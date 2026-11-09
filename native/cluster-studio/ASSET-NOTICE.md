# Startup artwork

`x4m-badge.png` is a transparent adaptation of the owner's supplied X4 M
Competition badge reference, prepared with the built-in image-generation tool.
Prompt: preserve badge typography, M stripes and competition bar; remove the
white background; add a fine chrome edge for readability on black. No added text.
The original output was copied here without modifying the raster; the runtime
scales it into its GPU atlas and adds the optional animated light sweep.

The Apple silhouette in `studio_assets.js` comes from the navigation SVG at
https://www.apple.com/ (retrieved 2026-11-04), sampled as a native vector outline.
It is rendered into a single antialiased mask at runtime. These marks identify
personal startup themes, not BMW or Apple authorship or official CarPlay Ultra
integration. Trademark rights remain with their respective owners.

Application/source licenses do not grant trademark rights. No vehicle photos,
VINs or authentication data are bundled.

# Instrument numerals

`font_cluster.js` contains unmodified Russo One glyphs from Google Fonts
(`google/fonts/ofl/russoone/RussoOne-Regular.ttf`), retrieved 2026-11-08.
Source SHA-256: `bc0abcc660bd8b7ad3000ecb2898a27c58a29a50f7ec81652fa12e75148d09df`.
SIL Open Font License 1.1; see `LICENSE-RussoOne.txt`.
This is an open font, not BMW firmware artwork.
