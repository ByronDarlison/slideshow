# Make your own slideshow

This folder is the reusable MIT shell. Copy it and write your own slides.

The EOA Cash deck in `decks/eoa-cash/` is an example, not the product. Do not
copy Byron’s teaching content unless you follow that deck’s CC BY 4.0 licence
and the `NOTICE` file. The framework itself is MIT.

`shell.html` is the empty starter. You do not need a second template deck.

## What you get

| Path | Role |
| --- | --- |
| `css/slideshow.css` | Theme, 16:9 stage, sidebar, controls, notes, progress |
| `js/slideshow.js` | Keyboard, wheel, touch, hash, sidebar, notes, full screen, optional footers |
| `fonts/` | Local Geist / Geist Mono (SIL OFL 1.1) so a deck can run offline |
| `shell.html` | Starter page with the chrome IDs `slideshow.js` looks up |
| `LICENSE` | MIT |

`decks/eoa-cash/framework/` is a vendored copy so that deck opens from its own
`index.html`. Refresh it with `scripts/vendor-framework.sh` after you change
this folder.

## Start a new deck

From the repo root, or after copying this folder into any new project:

1. Put `framework/` next to your deck page.
2. Copy `framework/shell.html` to `index.html` beside that `framework/` folder.
3. Keep the chrome IDs listed below. Change titles, copy, and slide count.
4. Add one `<section class="slide">` per slide.
5. Point the stylesheet and script at `./framework/…`, then construct the
   controller.

```html
<link rel="stylesheet" href="./framework/css/slideshow.css">
<script src="./framework/js/slideshow.js"></script>
<script>
  new SlidePresentation({
    sidebarGroups: [
      [0, 'Introduction'],
    ],
    footerHtml: 'Optional license or canonical URL footer.',
    footerTitle: 'Optional tooltip on that footer.',
  });
</script>
```

A deck that already lives in this repo can sit at `decks/your-deck/index.html`
with a vendored `framework/` copy, the same way `decks/eoa-cash/` does.

## Required chrome IDs

`slideshow.js` looks these up with `getElementById`. Keep the IDs even if you
restyle the markup. Missing IDs disable that control; they do not throw.

| ID | Role |
| --- | --- |
| `sidebarToggle` | Mobile hamburger that opens the sidebar |
| `sidebarBackdrop` | Dimmed overlay behind the mobile sidebar |
| `slideSidebar` | Sidebar drawer |
| `sidebarNav` | JS fills this with one button per slide |
| `progressBar` | Width tracks the current slide |
| `presentation` | `<main>` that wraps the slides (not queried by JS; keep it as the landmark) |
| `navDots` | JS fills this with jump dots |
| `sidebarDesktopToggle` | Desktop “Hide sidebar” / “Show sidebar” |
| `previousButton` | Previous slide |
| `controlCount` | `current / total` |
| `fullscreenButton` | Enter / exit full screen |
| `fullscreenLabel` | Label text inside the full-screen button |
| `nextButton` | Next slide |
| `notesPanel` | Speaker-notes drawer |
| `notesTitle` | Notes heading (`Slide N: title`) |
| `notesClose` | Close notes |
| `notesBody` | JS copies the current slide’s notes here |

`shell.html` also uses `id="slide-1"` on the sample slide. That is a slide id,
not chrome. See below.

## How slides work

JS collects every `.slide` in document order. Hash links expect
`id="slide-N"` where `N` is **1-based** (`#slide-1`, `#slide-2`, …). Opening
`#slide-4` jumps to the fourth slide.

```html
<section class="slide" id="slide-2" data-title="Why this matters">
  <div class="slide-content">
    <div class="brand-line"></div>
    <p class="eyebrow">Deck · Series</p>
    <h2 class="slide-title reveal">Why this matters</h2>
    <div class="slide-stage">
      <p>Your copy.</p>
    </div>
  </div>
  <aside class="speaker-notes">
    <p>What you say aloud. Hidden on the slide; shown in the notes panel.</p>
  </aside>
</section>
```

