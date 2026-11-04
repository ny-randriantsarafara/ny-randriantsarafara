"""Check privilege, gate and serialization boundaries in the actual workflow graph."""
import unittest
import os
import subprocess
import tempfile
import json
from pathlib import Path
import yaml

WORKFLOWS = Path(__file__).parent.parent / '.github/workflows'


def workflow(name):
    return yaml.safe_load((WORKFLOWS / f'{name}.yml').read_text())


class WorkflowBoundariesTest(unittest.TestCase):
    def test_release_waits_for_all_current_ci_gates_without_staging(self):
        ci = workflow('ci')
        self.assertEqual(set(ci['jobs']['release']['needs']), {'checks', 'e2e', 'lighthouse', 'integration', 'delivery', 'images'})
        self.assertNotIn('staging', ci['jobs'])
        self.assertNotIn('production', ci['jobs'])
        self.assertIn("github.event_name == 'push'", ci['jobs']['release']['if'])

    def test_production_admission_precedes_shared_delivery_lock(self):
        production = workflow('production')
        self.assertNotIn('concurrency', production)
        self.assertNotIn('concurrency', production['jobs']['release'])
        delivery = production['jobs']['deploy']
        self.assertEqual(delivery['needs'], 'release')
        self.assertEqual(delivery['concurrency'], {'group':'production', 'queue':'max', 'cancel-in-progress':False})
        self.assertEqual(delivery['uses'], './.github/workflows/production-delivery.yml')
        operations = workflow('production-delivery')['jobs']
        self.assertEqual(operations['record']['needs'], ['deploy'])
        self.assertEqual(operations['record']['if'], "github.ref == 'refs/heads/main'")
        self.assertEqual(operations['site']['needs'], ['record'])
        self.assertEqual(operations['pages']['needs'], ['site'])
        steps = workflow('deploy')['jobs']['deliver']['steps']
        names = [step['name'] for step in steps]
        self.assertLess(names.index('Revalidate production immediately before private inputs'), names.index('Private production inputs'))

    def test_content_and_code_serialize_pages_with_production_release_tag(self):
        content = workflow('content')
        self.assertEqual(content['concurrency'], {'group':'production', 'queue':'max', 'cancel-in-progress':False})
        self.assertEqual(set(content['jobs']), {'production-release', 'production-site', 'production-pages'})
        self.assertIn('production-release', str(content['jobs']['production-release']['steps']))

    def test_preview_reconciles_current_pr_under_one_noncancelling_lock(self):
        preview = workflow('preview')
        self.assertEqual(preview['concurrency']['cancel-in-progress'], False)
        reconcile = preview['jobs']['reconcile']
        self.assertIn('head.repo.full_name == github.repository', reconcile['if'])
        self.assertIn('gh api', str(reconcile['steps']))
        self.assertIn('preview_operation.py', str(reconcile['steps']))
        self.assertIn("operation == 'destroy'", preview['jobs']['deploy']['if'])
        ci_preview = workflow('ci')['jobs']['preview']
        self.assertEqual(set(ci_preview['needs']), {'checks', 'e2e', 'lighthouse', 'integration', 'delivery', 'images'})
        self.assertIn('draft == false', ci_preview['if'])

    def test_preview_never_receives_production_dispatch_or_pages_rights(self):
        preview = workflow('preview')
        self.assertNotIn('pages', str(preview.get('permissions', {})))
        self.assertEqual(preview['jobs']['deploy']['with']['github-environment'], 'nonprod')
        site = workflow('site')
        steps = site['jobs']['export']['steps']
        artifact = next(step for step in steps if step['name'] == 'Pages artifact')
        self.assertEqual(artifact['if'], "inputs.environment == 'prod'")
        build = next(step for step in steps if step['name'] == 'Static export')
        self.assertEqual(build['env']['NEXT_PUBLIC_API_URL'], '${{ steps.hosts.outputs.api-url }}')
        publication = next(step for step in steps if step['name'] == 'Publication')
        self.assertIn('PREVIEW_CONTENT', publication['env'])
        deploy = workflow('deploy')['jobs']['deliver']['steps']
        preview_inputs = next(step for step in deploy if step['name'] == 'Private preview inputs')
        self.assertNotIn('SITE_BUILD_TOKEN', preview_inputs['env'])
        self.assertNotIn('MODEL_API_KEY', preview_inputs['env'])
        cleanup = next(step for step in deploy if step['name'] == 'Private cleanup inputs')
        self.assertEqual(set(cleanup['env']), {'VPS_SSH_PRIVATE_KEY'})


    def test_production_content_build_works_without_preview_helpers_in_old_release(self):
        steps = workflow('site')['jobs']['export']['steps']
        script = next(step['run'] for step in steps if step['name'] == 'Instance addresses')
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'deploy').mkdir()
            (root / 'deploy' / 'instances.json').write_text(json.dumps({'prod': {
                'site':'nyhasinavalona.com', 'api':'api.nyhasinavalona.com'
            }}))
            git_directory = subprocess.check_output(['git', 'rev-parse', '--absolute-git-dir'], text=True).strip()
            output = root / 'github-output'
            subprocess.run(['bash', '-e', '-c', script], cwd=root,
                           env={**os.environ, 'GIT_DIR':git_directory, 'TARGET_ENVIRONMENT':'prod', 'PULL_REQUEST':'0', 'GITHUB_OUTPUT':str(output)}, check=True)
            values = dict(line.split('=',1) for line in output.read_text().splitlines())
            self.assertEqual(values['site-url'], 'https://nyhasinavalona.com')
            self.assertEqual(values['api-url'], 'https://api.nyhasinavalona.com')


    def test_two_valid_code_and_content_operations_share_nonreplacing_pending_queue(self):
        # GitHub's native queue:max contract retains up to100 pending entrants.
        # Both producers must opt in: a single default/single entrant can replace one.
        code = workflow('production')['jobs']['deploy']
        content = workflow('content')
        locks = [code['concurrency'], content['concurrency']]
        self.assertEqual({lock['group'] for lock in locks}, {'production'})
        self.assertTrue(all(lock.get('queue') == 'max' for lock in locks))
        self.assertTrue(all(lock.get('cancel-in-progress') is False for lock in locks))
        self.assertEqual(code['needs'], 'release')
        self.assertNotIn('concurrency', workflow('production')['jobs']['release'])
