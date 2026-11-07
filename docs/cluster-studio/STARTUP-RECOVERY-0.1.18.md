# Bounded renderer startup recovery

After the separate-display configuration was installed, the normal services
reported the full custom panel and independent HUD map shown for 59 consecutive
one-second samples, with live idle RPM and no route. The owner subsequently
confirmed both displays were visible and clear.

A normal head-unit restart reproduced a distinct boot failure: the HUD scene
was mapped, but RAMSES did not report a renderer subscription. The existing
unmap/fetch retry ladder did not resolve it. Restarting only the custom
cluster-render service restored both outputs without another head-unit restart.

Cluster Studio 0.1.18 adds one bounded recovery for that exact condition. It
requires an explicitly confirmed independent panel/HUD mapping and at least
15 seconds of the missing-subscription failure during the first three minutes
of boot. A short mapped acknowledgement does not erase the failure; ten seconds
of stable output does. Stock dialogs, foreign ownership, unavailable renderers,
shared mappings and other error messages cannot trigger it.

An exclusive root-owned marker in /run is written before the restart, so a helper
restart cannot repeat it in the same boot. It uses systemctl try-restart only on
cluster-render.service. It does not restart CarPlay, BMW's display services or
the head unit. The HUD recovery has no gear dependency. Full-panel Park checks,
the native P clearance and the factory-warning fallback are unchanged.

Regression tests cover the exact trigger, boot deadline, stable recovery,
intervening acknowledgements, denied/duplicate markers, stock/foreign ownership,
invalid capabilities and clock rollback. Physical startup verification remains
a separate check from these tests.
