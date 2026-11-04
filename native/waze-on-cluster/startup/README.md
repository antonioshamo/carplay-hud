# Optional Dashboard startup experiment

Packaged with tool 0.7.113 and controlled by app 0.4.115. Default OFF. The boot
service keeps the CarPlay listener running even while capture is off, retaining
foreground events received before opt-in. The runner polls the separate saved
`startup-mode` preference. `dashboard` enables capture; `off` immediately hides
output and stops capture while leaving the listener ready for the next event.

The runner subscribes to CarPlayManager.onScreenChange. A positive PROJECTED
notification, fresh normal-tool status with target HUD and state idle, a recognized
Dashboard layout, and a ready 800x480 renderer target are all required. No route
state is used. The current capture path is winston-grabber center, 1920x720 BGRA;
other geometry fails closed. Captures are private temporary files, deleted after
reading and on shutdown. No network upload occurs.

The map crop is 160,0,1020,720, sampled to 416x292 at up to 3 fps. Layer position
and size use the normal tool's HUD width/offsets, bounded to 800x480. The image
uses original colors and square corners. It is an ambient layer, nonexclusive,
with slot contention matching the existing map; normal map content takes priority.
The controller invalidates in-flight captures on screen changes, source handoff,
renderer disconnect and shutdown. A 750 ms stale-frame watchdog hides the layer.

The foreground classifier is a color/layout heuristic from the referenced
producer, not a verified Apple Maps identity API. Night maps may be rejected;
other layouts may be misclassified. It needs parked calibration. It cannot show
a map while the main screen is on BMW menus or a different app. It does not
solve the independent secondary stream starting without a route.

App status separates a saved preference from helper readiness. Sending frames
means the renderer accepted data, not proof that pixels are visible on the car.
If no ownership event has arrived since the helper started, reopening or
reconnecting CarPlay supplies one. Startup status now identifies the blocking
condition (ownership, center screen, target, renderer, or stale source status).
Retries after a helper failure are spaced by at least 10 seconds. Off remains
available without a live map stream. The preference is global, not per driver.

Run `node test/controller.test.js` and `node test/service.test.js`. These use
synthetic inputs; they do not establish physical CarPlay or HUD compatibility.

Vendor image code: https://github.com/isaakbruno2/carplay-map-cluster
Vendor renderer client: https://github.com/eroobeeroo/idrive-apps
All files in this directory are MPL-2.0; original notices and LICENSE are included.
