#!/usr/bin/env bash
# Post-deploy checks for EZmailout on the Internet Computer.
#
#   scripts/verify-deploy.sh <frontend-host> [backend-canister-id]
#
#   frontend-host        e.g. abcde-aaaaa-aaaaa-aaaaa-cai.icp0.io or ezmailout.com
#   backend-canister-id  e.g. fghij-aaaaa-aaaaa-aaaaa-cai (enables backend checks)
#
# Exits non-zero if any check fails.
set -uo pipefail

FRONTEND="${1:?usage: $0 <frontend-host> [backend-canister-id]}"
# SCHEME=http for a local dry run against `vite preview`.
SCHEME="${SCHEME:-https}"
BACKEND="${2:-}"
FAILS=0

pass() { printf '  ok    %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; FAILS=$((FAILS + 1)); }

echo "── SPA deep links: served index.html with 200 (asset-canister fallback)"
for path in "/" "/wizard?step=2" "/campaigns" "/dashboard" "/admin" "/templates" "/t/cmp_1-probe"; do
  body=$(curl -sS -L -o - -w '\n%{http_code}' "${SCHEME}://${FRONTEND}${path}") || { fail "$path (request failed)"; continue; }
  code=${body##*$'\n'}
  if [[ "$code" == "200" && "$body" == *'<div id="root">'* ]]; then pass "$path → 200 index.html"
  else fail "$path → HTTP $code$([[ "$body" == *'<div id="root">'* ]] || echo ', not the app shell')"; fi
done

echo "── Caching"
index_cc=$(curl -sS -D - -o /dev/null "${SCHEME}://${FRONTEND}/" | tr -d '\r' | awk -F': ' 'tolower($1)=="cache-control"{print $2}')
[[ "$index_cc" == *must-revalidate* || "$index_cc" == *no-cache* ]] && pass "index.html: $index_cc" || fail "index.html Cache-Control is '${index_cc:-missing}' (must revalidate, or a deploy strands returning visitors)"
bundle=$(curl -sS "${SCHEME}://${FRONTEND}/" | grep -o 'assets/index-[A-Za-z0-9_-]*\.js' | head -1)
if [[ -n "$bundle" ]]; then
  js_cc=$(curl -sS -D - -o /dev/null "${SCHEME}://${FRONTEND}/${bundle}" | tr -d '\r' | awk -F': ' 'tolower($1)=="cache-control"{print $2}')
  [[ "$js_cc" == *immutable* ]] && pass "$bundle: $js_cc" || fail "$bundle Cache-Control is '${js_cc:-missing}' (.ic-assets.json5 not applied?)"
else
  fail "could not find the hashed bundle in index.html"
fi

echo "── Security headers (index.html, a deep link and the bundle)"
# Header value by name from one response (empty when missing).
header() { tr -d '\r' <<<"$1" | awk -v n="$(tr '[:upper:]' '[:lower:]' <<<"$2")" -F': ' 'tolower($1)==n{sub(/^[^:]*: /,""); print; exit}'; }
for path in "/" "/wizard?step=2" ${bundle:+"/${bundle}"}; do
  hdrs=$(curl -sS -D - -o /dev/null "${SCHEME}://${FRONTEND}${path}") || { fail "$path (request failed)"; continue; }
  csp=$(header "$hdrs" content-security-policy)
  missing=""
  for d in "default-src 'self'" "object-src 'none'" "base-uri 'self'" "frame-ancestors 'none'" "https://icp-api.io" "https://js.stripe.com"; do
    [[ "$csp" == *"$d"* ]] || missing+=" [$d]"
  done
  script_src=$(grep -o "script-src [^;]*" <<<"$csp")
  [[ "$csp" == *"'unsafe-eval'"* ]] && missing+=" [no 'unsafe-eval']"
  [[ "$script_src" == *"'unsafe-inline'"* ]] && missing+=" [no 'unsafe-inline' in script-src]"
  if [[ -z "$csp" ]]; then fail "$path: no Content-Security-Policy (.ic-assets.json5 not applied?)"
  elif [[ -n "$missing" ]]; then fail "$path: CSP needs$missing"
  else pass "$path: Content-Security-Policy"; fi
  [[ "$(header "$hdrs" x-content-type-options)" == "nosniff" ]] && pass "$path: X-Content-Type-Options" || fail "$path: X-Content-Type-Options is '$(header "$hdrs" x-content-type-options)'"
  [[ "$(header "$hdrs" x-frame-options)" == "DENY" ]] && pass "$path: X-Frame-Options" || fail "$path: X-Frame-Options is '$(header "$hdrs" x-frame-options)'"
  [[ "$(header "$hdrs" referrer-policy)" == "strict-origin-when-cross-origin" ]] && pass "$path: Referrer-Policy" || fail "$path: Referrer-Policy is '$(header "$hdrs" referrer-policy)'"
  [[ "$(header "$hdrs" permissions-policy)" == *"camera=()"* ]] && pass "$path: Permissions-Policy" || fail "$path: Permissions-Policy is '$(header "$hdrs" permissions-policy)'"
done

if [[ -n "$BACKEND" ]]; then
  RAW="https://${BACKEND}.raw.icp0.io"
  echo "── Backend (${RAW})"
  health=$(curl -sS -w '\n%{http_code}' "${RAW}/health") || true
  [[ "${health##*$'\n'}" == "200" && "$health" == *ezmailout* ]] && pass "/health → 200" || fail "/health → ${health##*$'\n'}"
  hook=$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' --data '{"probe":true}' "${RAW}/webhooks/click2mail") || true
  [[ "$hook" == "401" ]] && pass "webhook without secret → 401 (fail-closed)" || fail "webhook without secret → HTTP $hook (expected 401)"
fi

echo
if (( FAILS == 0 )); then echo "all checks passed"; else echo "$FAILS check(s) failed"; fi
exit $(( FAILS > 0 ))
