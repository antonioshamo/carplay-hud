## 0.4.142

- Serialize driver-profile loading with manual HUD edits, startup changes and
  restoring BMW defaults, so they cannot overwrite each other in flight.
- Cancel delayed profile getters, replies and temporary renderer connections
  when stopped or timed out; prevent an old session from restarting polling.
- Add real-socket tests for background handoff and cancellation, and renderer
  integration tests for simultaneous separate HUD/cluster resources, native
  interruptions, saved design edits and reconnection.
- Require Waze on cluster 0.7.117, containing the bounded blank-frame repair.
  Tested offline; this does not establish physical-car startup or flicker fixes.

## 0.4.141

- Expand the library from 12 to 37 widgets with categories and paging: fuel,
  range, reserve, odometer, trip time, outside temperature, battery charge,
  torque, calculated power, engine/mode/sport readings and per-wheel tire data.
- Show fuel by default in every template and migrate saved designs without
  discarding existing widgets. Recenter untouched iDrive 8 coolant/oil pairs.
- Keep missing/expired readings unavailable and require reported tire units.
- Require Cluster Studio 0.1.20 and renderer 0.3.105 for queued-patch refresh
  improvements. Full-cluster output outside Park and intermittent HUD startup
  remain unresolved; this release does not claim to fix either behavior.

# 0.4.138

- Separate the saved full-cluster selection from temporary-test availability; show the selected output even when the renderer is waiting.
- Add Retry saved display without overwriting the design or changing the chosen output. Show renderer visibility and failure reasons instead of treating a prepared layer as visible.
- Requires Cluster Studio 0.1.15: bounded recovery for renderer rejections and repeated unexplained display losses, retaining saved layouts and native P clearance.
- Tested offline, including the real renderer protocol with simulated display hardware. The reported vehicle incident has not been reproduced in the car. Simultaneous HUD and full-cluster output remains unsupported.

# 0.4.137

- Arrange has Add widget, with available types, immediate positioning, Undo/Redo and live saving.
- Reduce diagonal line rasterization work without changing pixels.
- Requires Cluster Studio 0.1.14 for faster live readings and call recovery, plus cluster-render 0.3.103.
- Offline verified; simultaneous full cluster and HUD still need a separate parked display-resource test.

# 0.4.136

- Three editable iDrive 8-inspired templates: Sport, Classic and Minimal.
- Angular and minimal angular dial styles for speed or RPM, bringing the style picker to 12 choices.
- Template previews, saved template identity, and reset-widget support. Selecting a template keeps speed/temperature units and welcome preferences.
- Uses the existing live vehicle data pipeline; missing readings remain unavailable. Native gear-indicator clearance and the accepted side feather are unchanged.
- Requires Cluster Studio 0.1.13. Offline-tested; this build has not been checked in the car. Full-cluster output remains Park-only.

# 0.4.135

- Back and Apply stay in fixed top corners across modern settings and all designer pages; Back returns through editing history and leaves the root screen through the existing BMW RHMI close-state API.
- Live changes are on by default for an enabled, freshly confirmed parked layout. Edits coalesce, preserve the output choice, wait for save acknowledgements and keep newer drafts through delayed replies or disconnects. Turn Live changes off to edit before applying.
- Ten dial styles, independent speed/RPM styling, direct widget selection, drag positioning, separate dimensions, centering, layer order, locks, undo/redo, color themes and five saved slots.
- Paired phone designer gains a sticky Apply action and live saves. Saving no longer resets the selected widget. Imports remain reviewable drafts.
- Separate-map HUD startup shortcut keeps dashboard mirroring off and selects HUD. Requires Waze on cluster 0.7.115; route-free startup is supported on the previously verified CarPlay build.
- Requires Cluster Studio 0.1.12, including 0.1.11 continuity and refresh fixes. Full-cluster output remains Park-only and retains the accepted native P opening; active HUD ownership can defer it.
- Tested offline against simulated helper/renderer protocols, the captured SDK contract, Node 8, and browser phone controls. This release has not been physically retested in the car.

# 0.4.134

- Cluster Studio 0.1.9: save a full-cluster layout for Park, restore center output or BMW display explicitly, and retain the owner-approved M Competition layout as a selectable draft.
- Preserve the native gear indicator with the parked-tested fixed opening and opaque side-only background fades. GPU welcomes reserve the same opening. Fresh Park/speed and idle HUD are required; BMW gauges return when moving or telemetry becomes stale.
- Add detailed ring markings and read-only BMW assistance preferences. Active cruise, gap and lane warnings still use BMW's gauges.
- Preserve the modern-settings startup repair. Independent route-free HUD maps, driving full-cluster output and raw full-panel video are not enabled by this release.

