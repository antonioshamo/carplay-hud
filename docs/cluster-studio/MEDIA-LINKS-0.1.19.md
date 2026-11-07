# Media link feedback, 0.1.19

Website links previously left an empty player with Send enabled. The phone page now distinguishes common website players, clears the previous source on every new selection, and enables sending only after decoded video pixels can be read. Generic direct HTTPS URLs (including extensionless URLs and browser-supported streams) are still attempted; format, CORS, protected playback and timeout failures disable sending and explain the limitation. The optional website link opens on the phone only and never claims to cast the website.

This is not universal streaming-service playback. YouTube iframe players cannot be captured by this canvas sender; Prime Video requires its supported browser/app. No DRM, CORS or vehicle safeguards are bypassed.

Validation: all app and helper tests and release contract checks passed. The new client tests cover website URLs, unsafe URLs, readiness, source replacement, timeout, DRM, CORS and Start races. A generated local MP4 passed decoded readiness and frame sending through the actual browser UI against a localhost fixture. This is not a phone-to-car playback acceptance test.

Vehicle inspection found none of the checked general browser/player binaries installed. This negative inventory is limited to the checked locations, not proof that arbitrary software could never be added.

The included 0.1.18 startup recovery was installed and exercised by a normal head-unit restart. A once-per-boot marker recorded its automatic action. All 59 subsequent one-second samples reported full-panel visibility and a showing independent HUD map with guidance inactive. Earlier physical confirmation covered both displays. One successful restart is not proof of every future startup.

References:
- https://developers.google.com/youtube/iframe_api_reference
- https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image
- https://www.primevideo.com/help?nodeId=GUX9FYHU5D8LC9EJ
