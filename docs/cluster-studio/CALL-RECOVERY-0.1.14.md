# Call interruption recovery — Cluster Studio 0.1.14 / renderer 0.3.103

The user reported that their accepted full-cluster gauges reverted to BMW gauges during a call and did not return afterward. Waze on cluster 0.7.115 was installed and custom full-cluster gauges were active when the startup HUD map was missing. This update fixes two reproduced lifecycle failures. It has not been verified in the car.

## Recovery changes

1. Cluster Studio retains its existing gauge layer when the renderer says the HUD is waiting for a stock pop-up. That report means the HUD map is unmapped; it is not HUD ownership. Actual HUD ownership, unknown state and unexpected ownership still release the panel. A popup cannot authorize a new panel mapping.
2. The renderer reserves an already published scene for its target while that target still wants to resume after an interruption. A waiting HUD cannot steal a suspended panel's scene before the panel retries. Ending panel demand releases the reservation normally.

BMW dialogs and display locks remain under the renderer's existing arbitration. There is no forced stock-content unmapping. The saved design, drawing, native P clearance, side shading, Park gate, telemetry checks and welcome are unchanged. Back navigation is unchanged after the user confirmed it works.

## Startup limitation

The shipped full panel and HUD both use scene 0x01000400. Their simultaneous use remains unsupported. Waze on cluster 0.7.115 supplies the dedicated route-free map startup patch, but a full-panel scene can block its HUD target. This release deliberately does not relabel that conflict as fixed or mirror the main CarPlay screen.

The upstream renderer also restricts HUD to slot 0x323 / scene 0x01000400. A different panel scene requires a controlled parked-car test with rollback before shipping. No alternative scene mapping is enabled here.

## Validation

The new helper regression failed on 0.1.13 by deleting the gauge reference at the HUD popup event. The new native regression failed on 0.3.102 by letting HUD replace the suspended panel's published scene. Both pass after these changes. Tests cover repeated popup interruptions, preserved demand, resumption, explicit release to HUD, unknown ownership, stale telemetry, movement, reconnect and restoration. A real incoming call and simultaneous full-panel/HUD output still need separate vehicle verification.