# 0.4.133

- Expanded saved designs and phone customization with Cluster Studio 0.1.5.
- Re-arm welcome after the recorded BMW engine-off state and fresh zero RPM.
- Retain 0.4.131 modern-settings transition fix.
- Independent route-free maps and full factory-gauge replacement remain unverified.

## 0.4.132 — offline customization candidate

- My cockpit shortcuts to the cluster designer, welcome, saved designs, lighting discovery and parked media.
- Direct layout/theme/widget choices, independent size axes, centering, layer order, locks, redo, per-widget gauge/color and Fahrenheit/Celsius.
- Paired phone designer: personal names and welcome text, exact colors, drag/placement, validated import/export and five saved layouts.
- Requires Cluster Studio 0.1.4: reads the unit catalog directly, including notifier-only Park and ignition fields; handles ignition data arriving before Park.
- Retains 0.4.131's named-state loading fix. Independent map-only startup, native gauge replacement, lighting writes and DRM/web playback remain unresolved. Vehicle disconnected; physical validation pending.

## 0.4.131

- Address the 0.4.130 vehicle trace: graphics connected, but opening the remapped entry UUID returned `INVALID_UUID`. Navigate to the modern screen by its RHMI state, matching the upstream Store transition pattern. Keep tile mapping for later launches.
- Use the same direct-state path on repeat entry and when restoring native settings. Preserve initialization order and graphics foreground/focus gates.
- A controlled Node 8 regression reproduces the observed UUID rejection before this change and checks initial modern entry plus three repeated openings afterward. This is not a vehicle emulator; a car retest is pending.
- Retain the bounded redraw recovery and diagnostics from 0.4.130. Independent map-only startup without a route remains unresolved.

## 0.4.130

- Vehicle follow-up: this test build did not fix the reported menu. Its new diagnostics exposed `openEntryState` returning `INVALID_UUID`, addressed separately in 0.4.131.

- Recover graphical settings after an unacknowledged frame when reopening the app. Keep renderer recovery bounded to the normal keepalive instead of waiting indefinitely.
- Resume after a temporary outside-touch dismissal only while the same host remains visible and focused. Keep popup, foreground and hidden-input gates intact.
- Record bounded renderer readiness, visibility, focus and mode-failure milestones for vehicle diagnosis.
- Socket regression tests cover missing frame acknowledgments, reopen, bounded recovery, outside-touch dismissal, leaving the app and popups. Vehicle confirmation is pending.
- Independent route-free Apple Maps startup remains unresolved. This app update does not change the map helper.

## 0.4.129

- Package the opening and modern-default repair verified in the car on 0.4.128 as an in-place update for that test build.
- Align all app and RHMI version metadata. Preserve normal fatal exit behavior when the startup recorder runs without an SDK handler, and defer to the SDK exit policy when its handler is installed.
- App-only release. Independent map-only startup without navigation is still unresolved.

## 0.4.128

- Fix a live startup crash when the renderer reports HUD status before the patch helper sends its initial capabilities. Settings remain disabled until both statuses arrive, including after reconnection.
- Preserve the modern settings entry when the renderer dismisses its foreground surface, and select it again when the app is reopened. Native settings remain the fallback if graphics are unavailable.
- Record asynchronous startup exceptions before the stock SDK exit handler.
- Tested on Node 8.16.2 with both status-arrival orders and reconnection, socket-based settings checks, controlled startup failure cases and modern touch/rotary checks. Installed on the affected MGU; the owner confirmed it stays open and reopens into modern settings. The process also stayed alive through the engine off/on test.
- This update does not implement independent, route-free Apple Maps startup. Dashboard mirroring is not that feature.

## 0.4.125

