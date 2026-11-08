# Map-only flicker investigation and bounded blank-frame handling

The owner confirmed that only Apple Maps blinks; BMW's speed display stays on.
They also confirmed Cluster Studio 0.1.21 did not resolve the symptom. No fresh
vehicle trace was available for this change. The current physical cause remains
unconfirmed; no claim of in-car resolution is made.

## Reproduced code issue

The map loop immediately set `picture_ready = !blank` on each decoded frame.
One blank transition therefore hid the layer. A subsequent real picture made it
visible again. This is independent of the older missing-renderer-subscription
failure addressed by the helper's once-per-boot recovery.

`PictureGate` retains an already visible real picture for at most 250 ms from
the first blank frame. More blank frames cannot extend this deadline. A good
picture within that interval replaces it normally without a visibility toggle.
The main poll wakes at the deadline even if video stops after the blank frame.
Blank startup cannot acquire a display; sustained blanks clear the picture.
Observed disconnect, freeze, factory-default mode and backward clock changes
clear eligibility. Reconnection needs a newly decoded real frame. No blank
image is uploaded. Existing stream liveness, video-stall handling, stock-dialog
arbitration, map scene identity and automatic startup settings are unchanged.

`stream.json` now also reports `picture_state`, `brief_blanks_bridged` and
`blank_expiries`. These are additive; patchd still reads `keyframe_wait_ms`.
They contain no map image, destination, device identifier or location.

## Verification

- Gate regression: blank startup, 101 short transitions, sustained blank with
  no following frame, non-extending deadline, static good picture, disconnect,
  freeze and invalid/backward time.
- Actual map-feed/renderer service integration over local test sockets: twenty
  short blank transitions without hiding or remapping, sustained blank hidden,
  and no stale picture revived by reconnection.
- Existing map-tool host suite and 32 app/helper scripts passed locally. Some
  firmware-specific restore checks skip when a carplay firmware binary is not
  available; this is not a full physical-vehicle test.
- Release requires Linux/x86 tests, target ABI validation and a reproducible
  artifact check before publication. Record the actual CI outcome separately.

The new factory-personal study is an offline preview, excluded from vehicle
packages. Nothing in this change enables full-panel replacement while driving,
suppresses a BMW warning, changes an assistance state or recolors native dials.
