# Native assistance window: offline composition study

The owner proposed retaining custom side gauges while making the center
transparent for BMW's original vehicle, lane and following-distance display.
The supplied second photo also shows assistance icons left of center, and the
bottom warning/status strip. Those require clearance as well.

`native/cluster-studio/test/assistance-window/composition.js` implements a
native-resolution RGBA candidate with a fully clear center, a separate clear
left assistance-icon area and a clear bottom strip. A smooth 48-pixel fade is
outside the reserved rectangles. It never darkens their fully clear interior.
The accepted factory-P exclusion is retained. The mask is applied after all
widgets, so center widgets cannot cover the opening. Source layouts are not
modified; the separate sample design moves the main dials to the sides.

These coordinates are conservative photo-derived candidates, not measured or
accepted vehicle boundaries. The whole native assistance view and every warning
location have not been established from the photos. Their size can vary by
assistance mode and alert. No active cruise-state decoding is invented.

This study has no service import, no changes to vehicle display policy, no car
connection and no installable release. The offline preview uses a labeled
checkerboard rather than a fake live cruise-control picture. An always-open
native area is the first candidate for testing; automatic opening on cruise
activation remains unimplemented until an actual active-state feed is verified.

Validation:

- Every pixel in each reserved region has zero RGBA after arbitrary widgets.
- Straight-alpha fades are symmetric around the center and outside the opening.
- The accepted P opening stays clear, with no changes to its published mask.
- Cached and full drawing match byte-for-byte across all 12 dial styles,
  changing/missing RPM, widget reorder and theme changes.
- Unchanged readings produce no additional frame.

Run with Node 8 or later:

```
node native/cluster-studio/test/assistance-window/test.js
node native/cluster-studio/test/assistance-window/preview.js /tmp/assistance-window-preview
```

The next vehicle step is a bounded stationary comparison using real BMW
assistance/status graphics, to measure the required clear regions and verify
that the renderer retains the native content underneath. Validate relevant
warning/dialog priority, stale data, release and recovery before enabling any
driving output. A parked visualization cannot certify active road warnings.
