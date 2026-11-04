#!/usr/bin/env bash
# Inputs are process environment only. No private value is printed.
set -euo pipefail
umask 077
private="$RUNNER_TEMP/delivery"
mkdir -p "$private"
if [[ -z "${VPS_SSH_PRIVATE_KEY:-}" ]]; then
  echo "Secret VPS_SSH_PRIVATE_KEY is missing from the GitHub environment." >&2
  exit 1
fi
printf '%s\n' "$VPS_SSH_PRIVATE_KEY" > "$private/ssh-key"
python3 "$(dirname "$0")/delivery_inputs.py" "$private"
echo "PRIVATE_DIR=$private" >> "$GITHUB_ENV"
