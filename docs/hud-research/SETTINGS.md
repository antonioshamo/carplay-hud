# Settings revision and missing-streets investigation

App 0.4.114 and tool 0.7.112 include the settings revision and optional
Dashboard startup experiment. Publication state is shown by GitHub Releases,
not by this source document. Native visual review, BMW SDK linking and physical
car validation remain outstanding. The experiment does not establish independent
route-free startup. See [installation and limits](../../README.md).

## Video review

Reviewed sampled frames from the supplied 29.7-second recording, including a
full-resolution settings frame. The recording shows the old long settings
list, a route-active HUD map and size/position testing while stationary. It
does not show the newly reported long-straight-road zoom/detail loss. The
user already corrected the incompatible installed tool; do not repeat that
earlier diagnosis or claim this recording proves the new symptom.

## Native interface

- Home: status, display, map size, position, appearance, help.
- Display: explicit windshield HUD or instrument cluster choice and optional
  Dashboard startup trial with status and Off switch.
- Size: 5-percent adjustments, standard reset, and 40/60/75-percent presets.
  These resize the map rectangle; they do not change geographic zoom.
- Position: separate horizontal/vertical controls, center reset, fine/coarse
  10/40-pixel steps. Step choice is local to this app process. Offsets are saved.
- Appearance: original colors, clear dark background, rounded/square corners.
- Help: setup, missing-streets explanation, bounded capture and technical logs.

Every nontechnical page has at most six rows. The generated JSON/XML use
native BMW list/button/label widgets. Their actual HMI rendering is not
established by the local fake-SDK navigation tests. Opening a subpage does
not disconnect the tool. Missing capabilities disable controls. The UI
reports applied/saved only after matching renderer state and persistence
acknowledgement; errors/timeouts remain visible.

## Evidence about missing detail

The existing HUD-only filter in `AtlasScaler::key_background` removes dark
pixels close to the most common background luma. A synthetic night scene
with a faint road at Y=64 over background Y=60 reproduces road removal.
Turning that filter off preserves those source pixels. An integration test
sends the setting through MapFeeds into the shared renderer and verifies
the HUD texture changes while cluster pixels do not.

The new Original colors option disables that filter. It cannot reconstruct
streets that Apple Maps omitted before encoding the secondary stream, stop
automatic geographic zoom, or explain an identical issue on the cluster.
Downsampling can still soften fine detail. A visible background may remain
on the HUD in original-color mode. Existing filtering/corner defaults are
preserved until the user chooses otherwise.

Apple documents instrument-cluster map zoom support as a vehicle integration
feature: https://developer.apple.com/videos/play/wwdc2023/10150/ . No usable
zoom command was found in this BMW tool. Do not add a pretend zoom-lock switch
or confuse map width with zoom. Vehicle CarPlay interfaces must be verified
before adding real geographic zoom or appearance-mode negotiation.

When the user can collect data: compare the main CarPlay screen and secondary
display during the event; identify whether streets are absent in the decoded
source frame or lost in output processing. Record current iOS version, map
app, day/night appearance, feed status and stream health. The main and
secondary views can legitimately differ, so this comparison alone is not a
root-cause verdict. Test the same HUD scene with Original colors versus Clear
dark background without changing route or zoom. Keep any images/logs private.

## Protocol and compatibility

Renderer command: `{"cmd":"hud-style","setting":"hud_black_background","value":"0"}`.
`hud_round_corners` is the only other accepted key; values are exactly "0"/"1".
Status contains boolean fields for both settings and `hud_style_available`;
the UI requires availability so disabled HUD processing cannot offer ineffective
appearance controls. The patch daemon advertises
`hud_style: true` and accepts the same command with a boolean `value`. It saves
one whitelisted setting atomically, replies `hud-style-reply` with setting,
value and ok, and remembers it per driver profile. Old profiles inherit their
current appearance once. ProfileSync restores supported appearance fields.

No firmware patch edits, navigation commands, gauge repositioning, or remote
access setup were introduced. The native main executable cannot be compiled
on macOS directly (`sys/signalfd.h` is Linux-only); host tests cover the
rendering code but do not substitute for the required Linux target build.

Passed locally: native page/resource and navigation fixture; nine settings
scenarios including capability gating and save failures; 27 existing control
cases; five profile-sync cases (including appearance restoration); 19 patch
daemon persistence cases; 11 existing profile cases; native atlas processing
and shared-renderer feed tests. The last two use synthetic frames, not a
recording of the reported zoom failure.
