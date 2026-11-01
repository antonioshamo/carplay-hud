#!/bin/bash
# This fork's rules for an upstream merge (sync-upstream.yml). Its changes are woven into the same files as
# upstream's (versions x.y.1nn, the HUD target and size, the pop-up yield, per-profile settings), so a real
# conflict is left for a person: only a file this fork deleted that upstream changed is decided (kept deleted).
set -u
[ "${1:-}" = "--after" ] && exit 0
git status --porcelain | while read -r code path; do
    case "$code" in
        DU) git rm -q "$path"; echo "rule: kept deleted $path (deleted here, changed upstream)";;
    esac
done
