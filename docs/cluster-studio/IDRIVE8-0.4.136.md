# iDrive 8-inspired gauges: App 0.4.136 / helper 0.1.13

Update Cluster Studio (Tool) to 0.1.13, then CarPlay HUD (App) to 0.4.136. In Cluster Studio, open Templates → iDrive 8 templates. Sport, Classic and Minimal are three additional curated layouts. The original 100 layout/palette combinations and saved slots retain their identifiers.

Sport and Classic use open angular rails and large speed/RPM readouts; Minimal removes the numeric scale and uses lighter rails. All widgets retain independent position, size, visibility, lock and accent controls. Angular and Minimal angular are also available independently for either gauge under Style. The phone designer can edit both styles. Reset widget returns to the selected template geometry. Choosing a template preserves units, clock format, snapping and welcome preferences, but changes its layout, palette and design name; Undo restores the previous design.

The model and renderer are shared by app and helper. A retained template identifier survives validation, export/import, durable saves and slots. Old designs normalize to the standard template family. The frame cache now records polygon and polyline commands as well as existing primitives; without that addition, an app preview would work but the vehicle helper would fail to draw the angular rails.

Validation covers all 17 editor pages and the existing 24-control proxy limit; template selection, undo/redo/reset; unit conversion and unavailable readings; persisted phone saves; Node 8.16.2 compatibility; and byte-for-byte cache/full redraw parity for all 100 original combinations, all 12 dial styles and all three new presets. Native P clearance remains exactly [1380,660,1520,720], with the approved side-only feather and no top fade. Offline previews use the actual app renderer and sample readings, not photographs of installed output.

The established vehicle-data path is unchanged: notifications are accepted immediately, speed/RPM getters run at up to 10 Hz, slower temperature getters at 2 Hz, and gauge rendering at up to 20 Hz. This release does not claim OEM timing parity or 60 fps. Missing/stale values are not synthesized. Full-cluster output remains Park-only, with the existing shared HUD scene limitation and fallback to BMW gauges.

The new designs have not been physically verified in the car. They do not replace BMW Operating System, Home, factory menus, active driving-assistance indicators or cluster firmware. Investigation of the complete factory center-screen interface is deferred at the user's request.
