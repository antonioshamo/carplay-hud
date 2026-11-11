# Cluster Studio 0.1.32

Source-based cluster replacement for CarPlay HUD 0.4.155. See
[SOURCE-INTEGRATION.md](SOURCE-INTEGRATION.md) for exact imported revisions,
license notices, adaptations, excluded integrations and verification limits.

The Node 8 service stores schema-2 settings at
`/var/opt/cluster-studio/studio.json` and exposes its group-restricted control
socket at `/run/cluster-studio/control.sock`. It starts with the head unit;
gauge output defaults off. Legacy settings are backed up byte-for-byte before
migration and their active/startup flags are not imported.

Only the source GPU renderer is packaged. Old bitmap rendering, welcome drawing,
phone design serving and legacy panel/center output commands are removed. The
service retains the existing telemetry, climate, media and HUD startup-recovery
components. It does not install another cluster app or change renderer slots.

Run the host renderer tests first, then `node test/test_source_cluster.js` and
`node test/test_source_transport.js` from this folder. The latter needs the
compiled `../cluster-render/build/host/host_service` and local Unix sockets.
`tools/render_source.js` needs Playwright Chromium for shader/gallery verification.

No physical-car validation is claimed for this adaptation.
