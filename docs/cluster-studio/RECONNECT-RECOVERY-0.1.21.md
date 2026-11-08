# HUD reconnect recovery 0.1.21

The owner reports the Apple Maps HUD picture flashing. The cause of this new
incident is not confirmed: there is no current car connection or fresh trace.

The previously captured `post-restart-observe.jsonl` contains 59 samples: 57
reported `starting` with `not rendered: the renderer is not subscribed`, and two
reported `showing`. Its renderer journal confirms mapping acknowledgements
followed about 1.5 seconds later by unmap/refetch attempts. A restart of our
renderer restored output in the separate captured recovery run. That is evidence
of one failure mechanism, not proof that every flashing incident has that cause.

## Corrected recovery gap

The former recovery stopped monitoring after 180 seconds of head-unit uptime.
A delayed CarPlay connection, or a failed reconnect later in the session, could
therefore miss it entirely. The exclusive once-per-boot recovery now responds
to the same exact missing-subscription condition regardless of uptime:

- Wait at least 15 seconds of repeated failure. Brief mapping acknowledgements
  do not count as lasting recovery; 10 seconds of stable output clears it.
- Require a ready renderer, confirmed independent HUD/panel mapping, and fresh
  stationary/Park telemetry. Losing any prerequisite resets the countdown.
- Write the exclusive /run marker before restarting only cluster-render.service.
  A helper restart cannot trigger a second recovery during the same boot.
- No recovery for stock popups, foreign ownership, blank phone frames, idle
  streams, other error messages or unavailable renderers.

Fresh Park is required for this repair because restarting the shared custom
renderer briefly interrupts both custom outputs. It does not restrict ordinary
HUD display in Drive. CarPlay, BMW services and the head unit are not restarted.
Saved gauge designs, native gear clearance, map size and position are unchanged.

Host regressions cover late connection, failure across the old cutoff, normal
startup, stable recovery, interrupted/stale Park, other ownership, marker denial,
invalid uptime and clock rollback. This update does not establish that the
owner's latest flashing is resolved in the car. The next capture must distinguish
only-map blinking from the whole HUD, then correlate visibility with stream,
renderer subscription and stock-popup events.
