#!/usr/bin/env bash
# Public checks after a delivery.
# Usage: deploy/smoke.sh --api <url> --cms <url> [--site <url>] [--insecure] [--wait <seconds>]
# --site checks the staging site container (production serves its site from GitHub Pages).
# --wait gives a new instance time to get its certificates before the checks start.
set -euo pipefail

usage() {
  echo "Usage: $0 --api <url> --cms <url> [--site <url>] [--insecure] [--wait <seconds>]" >&2
  exit 2
}

api_url=""
cms_url=""
site_url=""
wait_seconds=0
status_options=(--silent --output /dev/null --write-out '%{http_code}' --max-time 20)
header_options=(--silent --head --max-time 20)
while [[ $# -gt 0 ]]; do
  case "$1" in
    --api) api_url="${2:?--api expects a URL}"; shift 2 ;;
    --cms) cms_url="${2:?--cms expects a URL}"; shift 2 ;;
    --site) site_url="${2:?--site expects a URL}"; shift 2 ;;
    --wait) wait_seconds="${2:?--wait expects a number of seconds}"; shift 2 ;;
    --insecure) status_options+=(--insecure); header_options+=(--insecure); shift ;;
    *) usage ;;
  esac
done
if [[ -z "$api_url" || -z "$cms_url" ]]; then
  usage
fi
readonly API_URL="${api_url%/}" CMS_URL="${cms_url%/}" SITE_URL="${site_url%/}" WAIT_SECONDS="$wait_seconds"
readonly STATUS_OPTIONS=("${status_options[@]}") HEADER_OPTIONS=("${header_options[@]}")

status_of() {
  curl "${STATUS_OPTIONS[@]}" --request "$1" "$2" || true
}

wait_until_up() {
  local deadline=$((SECONDS + WAIT_SECONDS))
  until [[ "$(status_of GET "$API_URL/health")" == 200 && "$(status_of GET "$CMS_URL/server/ping")" == 200 ]]; do
    if ((SECONDS >= deadline)); then
      echo "No HTTPS answer after ${WAIT_SECONDS} s: the checks run anyway." >&2
      return
    fi
    sleep 10
  done
}

if ((WAIT_SECONDS > 0)); then
  wait_until_up
fi

readonly PRIVATE_COLLECTIONS=(
  publications profile experiences projects skills capabilities key_figures answers site_settings chat_settings
  chat_exchanges contact_messages
)

failures=0

check_status() {
  local description="$1"
  local expected="$2"
  local method="$3"
  local url="$4"
  local actual
  actual="$(status_of "$method" "$url")"
  if [[ " $expected " == *" $actual "* ]]; then
    echo "ok      $description ($actual)"
    return
  fi
  echo "FAILED  $description: expected $expected, got $actual" >&2
  failures=$((failures + 1))
}

check_header() {
  local description="$1"
  local url="$2"
  local header="$3"
  if curl "${HEADER_OPTIONS[@]}" "$url" | tr -d '\r' | grep -qi "^$header"; then
    echo "ok      $description"
    return
  fi
  echo "FAILED  $description: no \"$header\" header" >&2
  failures=$((failures + 1))
}

check_status "API health" "200" GET "$API_URL/health"
# 404 until the first publication of a new instance.
check_status "active publication" "200 404" GET "$API_URL/content/active"
check_status "publication hook not routed publicly" "404" POST "$API_URL/internal/publications/activated"
check_status "Directus answers" "200" GET "$CMS_URL/server/ping"
for collection in "${PRIVATE_COLLECTIONS[@]}"; do
  check_status "anonymous read refused: $collection" "403" GET "$CMS_URL/items/$collection?limit=1"
done
check_status "anonymous files refused" "403" GET "$CMS_URL/files?limit=1"
check_status "anonymous users refused" "403" GET "$CMS_URL/users?limit=1"
check_status "anonymous flows refused" "403" GET "$CMS_URL/flows?limit=1"
check_status "MCP refused without authentication" "401 403" POST "$CMS_URL/mcp"

if [[ -n "$SITE_URL" ]]; then
  chat_origin="$SITE_URL"
  preflight_status="$(curl "${STATUS_OPTIONS[@]}" --request OPTIONS "$API_URL/chat" \
    --header "Origin: $chat_origin" --header 'Access-Control-Request-Method: POST' || true)"
  if [[ "$preflight_status" == 204 ]]; then
    echo "ok      chat CORS preflight ($preflight_status)"
  else
    echo "FAILED  chat CORS preflight: expected 204, got $preflight_status" >&2
    failures=$((failures + 1))
  fi
  chat_payload='{"locale":"en","conversationId":"00000000-0000-4000-8000-000000000099","messages":[{"role":"visitor","text":"Hello"}]}'
  chat_status="$(curl "${STATUS_OPTIONS[@]}" --request POST "$API_URL/chat" \
    --header "Origin: $chat_origin" --header 'Content-Type: application/json' \
    --data "$chat_payload" || true)"
  if [[ "$chat_status" == 200 ]]; then
    echo "ok      POST /chat ($chat_status)"
  else
    echo "FAILED  POST /chat: expected 200, got $chat_status" >&2
    failures=$((failures + 1))
  fi
  contact_honeypot='{"name":"Bot","email":"bot@example.com","message":"Spam","locale":"en","website":"http://spam","elapsedMilliseconds":5000}'
  contact_status="$(curl "${STATUS_OPTIONS[@]}" --request POST "$API_URL/contact" \
    --header "Origin: $chat_origin" --header 'Content-Type: application/json' \
    --data "$contact_honeypot" || true)"
  if [[ "$contact_status" == 200 ]]; then
    echo "ok      contact honeypot accepted ($contact_status)"
  else
    echo "FAILED  contact honeypot: expected 200, got $contact_status" >&2
    failures=$((failures + 1))
  fi
fi

if [[ -n "$SITE_URL" ]]; then
  check_status "site home" "200" GET "$SITE_URL/"
  check_status "French home" "200" GET "$SITE_URL/fr"
  check_status "unknown page" "404" GET "$SITE_URL/page-that-does-not-exist"
  check_status "English CV" "200" GET "$SITE_URL/documents/ny-randriantsarafara-cv-en.pdf"
  check_header "staging kept out of search engines" "$SITE_URL/" "x-robots-tag: noindex"
fi

if ((failures > 0)); then
  echo "$failures check(s) failed." >&2
  exit 1
fi
echo "All checks passed."
