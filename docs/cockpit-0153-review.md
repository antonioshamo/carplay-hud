# Updated white X4 M and climate availability

CarPlay HUD 0.4.153 requires Cluster Studio 0.1.30. Update both through MGU Store.
The old three equal cards with a small purple M3 indicate an older app build.

The large central My BMW card now uses the owner's November 10 updated white
X4 M display package. All 96 supplied frames retain their exact RGBA pixels.
Direct dashboard drag rotates the car without opening another page; Move,
zoom, Reset and Data remain on the dashboard. Initial framing uses the union
of all car silhouettes, preventing roof or wheel clipping during rotation.
The renderer displays fixed-elevation views, not a freely tilted 3D mesh.

Seat-heating, ventilation and rear-climate adapters still require supported
firmware and a fresh valid reading. They remain marked not yet verified in
the car. A missing adapter from an old helper now says Update Cluster Studio,
instead of an ambiguous Waiting for car. Front A/C and airflow are owner
confirmed; their commands are unchanged.

Climate telemetry can retain getter polling when notification subscription
fails. This fallback is enabled only for climate, requires a declared getter,
and preserves expiry of stale readings. Notification-only vehicle signals and
other telemetry retain their previous subscription behavior.

Verification covers model hashes/pixels, silhouette bounds, direct drag/pan,
zoom/reset, cache limits, missing/corrupt images, page navigation, helper version
mismatch, all 20 climate command routes, failed subscriptions, stale readings,
neutral payload fields, fresh acknowledgement and shutdown. Offline tests and
renderer replay do not establish physical-car operation or frame rate.
