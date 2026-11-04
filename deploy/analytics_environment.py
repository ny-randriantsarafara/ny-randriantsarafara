"""Checks that a rendered delivery gives analytics what it needs on each service.

Directus (scheduled rollups), the provisioning job (dashboard defaults and history backfill) and the
API (new telemetry) each read ANALYTICS_ENVIRONMENT; without it they fall back to local.

The Directus analytics endpoint resolves access from the role ids that provisioning creates; without
them, Directus skips the endpoint and the dashboard panels that call it answer 404.
"""

ANALYTICS_SERVICES = ("directus", "provision", "api")
ANALYTICS_ROLE_VARIABLES = ("OWNER_ROLE_ID", "AI_ROLE_ID", "API_ROLE_ID")


def analytics_environment_errors(compose, environment):
    """Returns one readable message per service whose label differs from the environment."""
    services = compose.get("services", {})
    errors = []
    for name in ANALYTICS_SERVICES:
        label = services.get(name, {}).get("environment", {}).get("ANALYTICS_ENVIRONMENT")
        if label != environment:
            errors.append(f"{name} sets ANALYTICS_ENVIRONMENT to {label!r}, expected {environment!r}.")
    return errors


def analytics_role_errors(compose):
    """Returns one readable message per role id that Directus lacks or reads differently."""
    services = compose.get("services", {})
    directus = services.get("directus", {}).get("environment", {})
    provision = services.get("provision", {}).get("environment", {})
    errors = []
    for variable in ANALYTICS_ROLE_VARIABLES:
        expected = provision.get(variable)
        actual = directus.get(variable)
        if not actual or actual != expected:
            errors.append(f"directus sets {variable} to {actual!r}, expected the provisioned {expected!r}.")
    return errors


def preview_environment_errors(compose, site_hostname):
    """Refuse a preview that could dispatch production jobs or export visitor events there."""
    services = compose.get("services", {})
    api = services.get("api", {}).get("environment", {})
    directus = services.get("directus", {}).get("environment", {})
    errors = []
    for variable in ("SITE_BUILD_ENVIRONMENT", "SITE_BUILD_REPOSITORY", "SITE_BUILD_TOKEN"):
        if api.get(variable) != "":
            errors.append(f"Preview must clear {variable}.")
    if api.get("CORS_ALLOWED_ORIGINS") != "https://" + site_hostname:
        errors.append("Preview CORS must use only its own site origin.")
    if directus.get("PUBLICATION_HOOK_URL") != "http://api:8067/internal/publications/activated":
        errors.append("Preview publication hook must stay on its internal API.")
    return errors
