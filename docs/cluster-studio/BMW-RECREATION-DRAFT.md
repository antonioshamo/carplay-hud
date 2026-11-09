# BMW recreation changes for 0.4.150 / 0.1.27

The owner rejected both the oval dials from 0.4.149 and the first broad-face
revision. The current candidate follows the supplied factory photograph's
proportions: lower bases, inward readouts with inline units, broad tapered gray
faces, small outside fuel/oil gauges, and a less condensed instrument typeface.
Dial accents remain recolorable. This is recreated artwork, not BMW firmware.

Fuel is a whole percentage in every template. `fuelCapacityLitres` defaults to
65 for this X4 M project, following BMW's technical data:
https://www.bmw.rs/sr/all-models/m-series/x4-m/bmw-x4m-automobili-tehnicki-podaci.html
The calculation is live quantity in litres / configured tank capacity * 100;
it is a calculated percentage, not a newly discovered percent sensor. The
phone designer exposes capacity for other cars. Missing/stale quantities stay
unavailable, and speed/distance units do not change the percentage.

The top dial shoulders can extend into the outer header, while the center is
transparent from x=0.42 to 0.58 above y=0.24 and from x=0.40 to 0.60 below it.
The accepted native P clearance is unchanged. These are design coordinates,
not proof that every driving warning remains visible. Drive behavior is unchanged.

Only untouched old factory widget positions migrate; custom moves, colors,
visibility and locks remain. Centered custom badges are kept below y=0.22 to
avoid the physical top-center housing. The factory-style runtime retains the
native BMW badge. The separately drawn badge in the composition preview is an
illustration positioned below the housing, not a claim that native BMW artwork
was moved. Preview values are samples.

Reproduce the transparent cluster and illustrated composition with:
`node apps/robertn_waze_cluster/tools/preview_factory_reference.js <output>`.
The center badge and gear indicator exist only in that preview tool. No car
connection, physical installation or Drive activation is part of this validation.

The background is now true black. Side regions are opaque, with no alpha
feather over the factory numerals or readouts. Integer-aligned background
boundaries prevent partially covered seam pixels. The canvas now bounds line,
polygon and glyph raster loops to the active clip; randomized parity checks
verify identical visible pixels while avoiding invisible work.

The newer requested normal/assistance center transition is implemented only in
`test/assistance-window/bmw_transition.js`. It draws a customizable black center
in the normal candidate and fades only that center for assistance, preserving
the side pixels exactly. Repeated transitions restore the normal layout exactly;
unknown mode yields the native display. It is excluded from the installable
component. Captured assistance preferences do not verify live engagement, so
automatic center switching and full-cluster Drive support are not claimed.
