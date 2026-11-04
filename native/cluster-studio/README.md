# Cluster Studio

See the [user guide, capabilities and limitations](../../docs/cluster-studio/README.md).

This Node 8 tool runs at head-unit startup. State is stored at
`/var/opt/cluster-studio/studio.json`; the group-restricted control socket is
`/run/cluster-studio/control.sock`. Default output is off. The installed app supplies
read-only SOME/IP definitions. The service retries discovery if installed before
the app. Renderer output is at most one half-resolution frame per second; welcome
motion and full-screen expiry run in the renderer. Full-screen output is a timed
parked experiment only. Removing the tool stops its service and releases its layers.
