# Factory appearance with personal side widgets

The owner now prefers BMW's original dial shapes, colors/personal details on
the sides, additional side widgets, and an always-clear native center. This
replaces the earlier assistance-only cutout concept for this design direction.

`native/cluster-studio/test/factory-personal/` contains a standalone interactive
preview plus an isolated RGBA overlay candidate. It is not imported by the
engine or included in an installable component. Its native artwork is a
code-drawn illustration with sample readings, not a capture or BMW firmware.

The four candidate slots are fixed side regions. All pixels outside them,
including the center, original speed/RPM readouts, native assistance icons and
bottom status/gear strip, are transparent. Each card is rendered into a separate
buffer and clipped; values/labels fit its width. The preview supports 27
readings, six accent colors, side-slot swaps, per-slot native restoration,
imperial/metric and temperature units, and local saved preferences. It does
not modify any previously saved custom-gauge layout.

Captured KombiIF configuration schemas expose content/preselection, navigation
display, entertainment, brightness and RPM/power-meter choices. No arbitrary
native gauge-color setter was identified in that inspected configuration path.
Thus the color picker changes custom widget accents only. Native gauge
recoloring is not implemented or claimed impossible; it needs a verified
interface or supported coding option.

The candidate positions are inferred from photos. Native warnings can occupy
more than the center. Live calibration must check all relevant display states
before enabling an overlay on the vehicle, particularly on-road use. Merely
leaving the center transparent does not prove every factory warning is visible.

Tests verify every pixel outside the slots, the accepted gear area, immutable
source settings, unit conversion parity with the installed widget library,
missing values, side-only validation, clearing old pixels, and package isolation.
Browser checks cover selection, unit changes, drag swaps, persistence, restoration
and native-view examples. These are offline results.
