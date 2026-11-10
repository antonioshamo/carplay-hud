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
The full-resolution first view is embedded in cockpit_car.js. Rotation views
remove unused transparent margins and resize the same pixels to 600 x 315,
without changing materials or tint. Premultiplied RGBA is prepared at build
time. The app holds up to twelve decoded views, prefetches
nearby angles, and alternates two display buffers after frame acknowledgements.
The renderer updates existing pixel textures when supported; older renderers
use two ordinary image resources. Every view is verified against its expected
hash before display, preserving appearance when app and helper versions differ.

Rebuild from the supplied display package:

    python3 tools/x4m/pack.py /tmp/x4m-frames

First verify the source manifest and decode its 96 zlib frames to 900 x 450 PNGs
named 000.png through 095.png. The packer requires Pillow and preserves the
original RGBA views losslessly. views.json records source and prepared-view
hashes, sizes and shared silhouette bounds.
The older SceneKit renderer remains a development tool; the shipped images use
the owner's Blender renders to retain the updated materials. The model retains
its original rights; application source licensing does not relicense the model
or BMW marks. The old m3-reference.png is retained only as a historical source
reference and is not loaded or shipped by the application.
