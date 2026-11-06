# Cluster Studio

See the [user guide, capabilities and limitations](../../docs/cluster-studio/README.md).

This Node 8 tool runs at head-unit startup. State is stored at
`/var/opt/cluster-studio/studio.json`; the group-restricted control socket is
`/run/cluster-studio/control.sock`. Default output is off. Version 0.1.4 constructs five read-only SOME/IP field definitions from the unit's own catalog. It subscribes to notifier-only Park and ignition data as well as polling supported getters; optional fields do not expand the app's installation interface manifest. Version 0.1.11 checks for changed gauge drawing every 50 ms (20 Hz cap), with independent 100 ms speed/RPM getters and 500 ms slower getters. Notifications are accepted immediately. Cached drawing prefixes and exact changed-band uploads avoid repainting unchanged artwork; welcome
motion and expiry run in the renderer. Version 0.1.9 adds saved full-cluster output while parked, using the accepted native gear clearance [1380,660,1520,720] and opaque side-only shading. Fresh speed 0, gear P, supported geometry and idle HUD are required; leaving Park or stale telemetry releases the panel. BMW gauges provide driving warnings. Raw full-panel video stays blocked. Removing the tool stops its service and releases its layers.

Version 0.1.11 retains an existing panel when the HUD is only queued behind its shared scene. A genuinely active HUD still blocks that panel. Gauge edits update the current image; saving a design slot no longer releases it. The gauge overlay requests foreground contention through the existing renderer, but does not enable forced stock-content unmapping or alter scene IDs, display locks, the Park gate or native P clearance. See [validation and limits](../../docs/cluster-studio/GAUGE-STABILITY-0.1.11.md).

The paired phone designer is an explicit five-minute parked session. It supports personal names, widget colors and geometry, validated JSON import/export, and the five saved designs. It does not suspend active gauge output. New design fields default safely when loading older saved designs.

Version 0.1.14 retains an existing gauge layer across HUD stock-pop-up waits. Renderer 0.3.103 keeps its published scene reserved while that layer still wants to resume after a BMW interruption. See [recovery validation and the remaining HUD conflict](../../docs/cluster-studio/CALL-RECOVERY-0.1.14.md).
