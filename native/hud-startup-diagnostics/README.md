# CarPlay HUD startup diagnostics

This is a read-only collector, not an app repair. It runs once when installed
and sends a bounded report through the Store installer's existing log output.
It does not open ports, run a service, execute the app, change settings, patch
files, restart anything, or upload data.

While parked:

1. Refresh `antonioshamo/carplay-hud` in MGU Store and update **CarPlay HUD (App)**
   to **0.4.158 or newer** for the private startup record and graphics state.
2. Try opening CarPlay HUD, then return to Store after the launch attempt.
3. Update **CarPlay HUD startup diagnostics (Tool)** to **0.1.2**. Collection runs
   during that update. If it was already updated before the launch attempt,
   remove and reinstall this diagnostics tool only to collect a fresh report.
4. In Store, select **Settings > Phone access > On**. Scan its QR code using a
   phone connected to the car's hotspot.
5. On the phone page select **Logs > mgu-updater.log > Show**. Copy only the
   block between `HUD STARTUP REPORT ... BEGIN` and `HUD STARTUP REPORT END`
   into the private support chat. Review it first; do not post the entire log
   or the access QR code publicly. Turn Phone access off afterward.

The report includes the registered/installed app version, donor/runner identity,
screen-loading flags, file hashes, JavaScript syntax results, process state,
the app-owned `hud-startup.log` record,
and available recent startup messages. It also includes up to 40 selected renderer
journal lines from the current boot's last 500 entries, their monotonic timestamps,
read-only renderer service status, and an allowlist of display configuration keys.
Camera/video visibility and app frame-timeout messages can explain a hidden graphics
surface. They describe past events, not necessarily the current state; missing
messages do not establish that a renderer is healthy. The configuration snapshots
may differ from the values a running process loaded earlier. The app UID comes from its own registry
entry; no fixed UID is assumed. Missing logs or services are reported explicitly.
URLs, common token formats, email addresses, VIN-shaped strings, network addresses
and named coordinates are redacted. Automated redaction cannot guarantee that
every sensitive value is removed; review the small report before sharing it.

The four-second DLT sample is passive and does not change log levels. It may
miss an earlier failure if the vehicle has no retained journal or DLT messages.
In that case the report supplies metadata only, not a diagnosed cause. A later
live connection or a bounded launch recording will still be needed.

The collector's Node 8 and fixture tests are offline tests. Collector 0.1.0 ran on the target BMW and returned metadata but no startup errors.
Collector 0.1.2 still needs target verification. No repair or successful vehicle launch is claimed.

For a fresh snapshot later, remove and reinstall this diagnostics tool only.
It keeps no service or separate report file to clean up.

The app resets its private log at each bundle start and caps it at 64 KiB.
It records no navigation data, screenshots, settings, or credentials, and it
never uploads the log. If execution fails before the app bundle is loaded,
this recorder cannot capture that earlier failure; absence of a record is
reported without diagnosing a cause.
