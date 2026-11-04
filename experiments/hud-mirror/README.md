> Historical prototype. The maintained version is [the packaged startup trial](../../native/waze-on-cluster/startup/README.md). The notes below describe the earlier unintegrated prototype.

# CarPlay Dashboard -> HUD prototype

Local research prototype. Not published, installed or car-tested. This is NOT
an independent route-free CarPlay secondary-screen implementation.

The intended first-frame trigger is foreground CarPlay Dashboard. Navigation
state is never used. It mirrors the main screen's map when the existing Waze
renderer reports idle with HUD selected, then yields as that renderer starts.
Switching to BMW menus hides it. Screen identification is still a heuristic
and has NOT been calibrated against this user's screen, night mode, calls,
notifications or display geometry. Do not call this ready to drive with.

`runner.js` defaults to observation only (no HUD layer). `--display` enables the
experimental HUD adapter. It needs the car's `winston-grabber`, SOME/IP binding,
CarPlayManager 0.5 interface, and cluster-render. No firmware changes or route
commands. No service is installed; no automatic launch configuration has been
published. In a real installation a boot service would run this before CarPlay
connects. Capturing the current screen is fundamentally insufficient when
CarPlay is hidden behind BMW menus.

The controller rejects captures completed after screen ownership changes,
disconnection or independent-map startup. It hides on stale captures and stale
renderer status, and requires positive foreground ownership before capture.
Private temporary screenshots are deleted after each read. Nothing is uploaded.
The current experimental 416x292 rectangle needs physical HUD verification;
it is not integrated with the existing app's size/position controls yet.

Tests: `node test/controller.test.js`. These establish state transitions with
synthetic input, not Apple Maps output, Dashboard recognition, or car rendering.

Reference producer: isaakbruno2/carplay-map-cluster. Its color/layout classifier
and image code remain in `vendor/capture_image.js` under MPL-2.0. The renderer
client is Robert Nisipeanu's MPL-2.0 `cluster_render_client.js` from the working
HUD fork. Their notices are preserved. New prototype files are MPL-2.0.

https://github.com/isaakbruno2/carplay-map-cluster
https://github.com/eroobeeroo/idrive-apps
https://www.mozilla.org/en-US/MPL/2.0/
