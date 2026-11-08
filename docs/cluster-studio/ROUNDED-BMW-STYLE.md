# Rounded BMW style update

CarPlay HUD 0.4.149 and Cluster Studio 0.1.26 replace the BMW template polygon rails with continuous sampled cubic curves. Both the face and indicator use the same arc-length path. The color palette applies to accents; primary theme readouts remain white. Explicit widget colors still apply.

The entire center, including the OEM badge, remains transparent. Neutral side backgrounds fade horizontally across 128 native pixels. Strip boundaries are rounded to destination pixels to avoid alpha seams between adjacent fractional rectangles in the software fallback. The accepted P exclusion is unchanged. An exact match for the old default centered badge is retired; a user-positioned badge remains. Saved other templates are untouched.

Offline tests cover smooth rail tangents, monotonic feather alpha, native center/P transparency, CPU recording and frame-cache parity, old-layout migration and customization. Physical blending against BMW artwork needs an in-car check.

## Outstanding request boundaries

The Drive fallback remains in `engine.js`. Assistance telemetry currently contains preferences, not verified active cruise/collision-warning states. Native warning extents and compositor priority are not established by the parked photos. Do not describe this appearance release as enabling full-panel replacement in Drive.

The latest external model is `Antonio_X4M_Custom_2026.glb` from the user-linked conversation. The authenticated chat exposed the download links, but GLB/ZIP downloads returned an error and its attached HTML viewer reported that the file could not load. No model was imported and no placeholder rotation buttons were added. The actual GLB/ZIP is required to build and verify dashboard rotation/positioning.
