# Separate full-cluster and HUD resources

Cluster Studio 0.1.17 and renderer 0.3.104 can retain the custom full panel while
an independent CarPlay map uses the HUD, when the installed renderer is explicitly
configured with different scene IDs and display slots for those targets.

The renderer now reports `independent_panel_hud` from its loaded target mapping.
The helper accepts only an explicit true value from the active connection. Older
renderers, omitted/malformed capabilities, and shared mappings retain the existing
HUD conflict gate. Reconnection clears the capability until the new hello arrives.
The settings app 0.4.140 shows which configuration is actually active.

No global scene-ID default changes are included. On the owner's ID7 car, a
bounded 45-second parked trial used panel slot 0x203 / scene 0x010004f0 and HUD
slot 0x323 / scene 0x01000400. Both IDs were already in the renderer's accepted
allowlist. The renderer reported both outputs shown for 40 consecutive samples,
with live RPM, no recovery failures, and navigation inactive. The trial restored
the original configuration automatically. This is device telemetry evidence;
physical appearance and phone-call behavior still require separate observation.

The accepted native-P opening, horizontal shading, fresh Park/speed checks,
factory-display restoration outside Park, stock-dialog arbitration and saved
layout are unchanged. A separate mapping does not validate road-ready replacement
of BMW's assistance and warning displays. No arbitrary scene IDs or forced
unmapping of factory content are enabled.

The default center-map target also uses 0x010004f0. With this per-car mapping,
center-map and full-panel outputs remain mutually exclusive; the HUD is separate
from either one. Local renderer configuration survives Store updates. Do not copy
this mapping to an untested car without a bounded parked trial and rollback.

Regression checks cover loaded-mapping capability truth tables, older clients,
reconnection, retained panel demand during HUD ownership, and movement fallback.
