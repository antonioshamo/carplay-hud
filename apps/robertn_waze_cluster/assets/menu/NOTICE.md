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
