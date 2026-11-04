# HUD startup investigation

Independent route-free secondary-stream startup remains unproven. The optional
Dashboard mirroring trial in tool 0.7.112 uses no route event, but needs the map
visible on the center screen. App 0.4.114 exposes its opt-in and Off controls.
See [current trial documentation](../../native/waze-on-cluster/startup/README.md).
No hardware or BMW emulator validation is claimed. GitHub Releases records
publication separately from this research document.

## Required behavior

After a fresh CarPlay connection, Apple Maps supplies a live map to the HUD
without any route having been started in that session. HUD is the preferred
output. The cluster is optional. A map after starting and cancelling a route
is not acceptance evidence. A cached still image is not a live map.

The user confirmed that resizing and movement work after replacing the
incompatible tool with the HUD fork. Do not repeat the earlier downgrade
instructions or change the working backend just to redesign the settings.

## Inspected baseline

- eroobeeroo/idrive-apps tag waze-on-cluster@0.7.111,
  d7ab09f53f32ff100aa9623342a0de02fd630ce6.
- Tool 0.7.111; UI 0.4.113. Local UI revision 0.4.114.
- Subsequent local settings work adds native appearance controls in tool
  0.7.112; see [settings review](SETTINGS.md). CarPlay patch bytes and startup
  behavior are unchanged.
- App source package builds with the repository's source packer. No BMW SDK,
  firmware, private photos, videos, locations or credentials are bundled.

## Findings and evidence boundaries

1. **HUD preference already persists in the tool.** The app sends `start` to
   the renderer and `target` to patchd. Patchd writes `target = hud` into the
   local config and remembers it for the current driver profile. The service
   starts at boot and reads that config. The native target test passes 13/13,
   and profile-sync tests pass 5/5. These tests do not prove a car restart.

2. **Opening the settings app is not the map source.** The renderer captures
   CarPlay's alternate video stream. Neither moving it to HUD nor repeatedly
   sending `start target=hud` asks Apple Maps to draw a new scene.

3. **The existing self-start hook depends on an event.**
   `native/waze-on-cluster/patch/PATCH.md`, Edit 3, describes retargeting
   `AlternateDisplays::onSuggestUi` from `setStreamStatus(AVAILABLE)` to
   `requestStream()`. That method calls Cinemo ShowUI and ForceKeyframe with
   constants supplied by CarPlayConstantsRepository, then marks streaming.
   It is guarded to run once per session. Whether this car receives the
   required suggestion before a route, and which URL it requests, is unknown.
   The documented call can throw on error; do not invent or trial offsets.

4. **A persistent map-only scene is a supported research direction elsewhere.**
   DiPlay's developer documents an alternate display with
   `initialURL=maps:/car/instrumentcluster/map`; without it the developer
   observed a black frame. That is BYD evidence, not a BMW patch:
   https://github.com/Boring206/DiPlay-T8/blob/t8-api27/docs/BYD_NAVIGATION.md

   The Audi integration documents map-only versus map-and-card scenes,
   ShowUI selection and reapplication after stream readiness:
   https://github.com/luka-dev/mib2q-carplay-rgi/blob/main/docs/cluster-and-rgi/THIRD_PARTY_NAV_APPS.md

   Another implementation separates UI-context negotiation from the video
   transport; an established stream does not prove a selected map scene:
   https://github.com/harman-f/mhi2_altscreen_carplay/blob/main/docs/architecture/SCREENALT_CONTROL_PLANE.md

5. **The BMW no-route request is still open in the inspected public reports.**
   https://github.com/robertnisipeanu/idrive-apps/issues/21
   The latest reviewed comments also report duplicated BMW instructions.
   Hiding guidance in a cluster slot does not establish control of HUD
   guidance, and does not start a route-free map.

6. **Banner ownership is not proven by the supplied images/video.**
   A map-only scene can address phone-rendered cards. It cannot independently
   move a BMW-rendered HUD instruction, speed readout, or speed-limit sign.
   Existing HUD x/y/size commands move the captured map only. The native MPH
   and sign need separate identification and a supported interface before
   offering controls. Do not cover them with a black rectangle.

