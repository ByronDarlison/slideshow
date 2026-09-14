const fs = require('fs');
const path = require('path');

function loadPlaywright() {
  const candidates = [];
  if (process.env.PLAYWRIGHT_MODULE) candidates.push(process.env.PLAYWRIGHT_MODULE);
  candidates.push('playwright');
  candidates.push('/Users/byron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') throw error;
    }
  }
  return null;
}

const playwright = loadPlaywright();
if (!playwright) {
  console.log('SKIP: Playwright is not installed. Content smoke is test-content.cjs; full viewport QA needs `npx playwright install chromium`.');
  process.exit(0);
}
const { chromium } = playwright;

const url = process.env.EOA_PRESENTATION_URL || 'http://127.0.0.1:8877/index.html';
const outputDirectory = process.env.EOA_QA_OUTPUT_DIR || path.join(__dirname, 'qa');
const captureAllViewports = process.env.EOA_CAPTURE_ALL === 'true';
const quiet = process.env.EOA_QA_QUIET === 'true';
const allowedOrigin = new URL(url).origin;

const requiredViewports = [
  { name: 'owner-chrome', width: 1686, height: 1267 },
  { name: 'full-hd', width: 1920, height: 1080 },
  { name: 'desktop-wide', width: 1440, height: 900 },
  { name: 'projector-standard', width: 1366, height: 768 },
  { name: 'presentation', width: 1280, height: 720 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'phone-portrait', width: 390, height: 844 },
  { name: 'phone-landscape', width: 844, height: 390 },
];
const requestedViewports = (process.env.EOA_QA_VIEWPORTS || '')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean);
const viewports = requestedViewports.length
  ? requiredViewports.filter((viewport) => requestedViewports.includes(viewport.name))
  : requiredViewports;

async function measureDeck(page) {
  return page.evaluate(() => {
    const slides = Array.from(document.querySelectorAll('.slide'));
    const results = slides.map((slide, index) => {
      const content = slide.querySelector('.slide-content');
      const importantElements = Array.from(slide.querySelectorAll([
        '.slide-title',
        '.opening-title',
        '.closing-title',
        '.slide-stage',
        '.support-line',
        '.ask-line',
        '.target-caption',
      ].join(',')));
      const boundedElements = Array.from(slide.querySelectorAll([
        '.days-target',
        '.days-target .big-number',
        '.forecast-result',
        '.cash-consequence',
        '.cash-consequence .big-number',
        '.cash-consequence .forecast-label',
        '.cash-consequence .support-line',
        '.decision-copy',
        '.choice-list strong',
        '.monthly-node',
        '.model-word',
        '.chain-node',
        '.metronomics-hero',
        '.outcome-path',
        '.outcome-card',
        '.story-arc',
        '.story-chapter',
        '.reading-layout',
        '.reading-books',
        '.reading-book',
        '.book-face',
        '.book-face strong',
        '.resource-grid',
        '.resource-card',
        '.resource-card img',
        '.kffm-map',
        '.kffm-function',
        '.kffm-cash',
        '.kffm-handoff small',
        '.kffm-resource',
        '.kffm-resource img',
        '.correction-flow',
        '.correction-card',
        '.payoff-chain',
        '.payoff-card',
      ].join(',')));
      const slideRect = slide.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const title = slide.querySelector('.slide-title');
      const stage = slide.querySelector('.slide-stage');
      const stagePaddingTop = stage ? Number.parseFloat(getComputedStyle(stage).paddingTop) : 0;
      const outOfBounds = importantElements.flatMap((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') return [];
        const outside = (
          rect.left < slideRect.left - 1
          || rect.right > slideRect.right + 1
          || rect.top < slideRect.top - 1
          || rect.bottom > slideRect.bottom + 1
        );
        return outside ? [element.className || element.tagName] : [];
      });
      const innerOverflow = boundedElements.flatMap((element) => (
        element.scrollWidth > element.clientWidth + 5
          ? [{
              element: element.className || element.tagName,
              text: element.textContent.trim().replace(/\s+/g, ' '),
              clientWidth: element.clientWidth,
              scrollWidth: element.scrollWidth,
            }]
          : []
      ));
      return {
        slide: index + 1,
        slideHorizontalOverflow: slide.scrollWidth > slide.clientWidth + 1,
        slideVerticalOverflow: slide.scrollHeight > slide.clientHeight + 1,
        contentHorizontalOverflow: content.scrollWidth > content.clientWidth + 1,
        contentVerticalOverflow: content.scrollHeight > content.clientHeight + 1,
        stageVerticalOverflow: stage ? stage.scrollHeight > stage.clientHeight + 1 : false,
        contentAspectRatio: contentRect.height ? contentRect.width / contentRect.height : 0,
        contentTop: contentRect.top - slideRect.top,
        contentBottom: contentRect.bottom - slideRect.top,
        titleToContentGap: title && stage
          ? stage.offsetTop + stagePaddingTop - (title.offsetTop + title.offsetHeight)
          : null,
        innerOverflow,
        outOfBounds,
      };
    });
    return {
      documentHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      results,
    };
  });
}

