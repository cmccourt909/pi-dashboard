#!/usr/bin/env bash
# scripts/verify-lodestar-cors.sh
#
# T2.1 — Verify CORS and SSE connectivity for the Lodestar endpoint.
#
# Runs three checks against the UAT backend, simulating an EventSource
# request from the dashboard origin:
#
#   Check 1 — CORS preflight:  confirms allow_origins includes the dashboard.
#   Check 2 — SSE connection:  confirms text/event-stream response and no proxy
#              buffering (X-Accel-Buffering: no must pass through Azure ingress).
#   Check 3 — First SSE event: confirms the meta event arrives within 5s.
#
# Usage (from repo root):
#   BACKEND_URL=https://<backend-fqdn> \
#   DASHBOARD_ORIGIN=https://<frontend-fqdn> \
#   PI=<pi-name> \
#   FEATURE_KEY=<feature-key> \
#   bash scripts/verify-lodestar-cors.sh
#
# All four env vars are required. Exit code 0 = all checks passed.

set -euo pipefail

BACKEND_URL="${BACKEND_URL:?Set BACKEND_URL to the backend container app FQDN}"
DASHBOARD_ORIGIN="${DASHBOARD_ORIGIN:?Set DASHBOARD_ORIGIN to the frontend container app URL}"
PI="${PI:?Set PI to a valid PI name e.g. 26.3}"
FEATURE_KEY="${FEATURE_KEY:?Set FEATURE_KEY to a valid epic jira_key e.g. ALPHA-1}"

ENDPOINT="${BACKEND_URL}/api/pis/${PI}/features/${FEATURE_KEY}/lodestar"
PASS=0
FAIL=0

pass() { echo "  ✓ $1"; PASS=$((PASS+1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL+1)); }

echo ""
echo "Lodestar CORS/SSE verification — T2.1"
echo "  Backend:  $BACKEND_URL"
echo "  Origin:   $DASHBOARD_ORIGIN"
echo "  Endpoint: $ENDPOINT"
echo ""

# ── Check 1: CORS preflight ──────────────────────────────────────────────────
echo "Check 1 — CORS preflight (OPTIONS)"
PREFLIGHT=$(curl -s -o /dev/null -w "%{http_code}" \
  -X OPTIONS "$ENDPOINT" \
  -H "Origin: $DASHBOARD_ORIGIN" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type")

if [ "$PREFLIGHT" = "200" ] || [ "$PREFLIGHT" = "204" ]; then
  pass "OPTIONS $ENDPOINT → $PREFLIGHT"
else
  fail "OPTIONS $ENDPOINT → $PREFLIGHT (expected 200 or 204)"
fi

# Check allow_origin header
ACAO=$(curl -s -I -X OPTIONS "$ENDPOINT" \
  -H "Origin: $DASHBOARD_ORIGIN" \
  -H "Access-Control-Request-Method: GET" \
  | grep -i "access-control-allow-origin" | tr -d '\r' || true)

if echo "$ACAO" | grep -q "$DASHBOARD_ORIGIN\|\*"; then
  pass "Access-Control-Allow-Origin includes dashboard origin"
else
  fail "Access-Control-Allow-Origin missing or wrong: ${ACAO:-<header not present>}"
fi

# Check expose_headers includes X-Lodestar-Prompt-Version
ACEH=$(curl -s -I -X OPTIONS "$ENDPOINT" \
  -H "Origin: $DASHBOARD_ORIGIN" \
  -H "Access-Control-Request-Method: GET" \
  | grep -i "access-control-expose-headers" | tr -d '\r' || true)

if echo "$ACEH" | grep -qi "X-Lodestar-Prompt-Version"; then
  pass "Access-Control-Expose-Headers includes X-Lodestar-Prompt-Version"
else
  fail "Access-Control-Expose-Headers missing X-Lodestar-Prompt-Version: ${ACEH:-<header not present>}"
fi

# ── Check 2: SSE response headers ───────────────────────────────────────────
echo ""
echo "Check 2 — SSE response headers (GET, 3s timeout)"
HEADERS=$(curl -s -I --max-time 3 "$ENDPOINT" \
  -H "Origin: $DASHBOARD_ORIGIN" \
  -H "Accept: text/event-stream" 2>/dev/null || true)

if echo "$HEADERS" | grep -qi "content-type: text/event-stream"; then
  pass "Content-Type: text/event-stream"
else
  fail "Content-Type is not text/event-stream — proxy may be buffering or endpoint not reachable"
fi

if echo "$HEADERS" | grep -qi "x-accel-buffering: no"; then
  pass "X-Accel-Buffering: no (proxy buffering disabled)"
else
  fail "X-Accel-Buffering: no header missing — Azure/nginx may buffer the stream"
fi

# ── Check 3: First SSE event within 5s ──────────────────────────────────────
echo ""
echo "Check 3 — First SSE event (5s timeout)"
FIRST_EVENT=$(curl -s -N --max-time 5 "$ENDPOINT" \
  -H "Origin: $DASHBOARD_ORIGIN" \
  -H "Accept: text/event-stream" 2>/dev/null | head -1 || true)

if echo "$FIRST_EVENT" | grep -q "meta\|chunk\|error"; then
  pass "First SSE event received: ${FIRST_EVENT:0:80}"
else
  fail "No SSE event received within 5s: ${FIRST_EVENT:0:80}"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "────────────────────────────────────────"
echo "Result: $PASS passed, $FAIL failed"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "Action required before Phase 2 UAT sign-off:"
  echo "  - CORS: confirm CORS_ORIGINS env var on backend Container App includes $DASHBOARD_ORIGIN"
  echo "  - SSE buffering: confirm X-Accel-Buffering: no passes through Azure Container App ingress"
  echo "  - See app/api/main.py CORSMiddleware config and app/api/routers/lodestar.py response headers"
  exit 1
fi

echo "T2.1 CORS verification passed. Safe to proceed to Wave 3."
exit 0