## Evidence needed from this car

- iOS version (asked asynchronously) and the exact head-unit CarPlay build.
- A bounded diagnostic capture beginning before a fresh CarPlay connection.
  First open Apple Maps without a route and wait. Record the visible map state
  and the corresponding ShowUI, instrumentcluster and stream-status markers.
  A separate route-start comparison can identify which event wakes the map;
  it is a diagnostic comparison, not the final startup workaround.
- The installed tool's patch socket supports `{"cmd":"logs"}`, returning
  recent marker, CarPlay, AVB and DLT health records. DLT marker capture must
  start before reconnection; the existing UI has Capture logs (5 min).
- The inspected MGU Store phone page only exports updater/uplink/fallback
  journals. It does not provide the Waze patch socket logs. Do not tell the
  user to download Waze startup logs from that page without adding and
  validating an actual export path.
- If changing advertisement/ShowUI construction requires binary inspection,
  obtain the user's own `/usr/bin/carplay` privately and inspect its build and
  references. Do not bundle firmware or reuse another build's offsets.

## Candidate decision tree

- No ShowUI before route, but available map-only capability: investigate the
  initial display scene and a bounded request after session readiness.
- ShowUI before route requests a root/card scene: investigate map-only scene
  selection without changing primary CarPlay UI or navigation ownership.
- Correct ShowUI, no picture: distinguish command timing, actual result,
  phone idle behavior and media transport. A blank/idle frame is not success.
- Picture reaches the receiver but HUD stays blank: investigate output target
  and renderer, not the iPhone scene.

Acceptance requires repeated fresh connections, head-unit restart, route end,
phone disconnect/reconnect and an idle interval. Confirm the display is live
and never leaves stale directions. Confirm existing HUD speed/warnings remain
readable. Retain a documented rollback to the currently working tool.

## Local UI revision

Home contains status, display destination, size, position, and Help & setup.
Separate native RHMI pages contain size, position, setup, capture, and logs.
The selected HUD destination is persisted through the existing tool protocol.
The UI never starts a route, patches firmware automatically, or changes the
current user's display destination merely by opening the app.

Settings are reported as applied and saved only after live renderer status and
matching persistence acknowledgement. Unsupported status fields disable the
controls. Missing acknowledgements expire with an explicit message; the UI
continues showing the renderer's actual value. No simulated percentage is
presented as a confirmed HUD change.

Passed locally: source package build; native page fixture navigation/lifecycle;
27 existing control cases; six settings scenarios using real local Unix
sockets and fake daemons; five profile cases; 13 native persistence checks.
The fixtures are not the BMW HMI emulator. Visual/native SDK validation and
physical testing remain outstanding.

## Further investigation and prepared diagnostics

The initial prototype in `experiments/hud-mirror` is retained as historical
research. Its maintained, packaged successor is `native/waze-on-cluster/startup`,
including the optional boot service. Independent secondary-screen startup still
requires physical evidence before a verified firmware/control-plane change.

`tools/hud-research/startup-snapshot.js` is a read-only head-unit diagnostic
reader for the existing patch socket and bounded status files. It returns a
CarPlay executable fingerprint, not the executable itself. Output may include
private navigation logs and must stay outside the repository. It neither
starts logging nor starts navigation. Use the installed app's existing bounded
capture control before reconnecting, then run the reader over private SSH.
Its synthetic socket checks cover reply framing, size limits, timeouts and
refusal to send a non-read-only command. These are not car validation.

`tools/hud-research/scene-probe.js` can inspect a private copy of the user's own
CarPlay executable offline. It reports known scene constants and candidate
references only; it does not identify safe patch sites or modify the binary.

The previously configured head-unit SSH address was not reachable from this
Mac during this investigation. A possible phone-assisted connection is the
Tailscale app/tool from https://github.com/IterioDev/car-apps . Its README says
iDrive 7 is build-tested, not car-tested. User approval and actual connectivity
are pending; no Tailscale login, device enrollment or installation has occurred.
An ENET connection to the Mac remains another way to obtain the evidence.

Do not release the UI package or mirror as a completed route-free startup fix.
