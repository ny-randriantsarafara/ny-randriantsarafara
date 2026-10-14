#!/usr/bin/env bash
# Renders the delivery of one environment with placeholder images and secrets, then validates it with
# the VPS controller's rules (deploy/check_delivery.py). No server is contacted.
# Usage: deploy/render.sh <staging|prod> <output-directory>
# Requires ansible-playbook and the ny.vps collection of deploy/ansible/requirements.yml.
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <staging|prod> <output-directory>" >&2
  exit 2
fi

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
readonly DEPLOY_DIR
readonly OUTPUT_DIR="$2"
readonly PLACEHOLDER_DIGEST="sha256:0000000000000000000000000000000000000000000000000000000000000000"
readonly PLACEHOLDER_SECRET="render-check-placeholder-0123456789abcdef"

collections_dir="$(ansible-galaxy collection list ny.vps --format json | jq -r 'keys[0]')"
readonly collections_dir
if [[ ! -d "$collections_dir/ny/vps" ]]; then
  echo "The ny.vps collection is not installed: ansible-galaxy collection install -r deploy/ansible/requirements.yml" >&2
  exit 1
fi

umask 077
mkdir -p "$OUTPUT_DIR"

image() {
  echo "ghcr.io/ny-randriantsarafara/portfolio:$1-render@$PLACEHOLDER_DIGEST"
}

TARGET_ENVIRONMENT="$1" \
  OPERATION=apply \
  RELEASE="$(jq -cn --arg directus "$(image directus)" --arg api "$(image api)" \
    --arg provision "$(image provision)" --arg site "$(image site)" \
    '{directus: $directus, api: $api, provision: $provision, site: $site}')" \
  POSTGRES_PASSWORD="$PLACEHOLDER_SECRET" DIRECTUS_SECRET="$PLACEHOLDER_SECRET" \
  ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD="$PLACEHOLDER_SECRET" ADMIN_TOKEN="$PLACEHOLDER_SECRET" \
  OWNER_EMAIL=owner@example.com OWNER_PASSWORD="$PLACEHOLDER_SECRET" \
  AI_EMAIL=assistant@example.com AI_PASSWORD="$PLACEHOLDER_SECRET" \
  API_EMAIL=api@example.com API_PASSWORD="$PLACEHOLDER_SECRET" API_TOKEN="$PLACEHOLDER_SECRET" \
  PUBLICATION_HOOK_SECRET="$PLACEHOLDER_SECRET" \
  python3 "$DEPLOY_DIR/delivery_inputs.py" "$OUTPUT_DIR"

ansible-playbook -i "$DEPLOY_DIR/ansible/inventory.yml" "$DEPLOY_DIR/ansible/deploy.yml" --tags render \
  -e "@$OUTPUT_DIR/secrets.json" -e "@$OUTPUT_DIR/delivery.json" \
  -e "app_render_output=$OUTPUT_DIR/rendered.json"

PYTHONPATH="$collections_dir/ny/vps/roles/controller/files" \
  python3 "$DEPLOY_DIR/check_delivery.py" "$OUTPUT_DIR/rendered.json" "$1"
