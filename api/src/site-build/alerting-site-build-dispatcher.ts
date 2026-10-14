import type { RaiseAlert } from '../alerts/raise-alert.ts';
import { parisDayKey } from '../time/paris-calendar.ts';
import type { SiteBuildDispatcher, SiteBuildOutcome } from './site-build-dispatcher.ts';

export function createAlertingSiteBuildDispatcher(
  inner: SiteBuildDispatcher,
  raiseAlert: RaiseAlert,
  clock: () => Date
): SiteBuildDispatcher {
  return {
    dispatch: () => dispatchWithAlert(inner, raiseAlert, clock),
  };
}

async function dispatchWithAlert(
  inner: SiteBuildDispatcher,
  raiseAlert: RaiseAlert,
  clock: () => Date
): Promise<SiteBuildOutcome> {
  const outcome = await inner.dispatch();
  if (outcome.status !== 'failed') {
    return outcome;
  }
  const day = parisDayKey(clock);
  await raiseAlert({
    kind: 'site-build',
    dedupKey: `site-build:${day}`,
    subject: 'Site build dispatch failed',
    text: 'A publication hook could not dispatch the content workflow.',
    details: { reason: outcome.reason },
  });
  return outcome;
}
