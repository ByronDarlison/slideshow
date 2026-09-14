# slideshow

MIT HTML slideshow framework. Copy `framework/` and make your own deck.

This repository also ships the EOA Cash Learning Day pilot (CC BY 4.0 teaching
content) as a worked example.

## Make your own slideshow

The reusable part is `framework/`: CSS, JS, fonts, and `shell.html`.

1. Copy `framework/` next to a new `index.html`.
2. Start from `framework/shell.html` (keep the chrome IDs).
3. Add `<section class="slide">` pages and construct `SlidePresentation`.

Step-by-step IDs, options, keys, and licence notes:
**[framework/README.md](framework/README.md)**.

`decks/eoa-cash/` shows a full deck. Use it as a reference, not as the
starter. Do not treat Byron’s teaching slides as MIT framework files.

## Canonical live deck

https://slides.darlison.com/eoa-cash/

A previous ChatGPT Sites freeze
(`https://eoa-cash-presentation-plan.byron500948.chatgpt.site/`) is
documentation only. There is no sync pipeline. The live path is this
repository on Cloudflare Pages.

## Layout

- `framework/` — reusable MIT shell (CSS, JS, fonts, starter chrome)
- `decks/eoa-cash/` — full EOA Cash deck, speaker guide, and a vendored copy of
  `framework/` so the deck is self-contained
- `_redirects` — Cloudflare Pages pretty URLs
- `wrangler.toml` — Pages project: static output from the repo root

## Licenses

- Framework code: MIT (`LICENSE-MIT`, also `framework/LICENSE`)
- Byron teaching content: CC BY 4.0 (`decks/eoa-cash/LICENSE`)
- Geist fonts: SIL OFL 1.1 (`framework/fonts/LICENSE.txt`)
- See `NOTICE` for Metronomics / third-party material (not re-licensed)

If you remix the shell, keep the MIT notice. If you reuse EOA Cash teaching
copy, follow CC BY 4.0 — that content is not MIT.

## Local preview

Open `framework/shell.html` or `decks/eoa-cash/index.html` in a browser, or
serve the repo root:

```sh
python3 -m http.server 8080
```

Pretty URLs (`/eoa-cash/`) need the `_redirects` rules, which Cloudflare Pages
applies in production. Locally use `/framework/shell.html` or
`/decks/eoa-cash/`.

## Tests

```sh
node decks/eoa-cash/test-content.cjs
```

`test-responsive.cjs` is optional and needs Playwright plus a browser. It skips
cleanly when that toolchain is not installed.

## Hosting (Cloudflare Pages)

This is a static site. Build command: none. Output directory: `/` (repo root).

Your own deck can be any static host. The steps below are how this repo’s
example is published; they are not required to remix the framework.

### Create the Pages project (Byron)

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**.
2. Select `ByronDarlison/slideshow`. Production branch: `main`.
3. Framework preset: **None**. Build command: leave empty. Build output
   directory: `/`.
4. Project name can be `slideshow` (matches `wrangler.toml`). Deploy.

CLI equivalent after `npx wrangler login`:

```sh
npx wrangler pages deploy . --project-name=slideshow
```

### Bind `slides.darlison.com` (human step — not done in CI)

Cloudflare Pages custom domains are dashboard-only. Wrangler cannot attach the
hostname.

1. After the first successful deploy, open the Pages project → **Custom
   domains** → **Set up a custom domain**.
2. Enter `slides.darlison.com` and continue.
3. DNS, if `darlison.com` is already on this Cloudflare account: add or accept
   the suggested record
   `slides` CNAME `<project>.pages.dev` (proxied).
4. If DNS is elsewhere: create that same CNAME at the current DNS host, using
   the target Cloudflare shows in the Custom domains tab.
5. Wait until the domain status is **Active** and the certificate is issued.
6. Confirm https://slides.darlison.com/ redirects to
   https://slides.darlison.com/eoa-cash/ and the deck loads.

Pretty URL map (already in `_redirects`):

- `/` → `/eoa-cash/` (302)
- `/eoa-cash/` → `decks/eoa-cash/index.html` (200 rewrite)
- `/eoa-cash/*` → `decks/eoa-cash/:splat` (200 rewrite)
