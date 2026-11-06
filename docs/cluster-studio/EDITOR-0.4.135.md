# Editor 0.4.135 / helper 0.1.12

Back and Apply are present on every modern settings and Studio page. The 24-proxy RHMI contract is unchanged: less-used lighting, assistance and video tools are grouped under More options. Back uses page history; at the cockpit root it calls the captured SDK's `rhmiApplication.closeState(HOST)` and does not remap the entry to classic settings.

Live design edits are coalesced at a maximum of about 3 saves/second, with one request in flight. Existing helper `save` keeps output/enabled state; the stable engine updates its existing layer. Fresh parked state and a renderer connection are required for automatic edits. Timed tests do not receive automatic design saves. Manual Apply remains available, and an inactive output requires explicit Apply. Failed saves preserve the draft and do not retry indefinitely. Global BMW restore pauses live editing and waits for any in-flight save before requesting Off.

The phone editor has sticky Apply and an optional live-save queue capped at two saves/second. Its existing origin/token, Park and five-minute-session protections remain. Import is a draft until Apply. Changes are stored only after helper validation and durable file replacement.

Ten dial styles use the same model/drawing code in app and helper: sport rings, digital cards, horizontal bars, Ultra rings, classic needles, segmented rings, racing sweep, vertical rails, minimal arc and dot dial. The 100 combinations remain ten layouts times ten palettes, not 100 distinct physical integrations.

Validation covers 16 editor pages, all 10 dial styles, touch and iDrive packets, navigation history, no overlapping hit areas, the unchanged 24-proxy limit, coalescing, continuous drag across acknowledgements, delayed/out-of-order status, disconnects, manual drafts, slot saves, Park/freshness, startup/lifecycle and native P byte-exact composition. Native cache tests compare every style against a full redraw. Local browser checks exercise paired phone live save, preserved widget selection, draft mode and manual Apply. All vehicle data in these checks is simulated; no connection to the car was used.

The renderer remains capped at 20 fps and polling at up to 10 Hz for speed/RPM, with notifications accepted immediately. This improves the prior slow path; OEM timing parity is not established. Full-cluster output remains Park-only, with shared HUD scene limitations and factory warnings intact. This is not replacement cluster firmware or enabled road-going custom instrumentation.
