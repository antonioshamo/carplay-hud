# Combined vehicle session — deferred, not completed

The owner asked to finish and publish the work that can be validated locally,
then collect all vehicle-dependent work in one later session. No car access or
physical validation was available for 0.4.120 / Studio 0.1.3 / map tool 0.7.114.

| Requirement | Built now | Evidence needed from the car |
|---|---|---|
| Startup animations | X4 M fly-in/shine/reveal, Apple-to-CarPlay Ultra, Antonio welcome, timing/on-off, previews and saved choices | Vehicle condition transitions across unlock, ignition, stop, sleep, wake and service restart; verify once per startup and no repeat on settings changes |
| Chosen gauges remain after animation | Preview handoff and persistent center-area layout; temporary full-panel test | Confirm warning/telltale priority and fresh telemetry before enabling full-panel persistent output |
| Global default restore | Persist suppression, disable both startups, drop Studio layers, restore map-patch regions, acknowledged result, restart/partial-failure reporting | Confirm native HUD, cluster and CarPlay return after a restart; repeat after tool update; document installed-software remnants rather than claim undetectability |
| CarPlay connection launches HUD without a route | Existing Dashboard capture experiment; no navigation-required flag fabricated | Capture connection events, independent stream availability, foreground behavior and Dashboard geometry; repeat without starting a route |
| Interior lights | Read-only feature scanner and phone-downloadable schema report; no vehicle writes | Read firmware interface catalog at `/etc/oap/someip/someip-interfaces.json`; identify exact lighting fields, getters/setters/enums and zone availability; read and preserve baseline before any supported setter |
| YouTube / TikTok / Instagram | Local saved clips and direct CORS-enabled HTTPS video links; native social/Prime apps remain unavailable | Check parked-video/AirPlay capability, native browser/player availability, authenticated playback and source restrictions; identify capture/decoder/audio/input path before building the media placement editor |
| Drag media to main display / cluster / HUD | Parked clip relay with cluster/HUD move/size controls and center-screen movie view | Verify actual source playback and target ownership; confirm placement and shutdown gates; drag-to-place video windows and saved media layouts are not implemented |

## Session order

1. Record installed versions, head-unit firmware and display targets. Read only;
   do not publish VINs, credentials, private catalogs or account tokens.
2. Save current settings and verify the default-restore path first.
3. Check speed/gear/condition/RPM/temperatures against the factory display while parked.
4. Check ignition and CarPlay events together, with no route active, then one route.
5. Inspect lighting capabilities and baseline, including ambient/contour, footwell,
   door/console, dimming, welcome and reading-light controls only where supported.
   No guessed RGB values, service IDs or diagnostic writes.
6. Verify parked media sources on the center screen before projection to another
   screen. Social websites may restrict embeds, playback, sign-in or mirroring.
   Do not assume a renderer supplies a browser or a video entitlement.
7. Full-cluster tests remain bounded and parked until factory warnings are verified.
   `panel` and `hud` share a scene in this renderer and cannot be assumed simultaneous.
8. Test disconnect/reconnect, stale data, sleep/wake and restoration together.

## Primary research

- [BMW ambient-light settings](https://faq.bmwusa.com/s/article/FAQ-How-do-I-turn-on-and-adjust-the-ambient-lighting-in-my-BMW-0iLTV?language=en_US)
- [BMW X3/X4 lighting description](https://www.press.bmwgroup.com/usa/article/detail/T0334902EN_US/the-new-bmw-x3-and-the-new-bmw-x4)
- [Apple CarPlay and parked video](https://developer.apple.com/carplay/)
- [Apple video app compatibility](https://developer.apple.com/videos/play/wwdc2026/212/)
- [Aston Martin CarPlay Ultra visual reference](https://www.apple.com/newsroom/2025/05/carplay-ultra-the-next-generation-of-carplay-begins-rolling-out-today/)

Apple's parked-video support applies to compatible vehicles and supported apps.
It is not evidence that this BMW iDrive 7 unit supports it, nor that TikTok or
Instagram will run as native car apps. That remains to be established.
