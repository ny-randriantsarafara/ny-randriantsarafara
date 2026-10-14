#!/usr/bin/env bash
# Checks that the VPS can pull every image of a delivery: the controller pulls from GHCR without
# credentials, so each image must exist and be public. Run before the request, so that a private
# package stops the delivery with a clear message instead of a failed pull on the server.
# Usage: deploy/check-public-images.sh <ghcr.io/owner/name:tag@sha256:digest>...
set -euo pipefail

readonly MANIFEST_TYPES="application/vnd.oci.image.index.v1+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.docker.distribution.manifest.v2+json"

check_image() {
  local reference="$1"
  if [[ ! "$reference" =~ ^ghcr\.io/([a-z0-9._/-]+)(:[A-Za-z0-9._-]+)?@(sha256:[a-f0-9]{64})$ ]]; then
    echo "Not a GHCR image by digest: $reference" >&2
    exit 1
  fi
  local repository="${BASH_REMATCH[1]}"
  local digest="${BASH_REMATCH[3]}"
  local token
  token="$(curl -fsS "https://ghcr.io/token?scope=repository:$repository:pull" 2> /dev/null | jq -r '.token // empty')" || true
  if [[ -z "$token" ]]; then
    echo "ghcr.io/$repository cannot be pulled anonymously: make the package public (package settings, Change visibility)." >&2
    exit 1
  fi
  if ! curl -fsS --head --output /dev/null -H "Authorization: Bearer $token" -H "Accept: $MANIFEST_TYPES" \
    "https://ghcr.io/v2/$repository/manifests/$digest" 2> /dev/null; then
    echo "ghcr.io/$repository has no public image $digest." >&2
    exit 1
  fi
  echo "ok      $reference"
}

if [[ $# -eq 0 ]]; then
  echo "Usage: $0 <ghcr.io/owner/name:tag@sha256:digest>..." >&2
  exit 2
fi

for reference in "$@"; do
  check_image "$reference"
done
