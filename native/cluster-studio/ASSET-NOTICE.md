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

`font_cluster_square.js` is the renamed **Cluster Square** derivative under
the same SIL Open Font License 1.1. Its square numerals are original polygon
drawings; its non-digit glyphs are unchanged Russo One. Regenerate it with
`node tools/bake_cluster_square.js`. It contains no extracted BMW fonts.

# Owner-supplied updated white X4 M

The dashboard uses the 96 display views supplied in
`Antonio_WHITE_X4M_Complete_Updated.zip`, November 10, 2026. Package SHA-256:
`61da96ed7fc09cd249ca3bcd8a56cc7585bb35d4c5c0f63ab09a9347ef85b6c8`.
Its `Antonio_BMW_X4M.glb` SHA-256:
`d062c688daa6f52868c764a3bd0264faff739dc912643d57d23e1044b154e0ba`.
It replaces the earlier customized GLB renders and the temporary M3 illustration.
The mesh, Blender master, owner photographs and review pages are not shipped.

The updated white car has revised wheels, seats, brakes, tint, rear-window cross
and carbon spoiler. The display frames retain the supplied render pixels without
material conversion. The source is a photo-based reconstruction, not measured CAD.

The native menu renderer supports 2D images. Its interactive car uses 96 distinct
views of this model, at 3.75-degree yaw increments and a fixed elevation.
Dragging rotates the view through 360 degrees; Move pans the image; +/- zooms;
Reset restores the initial view. This is not an arbitrary-camera 3D mesh renderer.
The car appears large on the dashboard itself. Initial framing uses all angles'
silhouette bounds, keeping the roof and wheels visible throughout rotation.
Deliberate zoom and movement can crop the car.
The first view is embedded in cockpit_car.js; the remaining views are lazily
loaded from the installed Cluster Studio package with a six-image decode cache.

Rebuild from the supplied display package:

    python3 tools/x4m/pack.py /tmp/x4m-frames

First verify the source manifest and decode its 96 zlib frames to 900 x 450 PNGs
named 000.png through 095.png. The packer requires Pillow and preserves RGBA
pixels losslessly. views.json records hashes, sizes and shared silhouette bounds.
The older SceneKit renderer remains a development tool; the shipped images use
the owner's Blender renders to retain the updated materials. The model retains
its original rights; application source licensing does not relicense the model
or BMW marks. The old m3-reference.png is retained only as a historical source
reference and is not loaded or shipped by the application.
