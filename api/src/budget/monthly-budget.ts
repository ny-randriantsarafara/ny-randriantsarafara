export type MonthlyBudgetSource = {
  sumMonthToDateCostEur(monthStartIso: string): Promise<number>;
};

export type BudgetReservation = {
  // What the generation cost; null when the provider reported no usage, which keeps the estimate.
  settle(costEur: number | null): void;
  // The request never reached the provider.
  cancel(): void;
};

export type BudgetReservationResult =
  | { status: 'reserved'; reservation: BudgetReservation }
  | { status: 'exhausted' }
  | { status: 'unavailable' };

export type MonthlyBudgetGate = {
  reserve(estimateEur: number): Promise<BudgetReservationResult>;
};

export type MonthlyBudgetGateDependencies = {
  source: MonthlyBudgetSource;
  budgetEur: number;
  monthStartIso: () => string;
  clock: () => Date;
  cacheTtlMilliseconds: number;
  log: (message: string) => void;
};

type RecordedSum = {
  sumEur: number;
  expiresAtMilliseconds: number;
};

type BudgetState = {
  monthStartIso: string | null;
  recorded: RecordedSum | null;
  // Reserved by generations still waiting for the provider.
  reservedEur: number;
  // Settled here but not yet seen in the recorded sum, which the exchange recorder feeds later.
  unrecordedEur: number;
};

// Strict within one API process: reservations are checked and taken without yielding, so
// concurrent questions cannot all pass a budget that only one of them fits in.
export function createMonthlyBudgetGate(
  dependencies: MonthlyBudgetGateDependencies
): MonthlyBudgetGate {
  const state: BudgetState = {
    monthStartIso: null,
    recorded: null,
    reservedEur: 0,
    unrecordedEur: 0,
  };

  async function readRecordedSum(): Promise<number | null> {
    const monthStartIso = dependencies.monthStartIso();
    if (monthStartIso !== state.monthStartIso) {
      state.monthStartIso = monthStartIso;
      state.recorded = null;
      state.unrecordedEur = 0;
    }
    const now = dependencies.clock().getTime();
    if (state.recorded !== null && state.recorded.expiresAtMilliseconds > now) {
      return state.recorded.sumEur;
    }
    try {
      const sumEur = await dependencies.source.sumMonthToDateCostEur(monthStartIso);
      const newlyRecordedEur = Math.max(0, sumEur - (state.recorded?.sumEur ?? sumEur));
      state.unrecordedEur = Math.max(0, state.unrecordedEur - newlyRecordedEur);
      state.recorded = { sumEur, expiresAtMilliseconds: now + dependencies.cacheTtlMilliseconds };
      return sumEur;
    } catch {
      return null;
    }
  }

  function createReservation(estimateEur: number): BudgetReservation {
    const lifecycle = { open: true };
    function close(): boolean {
      if (!lifecycle.open) {
        return false;
      }
      lifecycle.open = false;
      state.reservedEur = Math.max(0, state.reservedEur - estimateEur);
      return true;
    }
    return {
      settle(costEur) {
        if (close()) {
          state.unrecordedEur += costEur ?? estimateEur;
        }
      },
      cancel() {
        close();
      },
    };
  }

  return {
    async reserve(estimateEur) {
      const recordedEur = await readRecordedSum();
      if (recordedEur === null) {
        dependencies.log('Monthly budget unavailable: falling back to scripted mode.');
        return { status: 'unavailable' };
      }
      const committedEur = recordedEur + state.unrecordedEur + state.reservedEur;
      if (committedEur + estimateEur > dependencies.budgetEur) {
        return { status: 'exhausted' };
      }
      state.reservedEur += estimateEur;
      return { status: 'reserved', reservation: createReservation(estimateEur) };
    },
  };
}

export function createBudgetUnavailableGate(): MonthlyBudgetGate {
  return {
    async reserve() {
      return { status: 'unavailable' };
    },
  };
}

export function createWithinBudgetGate(): MonthlyBudgetGate {
  return {
    async reserve() {
      return {
        status: 'reserved',
        reservation: {
          settle: () => undefined,
          cancel: () => undefined,
        },
      };
    },
  };
}
