#!/usr/bin/env bash
# End-to-end: the real frontend, in Chromium, driving the real canister in
# PocketIC — template → studio edits → reload → audience → Step 4 → create →
# print PDF → upload → test-mode payment → print hand-off → tracking.
#
#   scripts/test-e2e.sh                 hand-off answered by a recording print partner
#   E2E_LIVE=1 scripts/test-e2e.sh      hand-off to the print partner's real staging API
#
# Live mode needs the staging login in C2M_STAGE_USERNAME / C2M_STAGE_PASSWORD
# and outbound access to stage-rest.click2mail.com. Screenshots, the call log
# and the print PDF land in tests/backend/.e2e/.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
T="$ROOT/tests/backend"
mkdir -p "$T/.gen"
cp "$ROOT/src/frontend/src/declarations/backend.did.js" "$T/.gen/backend.did.js"
[ -d "$T/node_modules/@dfinity/pic" ] || npm --prefix "$T" install --no-audit --no-fund
node "$T/e2e/build.mjs"
cd "$T" && node e2e.mjs
