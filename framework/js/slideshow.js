/*! Slideshow framework (MIT) | Copyright (c) 2026 Byron Darlison */

class SlidePresentation {
  constructor(options = {}) {
    this.slides = Array.from(document.querySelectorAll('.slide'));
    this.currentSlide = 0;
    this.wheelLocked = false;
    this.touchStartY = null;
    this.progressBar = document.getElementById('progressBar');
    this.counter = document.getElementById('controlCount');
    this.notesPanel = document.getElementById('notesPanel');
    this.notesTitle = document.getElementById('notesTitle');
    this.notesBody = document.getElementById('notesBody');
    this.fullscreenButton = document.getElementById('fullscreenButton');
    this.fullscreenLabel = document.getElementById('fullscreenLabel');
    this.sidebar = document.getElementById('slideSidebar');
    this.sidebarToggle = document.getElementById('sidebarToggle');
    this.sidebarBackdrop = document.getElementById('sidebarBackdrop');
    this.sidebarGroups = new Map(options.sidebarGroups || []);
    this.footerHtml = options.footerHtml || '';
    this.footerTitle = options.footerTitle || '';
    this.setupIntersectionObserver();
    this.setupKeyboardNavigation();
    this.setupTouchNavigation();
    this.setupWheelNavigation();
    this.setupControls();
    this.setupSidebar();
    this.setupNavigationDots();
    this.setupNotes();
    this.setupFullscreen();
    this.setupFooters();
    this.goToHash();
  }

  setupFooters() {
    if (!this.footerHtml) return;
    this.slides.forEach((slide) => {
      const content = slide.querySelector('.slide-content');
      if (!content) return;
      const footer = document.createElement('footer');
      footer.className = 'license-footer';
      footer.innerHTML = this.footerHtml;
      if (this.footerTitle) footer.title = this.footerTitle;
      content.appendChild(footer);
    });
  }

