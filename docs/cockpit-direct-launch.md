# Direct graphical dashboard launch

The owner's photo showed the old native HUD settings list with the message
"Graphical menu unavailable." That route existed both before the graphical
connection completed and after the presentation monitor exhausted its retry.

This change removes the fourteen old native menu states, their action bindings,
and the Classic settings link. The only RHMI state is the dashboard host. The
public tile maps to that host immediately and opens it by name, avoiding the
previous INVALID_UUID entry reopen path. Graphics initialization starts before
waiting for the HMI open request; driver-profile initialization remains separate.

A connected renderer does not prove a displayed picture. Frame acknowledgements
and renderer visibility still establish presentation. During loading or failure,
raw proxy button labels stay hidden. A minimal status plus Retry/Close remains
available if the graphical renderer cannot show the dashboard. Graphics failure
never remaps the app or navigates to the old menu. Recovery is app-local and
bounded; it does not restart the shared renderer or steal screen ownership.

The previous watchdog treated a delayed BMW foreground gate as a graphics fault
and reconnected the renderer. Now it waits on that gate without reconnecting.
A genuine missing surface with foreground ownership still gets one reconnect,
then up to three delayed retries while the same host is visible and focused.
Manual retry remains available. Closing the app or a popup suppresses recovery.

Tests use the real socket client, controlled renderer peer and SDK/HMI fixtures.
They cover direct initial launch, repeated entry, delayed foreground, hidden
surfaces with frame acknowledgements, delayed/failed HMI requests, renderer
errors, missing graphics, proxy suppression, popup focus and recovery. These
are offline checks, not a measurement of physical-car startup time. The actual
cause of this car's graphics visibility failure still needs current vehicle logs
if it persists after the update.
