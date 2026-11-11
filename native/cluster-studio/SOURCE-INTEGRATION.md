# Source cluster replacement

This is a modified integration, not an official build from any upstream author.
The prior custom bitmap cluster and its startup animation have been removed.
One cluster service owns the imported layouts. No upstream app launcher,
autostart service, HUD bridge or map-routing controller is installed alongside it.

## Imported source

The packaged source is pinned in `vendor/cluster-layouts/UPSTREAM.json`:
[Cluster Layouts](https://github.com/eroobeeroo/idrive7-cluster-info), commit
`a39ce37273409cb46ffff8e858c2b8a1a0710f66`, version 0.28.1 under GPL-3.0-or-later.
This snapshot precedes the later license-only change. Its M, Sport and GT3
layouts include credited MIT source and designs from
[Bimmer-lab](https://github.com/bimmer-lab/apps). All GPL, MIT and font notices
are distributed in `vendor/cluster-layouts/LICENSE` and `NOTICE`.

The twelve selectable layouts are M, Sport, GT3, Classic M, Analog sport,
Digital round, Modern wide, Digital dash, Retro, Track, Pulse and Freedom.
Each has three rendered palette pictures. They share the source GPU/SDF text
engine, 60 Hz update scheduling and 10 ms needle easing. This is a scheduling
target, not a measured frame-rate claim for the X4 M. Fresh vehicle events and
the existing independent 50 ms speed/RPM polling feed the engine.

## Other sources reviewed, not merged indiscriminately

| Project | Reviewed revision | Decision |
| --- | --- | --- |
| Bimmer-lab/apps | e212b4cb8dc09eec9d2ad5e806e949ec0a0a12da | M, Sport and GT3 are included through the attributed GPU adaptation. Its separate HUD/map coordinator is excluded. Additional full-center layouts need a clearance adaptation before inclusion. |
| ALMSTRA/idv7lol | 01c97f3 | Desktop editor and separate compiled-theme runtime; README explicitly says the car app has only been tested with a fake renderer. Its community set overlaps the imported layouts. No second runtime or unsupported signal bindings are shipped. |
| cruzen991/Cluster | d2db98e | Arc/Tech use another engine and version-dependent preloaded layers. Those cannot simply be stacked onto the existing eight-layer renderer budget. |
| markoni1408/mgu-e39-m5-cluster | d20217f | Different drawing pipeline. The startup's fixed “CHECK CONTROL OK” is not a measured diagnostic result and is not imported. |
| PenguinDukeYDAuto/idrive7-EVAHUD | 1a37b31 | Combined HUD/cluster ownership modes, missing/excluded font assets and separate artwork licensing need resolution. Its HUD code is outside this change. |

Repository publication, screenshots and an author's tests are not proof that
every feature works on this X4 M. Only compatible source is integrated; this
release does not claim to contain every theme from every repository above.

## Adaptations and conflict prevention

- Small source shaders are packed into at most four native meshes. Each mesh
  has at most sixteen parts and sixteen animations, including expiry leases.
  Four old plus four replacement meshes fit the unchanged eight-layer limit.
- Old scenes are removed before their font textures. Theme changes cannot
  delete a texture still sampled by the previous scene.
- The source startup sweep is optional, runs once per process in Park, and is
  cancelled on leaving Park. Live gauge output and customization do not check
  Park. Startup cancellation restores the latest value immediately.
- Source-owned pixels exclude the BMW center, camera opening and bottom
  warning/gear strip. Native OEM display ownership rules remain unchanged.
  An OEM popup can still take priority; software resumes after it releases.
- No assistance engagement, lane objects or diagnostic status is fabricated.
  Four configurable footer readings use the existing verified signal decoders;
  unavailable readings show `--`. Fuel uses percentage with a 65-litre X4 M
  tank setting. Calculated power is explicitly labelled.
- The old phone designer and both activation routes are removed. Saved layouts
  use schema 2. Exact schema-1 bytes are backed up before a durable migration;
  old enabled/startup flags and old geometry are not imported. The first launch
  leaves BMW gauges active until the user enables a source theme.
- HUD source, startup recovery, map tool and renderer configuration are
  unchanged. The cluster observes the existing independent-resource capability
  and yields when the resource cannot be shared.

## Verification boundaries

`test_source_cluster.js` exercises every theme/palette, migration, startup and
Drive states, limits, three switch passes, stale-data fallback and cleanup.
`test_source_transport.js` uses the actual native renderer service and client
over a Unix socket, with fake BMW display backends. It exercises 24 switches,
startup cancellation, popup release, reconnect, stale-data fallback and an
independent simulated HUD. It verifies protocol behavior, not physical output.

`tools/render_source.js` compiles the actual part shaders in WebGL, renders all
36 variants, rejects black/failed scenes, verifies the reserved strip stays
transparent and generates the packaged gallery pictures. Menu previews replay
the real drawing command stream. CI additionally replays through mgu-render
0.6.15. No screenshot here is a photograph of the replacement in a vehicle.

Physical X4 M startup, Drive behavior, warning visibility, assistance geometry,
GPU load and coexistence with the real HUD remain unverified. The menu labels
this explicitly. Do not describe offline passing tests as vehicle validation.
