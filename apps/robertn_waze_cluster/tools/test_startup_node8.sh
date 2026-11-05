#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
# CI-only runtime check. No npm packages, SDK binaries or vehicle credentials.
set -eu
runtime_dir=$(mktemp -d)
trap 'rm -rf "$runtime_dir"' EXIT HUP INT TERM
curl --fail --silent --show-error --location --max-time 90 https://nodejs.org/download/release/v8.17.0/node-v8.17.0-linux-x64.tar.gz -o "$runtime_dir/node.tar.gz"
printf '%s  %s\n' 8b2c9e1f84317c4b02736c4c50db4dd2cd6c4f0ba910fa81f887c8c9294af596 "$runtime_dir/node.tar.gz" | sha256sum -c -
tar -xzf "$runtime_dir/node.tar.gz" -C "$runtime_dir"
"$runtime_dir/node-v8.17.0-linux-x64/bin/node" "$(dirname "$0")/test_startup.js"
"$runtime_dir/node-v8.17.0-linux-x64/bin/node" "$(dirname "$0")/test_settings_startup.js"
