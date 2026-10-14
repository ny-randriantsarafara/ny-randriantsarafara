"""Writes the private inputs of one delivery, read by deploy/ansible/deploy.yml.

Usage (CI, see .github/workflows/deploy.yml): python3 deploy/delivery_inputs.py <private-directory>
Reads TARGET_ENVIRONMENT, OPERATION, RELEASE and, for apply and plan, the instance secrets.
Writes secrets.json and delivery.json (0600). Never prints a value.
"""

import json
import os
import sys
import time
from pathlib import Path

SECRETS = {
    "postgres_password": "POSTGRES_PASSWORD",
    "directus_secret": "DIRECTUS_SECRET",
    "admin_email": "ADMIN_EMAIL",
    "admin_password": "ADMIN_PASSWORD",
    "admin_token": "ADMIN_TOKEN",
    "owner_email": "OWNER_EMAIL",
    "owner_password": "OWNER_PASSWORD",
    "ai_email": "AI_EMAIL",
    "ai_password": "AI_PASSWORD",
    "api_email": "API_EMAIL",
    "api_password": "API_PASSWORD",
    "api_token": "API_TOKEN",
    "publication_hook_secret": "PUBLICATION_HOOK_SECRET",
}
# The API skips site builds while the owner has not created the GitHub token.
OPTIONAL_SECRETS = {
    "site_build_token": "SITE_BUILD_TOKEN",
    "model_api_key": "MODEL_API_KEY",
    "smtp_password": "SMTP_PASSWORD",
}
RELEASE_KEYS = {
    "staging": ("directus", "api", "provision", "site"),
    "prod": ("directus", "api", "provision"),
}
OPERATIONS_WITH_RELEASE = ("apply", "plan")


class DeliveryInputError(Exception):
    """A message safe to print: it never contains a secret value."""


def delivery_generation(now_ns):
    """Milliseconds since the epoch. Staging has two writers (code deliveries and content builds):
    the controller must accept whichever delivers last, including a re-run."""
    return now_ns // 1_000_000


def read_secrets(environ):
    missing = [name for name in SECRETS.values() if not environ.get(name)]
    if missing:
        raise DeliveryInputError(
            "Missing GitHub environment secrets or variables: " + ", ".join(missing)
        )
    required = {key: environ[name] for key, name in SECRETS.items()}
    optional = {key: environ.get(name, "") for key, name in OPTIONAL_SECRETS.items()}
    return {**required, **optional}


def read_release(environment, raw_release):
    keys = RELEASE_KEYS[environment]
    try:
        release = json.loads(raw_release or "{}")
    except json.JSONDecodeError:
        raise DeliveryInputError("The release input is not JSON.") from None
    if not isinstance(release, dict) or not all(isinstance(release.get(key), str) for key in keys):
        raise DeliveryInputError("Incomplete release input: images expected for " + ", ".join(keys) + ".")
    return {key: release[key] for key in keys}


def build_inputs(environ, now_ns):
    environment = environ.get("TARGET_ENVIRONMENT", "")
    if environment not in RELEASE_KEYS:
        raise DeliveryInputError("Unknown target environment: " + environment)
    operation = environ.get("OPERATION", "")
    delivery = {
        "target_environment": environment,
        "operation": operation,
        "release_generation": delivery_generation(now_ns),
    }
    if operation not in OPERATIONS_WITH_RELEASE:
        return {"portfolio_secrets": {}}, delivery
    release = read_release(environment, environ.get("RELEASE"))
    return {"portfolio_secrets": read_secrets(environ)}, {**delivery, "portfolio_release": release}


def write_private(path, data):
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, "w") as file:
        json.dump(data, file)


def main(directory):
    try:
        secrets, delivery = build_inputs(os.environ, time.time_ns())
    except DeliveryInputError as error:
        print(error, file=sys.stderr)
        raise SystemExit(1) from None
    write_private(Path(directory) / "secrets.json", secrets)
    write_private(Path(directory) / "delivery.json", delivery)


if __name__ == "__main__":
    main(sys.argv[1])