(async () => {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const launchOptions = { headless: true };
  const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(chromePath)) launchOptions.executablePath = chromePath;
  const browser = await chromium.launch(launchOptions);
  const failures = [];

  for (const viewport of viewports) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: viewport.name === 'phone-landscape' ? 'reduce' : 'no-preference',
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    // Headless Chrome does not grant native full-screen mode. Simulate only the
    // browser API state so the presentation's controls and keyboard wiring can
    // still be verified deterministically. Native behavior is checked in Chrome.
    if (viewport.name === 'presentation') {
      await page.addInitScript(() => {
        let fullscreenElement = null;
        Object.defineProperty(Document.prototype, 'fullscreenElement', {
          configurable: true,
          get: () => fullscreenElement,
        });
        Element.prototype.requestFullscreen = async function requestFullscreen() {
          fullscreenElement = this;
          document.dispatchEvent(new Event('fullscreenchange'));
        };
        Document.prototype.exitFullscreen = async function exitFullscreen() {
          fullscreenElement = null;
          document.dispatchEvent(new Event('fullscreenchange'));
        };
        window.addEventListener('keydown', (event) => {
          if (event.key !== 'Escape' || !fullscreenElement) return;
          fullscreenElement = null;
          document.dispatchEvent(new Event('fullscreenchange'));
        }, true);
      });
    }

    await page.goto(`${url}#slide-1`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelectorAll('.slide').length === 23);
    await page.waitForFunction(() => document.querySelectorAll('.sidebar-link').length === 23);
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: `
      .reveal,
      .reveal-left,
      .reveal-scale {
        opacity: 1 !important;
        transform: none !important;
        transition: none !important;
      }
    ` });

    const fontState = await page.evaluate(() => ({
      displayLoaded: document.fonts.check('600 32px "Geist"'),
      bodyLoaded: document.fonts.check('400 16px "Geist"'),
      monoLoaded: document.fonts.check('600 12px "Geist Mono"'),
      titleFamilies: Array.from(document.querySelectorAll('.slide-title, .opening-title, .closing-title'))
        .map((element) => getComputedStyle(element).fontFamily),
      titleWeights: Array.from(document.querySelectorAll('.slide-title, .opening-title, .closing-title'))
        .map((element) => Number(getComputedStyle(element).fontWeight)),
    }));
    if (!fontState.displayLoaded || !fontState.bodyLoaded || !fontState.monoLoaded) {
      failures.push(`${viewport.name}: presentation fonts did not load ${JSON.stringify(fontState)}`);
    }
    if (fontState.titleFamilies.some((family) => !family.includes('Geist'))) {
      failures.push(`${viewport.name}: a title used the wrong family ${JSON.stringify(fontState.titleFamilies)}`);
    }
    if (fontState.titleWeights.some((weight) => weight > 700)) {
      failures.push(`${viewport.name}: a title used a synthetic heavy weight ${JSON.stringify(fontState.titleWeights)}`);
    }

    const imagesLoaded = await page.evaluate(() => Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0));
    if (!imagesLoaded) failures.push(`${viewport.name}: one or more images failed to load`);

    const sizingState = await page.evaluate(() => ({
      supportSizes: Array.from(document.querySelectorAll('.support-line, .ask-line, .target-caption'))
        .map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
      controlTargets: Array.from(document.querySelectorAll('.control-button'))
        .filter((element) => getComputedStyle(element).display !== 'none')
        .map((element) => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })),
      sidebarToggle: (() => {
        const element = document.getElementById('sidebarToggle');
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height, visible: getComputedStyle(element).display !== 'none' };
      })(),
      kffmFunctionSizes: Array.from(document.querySelectorAll('#slide-6 .kffm-function, #slide-6 .kffm-cash'))
        .map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
      kffmHandoffSizes: Array.from(document.querySelectorAll('#slide-6 .kffm-handoff small'))
        .map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
      kffmBridgeSizes: Array.from(document.querySelectorAll('#slide-6 .kffm-driver-bridge'))
        .map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
      kffmHandoffWordBreaks: Array.from(document.querySelectorAll('#slide-6 .kffm-handoff small')).flatMap((element) => {
        const textNode = element.firstChild;
        // A hyphen is a valid word boundary, not clipping inside a word.
        return Array.from(element.textContent.matchAll(/[A-Za-z]+/g)).flatMap((match) => {
          const range = document.createRange();
          range.setStart(textNode, match.index);
          range.setEnd(textNode, match.index + match[0].length);
          return range.getClientRects().length > 1 ? [`${element.textContent}: ${match[0]}`] : [];
        });
      }),
    }));
    const minimumSupportSize = viewport.name === 'phone-landscape' ? 14 : (viewport.width >= 1280 ? 24 : 0);
    if (minimumSupportSize && sizingState.supportSizes.some((size) => size < minimumSupportSize - 0.1)) {
      failures.push(`${viewport.name}: supporting text below ${minimumSupportSize}px ${JSON.stringify(sizingState.supportSizes)}`);
    }
    if (sizingState.controlTargets.some((target) => target.width < 43.9 || target.height < 43.9)) {
      failures.push(`${viewport.name}: control target below 44px ${JSON.stringify(sizingState.controlTargets)}`);
    }
    if (sizingState.sidebarToggle.visible && (sizingState.sidebarToggle.width < 43.9 || sizingState.sidebarToggle.height < 43.9)) {
      failures.push(`${viewport.name}: sidebar toggle below 44px ${JSON.stringify(sizingState.sidebarToggle)}`);
    }
    const kffmMinimums = viewport.width >= 1280
      ? { functions: 18, handoffs: 14 }
      : (viewport.name === 'tablet-portrait'
        ? { functions: 18, handoffs: 14 }
        : (viewport.name === 'tablet-landscape'
          ? { functions: 16, handoffs: 13 }
          : { functions: 14, handoffs: 12 }));
    if (sizingState.kffmFunctionSizes.some((size) => size < kffmMinimums.functions - 0.1)) {
      failures.push(`${viewport.name}: KFFM function label below ${kffmMinimums.functions}px ${JSON.stringify(sizingState.kffmFunctionSizes)}`);
    }
    if (sizingState.kffmHandoffSizes.some((size) => size < kffmMinimums.handoffs - 0.1)) {
      failures.push(`${viewport.name}: KFFM handoff label below ${kffmMinimums.handoffs}px ${JSON.stringify(sizingState.kffmHandoffSizes)}`);
    }
    if (sizingState.kffmBridgeSizes.some((size) => size < kffmMinimums.handoffs - 0.1)) {
      failures.push(`${viewport.name}: KFFM driver bridge below ${kffmMinimums.handoffs}px ${JSON.stringify(sizingState.kffmBridgeSizes)}`);
    }
    if (sizingState.kffmHandoffWordBreaks.length) {
      failures.push(`${viewport.name}: KFFM handoff label breaks inside a word ${JSON.stringify(sizingState.kffmHandoffWordBreaks)}`);
    }

    for (const slideNumber of [9, 12, 13, 16, 18, 19]) {
      await page.evaluate((number) => document.querySelectorAll('.sidebar-link')[number - 1].click(), slideNumber);
      await page.waitForFunction((number) => (
        location.hash === `#slide-${number}`
        && document.getElementById(`slide-${number}`).classList.contains('visible')
      ), slideNumber);
      const controlSafeZoneProblems = await page.evaluate((number) => {
        const clearance = 8;
        const controlsRect = document.querySelector('.controls').getBoundingClientRect();
        const selector = number === 9 || number === 13
          ? '.view.rolling'
          : (number === 12
            ? '.correction-card'
            : (number === 16
              ? '.payoff-card'
              : (number === 18 ? '.reading-credit, .book-face' : '.resource-card')));
        return Array.from(document.getElementById(`slide-${number}`).querySelectorAll(selector)).flatMap((element) => {
          const rect = element.getBoundingClientRect();
          const violatesSafeZone = !(
            rect.right + clearance <= controlsRect.left
            || rect.left >= controlsRect.right + clearance
            || rect.bottom + clearance <= controlsRect.top
            || rect.top >= controlsRect.bottom + clearance
          );
          return violatesSafeZone ? [element.className || element.tagName] : [];
        });
      }, slideNumber);
      if (controlSafeZoneProblems.length) {
        failures.push(`${viewport.name}: slide ${slideNumber} content violates the 8px control safe zone ${JSON.stringify(controlSafeZoneProblems)}`);
      }
    }

    await page.evaluate(() => document.querySelectorAll('.sidebar-link')[22].click());
    await page.waitForFunction(() => location.hash === '#slide-23' && document.getElementById('slide-23').classList.contains('visible'));
    const qrState = await page.evaluate(async () => {
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      const results = [];
      for (const image of document.querySelectorAll('.resource-card img, .teaching-resource img')) {
        const rect = image.getBoundingClientRect();
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(rect.width);
        canvas.height = Math.round(rect.height);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        const decoded = await detector.detect(canvas);
        results.push({
          expected: image.closest('a').href,
          width: canvas.width,
          height: canvas.height,
          decoded: decoded.map((result) => result.rawValue),
        });
      }
      return results;
    });
    if (qrState.length !== 10 || qrState.some((result) => result.decoded.length !== 1 || result.decoded[0] !== result.expected)) {
      failures.push(`${viewport.name}: not every QR code decodes at rendered size ${JSON.stringify(qrState)}`);
    }

    await page.evaluate(() => document.querySelectorAll('.sidebar-link')[5].click());
    await page.waitForFunction(() => location.hash === '#slide-6' && document.getElementById('slide-6').classList.contains('visible'));
    const articleQrState = await page.evaluate(async () => {
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      const image = document.querySelector('#slide-6 .teaching-resource img');
      const rect = image.getBoundingClientRect();
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(rect.width);
      canvas.height = Math.round(rect.height);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      const decoded = await detector.detect(canvas);
      return {
        width: canvas.width,
        height: canvas.height,
        decoded: decoded.map((result) => result.rawValue),
      };
    });
    if (articleQrState.decoded.length !== 1 || articleQrState.decoded[0] !== 'https://www.darlison.com/how-your-company-makes-money/') {
      failures.push(`${viewport.name}: Slide 6 QR code did not decode to the explanatory article ${JSON.stringify(articleQrState)}`);
    }

    // Measure the settled composition, not the opening reveal transition.
    await page.waitForTimeout(700);
    const measurement = await measureDeck(page);
    const badSlides = measurement.results.filter((result) => (
      result.slideHorizontalOverflow
      || result.slideVerticalOverflow
      || result.contentHorizontalOverflow
      || result.contentVerticalOverflow
      || result.stageVerticalOverflow
      || result.innerOverflow.length > 0
      || result.outOfBounds.length > 0
    ));
    if (measurement.documentHorizontalOverflow) failures.push(`${viewport.name}: document has horizontal overflow`);
    if (badSlides.length) failures.push(`${viewport.name}: slide overflow ${JSON.stringify(badSlides)}`);

    const expectsFramedSlide = viewport.width >= 900 && viewport.height >= 600;
    if (expectsFramedSlide) {
      const frameProblems = measurement.results.filter((result) => (
        Math.abs(result.contentAspectRatio - (16 / 9)) > 0.015
        || result.contentTop < 19
        || result.contentBottom > viewport.height - 19
      ));
      if (frameProblems.length) failures.push(`${viewport.name}: desktop frame is not centered 16:9 ${JSON.stringify(frameProblems)}`);

      const compositionProblems = measurement.results.filter((result) => (
        result.slide >= 3
        && result.slide <= 18
        && (result.titleToContentGap === null || result.titleToContentGap < 12 || result.titleToContentGap > 96)
      ));
      if (compositionProblems.length) failures.push(`${viewport.name}: title-to-content rhythm failed ${JSON.stringify(compositionProblems)}`);
    }

    const sidebarState = await page.evaluate(() => ({
      toggleVisible: getComputedStyle(document.getElementById('sidebarToggle')).display !== 'none',
      sidebarTransform: getComputedStyle(document.getElementById('slideSidebar')).transform,
    }));
    const expectsToggle = viewport.width <= 1180;
    if (sidebarState.toggleVisible !== expectsToggle) failures.push(`${viewport.name}: sidebar responsive state is wrong`);

    await page.goto(`${url}#slide-1`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.getElementById('controlCount').textContent.trim() === '1 / 23');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => location.hash === '#slide-2' && document.getElementById('controlCount').textContent.trim() === '2 / 23');
    const keyboardState = await page.evaluate(() => ({ hash: location.hash, counter: document.getElementById('controlCount').textContent }));
    if (keyboardState.hash !== '#slide-2' || keyboardState.counter.trim() !== '2 / 23') {
      failures.push(`${viewport.name}: keyboard navigation failed ${JSON.stringify(keyboardState)}`);
    }

    await page.keyboard.press('n');
    const notesOpen = await page.locator('#notesPanel').evaluate((element) => element.classList.contains('open'));
    if (!notesOpen) failures.push(`${viewport.name}: speaker notes did not open`);
    await page.keyboard.press('Escape');

    if (viewport.name === 'presentation') {
      const fullscreenButton = page.locator('#fullscreenButton');
      const initialFullscreenState = await fullscreenButton.evaluate((element) => ({
        text: element.textContent.trim().replace(/\s+/g, ' '),
        label: element.getAttribute('aria-label'),
        pressed: element.getAttribute('aria-pressed'),
      }));
      if (initialFullscreenState.text !== '⛶ Full screen'
        || initialFullscreenState.label !== 'Enter full screen'
        || initialFullscreenState.pressed !== 'false') {
        failures.push(`${viewport.name}: initial full-screen control state is wrong ${JSON.stringify(initialFullscreenState)}`);
      }

      await page.mouse.move(viewport.width - 20, viewport.height - 20);
      await fullscreenButton.focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => Boolean(document.fullscreenElement));
      const enteredFullscreenState = await fullscreenButton.evaluate((element) => ({
        text: element.textContent.trim().replace(/\s+/g, ' '),
        label: element.getAttribute('aria-label'),
        pressed: element.getAttribute('aria-pressed'),
      }));
      if (enteredFullscreenState.text !== '⛶ Exit full screen'
        || enteredFullscreenState.label !== 'Exit full screen'
        || enteredFullscreenState.pressed !== 'true') {
        failures.push(`${viewport.name}: entered full-screen control state is wrong ${JSON.stringify(enteredFullscreenState)}`);
      }
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.fullscreenElement);

      await page.keyboard.press('f');
      await page.waitForFunction(() => Boolean(document.fullscreenElement));
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.fullscreenElement);
    }

    if (expectsToggle) {
      await page.locator('#sidebarToggle').click();
      const open = await page.locator('#slideSidebar').evaluate((element) => element.classList.contains('open'));
      if (!open) failures.push(`${viewport.name}: sidebar did not open`);
      await page.locator('.sidebar-link').nth(8).click();
      await page.waitForFunction(() => location.hash === '#slide-9' && document.getElementById('controlCount').textContent.trim() === '9 / 23');
      const mobileSidebarState = await page.evaluate(() => ({
        hash: location.hash,
        open: document.getElementById('slideSidebar').classList.contains('open'),
      }));
      if (mobileSidebarState.hash !== '#slide-9' || mobileSidebarState.open) {
        failures.push(`${viewport.name}: sidebar navigation failed ${JSON.stringify(mobileSidebarState)}`);
      }
    }

    if (!expectsToggle) {
      for (let slideNumber = 11; slideNumber <= 23; slideNumber += 1) {
        await page.evaluate((number) => document.querySelectorAll('.sidebar-link')[number - 1].click(), slideNumber);
        await page.waitForFunction((number) => location.hash === `#slide-${number}`, slideNumber);
        const activeLinkVisible = await page.evaluate(() => {
          const link = document.querySelector('.sidebar-link.active');
          const nav = document.getElementById('sidebarNav');
          const linkRect = link.getBoundingClientRect();
          const navRect = nav.getBoundingClientRect();
          return linkRect.top >= navRect.top - 1 && linkRect.bottom <= navRect.bottom + 1;
        });
        if (!activeLinkVisible) failures.push(`${viewport.name}: active sidebar link for slide ${slideNumber} is not fully visible`);
      }

      for (const slideNumber of [1, 2, 5, 11, 12, 16, 19]) {
        await page.evaluate((number) => document.querySelectorAll('.sidebar-link')[number - 1].click(), slideNumber);
        await page.waitForFunction((number) => location.hash === `#slide-${number}`, slideNumber);
        const groupLabelVisible = await page.evaluate(() => {
          const link = document.querySelector('.sidebar-link.active');
          const group = link.previousElementSibling;
          const nav = document.getElementById('sidebarNav');
          if (!group?.classList.contains('sidebar-group')) return false;
          const groupRect = group.getBoundingClientRect();
          const navRect = nav.getBoundingClientRect();
          return groupRect.top >= navRect.top - 1 && groupRect.bottom <= navRect.bottom + 1;
        });
        if (!groupLabelVisible) failures.push(`${viewport.name}: sidebar group label for slide ${slideNumber} is not fully visible`);
      }
    }

    if (captureAllViewports || viewport.name === 'presentation') {
      for (let slideNumber = 1; slideNumber <= 23; slideNumber += 1) {
        await page.evaluate((number) => document.querySelectorAll('.sidebar-link')[number - 1].click(), slideNumber);
        await page.waitForFunction((number) => (
          location.hash === `#slide-${number}`
          && document.getElementById('controlCount').textContent.trim() === `${number} / 23`
          && document.getElementById(`slide-${number}`).classList.contains('visible')
        ), slideNumber);
        const controlOverlap = await page.evaluate((number) => {
          const slide = document.getElementById(`slide-${number}`);
          const controls = document.querySelector('.controls');
          const controlsRect = controls.getBoundingClientRect();
          const candidates = Array.from(slide.querySelectorAll('.slide-title, .opening-title, .closing-title, .support-line, .ask-line, .target-caption'));
          return candidates.flatMap((element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden') return [];
            const intersects = !(
              rect.right <= controlsRect.left
              || rect.left >= controlsRect.right
              || rect.bottom <= controlsRect.top
              || rect.top >= controlsRect.bottom
            );
            return intersects ? [element.className || element.tagName] : [];
          });
        }, slideNumber);
        if (controlOverlap.length) failures.push(`${viewport.name}: controls overlap slide ${slideNumber} ${JSON.stringify(controlOverlap)}`);
        await page.waitForTimeout(700);
        await page.screenshot({ path: path.join(outputDirectory, `${viewport.name}-slide-${slideNumber}.png`) });
      }
    } else {
      await page.evaluate(() => document.querySelector('.sidebar-link').click());
      await page.waitForFunction(() => location.hash === '#slide-1' && document.getElementById('slide-1').classList.contains('visible'));
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(outputDirectory, `${viewport.name}-slide-1.png`) });
    }

    if (errors.length) failures.push(`${viewport.name}: browser errors ${JSON.stringify(errors)}`);
    if (!quiet) console.log(JSON.stringify({ viewport, imagesLoaded, measurement, sidebarState, errors }));
    await page.close();
  }

  const offlinePage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const externalRequests = [];
  await offlinePage.route('**/*', async (route) => {
    const requestUrl = route.request().url();
    if (requestUrl.startsWith(`${allowedOrigin}/`) || requestUrl.startsWith('data:')) {
      await route.continue();
      return;
    }
    externalRequests.push(requestUrl);
    await route.abort();
  });
  await offlinePage.goto(`${url}#slide-1`, { waitUntil: 'networkidle' });
  await offlinePage.evaluate(() => document.fonts.ready);
  const offlineState = await offlinePage.evaluate(() => ({
    displayLoaded: document.fonts.check('600 32px "Geist"'),
    bodyLoaded: document.fonts.check('400 16px "Geist"'),
    monoLoaded: document.fonts.check('600 12px "Geist Mono"'),
    titleFamily: getComputedStyle(document.querySelector('.opening-title')).fontFamily,
    imagesLoaded: Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0),
  }));
  if (externalRequests.length) failures.push(`offline: external requests ${JSON.stringify(externalRequests)}`);
  if (!offlineState.displayLoaded || !offlineState.bodyLoaded || !offlineState.monoLoaded || !offlineState.titleFamily.includes('Geist') || !offlineState.imagesLoaded) {
    failures.push(`offline: local font or image failure ${JSON.stringify(offlineState)}`);
  }
  await offlinePage.screenshot({ path: path.join(outputDirectory, 'offline-presentation-slide-1.png') });
  await offlinePage.close();

  await browser.close();

  if (failures.length) {
    console.error('FAIL');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log(`PASS: 23 slides, ${viewports.length} responsive viewports, sidebar, keyboard, notes, full-screen controls, images, and QR codes`);
})();