  goToHash() {
    const match = window.location.hash.match(/^#slide-(\d+)$/);
    const target = match ? Number(match[1]) - 1 : 0;
    this.goTo(Math.max(0, Math.min(target, this.slides.length - 1)), false);
  }

  goTo(index, smooth = true) {
    if (index < 0 || index >= this.slides.length) return;
    this.currentSlide = index;
    this.slides[index].scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    history.replaceState(null, '', `#slide-${index + 1}`);
    this.updateInterface();
  }

  next() { this.goTo(Math.min(this.currentSlide + 1, this.slides.length - 1)); }
  previous() { this.goTo(Math.max(this.currentSlide - 1, 0)); }

  updateInterface() {
    const position = ((this.currentSlide + 1) / this.slides.length) * 100;
    if (this.progressBar) this.progressBar.style.width = `${position}%`;
    if (this.counter) this.counter.textContent = `${this.currentSlide + 1} / ${this.slides.length}`;
    document.querySelectorAll('.nav-dot').forEach((dot, index) => {
      dot.classList.toggle('active', index === this.currentSlide);
      dot.setAttribute('aria-current', index === this.currentSlide ? 'true' : 'false');
    });
    document.querySelectorAll('.sidebar-link').forEach((link, index) => {
      link.classList.toggle('active', index === this.currentSlide);
      link.setAttribute('aria-current', index === this.currentSlide ? 'page' : 'false');
    });
    const activeSidebarLink = document.querySelector('.sidebar-link.active');
    const sidebarNav = document.getElementById('sidebarNav');
    if (activeSidebarLink && sidebarNav) {
      const linkRect = activeSidebarLink.getBoundingClientRect();
      const navRect = sidebarNav.getBoundingClientRect();
      const precedingGroup = activeSidebarLink.previousElementSibling?.classList.contains('sidebar-group')
        ? activeSidebarLink.previousElementSibling
        : null;
      const topAnchorRect = (precedingGroup || activeSidebarLink).getBoundingClientRect();
      if (topAnchorRect.top < navRect.top + 8) sidebarNav.scrollTop += topAnchorRect.top - navRect.top - 8;
      if (linkRect.bottom > navRect.bottom) sidebarNav.scrollTop += linkRect.bottom - navRect.bottom + 8;
    }
    document.body.classList.toggle('dark-slide-controls', this.slides[this.currentSlide]?.classList.contains('closing-slide'));
    if (this.notesPanel?.classList.contains('open')) this.renderNotes();
  }

  setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('visible');
        const index = this.slides.indexOf(entry.target);
        if (!this.viewportSettling && index >= 0 && entry.intersectionRatio >= 0.55) {
          this.currentSlide = index;
          history.replaceState(null, '', `#slide-${index + 1}`);
          this.updateInterface();
        }
      }
    }, { threshold: [0.55, 0.85] });
    this.slides.forEach((slide) => observer.observe(slide));
  }

  setupKeyboardNavigation() {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault();
        this.next();
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        this.previous();
      }
      if (event.key === 'Home') {
        event.preventDefault();
        this.goTo(0);
      }
      if (event.key === 'End') {
        event.preventDefault();
        this.goTo(this.slides.length - 1);
      }
      if (event.key === 'n' || event.key === 'N') this.toggleNotes();
      if (event.key === 'f' || event.key === 'F') this.toggleFullscreen();
      if (event.key === 's' || event.key === 'S') this.toggleSidebar();
      if (event.key === 'Escape' && this.notesPanel?.classList.contains('open')) this.toggleNotes(false);
      if (event.key === 'Escape' && this.sidebar?.classList.contains('open')) this.toggleSidebar(false);
    });
  }

  setupTouchNavigation() {
    document.addEventListener('touchstart', (event) => {
      this.touchStartY = event.changedTouches[0].clientY;
    }, { passive: true });
    document.addEventListener('touchend', (event) => {
      if (this.touchStartY === null) return;
      const distance = this.touchStartY - event.changedTouches[0].clientY;
      this.touchStartY = null;
      if (Math.abs(distance) < 48) return;
      if (distance > 0) this.next();
      else this.previous();
    }, { passive: true });
  }

  setupWheelNavigation() {
    document.addEventListener('wheel', (event) => {
      if (this.wheelLocked || Math.abs(event.deltaY) < 24) return;
      this.wheelLocked = true;
      if (event.deltaY > 0) this.next();
      else this.previous();
      window.setTimeout(() => { this.wheelLocked = false; }, 500);
    }, { passive: true });
  }

  setupControls() {
    document.addEventListener('pointermove', (event) => {
      document.body.classList.toggle('controls-visible', event.clientX >= window.innerWidth / 2 && event.clientY >= window.innerHeight / 2);
    });
    document.documentElement.addEventListener('pointerleave', () => document.body.classList.remove('controls-visible'));
    document.getElementById('previousButton')?.addEventListener('click', () => this.previous());
    this.fullscreenButton?.addEventListener('click', () => this.toggleFullscreen());
    document.getElementById('nextButton')?.addEventListener('click', () => this.next());
  }

  setupFullscreen() {
    window.addEventListener('resize', () => this.alignAfterResize());
    document.addEventListener('fullscreenchange', () => {
      this.updateFullscreenControl();
      this.alignAfterResize();
    });
    this.updateFullscreenControl();
  }

  alignAfterResize() {
    // Keep the selected slide stable while native full-screen geometry settles.
    this.viewportSettling = true;
    clearTimeout(this.resizeTimer);
    this.slides[this.currentSlide]?.scrollIntoView({ behavior: 'instant', block: 'start' });
    this.resizeTimer = setTimeout(() => {
      this.slides[this.currentSlide]?.scrollIntoView({ behavior: 'instant', block: 'start' });
      requestAnimationFrame(() => { this.viewportSettling = false; });
    }, 250);
  }

  updateFullscreenControl() {
    if (!this.fullscreenButton) return;
    const isFullscreen = Boolean(document.fullscreenElement);
    this.fullscreenButton.setAttribute('aria-pressed', isFullscreen ? 'true' : 'false');
    this.fullscreenButton.setAttribute('aria-label', isFullscreen ? 'Exit full screen' : 'Enter full screen');
    if (this.fullscreenLabel) this.fullscreenLabel.textContent = isFullscreen ? 'Exit full screen' : 'Full screen';
  }

  setupSidebar() {
    const container = document.getElementById('sidebarNav');
    if (!container) return;
    const groups = this.sidebarGroups;
    this.slides.forEach((slide, index) => {
      if (groups.has(index)) {
        const group = document.createElement('p');
        group.className = 'sidebar-group';
        group.textContent = groups.get(index);
        container.appendChild(group);
      }
      const link = document.createElement('button');
      link.className = 'sidebar-link';
      link.type = 'button';
      link.innerHTML = `<span class="sidebar-number">${String(index + 1).padStart(2, '0')}</span><span class="sidebar-label">${slide.dataset.title}</span>`;
      link.setAttribute('aria-label', `Go to slide ${index + 1}: ${slide.dataset.title}`);
      link.addEventListener('click', () => {
        this.goTo(index, false);
        if (window.matchMedia('(max-width: 1180px)').matches) this.toggleSidebar(false);
      });
      container.appendChild(link);
    });

    this.sidebarToggle?.addEventListener('click', () => this.toggleSidebar());
    this.sidebarBackdrop?.addEventListener('click', () => this.toggleSidebar(false));
    document.getElementById('sidebarDesktopToggle')?.addEventListener('click', () => this.toggleSidebar());
    window.matchMedia('(max-width: 1180px)').addEventListener('change', () => {
      if (this.sidebar) {
        this.sidebar.inert = window.matchMedia('(min-width: 1181px)').matches && document.body.classList.contains('sidebar-hidden');
      }
    });
  }

  toggleSidebar(force) {
    if (!this.sidebar) return;
    if (window.matchMedia('(min-width: 1181px)').matches) {
      const show = typeof force === 'boolean' ? force : document.body.classList.contains('sidebar-hidden');
      document.body.classList.toggle('sidebar-hidden', !show);
      this.sidebar.inert = !show;
      const button = document.getElementById('sidebarDesktopToggle');
      if (button) {
        button.textContent = show ? 'Hide sidebar' : 'Show sidebar';
        button.setAttribute('aria-expanded', String(show));
      }
      return;
    }
    const shouldOpen = typeof force === 'boolean' ? force : !this.sidebar.classList.contains('open');
    this.sidebar.classList.toggle('open', shouldOpen);
    this.sidebarBackdrop?.classList.toggle('visible', shouldOpen);
    document.body.classList.toggle('sidebar-open', shouldOpen);
    this.sidebarToggle?.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    this.sidebarToggle?.setAttribute('aria-label', shouldOpen ? 'Close slide navigation' : 'Open slide navigation');
  }

  setupNavigationDots() {
    const container = document.getElementById('navDots');
    if (!container) {
      this.updateInterface();
      return;
    }
    this.slides.forEach((slide, index) => {
      const dot = document.createElement('button');
      dot.className = 'nav-dot';
      dot.type = 'button';
      dot.setAttribute('aria-label', `Go to slide ${index + 1}: ${slide.dataset.title}`);
      dot.addEventListener('click', () => this.goTo(index));
      container.appendChild(dot);
    });
    this.updateInterface();
  }

  setupNotes() {
    document.getElementById('notesClose')?.addEventListener('click', () => this.toggleNotes(false));
  }

  renderNotes() {
    const slide = this.slides[this.currentSlide];
    const notes = slide?.querySelector('.speaker-notes');
    if (this.notesTitle) this.notesTitle.textContent = `Slide ${this.currentSlide + 1}: ${slide.dataset.title}`;
    if (this.notesBody) this.notesBody.innerHTML = notes ? notes.innerHTML : '<p>No notes available.</p>';
  }

  toggleNotes(force) {
    if (!this.notesPanel) return;
    const shouldOpen = typeof force === 'boolean' ? force : !this.notesPanel.classList.contains('open');
    this.notesPanel.classList.toggle('open', shouldOpen);
    this.notesPanel.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
    if (shouldOpen) this.renderNotes();
  }

  async toggleFullscreen() {
    this.viewportSettling = true;
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
      else await document.exitFullscreen?.();
    } finally {
      this.alignAfterResize();
    }
  }
}

globalThis.SlidePresentation = SlidePresentation;
