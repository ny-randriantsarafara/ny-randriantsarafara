import unittest
from pathlib import Path

import yaml

from analytics_environment import (
    ANALYTICS_ROLE_VARIABLES,
    ANALYTICS_SERVICES,
    analytics_environment_errors,
    analytics_role_errors,
)

DEPLOY_DIR = Path(__file__).resolve().parent

ROLE_IDS = {
    "OWNER_ROLE_ID": "owner-role",
    "AI_ROLE_ID": "assistant-role",
    "API_ROLE_ID": "api-role",
}


def compose_with(labels):
    return {"services": {name: {"environment": {"ANALYTICS_ENVIRONMENT": label}} for name, label in labels.items()}}


def compose_with_roles(directus_roles):
    return {
        "services": {
            "directus": {"environment": directus_roles},
            "provision": {"environment": dict(ROLE_IDS)},
        }
    }


class AnalyticsEnvironmentTest(unittest.TestCase):
    def test_accepts_the_instance_label_on_every_service(self):
        compose = compose_with({name: "staging" for name in ANALYTICS_SERVICES})

        self.assertEqual(analytics_environment_errors(compose, "staging"), [])

    def test_names_a_service_without_the_label(self):
        compose = compose_with({"directus": "prod", "provision": "prod"})
        compose["services"]["api"] = {"environment": {}}

        self.assertEqual(
            analytics_environment_errors(compose, "prod"),
            ["api sets ANALYTICS_ENVIRONMENT to None, expected 'prod'."],
        )

    def test_names_a_service_with_another_label(self):
        compose = compose_with({"directus": "local", "provision": "staging", "api": "staging"})

        self.assertEqual(
            analytics_environment_errors(compose, "staging"),
            ["directus sets ANALYTICS_ENVIRONMENT to 'local', expected 'staging'."],
        )


class AnalyticsRolesTest(unittest.TestCase):
    def test_accepts_directus_with_the_provisioned_roles(self):
        self.assertEqual(analytics_role_errors(compose_with_roles(dict(ROLE_IDS))), [])

    def test_names_a_role_directus_does_not_receive(self):
        roles = {"OWNER_ROLE_ID": "owner-role", "AI_ROLE_ID": "assistant-role"}

        self.assertEqual(
            analytics_role_errors(compose_with_roles(roles)),
            ["directus sets API_ROLE_ID to None, expected the provisioned 'api-role'."],
        )

    def test_names_a_role_that_differs_from_provisioning(self):
        roles = {**ROLE_IDS, "OWNER_ROLE_ID": "other-role"}

        self.assertEqual(
            analytics_role_errors(compose_with_roles(roles)),
            ["directus sets OWNER_ROLE_ID to 'other-role', expected the provisioned 'owner-role'."],
        )


class DeliveryTemplateTest(unittest.TestCase):
    def test_directus_reads_every_provisioned_role(self):
        template = (DEPLOY_DIR / "compose.yml.j2").read_text()

        for variable, key in zip(ANALYTICS_ROLE_VARIABLES, ("owner", "assistant", "api")):
            self.assertEqual(
                template.count(f"{variable}: {{{{ portfolio_role_ids.{key} | to_json }}}}"),
                2,
                variable,
            )

    def test_every_analytics_service_reads_the_instance_label(self):
        template = (DEPLOY_DIR / "compose.yml.j2").read_text()

        self.assertEqual(
            template.count("ANALYTICS_ENVIRONMENT: {{ portfolio_analytics_environment | to_json }}"),
            len(ANALYTICS_SERVICES),
        )

    def test_the_label_is_the_target_environment(self):
        playbook = yaml.safe_load((DEPLOY_DIR / "ansible" / "deploy.yml").read_text())

        self.assertEqual(playbook[0]["vars"]["portfolio_analytics_environment"], "{{ target_environment }}")


if __name__ == "__main__":
    unittest.main()
