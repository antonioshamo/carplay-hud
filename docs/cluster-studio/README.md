# Cluster Studio 0.1.0 / CarPlay HUD 0.4.117

A full-cluster visual designer for Antonio's X4 M Competition, integrated into
**CarPlay HUD → Overview → Cluster Studio**. Install the Cluster Studio tool
alongside the app. All screenshots below are generated from the actual UI drawing
code with sample readings; they are not photographs of a running car.

![Arrange widgets](previews/edit.png)

## What you can customize

- 100 preset combinations: ten layouts × ten palettes. Includes **Ultra inspired**,
  M Competition, Grand touring, Minimal, Panorama, Driver focus, Technical,
  Night drive, Symmetry and Track paddock. These are not 100 independent features.
- Twelve movable elements: speed, RPM, gear, clock, date, X4 M Competition badge,
  checkered flag, coolant, oil temperature, M-color stripes, signature and data status.
- Touch dragging; dial-accessible select/left/right/up/down controls; size, visibility,
  stacking, 1% snapping, and 30-step undo. Every widget stays within the canvas.
- Three gauge treatments, ten palettes, three backgrounds, widget cards, mph/km/h,
  12/24-hour time and five signature choices.
- Five personal templates saved on the head unit. Loading a template makes a draft;
  **Apply center layout** or **Save** is explicit. Save confirmations come from the helper.
- A three-second X4 M Competition/checkered flag welcome, with slide/reveal/static
  choices. It requires a fresh vehicle-ready state and speed 0 / gear P, runs in the
  center area, and works without leaving the settings app open. It is opt-in; a
  vehicle that does not expose the required fields will not trigger it. It is not a
  replacement for the earliest firmware boot logo.

![Welcome](previews/intro.png)

## Actual output modes

| Mode | What happens |
|---|---|
| App design preview | Entire 1920 × 720 layout, sample readings, touch/dial editing. |
| Use center layout | Layout scaled into the 1088 × 480 center area **under** factory gauges. Persists across service starts. Can replace/cover the center map; transparent background is available. HUD uses a different target. |
| Full-cluster test | A manual, maximum 10-second drawing over the entire cluster. Fresh speed below 0.1 km/h and gear P are required. Unknown or active HUD blocks it. Stops when movement, non-P or stale data is observed. Not enabled at boot or saved as a driving mode. |
| Restore standard map area | Removes Studio's output and disables the Studio welcome. Existing CarPlay tool settings remain independent. |

The helper never sends sample readings to the car. Missing/invalid/stale vehicle
values display a dash; no inferred gear, simulated fuel, warning icons or guessed
speed. Freshness is two seconds. Full-screen tests additionally carry a renderer-side
expiry animation, so a blocked helper cannot indefinitely leave that test visible.
This is not a safety-certified instrument display or a verified replacement for BMW's gauges.

## Deep-dive findings

The [renderer implementation](../../native/cluster-render/README.md#arbitration)
really exposes a full-screen `panel` target: slot 0x203, 1920 × 720, **over** the gauges.
The `map` target is 0x100, 1088 × 480, under them. This means whole-cluster custom
artwork is technically supported; it does not expose setters for moving BMW's
individual speedometer, warning lights, fuel gauge or driver-assistance graphics.
The replacement gauges here are drawn by Studio.

`panel` and `hud` share scene ID 0x01000400 in this ID7 setup. They cannot both be
requested at once. Studio observes all target events and refuses/cancels a panel
test while HUD ownership is unknown or non-idle. It does not change scene IDs,
force the HUD off, steal another app's content, or patch cluster firmware.

The renderer documents tested door-warning lock behavior for **map slot 0x100**.
That is not evidence that all warnings/telltales remain visible over a custom
**panel**. The full-screen mode is therefore a parked test, not persistent driving
output. Before expanding it, physical validation must cover: warning priority,
seatbelt/airbag/ABS/brake/engine lights, turn indicators, driver-assistance alerts,
gear changes, signal loss, renderer loss, head-unit sleep/wake, and factory display
restoration. These have not been observed on this car in this release.

Read-only telemetry uses installer-generated SOME/IP interface definitions from
this app's own `someipInterfaces`, discovered by its exact package ID. Field
scaling follows the public [vehicle-data adapter](https://github.com/cauliflowermossgrape/idrive7-apps/blob/main/kit/runtime/car.js):
Vehicle2.statusCarSpeed2, VehicleInformation.statusGearboxDrive,
VehicleCondition.VehicleCondition, CDS.statusEngineSpeed2 and
CDS.statusEngineTemperature. No setters or diagnostic service calls are used.
The first physical test must confirm these definitions/instance IDs on this head unit.

**Ultra inspired** is a local visual template. It does not install Apple's CarPlay
Ultra, obtain new iPhone streams, or implement Apple's automaker integration.
Apple describes that separate integration in its
[CarPlay architecture presentation](https://developer.apple.com/videos/play/wwdc2024/10111/).
The existing route-free Dashboard experiment is unchanged by this release.

## Build and validation

`node native/cluster-studio/test/test.js` tests fresh/stale/invalid data, Park gates,
HUD conflict, renderer disconnect, expiry, startup and persistent storage.
`node apps/robertn_waze_cluster/tools/test_studio.js` tests 100 templates, bounds,
drag/undo, UI pages and actual Unix-socket save/apply/rejection behavior.
`test_design.js` also drives Studio through the real graphical client's touch wire.
`preview_studio.js` renders the actual graphics for inspection.

The helper copies the shared model/drawing/font modules from the app in `build.js`.
The generated `native/cluster-studio/shared` tree is tracked: regenerate it and bump
the tool version whenever those shared sources change. Bundles include GPL, MIT,
MPL and Inter font license texts. No proprietary SDK or vehicle data is published.

Local and CI validation is distinct from physical installation and in-car validation.
