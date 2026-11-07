# Widget library and refresh update

CarPlay HUD 0.4.141, Cluster Studio 0.1.20 and cluster-render 0.3.105.

The picker grows from 12 to 37 widgets. Fuel is visible in every preset,
including the three iDrive 8 designs. Existing saved layouts migrate without
losing their original widgets; fuel is added in the least occupied predefined
position. Other new widgets start hidden. The untouched iDrive 8 coolant/oil
pair and center stripe are recentered; individually moved widgets stay put.

Fuel & trip: fuel remaining, range, reserve state, odometer, driving time,
clock and date. Engine: speed, RPM, gear, oil/coolant temperatures, torque,
calculated power, engine state, sport power/torque percentages and drive mode.
Tires: each wheel's pressure, target pressure and temperature. Vehicle & style:
outside temperature, 12 V battery charge, badge, flag, stripes, signature and
data status. The category picker respects the installed 24-button contract;
long categories have a second page. All widgets support the existing move,
resize, color, hide, lock, layer, save and undo controls.

Fuel is the reported quantity (liters or US gallons), not an invented tank
percentage. Range and odometer use km/mi. Power is explicitly calculated from
torque and RPM, not a dynamometer result. Tire conversions require the car's
reported pressure and temperature units; absent units are not guessed from
value magnitude. Unsupported, invalid and expired data shows unavailable,
not zero. Battery charge is not battery voltage or current.

Read-only SOME/IP schemas are constructed from the installed firmware catalog.
The 17 fields match the privately captured car catalog; that catalog is not
shipped. Signal conversion reference: the upstream live_data/signals.js and
car_vitals/main.js in https://github.com/cauliflowermossgrape/idrive7-apps.
No guessed boost, consumption or assistance warning conversions were added.
RPM/speed polling remains 50 ms; slow fuel, unit and tire getters use 5 seconds
and 15-second expiry. Park/speed/gear freshness remains 2 seconds.

The image producer and renderer previously promoted more than 16 queued dirty
rectangles to a full 1920x720 image. Repeated small RPM changes could therefore
force 5.3 MiB uploads under the existing 3000 KB/s budget. Pending rectangles
now merge their least costly bounds while preserving newest pixel contents
and the 16-rectangle limit. The upload cap, display locks and native P opening
are unchanged. The regression case queues 120 changing RPM patches; the final
pixels match exactly and the upload is below 32 KiB. This is a host regression
result, not a measured in-car frame rate or an OEM-speed claim.

Validation includes saved-layout migration, all preset fuel defaults, paging,
add/undo/live save, raw sentinels, unit changes, stale data, cache invalidation,
software rendering, local socket integration and renderer queue reconstruction.
Real-car availability of new readings and refresh smoothness need verification.

Outstanding: full-panel output still intentionally restores BMW gauges outside
Park. This release does not implement replacement BMW cruise/lane/following
warnings. Intermittent no-route HUD startup also remains unresolved. Neither is
represented as fixed by this widget/refresh release.
