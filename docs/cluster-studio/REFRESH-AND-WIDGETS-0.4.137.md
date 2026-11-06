# Add widgets and faster readings — App 0.4.137 / Cluster Studio 0.1.14

Update cluster-render to 0.3.103, Cluster Studio to 0.1.14, and CarPlay HUD to 0.4.137. Waze on cluster remains 0.7.115.

## Arrange

Choose **Add widget**, pick an available type, then drag it or use the arrow/size controls. Types already in the layout are marked Added. There is one instance per supported type; this adds hidden types to the design without replacing the template or resetting their saved geometry. The new widget is unlocked, brought to the front and selected. Undo/Redo and live changes work as with other edits. Edit widget still selects existing or hidden elements. All 18 pages fit the installed 24-button RHMI contract.

## Refresh

- Supported speed/RPM getters: up to 20 Hz (50 ms), previously 10 Hz. Slower getters: up to 4 Hz (250 ms), previously 2 Hz. Notifications are accepted immediately. One bounded request per field, and newer notifications win over late getter responses.
- Every style uses the same 34 ms drawing interval and 30 fps renderer cap, previously 50 ms / 20 fps. This is a ceiling, not a measured on-car frame rate. Numbers are actual samples, never synthesized or interpolated.
- Unchanged rows are compared in native code before scanning pixels. Dirty bands are divided into left/right halves, so changing speed and RPM do not resend the unchanged center. At most 16 rectangles match the existing renderer protocol. Full resolution, alpha, overlaps and the accepted native P opening remain unchanged.
- Diagonal strokes limit scanning to their covered rows; 1,800 randomized strokes match a brute-force distance-field reference byte for byte.

## Local measurements

Node v8.16.2, macOS x64 runtime on the laptop. Full 1920x720 cached rendering plus delta preparation; speed, RPM and temperatures change in a deterministic sequence. Warm-up 10 frames; 35 measured frames per style. These results do not measure the head-unit CPU, compositor, vehicle data frequency, or equality with OEM gauge responsiveness.

| Design | Before median ms | After median ms | Before bytes/frame | After bytes/frame |
|---|---:|---:|---:|---:|
| ring | 7.844 | 4.775 | 325541 | 108592 |
| digital | 6.676 | 2.589 | 130599 | 52991 |
| bar | 8.986 | 5.854 | 186464 | 53824 |
| ultra | 8.000 | 4.273 | 493261 | 57316 |
| needle | 7.417 | 3.829 | 555683 | 130591 |
| segments | 6.914 | 3.073 | 121270 | 55250 |
| sweep | 6.592 | 2.749 | 124576 | 60847 |
| vertical | 6.119 | 2.474 | 102703 | 46728 |
| minimal | 7.123 | 3.506 | 371821 | 90465 |
| dots | 5.600 | 2.636 | 130640 | 57365 |
| id8 | 7.381 | 4.110 | 243780 | 105180 |
| id8-slim | 6.613 | 3.063 | 223551 | 94438 |
| id8-sport | 7.621 | 4.134 | 177485 | 108338 |
| id8-classic | 7.942 | 4.373 | 178968 | 110221 |
| id8-minimal | 6.692 | 2.877 | 137436 | 84357 |

## Verification and remaining car checks

Offline tests cover all 12 dial styles and three iDrive templates at the new cadence, both output sizes, real/latest numeric values, burst limits, stale values, Park expiry, no traffic on unchanged frames, pixel-exact delta reconstruction including odd sizes, 100-template cache parity, new-widget live saves and Undo/Redo, and real binary graphical touch packets for adding and dragging. App startup/entry, settings, profile sync, all helper suites, and native renderer arbitration are also release gates. The new runtime paths run under Node 8 as well as Node 22.

The [call-recovery fixes](CALL-RECOVERY-0.1.14.md) ship in the same update. A real call and OEM-speed comparison still require a parked-car check. Full-panel gauges and HUD still share scene 0x01000400; this update does not enable simultaneous full gauges and independent HUD. No alternate scene ID, movement gate, stock lock override, or factory-P coverage change is introduced. Back behavior is unchanged.
