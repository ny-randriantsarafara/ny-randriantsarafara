export type MonthlyBudgetSource = {
  sumMonthToDateCostEur(monthStartIso: string): Promise<number>;
};

export type MonthlyBudgetStatus = 'within_budget' | 'exhausted' | 'unavailable';

export type MonthlyBudgetGate = {
  readStatus(): Promise<MonthlyBudgetStatus>;
};

export type MonthlyBudgetGateDependencies = {
  source: MonthlyBudgetSource;
  budgetEur: number;
  monthStartIso: () => string;
  clock: () => Date;
  cacheTtlMilliseconds: number;
  log: (message: string) => void;
};

type CacheEntry = {
  sumEur: number;
  expiresAtMilliseconds: number;
};

export function createMonthlyBudgetGate(
  dependencies: MonthlyBudgetGateDependencies
): MonthlyBudgetGate {
  const cache: { current: CacheEntry | null } = { current: null };

  return {
    async readStatus(): Promise<MonthlyBudgetStatus> {
      const sum = await readCachedSum(cache, dependencies);
      if (sum === null) {
        dependencies.log('Monthly budget unavailable: falling back to scripted mode.');
        return 'unavailable';
      }
      if (sum >= dependencies.budgetEur) {
        return 'exhausted';
      }
      return 'within_budget';
    },
  };
}

async function readCachedSum(
  cache: { current: CacheEntry | null },
  dependencies: MonthlyBudgetGateDependencies
): Promise<number | null> {
  const now = dependencies.clock().getTime();
  if (cache.current !== null && cache.current.expiresAtMilliseconds > now) {
    return cache.current.sumEur;
  }
  try {
    const sumEur = await dependencies.source.sumMonthToDateCostEur(dependencies.monthStartIso());
    cache.current = {
      sumEur,
      expiresAtMilliseconds: now + dependencies.cacheTtlMilliseconds,
    };
    return sumEur;
  } catch {
    return null;
  }
}

export function createBudgetUnavailableGate(): MonthlyBudgetGate {
  return {
    async readStatus(): Promise<MonthlyBudgetStatus> {
      return 'unavailable';
    },
  };
}

export function createWithinBudgetGate(): MonthlyBudgetGate {
  return {
    async readStatus(): Promise<MonthlyBudgetStatus> {
      return 'within_budget';
    },
  };
}
