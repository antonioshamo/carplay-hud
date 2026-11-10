# Rotation progress and display buffers

CarPlay HUD 0.4.154 requires Cluster Studio 0.1.31. The owner's accepted white
X4 M appearance and tint are retained.

Rotation tracks the newest touch position even while a frame acknowledgement is
pending. Available decodes can advance toward that position during continuous
dragging. Two nearby angles in each direction are prefetched, with a twelve-view
cache. Errors retain the complete last image; asset hashes reject mixed versions.

Build-time preparation removes unused margins and resizes source pixels to
600 x 315. Each upload carries 756,000 bytes instead of 1,620,000 (53.3% less).
Premultiplied pixels are prepared offline. Two alternating renderer textures are
updated in place; a staged next view cannot remove the currently visible car.
The standard image path remains available on renderers without pixmap support.

Regression coverage includes continuous input with delayed decodes, latest-angle
coalescing behind frame acknowledgements, reversed requests, corrupt and mixed
assets, unchanged-frame reuse, reconnects, bounded resources, all 96 source and
prepared views, and native renderer replay of a complete orbit plus a partially
staged next angle. These tests do not establish physical-car frame rate.
