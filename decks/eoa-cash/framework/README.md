# Slideshow framework (MIT)

Reusable HTML deck shell extracted from the EOA Cash pilot.

Copy this directory into a new deck (or vendor it beside `index.html`) and keep
the chrome IDs from `shell.html`. Teaching copy stays in the deck, not here.

## What this directory is

| Path | Role |
| --- | --- |
| `css/slideshow.css` | Theme, viewport fitting, slide frame, sidebar, controls, notes, desktop 16:9 stage |
| `js/slideshow.js` | Keyboard, wheel, touch, hash, sidebar, notes, full screen, optional footers |
| `fonts/` | Local Geist / Geist Mono (SIL OFL 1.1) so a deck can run offline |
| `shell.html` | Starter markup with the required chrome IDs |
| `LICENSE` | MIT |

`decks/eoa-cash/framework/` is a vendored copy so that deck opens from its own
`index.html` without reaching back to this folder. Refresh it with
`scripts/vendor-framework.sh`.

## Start a new deck

1. Copy `framework/` next to your `index.html`.
2. Copy the chrome from `shell.html` (sidebar, progress, `#presentation`,
   controls, notes panel).
3. Add `<section class="slide" id="slide-N" data-title="…">` slides.
4. Link the stylesheet and script, then construct the controller:

```html
<script src="./framework/js/slideshow.js"></script>
<script>
  new SlidePresentation({
    sidebarGroups: [
      [0, 'Introduction'],
    ],
    footerHtml: 'Optional license or canonical URL footer.',
  });
</script>
```

`sidebarGroups` is a list of `[zeroBasedSlideIndex, label]` pairs. Omit
`footerHtml` if the deck should not inject a footer.

There is no ChatGPT Sites runtime and no sync pipeline. Host the static tree
from the repository root (see the root README for Cloudflare Pages).
