"""Validates a rendered delivery with the VPS controller's own rules, before any request.

Usage: PYTHONPATH=<ny.vps collection>/roles/controller/files python3 deploy/check_delivery.py <rendered.json> <preview|prod>
Builds the platform policy of the portfolio accounts and hostnames, normalizes the delivery as the
controller does, then compares its total with instance_budget in deploy/ansible/environments.
The rendered file holds secrets: this script prints only hostnames and limits.
"""

import json
import sys
from pathlib import Path

import yaml
from vps_platform.compose import normalize
from vps_platform.policy import Policy, Refused

from delivery_inputs import instance_hostnames

from analytics_environment import analytics_environment_errors, analytics_role_errors, preview_environment_errors

DEPLOY_DIR = Path(__file__).resolve().parent
DOMAIN = "apps.nyhasinavalona.com"
INSTANCES = {"preview": "portfolio-pr-", "prod": "portfolio-prod"}


def fail(message):
    print(message, file=sys.stderr)
    raise SystemExit(1)


def platform_policy(hostnames):
    production = hostnames["prod"]
    return Policy(
        {
            "domain": DOMAIN,
            "accounts": {
                "portfolio-nonprod": {"application": "portfolio", "environments": ["preview"]},
                "portfolio-prod": {"application": "portfolio", "environments": ["prod"]},
            },
            "instance_hostnames": {"portfolio-prod": [production["api"], production["cms"]]},
        }
    )


def read_instance_budget(environment):
    path = DEPLOY_DIR / "ansible" / "environments" / f"{environment}.yml"
    return yaml.safe_load(path.read_text())["instance_budget"]


def exceeds(budget, limit):
    return budget["cpus"] > limit["cpus"] or budget["memory_mib"] > limit["memory_mib"]


def main(rendered_path, environment, pull_request="42"):
    if environment not in INSTANCES:
        fail("Unknown environment: " + environment)
    rendered = json.loads(Path(rendered_path).read_text())
    hostnames = json.loads((DEPLOY_DIR / "instances.json").read_text())
    addresses = instance_hostnames(environment, pull_request)
    instance = "portfolio-pr-" + pull_request if environment == "preview" else "portfolio-prod"
    payload = {"compose": rendered["compose"], "routes": rendered["routes"]}
    try:
        _, budget, routes = normalize(payload, platform_policy(hostnames), instance, {})
    except Refused as refusal:
        fail(f"The controller would refuse {instance}: {refusal}")
    label_errors = analytics_environment_errors(rendered["compose"], "staging" if environment == "preview" else "prod")
    if label_errors:
        fail("Wrong telemetry label: " + " ".join(label_errors))
    if environment == "preview":
        isolation_errors = preview_environment_errors(rendered["compose"], addresses["site"])
        if isolation_errors:
            fail("Preview isolation failed: " + " ".join(isolation_errors))
    role_errors = analytics_role_errors(rendered["compose"])
    if role_errors:
        fail("Analytics roles missing: " + " ".join(role_errors))
    limit = read_instance_budget(environment)
    if exceeds(budget, limit):
        fail(
            f"{instance} declares {budget['cpus']} vCPU / {budget['memory_mib']:.0f} MiB, "
            f"above its share of {limit['cpus']} vCPU / {limit['memory_mib']} MiB."
        )
    routed = ", ".join(f"{route['hostname']} -> {route['service']}:{route['port']}" for route in routes)
    print(
        f"{instance} accepted: {budget['cpus']} vCPU / {budget['memory_mib']:.0f} MiB "
        f"of {limit['cpus']} / {limit['memory_mib']}; routes {routed}."
    )


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "42")
