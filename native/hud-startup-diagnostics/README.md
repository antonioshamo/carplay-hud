# CarPlay HUD startup diagnostics

This is a read-only collector, not an app repair. It runs once when installed
and sends a bounded report through the Store installer's existing log output.
It does not open ports, run a service, execute the app, change settings, patch
files, restart anything, or upload data.

While parked:

1. After a failed CarPlay HUD launch, return to MGU Store.
2. Refresh `antonioshamo/carplay-hud` and install **CarPlay HUD startup diagnostics**
   (Tool). Leave CarPlay HUD and its existing tools installed.
3. In Store, select **Settings > Phone access > On**. Scan its QR code using a
   phone connected to the car's hotspot.
4. On the phone page select **Logs > mgu-updater.log > Show**. Copy only the
   block between `HUD STARTUP REPORT ... BEGIN` and `HUD STARTUP REPORT END`
   into the private support chat. Review it first; do not post the entire log
   or the access QR code publicly. Turn Phone access off afterward.

The report includes the registered/installed app version, donor/runner identity,
screen-loading flags, file hashes, JavaScript syntax results, process state,
and available recent startup messages. The app UID comes from its own registry
entry; no fixed UID is assumed. Missing logs or services are reported explicitly.
URLs, common token formats, email addresses, VIN-shaped strings, network addresses
and named coordinates are redacted. Automated redaction cannot guarantee that
every sensitive value is removed; review the small report before sharing it.

The four-second DLT sample is passive and does not change log levels. It may
miss an earlier failure if the vehicle has no retained journal or DLT messages.
In that case the report supplies metadata only, not a diagnosed cause. A later
live connection or a bounded launch recording will still be needed.

The collector's Node 8 and fixture tests are offline tests. The target BMW has
not yet run this collector. No repair or successful vehicle launch is claimed.

For a fresh snapshot later, remove and reinstall this diagnostics tool only.
It keeps no service or separate report file to clean up.
