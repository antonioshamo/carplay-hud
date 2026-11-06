# Saved display recovery — app 0.4.138 / helper 0.1.15

The user reported full-cluster output disappearing, the center image flashing, and disabled full-cluster controls. Their photo showed `Saved · Renderer: waiting`. They requested offline work; no connection or display change was made to the car for this update.

## Reproduced software defects

- A current-layer renderer rejection discarded the layer and recreated it on the next 34 ms drawing tick. The new regression fails on the prior helper because the layer immediately reappears. Recovery now waits two seconds, then five seconds, and stops automatically after the third rejection. An explicit Retry resumes the saved output. Live saves cannot reset that limit.
- Renderer `layer:error` reports were ignored. They now follow the same bounded recovery path. Failures of optional welcome assets end only the welcome; they do not discard healthy gauges. Failure of the gauge safety lease still releases the gauge layer.
- The saved full-cluster control was tied to `canPreview`, so HUD contention disabled saving a full-cluster choice. It now has separate eligibility: fresh Park, supported geometry, connected renderer and accepted clearance. Saving the choice does not claim the display is already visible or take the scene from HUD.
- The app labeled any prepared panel layer as full-cluster output even while waiting. Visibility now requires both the current layer and target to be reported shown. Exact refusal/wait reasons and the selected saved output are exposed separately.

Three unexplained shown-to-waiting mapping losses within a minute also pause the Studio layer. The helper waits one second for the renderer's ownership classification before counting a loss. Stock calls/dialogs, foreign ownership and display locks are excluded. The native renderer remains responsible for normal slot retries; the helper retains the same layer through those interruptions.

## User controls

`In the car` now includes **Save full cluster in Park**, **Use center layout**, **Restore BMW display**, and **Retry saved display**. Retry requires fresh Park and a connected renderer, does not turn a disabled layout back on, and leaves unsaved editor drafts alone. Temporary tests remain separate and expire. Saved output never falls back to center automatically.

Native P clearance, side shading, telemetry freshness, Park gating, speed/RPM processing, scene IDs, BMW display locks and stock-content takeover settings are unchanged.

## Verification and limits

`test_recovery.js` covers bounded refusals, repeated mapping loss, late old-reference errors, stock classification, saved state, explicit recovery, visibility and movement. `test_renderer_integration.js` uses the actual C++ renderer service and JavaScript protocol clients with fake vehicle/display backends: changing readings, center-to-panel switching, HUD occupation/release, BMW interruption/release, queued HUD, movement, renderer restart and factory restore. The existing stability and editor suites cover repeated calls, slots, edits, reconnects and control layout.

This is an offline recovery fix, not proof of the cause of the user's latest physical-car incident. The normal offline protocol replay did not reproduce spontaneous flashing. A future vehicle check must capture the installed versions, selected output, fresh Park data, layer/target status and exact renderer reason if the issue recurs.

HUD and full panel still share scene `0x01000400`; simultaneous operation is not enabled. If HUD owns it, the selected full-cluster design waits and remains saved. Do not disable scene arbitration or alter the accepted P mask to work around that limitation.
