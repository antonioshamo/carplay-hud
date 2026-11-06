# Gauge continuity and refresh — Cluster Studio 0.1.11

This update was developed and tested offline. It does not establish BMW-equivalent refresh speed or confirm that every vehicle-side switch to the factory gauges is resolved.

## What changed

- Existing full-cluster gauges no longer release their scene when HUD is merely waiting for that same scene ID. Actual HUD ownership still requires release; this renderer cannot show both targets under one scene ID simultaneously.
- Applying or saving edits updates the current gauge image without unmapping it. Saving a design slot leaves the active layout and any timed test alone.
- Delayed errors for retired/unrelated layer references no longer remove the current gauge layer.
- Gauges use the renderer's foreground contention policy, with bounded existing retries. `panel_take_over_stock` remains disabled. No firmware replacement, scene-ID patch or forced unmapping of factory content is included.
- The one-frame-per-second limit is replaced with a 20 Hz drawing/upload cap. Unchanged drawing commands are cached in painter order, so arbitrary widget overlap stays correct. Only changed pixel bands are uploaded.
- Supported speed/RPM getters run independently at up to 10 Hz; slower getters use 500 ms spacing. Notifications can arrive faster and are used directly. A slow sensor request cannot stall other fields. A delayed getter cannot overwrite a newer notification. The displayed numbers are measured values, not fabricated/interpolated samples.

## Preserved behavior

Full-cluster output is still Park-only and requires fresh zero speed and P. Stale data, movement, reverse, renderer disconnection and real shared-scene conflicts still restore factory output. The 1.5-second renderer-side expiry is unchanged. The accepted native gear opening `[1380,660,1520,720]` and side-only shading are unchanged. The saved layout remains persistent; 10/30/60-second tests remain explicitly timed.

No car connection was made for this update. The already-published Waze on cluster 0.7.115 map-startup code is unchanged. This update does not demonstrate simultaneous full-cluster custom gauges and HUD output.

## Evidence

The previous engine fails the queued-HUD regression; its sequential telemetry polling fails the slow-field regression. The fixed version passes a deterministic ten-minute continuity sequence, repeat applies and slot saves, scoped errors, reconnection, stale readings, movement and restore-to-default checks.

Pixel comparisons cover all 100 template combinations, center/full-panel output, changing and unavailable values, overlapping/reordered widgets, design changes and date changes. Cached output is byte-for-byte equal to the original full drawing. The accepted P opening is also checked pixel-by-pixel. Refresh tests deliver each new 50 ms RPM sample through the engine to the renderer interface, and unchanged readings cause no new bitmap traffic.

Existing telemetry, renderer arbitration, assistance, phone-editor, persistence, media isolation and delta reconstruction suites also pass. New cache, refresh, polling and continuity tests run with Node 8.16.2; the full helper suite runs with Node 22.12.0. New regression failures were reproduced against the old helper before applying the fix.

On the development Mac using Node 8.16.2, 50 measured updates of the accepted gauge design took a median 15.29 ms with full drawing versus 5.98 ms with cached drawing (including delta extraction); p95 was 17.48 versus 7.14 ms. These are host measurements, not car performance or end-to-end sensor latency. Firmware notification rate, getter latency, CPU load and renderer upload budget still limit physical refresh. OEM parity needs an on-car comparison.

Saved vehicle logs include intentional timed tests, helper restarts and panel/HUD handoffs. They do not prove the exact cause of the reported two-minute/ten-second cycle. This release fixes reproducible causes of unnecessary switching without disabling genuine fallback conditions.
