# Cockpit 0.4.145 / helper 0.1.23

The app now opens a reference-inspired cockpit with large sliding home cards,
an 18-entry categorized app grid, live vehicle readings and a dedicated climate
section. Studio keeps its existing templates, widget editor and saved layouts;
its chrome uses the same side rail and bottom dock. Back returns to the page
that opened Studio. The factory BMW Home screen is not replaced.

## Reference inspection

Reference supplied by the owner:
https://drive.google.com/file/d/1Z9DAfiqum5M3Hcg9e5bEn4ZQp8cnz8eb/view

The entire 19.3-second recording was reviewed at half-second intervals. It shows
an iDrive 8.5 ARM64 emulator, not proof of replacement firmware running in a car.
The blue M3 illustration is temporary, as requested. It is generated artwork,
not a photograph of the owner's X4 M. Its provenance and prompt are in
`apps/robertn_waze_cluster/assets/menu/NOTICE.md`.

| Reference area | What the clip shows | This implementation |
| --- | --- | --- |
| Home, 0–1 and 8–12 s | Sliding diagonal cards, engine, journey, tires, telephone and media | Two pages of three cards, touch swipes, dial/touch buttons, Home/Vehicle/Climate/All apps dock |
| Journey, 1–4 s | Rotating M3, journey-period selector, vehicle navigation | Static replaceable M3 artwork; fresh engine, fuel, range, journey, outside and tire data; no invented trip resets |
| Climate, 4–6.5 s | Climate/Individual/Pre-cooling rail; fan changes medium to low; temperature, power, recirculation, A/C, AUTO, airflow, MAX A/C and SYNC visible | Three climate sections. Eight commands have adapters; the remaining temperature, fan, seat and rear controls explicitly say their mapping is pending |
| Apps, 6.5–8 s | All apps/Infotainment/Vehicle; apps for climate, seats, doors, lights, M functions, media, navigation, devices, messages and system settings | Eighteen actual app destinations for existing settings, designs, HUD, vehicle, climate, scan and media features; no inert copies of unavailable BMW apps |
| M Setup, 12–17 s | Engine/Chassis/Steering/Brake/M xDrive/traction choices; Engine selection changes | No drivetrain, traction or brake writes are implemented or implied |
| Return, 17–19.3 s | Home/journey return | Persistent dock and one-page Back behavior |

Most visible app-grid buttons are not pressed in the clip. Their behavior cannot
be established from this video alone. Vehicle artwork does not rotate in this
release; only the home-card transition is animated.

## Climate truthfulness and contract

The eight test-ready actions are A/C, MAX A/C, front defrost, driver AUTO,
passenger AUTO, fresh/automatic/recirculated air, driver airflow and passenger
airflow. The front page says **NOT VERIFIED IN CAR**. This is not a claim that
every installed vehicle accepts them.

The helper builds only the allowlisted setters from the unit's own firmware
catalog. Each wrapper field other than the selected action receives its declared
neutral enum; unknown schemas fail closed. No temperature scaling, seat-level
range, client-group identity, or fan-speed scaling is guessed. Only two writer
proxies are needed, one per service/field. Reads start when Climate is visible,
expire without an eight-second page lease, and never initiate writes.

Commands require fresh supported readback and are serialized. A setter reply is
not success: a newer readback must confirm the desired state. Unsupported,
expired, rejected and unconfirmed requests show an error. Values are never
optimistically changed or replaced with sample readings. Temperature, fan,
sync, seat-comfort and rear-climate entries are disabled and labeled **command
mapping pending**, which is different from an implemented but unverified action.

## Verification boundary

Offline regression tests exercise real menu drawing/input packets, startup
linking, proxy limits, hit-area overlap, text fit, repeated navigation, failed
and stale climate requests, confirmation, serial writes and shutdown. The
full preview generator includes connected, offline, pending and stale states;
all preview readings are explicitly sample data.

No live car was connected for this change. Next parked session: verify each
climate action individually against BMW's own climate display, check the effect
physically, confirm a rejected command does not move another setting, and record
units/ranges for the still-disabled features. The update does not assert that
the earlier Apple Maps HUD flicker has been fixed, or alter the tested native
gear exclusion, full-panel guard or assistance composition.
