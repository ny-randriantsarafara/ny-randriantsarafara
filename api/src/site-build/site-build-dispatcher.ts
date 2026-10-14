import type { SiteBuildConfiguration, SiteEnvironment } from '../environment.ts';

export type SiteBuildOutcome =
  | { status: 'dispatched'; environment: SiteEnvironment }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string };

export type SiteBuildDispatcher = {
  dispatch(): Promise<SiteBuildOutcome>;
};

export type SiteBuildFetch = (url: string, init: RequestInit) => Promise<Response>;

// The workflow and branch the GitHub token may dispatch (fine-grained token, actions: write).
const CONTENT_WORKFLOW = 'content.yml';
const WORKFLOW_REF = 'main';
// Directus waits 10 s for the whole publication hook, reload included.
const DISPATCH_TIMEOUT_SECONDS = 5;

export function createSiteBuildDispatcher(
  configuration: SiteBuildConfiguration | null,
  fetchDispatch: SiteBuildFetch
): SiteBuildDispatcher {
  return {
    dispatch: () => dispatchSiteBuild(configuration, fetchDispatch),
  };
}

async function dispatchSiteBuild(
  configuration: SiteBuildConfiguration | null,
  fetchDispatch: SiteBuildFetch
): Promise<SiteBuildOutcome> {
  if (configuration === null) {
    return { status: 'skipped', reason: 'site builds are not configured' };
  }
  if (configuration.token === null) {
    return { status: 'skipped', reason: 'SITE_BUILD_TOKEN is not set' };
  }
  try {
    const response = await fetchDispatch(dispatchUrl(configuration.repository), {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${configuration.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'portfolio-api',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        ref: WORKFLOW_REF,
        inputs: { environment: configuration.environment },
      }),
      signal: AbortSignal.timeout(DISPATCH_TIMEOUT_SECONDS * 1000),
    });
    return describeResponse(response, configuration.environment);
  } catch (error) {
    return { status: 'failed', reason: describeNetworkFailure(error) };
  }
}

function dispatchUrl(repository: string): string {
  return `https://api.github.com/repos/${repository}/actions/workflows/${CONTENT_WORKFLOW}/dispatches`;
}

function describeResponse(response: Response, environment: SiteEnvironment): SiteBuildOutcome {
  if (response.ok) {
    return { status: 'dispatched', environment };
  }
  if (response.status === 401 || response.status === 403) {
    return { status: 'failed', reason: `GitHub rejected the token (HTTP ${response.status})` };
  }
  return { status: 'failed', reason: `GitHub answered HTTP ${response.status}` };
}

function describeNetworkFailure(error: unknown): string {
  if (error instanceof Error && error.name === 'TimeoutError') {
    return `GitHub did not answer within ${DISPATCH_TIMEOUT_SECONDS} s`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'network failure';
}

export function describeSiteBuildOutcome(outcome: SiteBuildOutcome): string {
  if (outcome.status === 'dispatched') {
    return `Site build dispatched for ${outcome.environment}`;
  }
  if (outcome.status === 'skipped') {
    return `Site build skipped: ${outcome.reason}`;
  }
  return `Site build dispatch failed: ${outcome.reason}`;
}