- `data-title` is the sidebar label, the notes heading, and the nav-dot
  accessible name. It is not shown on the slide unless you also write it in
  the markup.
- `.slide-content` is the framed stage. Footers are appended here.
- `.speaker-notes` stays off-slide (`display: none` in the CSS). Press `N` to
  read them.
- Add `closing-slide` on a section if you want the dark control treatment used
  on a closer (`document.body` gets `dark-slide-controls`).
- Optional enter animations already in the CSS: `reveal`, `reveal-left`,
  `reveal-scale`, plus `delay-1` … `delay-4`.
- When a slide is in view, JS adds `.visible` (used by those reveal classes).

Number slides in order. The hash parser only accepts `#slide-<digits>`.

## `SlidePresentation` options

Verified from `framework/js/slideshow.js`. The constructor reads only these
three keys. Anything else is ignored.

| Option | Default | What it does |
| --- | --- | --- |
| `sidebarGroups` | `[]` | List of `[zeroBasedSlideIndex, label]` pairs. A group heading is inserted in the sidebar **before** that slide. Example: `[0, 'Introduction']` labels the first slide. |
| `footerHtml` | `''` | If non-empty, JS creates `<footer class="license-footer">` inside each `.slide-content` and sets `innerHTML` to this string. Omit it for no footer. |
| `footerTitle` | `''` | If set, becomes the `title` attribute on that footer (hover tooltip). Only used when `footerHtml` is also set. |

There is no option for theme, transition speed, or notes defaults. Change
those in CSS or by editing the chrome in your `index.html`.

## Keyboard, full screen, notes

What `slideshow.js` actually wires:

**Move**

- Next: `→`, `↓`, `PageDown`, `Space`
- Previous: `←`, `↑`, `PageUp`
- First / last: `Home` / `End`
- Wheel: next or previous after a 24px delta, then a 500ms lock
- Touch: vertical swipe of at least 48px
- Dots, sidebar buttons, and prev/next buttons call the same `goTo`

**Sidebar**

- `S` toggles the sidebar
- Wide viewports (≥1181px): hides or shows in place (“Hide sidebar”)
- Narrow viewports: hamburger + backdrop overlay; choosing a slide closes it
- `Escape` closes the overlay sidebar

**Notes**

- `N` toggles the notes panel
- JS copies the current slide’s `.speaker-notes` HTML into `#notesBody`
- Heading becomes `Slide N: {data-title}`
- If a slide has no `.speaker-notes`, the panel says “No notes available.”
- `Escape` or `#notesClose` closes the panel
- Notes re-render when you change slides while the panel is open

**Full screen**

- `F` or `#fullscreenButton` calls `requestFullscreen()` on `<html>`
- The button label switches between “Full screen” and “Exit full screen”
- After resize or full-screen change, JS re-aligns the current slide so the
  viewport does not land between slides

**URL**

- The address bar is kept on `#slide-N` via `history.replaceState`
- Reload or a shared link opens that slide

On-screen controls stay dim until the pointer is in the bottom-right
quadrant.

## Local preview

Serve the folder that contains `index.html` and `framework/`:

```sh
python3 -m http.server 8080
```

Then open `http://127.0.0.1:8080/` (or `/decks/your-deck/` if you kept the
repo layout).

Opening the HTML file as `file://` often works, but a local server is the
reliable check for fonts and relative paths.

Pretty URLs such as `/eoa-cash/` are Cloudflare `_redirects` rules. They do
not apply to `python3 -m http.server`. Use the real file path locally.

There is no ChatGPT Sites runtime and no sync pipeline. Host the static tree.

## Licence

- This folder: MIT (`LICENSE`). Keep the copyright notice when you copy it.
- Geist fonts: SIL OFL 1.1 (`fonts/LICENSE.txt`), not MIT.
- `decks/eoa-cash/` teaching copy: CC BY 4.0. That is Byron’s curriculum, not
  part of the framework licence.
- Metronomics and other third-party material in the example deck are **not**
  re-licensed. See the repo `NOTICE`.

Copy the shell. Write your own slides.
