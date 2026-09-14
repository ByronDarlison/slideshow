# Presentation Fonts

The responsive presentation bundles two local web fonts so the delivery format does not depend on an internet connection.

- `geist-latin.woff2`: Geist Sans, used for display and body copy.
- `geist-mono-latin.woff2`: Geist Mono, used for labels and compact navigation text.

The files came from the locally installed Next.js distribution. [Geist](https://github.com/vercel/geist-font) is an open-source typeface from Vercel distributed under the SIL Open Font License 1.1. The required copyright notice and license are in `LICENSE.txt`.

The responsive browser test blocks external requests and confirms that both local font families load before it captures the offline reference slide.
