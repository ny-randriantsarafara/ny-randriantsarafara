import type { DirectusMonthlyBudgetSource } from '../budget/directus-monthly-budget-source.ts';
import type { ModelConfiguration } from '../environment.ts';
import { parisHourKey, parisMonthKey, parisMonthStartIso } from '../time/paris-calendar.ts';
import type { RaiseAlert } from './raise-alert.ts';
import type { ModelFailureSource } from './directus-model-failure-source.ts';

const MODEL_FAILURE_WINDOW_MILLISECONDS = 15 * 60_000;
const MODEL_FAILURE_THRESHOLD = 5;

export type AlertChecks = {
  run(): Promise<void>;
};

export type AlertChecksDependencies = {
  modelConfiguration: ModelConfiguration | null;
  budgetSource: DirectusMonthlyBudgetSource;
  modelFailureSource: ModelFailureSource;
  raiseAlert: RaiseAlert;
  clock: () => Date;
};

export function createAlertChecks(dependencies: AlertChecksDependencies): AlertChecks {
  return {
    run: () => runAlertChecks(dependencies),
  };
}

async function runAlertChecks(dependencies: AlertChecksDependencies): Promise<void> {
  if (dependencies.modelConfiguration === null) {
    return;
  }
  await checkBudgetThresholds(dependencies);
  await checkModelFailures(dependencies);
}

async function checkBudgetThresholds(dependencies: AlertChecksDependencies): Promise<void> {
  const configuration = dependencies.modelConfiguration;
  if (configuration === null) {
    return;
  }
  const monthStartIso = parisMonthStartIso(dependencies.clock);
  const spendEur = await dependencies.budgetSource.sumMonthToDateCostEur(monthStartIso);
  const ratio = spendEur / configuration.monthlyBudgetEur;
  const monthKey = parisMonthKey(dependencies.clock);
  if (ratio >= 0.8) {
    await dependencies.raiseAlert({
      kind: 'budget',
      dedupKey: `budget:80:${monthKey}`,
      subject: 'Portfolio model budget at 80%',
      text: `Month-to-date model spend reached ${Math.round(ratio * 100)}% of the configured budget.`,
      details: {
        threshold: 80,
        month: monthKey,
        spendEur,
        budgetEur: configuration.monthlyBudgetEur,
      },
    });
  }
  if (ratio >= 1) {
    await dependencies.raiseAlert({
      kind: 'budget',
      dedupKey: `budget:100:${monthKey}`,
      subject: 'Portfolio model budget exhausted',
      text: 'Month-to-date model spend reached 100% of the configured budget.',
      details: {
        threshold: 100,
        month: monthKey,
        spendEur,
        budgetEur: configuration.monthlyBudgetEur,
      },
    });
  }
}

async function checkModelFailures(dependencies: AlertChecksDependencies): Promise<void> {
  const sinceIso = new Date(
    dependencies.clock().getTime() - MODEL_FAILURE_WINDOW_MILLISECONDS
  ).toISOString();
  const failures = await dependencies.modelFailureSource.countRecentFailures(sinceIso);
  if (failures < MODEL_FAILURE_THRESHOLD) {
    return;
  }
  const hourKey = parisHourKey(dependencies.clock);
  await dependencies.raiseAlert({
    kind: 'model_failures',
    dedupKey: `model-failures:${hourKey}`,
    subject: 'Portfolio model failures',
    text: `${failures} model failures were recorded in the last 15 minutes.`,
    details: { failures, windowMinutes: 15, parisHour: hourKey },
  });
}
