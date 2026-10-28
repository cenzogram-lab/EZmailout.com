#!/usr/bin/env bash
# UI walk: every route of the real frontend against the real canister in
# PocketIC, at 360/390/768/1440 px, in the light and the dark theme. Screenshots and report.json land in
# tests/backend/.ui/. Exits 1 on horizontal overflow, banned (crypto/wallet)
# copy or a route that fails to open; UI_STRICT=1 also fails on contrast and
# leftover light panels.
#
#   scripts/test-ui.sh [route-name ...]      e.g. scripts/test-ui.sh home dashboard
#   UI_VIEWPORTS=390,1440 UI_THEMES=dark scripts/test-ui.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
T="$ROOT/tests/backend"
mkdir -p "$T/.gen"
cp "$ROOT/src/frontend/src/declarations/backend.did.js" "$T/.gen/backend.did.js"
[ -d "$T/node_modules/@dfinity/pic" ] || npm --prefix "$T" install --no-audit --no-fund
[ "${UI_NO_BUILD:-}" = "1" ] || node "$T/e2e/build.mjs"
cd "$T" && node ui-walk.mjs "$@"
