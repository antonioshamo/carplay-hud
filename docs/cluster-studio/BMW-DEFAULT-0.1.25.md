# BMW original-style default

CarPlay HUD 0.4.148 and Cluster Studio 0.1.25 add a named `bmw-factory` template. New stores and offline editors start with mirrored BMW-inspired outer speed/RPM dials, white/silver markings, red indicators, and side readouts for fuel, range, oil and coolant. This is editable custom artwork, not a change to BMW's native theme assets.

Existing saved layouts and slots are loaded unchanged. Existing owners choose **Templates → BMW original style** to switch. Unit and welcome preferences are retained; the switch can be undone. Reset widget restores the named template's geometry. There are now 13 dial styles and 104 starter looks.

The middle below the header stays transparent, including when an edited widget crosses its boundary. Widget editing keeps placements in the visible side regions. The accepted native gear exclusion remains `[1380,660,1520,720]` with its existing horizontal-only fade. Native center coordinates here are an offline design choice; this is not evidence of complete driver-assistance/warning coverage. Existing display activation, movement, unknown-data and HUD ownership policies are unchanged.

The same model and drawing code is staged into the helper. The CPU preview honors renderer clipping, and the frame cache preserves clipping state along with its cached drawing prefix. It still skips identical readings and reuses unchanged artwork. Missing fuel/RPM/speed readings are unavailable, not fabricated. Fuel uses the received quantity and converts liters to US gallons for imperial layouts; no tank-capacity percentage is invented.

`test_factory_default.js` checks defaults, converted and centered readouts, protected alpha pixels, cache/full-frame parity, all widget moves/resizes, menu control bounds, undo/redo, and both old and new persisted designs. Existing generic customization tests explicitly load their legacy fixture, while real touch tests hide and re-add the oil widget now included in the default. The release pipeline replays the editor with native MGU Renderer 0.6.15 and runs the vehicle-era Node 8 checks before publication.

In-car appearance, display timing and native assistance compatibility remain unverified for this template. Offline sample images and raster timings must not be described as measurements from the car.
