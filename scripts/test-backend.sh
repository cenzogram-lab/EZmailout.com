#!/usr/bin/env bash
# PocketIC integration tests for the backend canister: admin keys, every HTTPS
# outcall (answered by local fakes that record each request), the support
# email queue, rate limits under load, and an upgrade from a previous build.
#
#   scripts/test-backend.sh [section ...]   # e.g. keys dispatch upgrade
#
# UPGRADE_FROM is the git ref whose committed wasm and bindings the upgrade
# test installs first. It defaults to cebcdf4, the last build before the
# 20261020 FulfilmentNames migration, whose old API names the test drives.
# Set WASM to test a build other than src/backend/dist/backend.wasm.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
T="$ROOT/tests/backend"
GEN="$T/.gen"

# Rebuild with the project's toolchain when it is available; otherwise test
# the committed src/backend/dist/backend.wasm.
if [ -z "${WASM:-}" ] && command -v mops >/dev/null 2>&1 && mops --help 2>/dev/null | grep -qE '^\s+build\b'; then
  (cd "$ROOT" && mops build)
fi
mkdir -p "$GEN"
cp "$ROOT/src/frontend/src/declarations/backend.did.js" "$GEN/backend.did.js"

REF="${UPGRADE_FROM:-cebcdf4}"
if git -C "$ROOT" cat-file -e "$REF:src/backend/dist/backend.wasm" 2>/dev/null; then
  git -C "$ROOT" show "$REF:src/backend/dist/backend.wasm" > "$GEN/old-backend.wasm"
  git -C "$ROOT" show "$REF:src/frontend/src/declarations/backend.did.js" > "$GEN/old-backend.did.js"
else
  rm -f "$GEN/old-backend.wasm" "$GEN/old-backend.did.js"
fi

[ -d "$T/node_modules/@dfinity/pic" ] || npm --prefix "$T" install --no-audit --no-fund
cd "$T" && node audit.mjs "$@"
