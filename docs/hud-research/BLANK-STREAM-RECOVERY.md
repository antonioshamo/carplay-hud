# Blank-stream display handoff

## Correction in map tool 0.7.116

The phone can send a decodable but blank secondary stream. The existing
freeze detector waits for sustained blank frames at a minimum frame rate.
When that rate drops, its freeze verdict clears. This tells a stopped stream
from a frozen one, but it is not evidence of a map picture.

Previously, a live connection and a cleared freeze verdict could make that
blank stream request the HUD scene and report `showing`. The full-panel
gauges currently share that scene ID, so an empty stream could also interfere
with their handoff.

The decoder now carries the blank classification with the exact pending
frame under the same lock. The display requires a non-blank decoded picture
in addition to a live, unfrozen stream. Empty frames keep decoding but do not
request a display. A lost connection clears picture readiness; reconnecting
alone cannot restore an old picture. A new non-blank frame resumes output.
The existing frame-freshness, warning-popup and Park checks remain in force.

## Evidence and limits

The vehicle reported blank pictures with zero changed frames both during
high-rate bursts and at roughly one frame per second. It nevertheless
reported `showing` at the lower rate. Temporarily releasing the custom gauges
did not produce a visible map, as confirmed by the owner.

A later failed scene fetch left the gauges waiting. Restarting only the
custom renderer recovered the gauge mapping without rebooting the head unit.
No automatic renderer-restart loop has been added.

Local fake-renderer tests cover blank startup, a freeze verdict clearing
after blank frames slow or stop, a real picture arriving, release after a
map becomes blank, and reconnect recovery. These checks establish the code's
display-demand behavior; they do not establish physical HUD visibility.

The dedicated-map patch was present in the running CarPlay binary. It does
not yet reliably obtain a useful no-route map. The full-panel and HUD targets
still share a scene ID and cannot render simultaneously in the current
configuration. No additional scene IDs or firmware patch offsets were tried.
This release is a blank-stream correction, not a completed startup repair.

Private captures, device identifiers, firmware and SDK files are excluded
from this repository. The correction needs an on-car reconnect check after
installation; the decoder normally needs the next stream's opening keyframe.
