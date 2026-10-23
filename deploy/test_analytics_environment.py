import unittest
from pathlib import Path

import yaml

from analytics_environment import ANALYTICS_SERVICES, analytics_environment_errors

DEPLOY_DIR = Path(__file__).resolve().parent


def compose_with(labels):
    return {"services": {name: {"environment": {"ANALYTICS_ENVIRONMENT": label}} for name, label in labels.items()}}


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


class DeliveryTemplateTest(unittest.TestCase):
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
