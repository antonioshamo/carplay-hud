# Cockpit 0.4.146 / Cluster Studio 0.1.24 review

This release reduces work before the first usable settings screen and fixes issues found during an offline regression review. It does not establish the actual launch time or physical HUD behavior in the vehicle.

## Changes

- Native home opens without queuing updates for thirteen unopened fallback pages or their log rows. Classic child pages are populated when requested; modern mode stops background native rendering.
- Working menu controls and a vector car placeholder are sent first. Detailed artwork follows the renderer acknowledgement, then stays cached.
- First-frame and first-present timing events are recorded for a later vehicle measurement.
- Tire pressure now respects kPa as well as bar and psi.
- Invalid fractional climate enum readings are unavailable instead of appearing valid.
- Unimplemented seat and rear climate pages explicitly distinguish missing command mappings from implemented commands awaiting in-car verification.

## Startup evidence

The same controlled SDK fixture queued 108 native component updates before graphics opened with published 0.4.145, and 13 with this release. These counts measure app work, not elapsed vehicle startup time. The initial frame contains no detailed bitmap; the artwork follows the first renderer acknowledgement.

A MacBook serialization probe measured 213,928 bytes for the usable first frame, 1,289,928 for the frame uploading the car artwork, and 9,908 for the cached frame. Host command-generation timings are not a prediction of the head unit's loading time.

## Regression evidence

All 44 commands in the serial local regression run passed, including renderer and map integration; every app test; every helper test; climate readback/timeout/serialization handling; profile and session coordination; phone media; assistance and factory-personal composition; startup failure injection; HUD diagnostics; and release tests. The startup matrix includes delayed/missing optional resources, fallback recovery and repeated entry. The cockpit check covers all 18 app destinations and Back, all eight implemented climate buttons, pending/stale/offline states, and ten repeated navigation/swipe cycles.

The preview generator rendered 331 images across 15 groups: all 103 cluster templates, dial styles, individual widgets, welcome stages, HUD settings/layout bounds, editor screens, and cockpit pages with fresh, pending, stale and offline data. All 331 PNGs passed signature, chunk CRC, dimensions, decompression and scanline checks. All 37 contact sheets were visually reviewed. These are offline code renders with sample values, not captures from the car.

## Remaining physical checks

Measure a cold app opening and repeat opening on the actual head unit, including first usable buttons and artwork arrival. Confirm implemented climate commands against physical behavior. Recheck the independent Apple Maps HUD stream and reconnect behavior. Vehicle signal availability, driving-assistance composition, actual refresh cadence and physical display masks cannot be established by offline tests. Existing factory indicator and motion safeguards remain in place.
