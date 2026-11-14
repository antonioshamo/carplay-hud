# Cluster Studio 0.1.32

Source-based cluster replacement for CarPlay HUD 0.4.155. See
[SOURCE-INTEGRATION.md](SOURCE-INTEGRATION.md) for exact imported revisions,
license notices, adaptations, excluded integrations and verification limits.

The Node 8 service stores schema-2 settings at
`/var/opt/cluster-studio/studio.json` and exposes its group-restricted control
socket at `/run/cluster-studio/control.sock`. It starts with the head unit;
gauge output defaults off. Legacy settings are backed up byte-for-byte before
migration and their active/startup flags are not imported.

Only the source GPU renderer is packaged. Old bitmap rendering, welcome drawing,
phone design serving and legacy panel/center output commands are removed. The
service retains the existing telemetry, climate, media and HUD startup-recovery
components. It does not install another cluster app or change renderer slots.

Run the host renderer tests first, then `node test/test_source_cluster.js` and
`node test/test_source_transport.js` from this folder. The latter needs the
compiled `../cluster-render/build/host/host_service` and local Unix sockets.
`tools/render_source.js` needs Playwright Chromium for shader/gallery verification.

No physical-car validation is claimed for this adaptation.

## CarPlay Map

Select **CarPlay Map** in the theme gallery, then **Use this cluster**. Requires Cluster renderer 0.3.106, Waze on cluster 0.7.118, and independent panel/HUD resources. The live map fills the usable panel behind speed, RPM at bottom left, and oil temperature at bottom right. There is no Park or cruise-control activation requirement. Factory warning/gear clearance and renderer arbitration remain in place. This modified integration has offline protocol, GPU, and Drive-state tests; physical X4 M verification is pending.

The map follows the upstream Cluster Layouts atomic map-window heartbeat approach, using a separate `map_focus.txt` file so unrelated layouts cannot opt into this mode. The helper keeps the existing HUD object and connection. A lost controller heartbeat releases the panel map; native expiry also covers a stalled producer. The original HUD video shaders and style settings are unchanged.

The full-panel heartbeat is readable by the separate `hmi_5000` map service even under Cluster Studio's `UMask=0027`: atomic replacements have explicit mode 0644 and the shared directory permits traversal. This file contains only the requested panel rectangle. Existing directory permissions are preserved except for the required traversal bit; symlink directories are rejected.

CarPlay Map uses clear capsule-shaped lenses inspired by Apple's Liquid Glass demonstration (https://developer.apple.com/videos/play/wwdc2025/219/). The panel video shader refracts the map near each edge, uses three local samples for soft scattering, and draws a directional highlight with localized dimming behind the readings. This is a custom BMW renderer implementation, not Apple's proprietary material. It adds no map image transfers or JavaScript animation loop. The map-only Inter font reuses the dashboard's licensed atlas.

RPM replaces fuel at bottom left. The number and bar turn yellow at 6700 through 7100 RPM inclusive, and red above 7100; the bar caps at 8000 RPM. The map fills behind the physical top sensor. The factory gear fade remains 190 pixels wide and 48 high, translated 32 pixels right with unchanged 38-pixel side feathers. Other themes, the map producer and the independent HUD are unchanged. Physical alignment, GPU performance in the car and the intermittent top-right rectangle still require vehicle validation.
