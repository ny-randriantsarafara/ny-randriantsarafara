"""Checks that a rendered delivery labels its telemetry with the instance's own environment.

Directus (scheduled rollups), the provisioning job (dashboard defaults and history backfill) and the
API (new telemetry) each read ANALYTICS_ENVIRONMENT; without it they fall back to local.
"""

ANALYTICS_SERVICES = ("directus", "provision", "api")


def analytics_environment_errors(compose, environment):
    """Returns one readable message per service whose label differs from the environment."""
    services = compose.get("services", {})
    errors = []
    for name in ANALYTICS_SERVICES:
        label = services.get(name, {}).get("environment", {}).get("ANALYTICS_ENVIRONMENT")
        if label != environment:
            errors.append(f"{name} sets ANALYTICS_ENVIRONMENT to {label!r}, expected {environment!r}.")
    return errors