- The affected car's 0.4.124 startup trace reaches OnlineApp.start, then RemoteHmi rejects RhmiApplication.init with `INAVLID_PARAMETER` before the SDK initialized event. Installation, the stock runner and SDK import all succeeded.
- Remove the static Enabled/property 1 declarations introduced in 0.4.115 from all button and label resources, restoring the startup property set used by the earlier opening layout and upstream ID7 app. Runtime setEnabled controls are retained. This is a targeted compatibility candidate: the generic remote error does not identify the exact rejected parameter, and successful vehicle startup is not yet verified.
- Keep all 15 screens, component IDs, parent relationships, features, settings, dependencies, startup recording and vehicle safety gates unchanged.
- Validate shipped XML/JSON properties, IDs, types, widgets, text cells and parent relationships during the build; regression checks reject reintroduced Enabled declarations. Controlled SDK tests are not a BMW RHMI emulator.
- Update the CarPlay HUD App only. Existing Tools do not need reinstallation. If an old failed process remains resident, restart the head unit while parked before retrying. The existing diagnostics Tool can collect the new app's persisted result if needed.

## 0.4.124

- Records bounded private startup milestones and app-handled errors in the app data directory before SDK imports and through screen initialization. Errors in the recorder do not block launch; the stock runner and startup behavior remain intact.
- This is a diagnostic build for an unresolved vehicle launch failure, not a confirmed repair. Use startup diagnostics Tool 0.1.1 after attempting a launch to collect the retained record.

## 0.4.123

