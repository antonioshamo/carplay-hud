# CarPlay HUD and Cluster Studio for BMW iDrive 7

CarPlay HUD **0.4.144** adds a simpler cockpit home, larger widget cards,
clear page titles, fixed Back/Live changes/Apply controls and two-way widget
paging. It fixes a reconnect timer found during repeated menu navigation.
Starter templates now avoid overlapping labels and the reserved gear opening.
Existing custom layouts are preserved. These changes are tested offline;
reliable route-free startup and HUD flicker still need physical-car verification.

Cluster Studio **0.1.22** provides 37 movable widgets, fuel by default, saved
layouts, optional welcome animations and Restore BMW defaults. Full-panel output
currently requires fresh Park data. The factory-preserving side-widget design
is a prototype, not a released replacement for BMW's menus or assistance display.

Personal fork of [eroobeeroo/idrive-apps](https://github.com/eroobeeroo/idrive-apps).
Current component versions: app **0.4.144**, Waze on cluster **0.7.117**,
Cluster Studio **0.1.22**, cluster-render **0.3.105**. **MGU Renderer 0.6.11**
comes from the official MGU Store source and draws the settings app; it is
separate from cluster-render.

A source commit alone is not an installable release. Check the
[Releases](https://github.com/antonioshamo/carplay-hud/releases) page for the
versioned artifact and Store catalog. [Designer guide](docs/cluster-studio/README.md)
and [experimental media limitations](docs/cluster-studio/EXPERIMENTS.md) describe
features with their own validation limits.

## Install and test

In MGU Store add the public source:

```text
https://github.com/antonioshamo/carplay-hud
```

Already using this source? Refresh Store and update the app and tools in place;
no removal is needed. Verify the installed versions above and follow Store's
restart notice. If another source owns Waze on cluster, note your settings
before migrating: remove its app and Waze tool, leave cluster-render installed,
then install this source's app and dependencies. Removing a source alone does
not transfer ownership of installed packages.

For the separate Apple Maps feed, open **Startup → Apple Maps on HUD**. This
selects HUD and keeps Dashboard mirroring off. While parked, reconnect CarPlay
without starting a route and check the HUD. Switch the main CarPlay screen to
Music to check that the HUD map remains independent. Successful settings saves
alone do not prove that the phone is delivering the secondary map stream.

Simultaneous full-panel gauges and HUD maps require distinct renderer scenes
and slots. The helper detects this capability; an older shared-resource
configuration can defer full-panel output. An app update does not automatically
migrate that vehicle configuration.

The older optional Dashboard capture experiment mirrors the main CarPlay screen;
it is not the separate-map setup. No automatic navigation route is started.

## Settings and missing streets

The new graphical app has Overview, Map layout, Appearance, Startup and Help
sections, with large touch targets and iDrive dial input. It fits inside the BMW
app area and yields when another screen or popup takes focus. If graphics are
unavailable, the fourteen native settings pages remain usable; you can also select
**Help & setup → Classic settings**. In Classic settings, direct HUD and startup
buttons remain on Home. Choose **Appearance → Original map colors** to preserve faint pixels removed by the existing HUD dark-background
filter. This applies to the normal map feed. It cannot restore roads absent from
Apple's source video or lock Apple Maps' geographic zoom. The reported loss on
both cluster and HUD still needs a source capture to diagnose.

BMW's MPH and speed-limit widgets remain in their existing positions. This
release does not move them, remove Apple's instruction banner, or implement
CarPlay Ultra. No proprietary BMW SDK, car binaries, keys or private logs ship.

[Startup experiment details](native/waze-on-cluster/startup/README.md) ·
[Research and validation limits](docs/hud-research/SETTINGS.md)

---

# idrive-apps

Tools and apps for the iDrive 7 head unit (MGU) of a BMW, installed from the
[mgu Store](https://github.com/robertnisipeanu/mgu-store).

| Path | |
|---|---|
| [`native/cluster-render`](native/cluster-render) | the cluster renderer: one service that draws every app's layers on the instrument cluster and the HUD, on iDrive 7 and iDrive 8 |
| [`native/waze-on-cluster`](native/waze-on-cluster) | the CarPlay map (Waze, Apple Maps or Google Maps) on the instrument cluster, drawn through cluster-render |
| [`apps/robertn_waze_cluster`](apps/robertn_waze_cluster) | the iDrive app for it: Enable map, Disable map, status |
| [`release`](release) | builds and publishes the Store catalog |
| `tools` | `oap_pack.js`, `oap_link.js`: pack the app |

## This fork: the map on the HUD

[eroobeeroo/idrive-apps](https://github.com/eroobeeroo/idrive-apps) adds the head-up display: the CarPlay map
(Waze or Google Maps) shown on the HUD instead of the instrument cluster, switched from the app's page. Photos
from a 2021 X5 xDrive45e (G05); street names blurred.

![The HUD map while driving](docs/hud/hud-on-the-road.jpg)

*The HUD map while driving: the route, the next streets and the speed readout over the road. (The panel at the
bottom right, battery power and temperatures, is the separate [Cluster Info](https://github.com/eroobeeroo/idrive7-apps)
app.)*

| Before: Waze's grey-blue night field on the HUD | After: the background made black, which a HUD shows as nothing |
|---|---|
| ![Before](docs/hud/hud-before-black-background.jpg) | ![After](docs/hud/hud-night.jpg) |

What it does:

- **Show map on: Cluster / HUD** - one button moves the map between the instrument cluster and the HUD, at once.
- **Size** - **HUD map larger / smaller** in 5 % steps from 30 % to 85 % of the HUD's width (85 %: the widest it
  shows whole), the picture's shape kept. Standard is the fitted box, about 57 %.
- **Position** - **Move HUD map left / right / up / down**, 10 px a press, and **Centre HUD map**. The map moves
  at once (only its place changes, nothing is re-sent) and is held inside the HUD.
- **Made for a HUD** - the frames are scaled on the head unit to the size shown (sharper, 2-6x less data to the
  instrument cluster), the corners are rounded, and a night map's background is made black so only the roads,
  route and labels float in view (green, such as parks, is kept).
- **Gives way** - the map steps aside while the HUD's own media and list pop-ups show, so they stay on the HUD.
- **Per driver** - the display choice, size and position are kept for each driver profile and follow the
  driver when the profile changes.

![HUD map size and position](docs/hud/hud-size-and-position.png)

![The app page](docs/hud/app-page.png)

On the cluster, as before, the map fills the central area:

![The map on the cluster](docs/hud/cluster-map.jpg)

## Install

In the Store, add the GitHub source `antonioshamo/carplay-hud` and install
**Waze on cluster**. The Store installs what it requires first: `mgu-deploy`
0.7.0 from mgu-store, then `cluster-render` and the Waze tool from here. One
head-unit start activates the CarPlay patch. The Store removes them again:
the app, then the tool, then the renderer.

## Build

```sh
make -C native/cluster-render test test-x86 target    # host tests; the unit's toolchain and binary (Docker)
make -C native/waze-on-cluster test test-x86 target
node apps/robertn_waze_cluster/tools/test_control.js
node apps/robertn_waze_cluster/tools/test_page.js
node release/test/release_test.js
node release/release.js check                         # reproducible artifacts
```

Each folder's README has the details; [`release/README.md`](release/README.md)
covers versions, the catalog and publishing.

## License

GPL-3.0-or-later ([`LICENSE`](LICENSE)), unless a file's SPDX header says
otherwise. What apps compile in or copy from cluster-render, its `include/`,
`client/`, `kit/`, `js/cluster_render_client.js` and `PROTOCOL.md`, is
MPL-2.0 ([`LICENSES/MPL-2.0.txt`](LICENSES/MPL-2.0.txt)). Third-party files
keep their own licenses: the RAMSES and vsomeip interfaces in cluster-render
(MPL-2.0), the Intel Media SDK headers in waze-on-cluster (MIT).
