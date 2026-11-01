# Changelog

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
