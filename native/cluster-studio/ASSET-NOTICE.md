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

# Owner-supplied X4 M model views

The current dashboard uses renders of `Antonio_X4M_Custom_2026.glb` from the
owner-supplied COMPLETE model archive. Source SHA-256:
`11f5be7dcfb8d7fbedb3aeb41cdfe711edc76475994564832778207493c30971`.
It replaces the temporary M3 illustration. The original GLB is not redistributed.

The native menu renderer supports 2D images. Its interactive car uses 96 distinct
views of this actual model, at 3.75-degree yaw increments and a fixed elevation.
Dragging rotates the view through 360 degrees; Move pans the image; +/- zooms;
Reset restores the initial view. This is not an arbitrary-camera 3D mesh renderer.
The first view is embedded in cockpit_car.js; the remaining views are lazily
loaded from the installed Cluster Studio package with a six-image decode cache.

Rebuild on macOS with SceneKit and Metal:

    swiftc tools/x4m/GLBScene.swift tools/x4m/main.swift -o /tmp/x4m-bake
    /tmp/x4m-bake /path/to/Antonio_X4M_Custom_2026.glb /tmp/x4m-frames
    python3 tools/x4m/pack.py /tmp/x4m-frames

The packer requires Pillow. It preserves RGBA pixels losslessly. views.json
records the SHA-256 and size of every shipped view. The supplied model retains
its original rights; application source licensing does not relicense the model
or BMW marks. The old m3-reference.png is retained only as a historical source
reference and is not loaded or shipped by the application.
