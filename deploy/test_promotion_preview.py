import copy
import importlib.util
import unittest
from pathlib import Path

HERE = Path(__file__).parent
REPO = "ny-randriantsarafara/ny-randriantsarafara"
SHA = "a" * 40


def load_policy(name):
    path = HERE / (name + ".py")
    if not path.exists():
        raise AssertionError("Missing delivery policy: " + name)
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def ci_run():
    return {"id": 123, "name": "CI", "path": ".github/workflows/ci.yml", "event": "push",
            "head_branch": "main", "head_sha": SHA, "status": "completed", "conclusion": "success",
            "repository": {"full_name": REPO}, "head_repository": {"full_name": REPO}}


def release():
    return {"commit": SHA, **{target: f"ghcr.io/ny-randriantsarafara/portfolio:{target}-{SHA}@sha256:" + "1"*64
                            for target in ("directus", "api", "provision")}}


class PromotionTest(unittest.TestCase):
    def test_accepts_current_successful_main_push_and_matching_immutable_images(self):
        policy = load_policy("validate_promotion")
        self.assertEqual(policy.validate_run(ci_run(), REPO, "123", SHA), SHA)
        self.assertEqual(policy.validate_release(release(), REPO, SHA), release())

    def test_refuses_stale_fork_dispatch_wrong_workflow_or_failed_ci(self):
        policy = load_policy("validate_promotion")
        for key, value in (("event", "pull_request"), ("event", "workflow_dispatch"), ("name", "Other"),
                           ("path", ".github/workflows/fake.yml"), ("head_branch", "branch"),
                           ("conclusion", "failure"), ("status", "in_progress"),
                           ("head_repository", {"full_name": "fork/repo"}), ("repository", {"full_name": "fork/repo"}),
                           ("head_sha", "b"*40), ("id", 999)):
            run = {**ci_run(), key: value}
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                policy.validate_run(run, REPO, "123", SHA)

    def test_manual_rollback_accepts_prior_trusted_main_push(self):
        self.assertEqual(load_policy("validate_promotion").validate_run(ci_run(), REPO, "123"), SHA)

    def test_refuses_release_with_wrong_commit_target_or_mutable_images(self):
        policy = load_policy("validate_promotion")
        for key, value in (("commit", "b"*40), ("api", "ghcr.io/attacker/portfolio@sha256:"+"1"*64),
                           ("directus", "ghcr.io/ny-randriantsarafara/portfolio:latest"), ("provision", release()["api"])):
            with self.subTest(key=key), self.assertRaises(ValueError):
                policy.validate_release({**release(), key:value}, REPO, SHA)


class PreviewLifecycleTest(unittest.TestCase):
    def pull_request(self):
        return {"number":42, "state":"open", "draft":False,
                "head":{"sha":SHA, "repo":{"full_name":REPO}}, "base":{"repo":{"full_name":REPO}}}

    def test_closed_current_pr_is_destroyed_even_for_delayed_successful_ci(self):
        operation = load_policy("preview_operation").preview_operation
        pr = {**self.pull_request(), "state":"closed"}
        self.assertEqual(operation(pr, REPO, 42, SHA, True), "destroy")

    def test_only_current_checked_nondraft_head_can_apply(self):
        operation = load_policy("preview_operation").preview_operation
        pr = self.pull_request()
        self.assertEqual(operation(pr, REPO, 42, SHA, True), "apply")
        self.assertEqual(operation(pr, REPO, 42, "b"*40, True), "skip")
        self.assertEqual(operation(pr, REPO, 42, SHA, False), "skip")
        self.assertEqual(operation({**pr, "draft":True}, REPO, 42, SHA, True), "skip")
        fork = copy.deepcopy(pr)
        fork["head"]["repo"]["full_name"] = "fork/repo"
        with self.assertRaises(ValueError):
            operation(fork, REPO, 42, SHA, True)
