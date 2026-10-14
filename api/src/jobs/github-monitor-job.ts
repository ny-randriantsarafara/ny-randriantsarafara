import type { SiteBuildConfiguration } from '../environment.ts';
import { parisDayKey } from '../time/paris-calendar.ts';
import type { RaiseAlert } from '../alerts/raise-alert.ts';

const MONITOR_WORKFLOW = 'monitor.yml';

export type GitHubMonitorJob = {
  run(): Promise<void>;
};

export type GitHubMonitorDependencies = {
  configuration: SiteBuildConfiguration | null;
  fetchImpl: typeof fetch;
  raiseAlert: RaiseAlert;
  clock: () => Date;
  log: (message: string) => void;
};

export function createGitHubMonitorJob(dependencies: GitHubMonitorDependencies): GitHubMonitorJob {
  return {
    run: () => runGitHubMonitor(dependencies),
  };
}

async function runGitHubMonitor(dependencies: GitHubMonitorDependencies): Promise<void> {
  const configuration = dependencies.configuration;
  if (configuration === null || configuration.token === null) {
    return;
  }
  const repository = configuration.repository;
  const token = configuration.token;
  const repoResponse = await dependencies.fetchImpl(
    `https://api.github.com/repos/${repository}`,
    githubHeaders(token)
  );
  if (repoResponse.status === 401 || repoResponse.status === 403) {
    const day = parisDayKey(dependencies.clock);
    await dependencies.raiseAlert({
      kind: 'github-token',
      dedupKey: `github-token:${day}`,
      subject: 'GitHub token rejected',
      text: 'The site build token was rejected by the GitHub API.',
      details: { status: repoResponse.status },
    });
    return;
  }
  if (!repoResponse.ok) {
    dependencies.log(`GitHub repository check failed with status ${repoResponse.status}.`);
    return;
  }
  const workflowResponse = await dependencies.fetchImpl(
    `https://api.github.com/repos/${repository}/actions/workflows/${MONITOR_WORKFLOW}`,
    githubHeaders(token)
  );
  if (workflowResponse.status === 404) {
    dependencies.log('GitHub monitor workflow is not created yet.');
    return;
  }
  if (!workflowResponse.ok) {
    dependencies.log(
      `GitHub monitor workflow lookup failed with status ${workflowResponse.status}.`
    );
    return;
  }
  const workflow = await readWorkflowState(workflowResponse);
  if (workflow.state !== 'disabled_inactivity') {
    return;
  }
  const enableResponse = await dependencies.fetchImpl(
    `https://api.github.com/repos/${repository}/actions/workflows/${MONITOR_WORKFLOW}/enable`,
    { ...githubHeaders(token), method: 'PUT' }
  );
  if (!enableResponse.ok) {
    dependencies.log(`GitHub monitor enable failed with status ${enableResponse.status}.`);
    return;
  }
  dependencies.log('GitHub monitor workflow re-enabled after inactivity.');
}

function githubHeaders(token: string): RequestInit {
  return {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'portfolio-api',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  };
}

async function readWorkflowState(response: Response): Promise<{ state: string }> {
  const body: unknown = await response.json();
  if (!isRecord(body) || typeof body.state !== 'string') {
    throw new Error('GitHub workflow response was missing state.');
  }
  return { state: body.state };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
