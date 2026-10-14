import json
import os
import stat
import tempfile
import unittest
from pathlib import Path

from delivery_inputs import (
    SECRETS,
    DeliveryInputError,
    build_inputs,
    delivery_generation,
    write_private,
)

NOW_NS = 1_760_000_000_123_456_789
IMAGES = {
    "directus": "ghcr.io/owner/portfolio:directus-abc@sha256:" + "1" * 64,
    "api": "ghcr.io/owner/portfolio:api-abc@sha256:" + "2" * 64,
    "provision": "ghcr.io/owner/portfolio:provision-abc@sha256:" + "3" * 64,
    "site": "ghcr.io/owner/portfolio:site-abc@sha256:" + "4" * 64,
}


def secret_environment():
    return {name: f"value-of-{name.lower()}" for name in SECRETS.values()}


def delivery_environment(environment, operation="apply", release=None, **overrides):
    images = IMAGES if release is None else release
    return {
        "TARGET_ENVIRONMENT": environment,
        "OPERATION": operation,
        "RELEASE": json.dumps(images),
        **secret_environment(),
        **overrides,
    }


class DeliveryGenerationTest(unittest.TestCase):
    def test_counts_milliseconds_since_the_epoch(self):
        self.assertEqual(delivery_generation(NOW_NS), 1_760_000_000_123)

    def test_grows_with_time(self):
        self.assertLess(delivery_generation(NOW_NS), delivery_generation(NOW_NS + 1_000_000))


class BuildInputsTest(unittest.TestCase):
    def test_staging_apply_carries_every_secret_and_the_four_images(self):
        secrets, delivery = build_inputs(delivery_environment("staging"), NOW_NS)

        self.assertEqual(
            set(secrets["portfolio_secrets"]),
            set(SECRETS) | {"site_build_token", "model_api_key", "smtp_password"},
        )
        self.assertEqual(secrets["portfolio_secrets"]["api_token"], "value-of-api_token")
        self.assertEqual(delivery["target_environment"], "staging")
        self.assertEqual(delivery["operation"], "apply")
        self.assertEqual(delivery["release_generation"], 1_760_000_000_123)
        self.assertEqual(delivery["portfolio_release"], IMAGES)

    def test_production_keeps_only_its_three_images(self):
        _, delivery = build_inputs(delivery_environment("prod"), NOW_NS)

        self.assertEqual(set(delivery["portfolio_release"]), {"directus", "api", "provision"})

    def test_site_build_token_defaults_to_empty(self):
        secrets, _ = build_inputs(delivery_environment("staging"), NOW_NS)

        self.assertEqual(secrets["portfolio_secrets"]["site_build_token"], "")
        self.assertEqual(secrets["portfolio_secrets"]["model_api_key"], "")
        self.assertEqual(secrets["portfolio_secrets"]["smtp_password"], "")

    def test_site_build_token_is_passed_when_set(self):
        environ = delivery_environment("staging", SITE_BUILD_TOKEN="github-token")
        secrets, _ = build_inputs(environ, NOW_NS)

        self.assertEqual(secrets["portfolio_secrets"]["site_build_token"], "github-token")

    def test_operations_without_release_need_no_secret(self):
        environ = {"TARGET_ENVIRONMENT": "prod", "OPERATION": "status"}
        secrets, delivery = build_inputs(environ, NOW_NS)

        self.assertEqual(secrets, {"portfolio_secrets": {}})
        self.assertNotIn("portfolio_release", delivery)

    def test_refuses_an_unknown_environment(self):
        with self.assertRaisesRegex(DeliveryInputError, "Unknown target environment: preview"):
            build_inputs(delivery_environment("preview"), NOW_NS)

    def test_names_missing_secrets_without_printing_values(self):
        environ = delivery_environment("staging", API_TOKEN="", OWNER_PASSWORD="")

        with self.assertRaises(DeliveryInputError) as raised:
            build_inputs(environ, NOW_NS)

        message = str(raised.exception)
        self.assertIn("OWNER_PASSWORD", message)
        self.assertIn("API_TOKEN", message)
        self.assertNotIn("value-of-", message)

    def test_refuses_a_release_that_is_not_json(self):
        environ = {**delivery_environment("staging"), "RELEASE": "{not json"}

        with self.assertRaisesRegex(DeliveryInputError, "not JSON"):
            build_inputs(environ, NOW_NS)

    def test_refuses_a_release_without_the_site_image_on_staging(self):
        release = {key: value for key, value in IMAGES.items() if key != "site"}

        with self.assertRaisesRegex(DeliveryInputError, "directus, api, provision, site"):
            build_inputs(delivery_environment("staging", release=release), NOW_NS)

    def test_refuses_a_release_that_is_not_an_object(self):
        environ = {**delivery_environment("prod"), "RELEASE": "[]"}

        with self.assertRaisesRegex(DeliveryInputError, "Incomplete release input"):
            build_inputs(environ, NOW_NS)


class WritePrivateTest(unittest.TestCase):
    def test_writes_json_readable_by_the_owner_only(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "secrets.json"
            write_private(path, {"portfolio_secrets": {"api_token": "token"}})

            self.assertEqual(json.loads(path.read_text()), {"portfolio_secrets": {"api_token": "token"}})
            self.assertEqual(stat.S_IMODE(os.stat(path).st_mode), 0o600)


if __name__ == "__main__":
    unittest.main()
