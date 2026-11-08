# CarPlay HUD 0.4.147 launch recovery

The user reports that tapping the updated app opens nothing. The car is not
connected, so no current vehicle trace or physical launch verification is available.

Code inspection found an unhandled native entry-open failure: the app logged an
error and returned without opening another screen. An older vehicle capture has
an INVALID_UUID response to this API; this is evidence of a relevant failure mode,
not proof of the cause of the current report. The new native-invalid-entry test
failed against 0.4.146 and passes with recovery.

The recovery uses the existing named-state API to open native Home. HMI mapping,
entry registration and screen requests have four-second deadlines. Successful
requests incur no delay. A rejected fallback mapping no longer prevents direct
Home navigation, and a failed modern transition releases the queue so a later
tap can retry. Leaving the app suppresses subsequent fallback opening. The SDK
cannot cancel requests already submitted to the head unit; a timeout bounds our
promise chain, not the remote operation.

Added cases: native entry rejection and timeout; modern mapping and opening
timeout followed by another tap; fallback mapping rejection; entry initialization
timeout; availability rejection; leaving during a hung entry request.
Repeated entry events share one pending launch request. Existing startup, graphics fallback, navigation,
profile, map/cluster coordination and persistence checks remain in the suite.

The app links and syntax-checks against the saved vehicle SDK offline. This is
not an SDK runtime simulation; private donor code and vehicle logs are excluded
from the release. CI also runs the controlled tests on Node 8.17, matching the
vehicle's Node 8 generation. Store artifacts are checked for reproducibility.

No saved layout migration, helper, HUD feed, rendering artwork, vehicle command,
or assistance/motion policy changes are included. Update the app in place; no
uninstall is needed. Physical launch after installation remains to be checked.
