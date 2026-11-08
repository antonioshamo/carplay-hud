# Native assistance window: offline composition study

The owner wants their normal custom layout, with a different composition only
when BMW's assistance view is active: custom side gauges around the original
vehicle/lane/following-distance display. The supplied photos also show native
assistance symbols left of center and a bottom warning/status strip.

The revised study uses matching dial sizes and baselines, a dark backdrop and
48-pixel outside fades. Fuel, oil and coolant occupy deliberate side positions.
The preview has separate Normal and Assistance Active controls and two dial
styles. Its native car, lanes and symbols are original vector illustrations with
sample readings, explicitly labeled outside the display. They are not a live
feed or part of the custom overlay sent to the renderer.

`test/assistance-window/composition.js` has an explicit preview mode selector.
Normal renders the original saved layout byte-for-byte. Assistance masks the
center, assistance symbols and bottom status strip after all custom widgets.
Unknown state yields the whole native display. Repeated mode changes reuse a
pixel buffer without leaving a cutout or stale graphics in the normal layout,
and never modify the saved source layout. The accepted factory-P exclusion is
retained; its published mask and side-only fade have not changed.

Candidate reserved coordinates remain conservative photo-derived rectangles,
not measured vehicle boundaries. Their interior is completely transparent;
the smooth fade is outside it and never darkens native content in the opening.
Native warning locations can vary by assistance mode and alert.

This remains an offline study, excluded from the component manifest and engine.
There is no automatic cruise-state decoding, live install or Drive activation.
Available captured assistance preferences are not an active-state signal. A
verified active-state feed and physical warning-priority checks are still needed
before making this automatic; a parked preview cannot certify road warnings.

Validation covers all reserved pixels, straight-alpha blending, native gear
clearance, center widgets, all 12 dial caches, normal/assistance/unknown switches,
source-layout immutability and absence from the installable component.

Run with Node 8 or later:

```
node native/cluster-studio/test/assistance-window/test.js
node native/cluster-studio/test/assistance-window/preview.js /tmp/assistance-window-preview
```