- Explicitly enable `rhmiLoadingEnabled` and `entryPointLoadingEnabled` in the app configuration. Some SDK 27.x donors default these off, leaving installed apps stuck at Loading app. See [upstream report and confirmed fix](https://github.com/cauliflowermossgrape/idrive7-apps/issues/39#issuecomment-6546607787).
- Add Node 8 linked-package regression scenarios for each disabled donor default. Both fail with the old empty configuration and pass with this override. Run the generated package entry point, and read the configuration from the linked artifact.
- Version 0.4.122 still failed to open on the affected car. This release fixes a documented compatibility defect; its cause and successful launch on that car are not yet confirmed. No BMW SDK or vehicle emulator was available for testing.
- App-only update; helpers, interface manifest, saved settings and feature safety gates are unchanged. After installation, restart the head unit while parked before testing, because the previous resident process may retain the failed launch state.

## 0.4.122

- Startup recovery: explicitly open the native home after initialization even when the firmware does not replay the entry-point UUID. Queue early tile clicks until that mapping is ready.
- Load only Home resources before reporting ready; load secondary/graphics screens on demand with a four-second resource timeout. Remove redundant tile icon/text RPCs from startup.
- Start graphics and driver-profile polling after the first native screen. Optional graphics/profile failures retain native HUD controls. Catch synchronous HMI write failures as well as promise rejections.
- Add ten startup scenarios, including an actually linked package using a synthetic SDK donor, and run them on Node 8.17.0. These are controlled SDK/HMI fixtures, not proof of the affected car's behavior.
- Preserve the 0.4.121 installation manifest and existing helpers. No new telemetry, video, lighting or route-free startup capability.

## 0.4.121

- Installation recovery: restore the 0.4.116 SOME/IP manifest. Remove the four firmware-specific Cluster Studio telemetry proxies that can cause BMW generateSomeipInterfaces to reject the entire app.
- Retain HUD controls, visual editor, saved layouts and all existing safety gates. Vehicle-data-dependent experiments remain unavailable without verified live telemetry; no simulated Park or speed fallback.
- Add a release regression check for the compatible manifest contract. Physical reinstallation still needs confirmation on the affected car.

## 0.4.120

Adds 10/30/60-second parked full-cluster tests with renewed renderer leases, a read-only lighting/media feature scan, and paired local-phone clip relay with center-screen movie view and cluster/HUD placement. Experimental 640x360 up to 15 fps; no native social apps, web browser, Prime Video integration, lighting setters or road-ready full-cluster replacement. Requires Cluster Studio 0.1.3.

## 0.4.119

Smooth motion update: settings preview requests 60 fps, preloads and blends shine frames, and avoids redundant native-control updates and hidden gauge drawing. Studio 0.1.2 uses renderer-side welcome shaders with one-time artwork uploads, smooth easing and a prepared gauge handoff. Includes 60 fps HD MP4 previews. Sustained in-car frame rate is not yet measured.

## 0.4.118

Adds X4 M, Apple / CarPlay Ultra and Antonio welcome choices with timing, shine and color controls. Help & setup has a confirmed Restore BMW defaults action, with persistent suppression, supported patch restoration, partial-failure and restart reporting. Requires map tool 0.7.114. Software remains installed; vehicle validation is pending.

## 0.4.117

Cluster Studio: 100 color/layout combinations, full-cluster design preview, drag and dial editing, 12 movable widgets, five saved designs, Ultra-inspired template, live center-area widgets and optional X4 M welcome. Full-screen output is a 10-second parked test, not a road-ready factory gauge replacement. Requires Cluster Studio tool 0.1.0.

# 0.4.116 - BMW-inspired graphical settings

- New dark navy panels, blue highlights, fixed left navigation and large touch targets; the iDrive dial also selects and presses controls.
- Overview puts HUD selection and the saved CarPlay startup trial together. Map layout combines size presets, adjustment arrows and a labelled schematic preview.
- Appearance offers original colors, clear background and corner choices, with unsupported controls visibly disabled. Help includes diagnostics and Classic settings.
- Uses MGU Renderer 0.6.11 in the central display app area, with its foreground gate. Native BMW settings remain the automatic fallback if graphics are unavailable.
- Bundles public MIT drawing/client code and OFL Inter fonts with their license notices. Tool remains 0.7.113; startup behavior is unchanged and still requires a parked car test.
- Tested through the actual renderer wire client and fake map tools, plus native HMI entry/focus/fallback integration. PC images use the real drawing command stream with sample status; they are not car validation.

# 0.4.115 - Accessible controls and startup connection timing

- Explicitly enable navigation buttons and declare ID7 parent-state links in XML and JSON.
- Direct HUD and startup switches on Home avoid relying on a subpage transition.
- A single startup press selects HUD, waits for live and saved confirmation, then enables the Dashboard trial.
- Report page-open failures and precise startup blockers instead of silently doing nothing.
- Requires Tool 0.7.113, which listens for CarPlay from boot and retains pre-opt-in foreground events. Capture remains off until enabled.
- Tests cover declared parent links, direct actions with the page API removed, failed saves, and pre-opt-in events. They are not a BMW SDK or physical-car test.
- Route-free output still requires CarPlay Dashboard visible on the center screen and the capture/classifier working on the car. An independent Apple secondary stream is not solved.

# 0.4.114 - HUD settings and optional startup trial

- Fourteen focused native pages; the home screen contains six rows.
- Explicit HUD/cluster choices, Compact/Balanced/Large size presets, and
  fine (10 px) or coarse (40 px) movement. Center and standard-size resets.
- Original map colors or clear dark background, plus rounded/square corners.
  Appearance requires the accompanying tool revision 0.7.112.
- Confirm settings using renderer status and save acknowledgements.
- Appearance, like size and position, is saved per driver profile. Fine/coarse
  step choice lasts for the current app process; it is not a vehicle setting.
- Optional Dashboard auto-start experiment, off by default, with helper status
  and an Off switch. Requires the map visible on the center screen.
- No change to the CarPlay firmware patch. No-route startup remains unverified.
- The background-filter bypass preserves faint detail present in source
  pixels. It does not lock Apple Maps zoom or fix missing source map tiles.

# Changelog

## 0.4.113 (eroobeeroo fork)

Requires waze-on-cluster 0.7.111: the HUD map can be sized and moved from
the page. HUD map larger / smaller step its width by 5 % (30-85 %); Move HUD
map left / right / up / down move it 10 px a press, and Centre HUD map puts
it back. Size and position are kept per driver profile.

## 0.4.112 (eroobeeroo fork)

Requires waze-on-cluster 0.7.110: the HUD's black background leaves green
alone, so parks no longer go black now and then.

## 0.4.111 (eroobeeroo fork)

Requires waze-on-cluster 0.7.109: on the HUD a night map's grey-blue
background is made black, which the HUD shows as nothing.

## 0.4.110 (eroobeeroo fork)

Requires waze-on-cluster 0.7.108: the HUD map's corners are rounded.

## 0.4.109 (eroobeeroo fork)

Show map on and HUD map size per driver profile: the app reads the head
unit's current user account (SessionManager.currentUserAccountReference)
every 5 s, page open or not, and when it changes the map moves to that
driver's choice. A profile seen for the first time keeps what is set.
Requires waze-on-cluster 0.7.107 (patchd keeps the choices per profile).

## 0.4.108 (eroobeeroo fork)

HUD map size steps Standard, 70 %, 85 %, 40 %: no Full width, which the
HUD cut off at its edges. Requires waze-on-cluster 0.7.106, which holds a
saved larger size to 85 %.

## 0.4.107 (eroobeeroo fork)

Brought up to date with upstream 0.4.1: while CarPlay's stream is live but
shows no map, the status says why ("Stream lost — reconnect CarPlay", or
"Stream lost — restarting CarPlay" where the tool restarts CarPlay itself).
Requires waze-on-cluster 0.7.105 (upstream 0.7.2 with the fork's HUD
changes) and cluster-render 0.3.101 (upstream 0.3.1).

## 0.4.106 (eroobeeroo fork)

Requires waze-on-cluster 0.7.104: the HUD map's frames are scaled on the
head unit to the size they are shown at (sharper, 2-6x less data to the
KOMBI), and the status says when a HUD pop-up has the map stepped aside.

## 0.4.105 (eroobeeroo fork)

Requires waze-on-cluster 0.7.103 with cluster-render 0.2.103: the HUD map
steps aside while the HUD's media and list pop-ups show, so they stay in
the HUD instead of moving to the cluster, and comes back 1.5 s after they
close.

## 0.4.104 (eroobeeroo fork)

Show map on switches between the Cluster and the HUD only (no longer both).
An earlier saved choice of both shows as Cluster until the next press.
Requires waze-on-cluster 0.7.102.

## 0.4.103 (eroobeeroo fork)

Requires waze-on-cluster 0.7.101 (upstream 0.7.1: the patch works on any
carplay build whose edit sites are found; the recovery service stays up).

## 0.4.102 (eroobeeroo fork)

HUD map size: a button steps the HUD map's size between Standard (the
fitted box, about 57 % of the HUD's width), 70 %, 85 %, Full width and 40 %,
resized at once and kept for the next start. Enabled while the map goes to
the HUD. Requires waze-on-cluster 0.7.101.

## 0.4.101 (eroobeeroo fork)

Show map on: one button steps the map between the Cluster, the HUD and
Cluster + HUD. The map moves at once and the choice is kept for the next
start. Requires waze-on-cluster 0.6.103.

## 0.4.0

The page says to set Instrument cluster > Central display area to Map view:
the Waze map replaces the stock map while CarPlay streams it, and the stock
map is back when the stream ends or freezes. A frozen stream shows "Map
frozen — reconnect CarPlay". Requires waze-on-cluster 0.6.0.

## 0.3.1

The page says to set Instrument cluster > Central display area to Off: with
Map view, Route preview or Assisted Driving View there, the cluster shows its
own content in the centre instead of the map.

## 0.3.0

Installing the app from the Store installs the Waze tool and the cluster
renderer too. The tool writes the CarPlay patch as it installs, without
restarting CarPlay; until the next head-unit start the app shows "Patch
pending — reboot to activate". Enable map appears only when the patch is
off, unknown or out of date, Disable map only when it is on. When the install
leaves CarPlay unpatched (an unknown CarPlay build, or another tool starting
CarPlay), the app says why and offers Enable map. The Store can remove the
app and then the Waze tool, which restores CarPlay.

## 0.2.11

When a patch change waits for the next head-unit start, the app says so and
offers a Restart head unit button. A boot recovery service restores the
original CarPlay binary after repeated failed starts with the patch.

## 0.2.10

The map appears on the cluster by itself when CarPlay streams it and goes
away when the stream stops; there is no Show or Stop button. Disable map
turns the feature off.

## 0.2.9

Enable map sets the area where the phone places its guidance, so Waze's
next-turn banner stays visible between the gauges. Units patched with a
full-frame area are prompted to update.

## 0.2.8

The map is drawn in the cluster's native map area (1088x480), under the
gauges. Units patched at another size are prompted to Enable map again.

## 0.2.7

Enable map applies a single patch configuration, including the size the
phone renders the map at. Units on another panel setting are prompted to
update.

## 0.2.6

Enable map uses a single capture path; the capture mode row is removed.
Capture logs has its own button.

## 0.2.5

The status line reads "Patch state unknown — enable the map" until the patch
daemon reports, so the page opens cleanly.

## 0.2.4

After Enable map, the cluster stream starts with the CarPlay session. A patch
waiting for the next head-unit start reads "Patch pending — …".

## 0.2.3

The diagnostic capture window is up to 5 minutes.

## 0.2.2

Capture mode offers a UDP stream sink.

## 0.2.1

Capture logs: a bounded DLT capture, with its status and an early stop.

## 0.2.0

A capture mode choice for Enable map.

## 0.1.0

First release: a page to apply and revert the CarPlay patch, show and stop
the map on the cluster, and read both tools' logs.
