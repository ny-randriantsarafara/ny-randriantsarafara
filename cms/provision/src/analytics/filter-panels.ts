import { analyticsDashboardIds, type OwnedPanelId } from './dashboard-ids.ts';

type PanelSeed = {
  id: OwnedPanelId;
  dashboard: string;
  name: string;
  type: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  options: Record<string, unknown>;
};

type DashboardKey = 'overview' | 'acquisition' | 'journey' | 'chatReview' | 'modelOperations';

type VariableDefinition = {
  field: string;
  name: string;
  placeholder: string;
  position_x: number;
  defaultValue?: string;
};

const variableDefinitions: VariableDefinition[] = [
  {
    field: 'analytics_locale',
    name: 'Locale filter',
    placeholder: 'en or fr (optional)',
    position_x: 1,
  },
  {
    field: 'analytics_environment',
    name: 'Environment filter',
    placeholder: 'local, staging or prod',
    position_x: 14,
    defaultValue: readProvisionAnalyticsEnvironment(),
  },
  {
    field: 'analytics_device_class',
    name: 'Device filter',
    placeholder: 'mobile, tablet or desktop (optional)',
    position_x: 27,
  },
  {
    field: 'analytics_utm_source',
    name: 'UTM source filter',
    placeholder: 'Campaign source (optional)',
    position_x: 1,
  },
  {
    field: 'analytics_model',
    name: 'Model filter',
    placeholder: 'Model id (API panels)',
    position_x: 14,
  },
  {
    field: 'analytics_provider_id',
    name: 'Provider filter',
    placeholder: 'Provider id (API panels)',
    position_x: 27,
  },
  {
    field: 'analytics_publication_id',
    name: 'Publication filter',
    placeholder: 'Publication id (API panels)',
    position_x: 1,
  },
];

const dashboardVariableIds: Record<DashboardKey, OwnedPanelId[]> = {
  overview: [
    'b1000016-0000-4000-8000-000000000016',
    'b1000017-0000-4000-8000-000000000017',
    'b1000018-0000-4000-8000-000000000018',
    'b1000019-0000-4000-8000-000000000019',
    'b1000020-0000-4000-8000-000000000020',
    'b1000021-0000-4000-8000-000000000021',
    'b1000022-0000-4000-8000-000000000022',
  ],
  acquisition: [
    'b1000023-0000-4000-8000-000000000023',
    'b1000024-0000-4000-8000-000000000024',
    'b1000025-0000-4000-8000-000000000025',
    'b1000026-0000-4000-8000-000000000026',
    'b1000027-0000-4000-8000-000000000027',
    'b1000028-0000-4000-8000-000000000028',
    'b1000029-0000-4000-8000-000000000029',
  ],
  journey: [
    'b1000030-0000-4000-8000-000000000030',
    'b1000031-0000-4000-8000-000000000031',
    'b1000032-0000-4000-8000-000000000032',
    'b1000033-0000-4000-8000-000000000033',
    'b1000034-0000-4000-8000-000000000034',
    'b1000035-0000-4000-8000-000000000035',
    'b1000036-0000-4000-8000-000000000036',
  ],
  chatReview: [
    'b1000037-0000-4000-8000-000000000037',
    'b1000038-0000-4000-8000-000000000038',
    'b1000039-0000-4000-8000-000000000039',
    'b1000040-0000-4000-8000-000000000040',
    'b1000041-0000-4000-8000-000000000041',
    'b1000042-0000-4000-8000-000000000042',
    'b1000043-0000-4000-8000-000000000043',
  ],
  modelOperations: [
    'b1000044-0000-4000-8000-000000000044',
    'b1000045-0000-4000-8000-000000000045',
    'b1000046-0000-4000-8000-000000000046',
    'b1000047-0000-4000-8000-000000000047',
    'b1000048-0000-4000-8000-000000000048',
    'b1000049-0000-4000-8000-000000000049',
    'b1000050-0000-4000-8000-000000000050',
  ],
};

const dashboardIdByKey: Record<DashboardKey, string> = {
  overview: analyticsDashboardIds.overview,
  acquisition: analyticsDashboardIds.acquisition,
  journey: analyticsDashboardIds.journey,
  chatReview: analyticsDashboardIds.chatReview,
  modelOperations: analyticsDashboardIds.modelOperations,
};

/**
 * Directus 12.5.0 optional dashboard variable pattern: exact `_eq` when the variable
 * resolves to a non-empty value; the impossible `_and` branch is never satisfied.
 * Empty strings still substitute to invalid `_eq` operands (API rejects them).
 */
export function optionalVariableEqualsFilter(
  field: string,
  variableKey: string
): Record<string, unknown> {
  return {
    _or: [
      { [field]: { _eq: `{{${variableKey}}}` } },
      {
        _and: [{ [field]: { _null: true } }, { [field]: { _nnull: true } }],
      },
    ],
  };
}

/** Native `events` list panels: environment only (the sole filter variable with a default). */
export function eventsVariableFilter(): Record<string, unknown> {
  return dailyStatsVariableFilter();
}

/** `daily_stats` rows are keyed by Paris day and environment. */
export function dailyStatsVariableFilter(): Record<string, unknown> {
  return {
    _and: [optionalVariableEqualsFilter('environment', 'analytics_environment')],
  };
}

export function dashboardSharedFilterNote(): string {
  return (
    'Shared filters: Portfolio API panels ignore empty or cleared inputs. Native Directus metric, time-series and list panels ' +
    'match environment only (defaulted above). Locale, device, UTM, model, provider and publication filters apply to Portfolio ' +
    'API panels only. Directus 12.5.0 cannot treat an unset or blank dashboard variable as “no filter” in native SQL, so native ' +
    'panels never bind optional variables.'
  );
}

export function nativeInsightsPanelNote(): string {
  return (
    'Native Directus panel: environment exact match (defaulted above). Locale, device, UTM, model, provider and publication ' +
    'filters on this dashboard affect Portfolio API panels only.'
  );
}

export function nativeEventsListPanelNote(): string {
  return (
    'Native events list: environment exact match (defaulted above). Use Portfolio API panels or the Events collection for ' +
    'locale, device or UTM breakdowns.'
  );
}

/** @deprecated Use nativeInsightsPanelNote */
export function nativeDailyStatsPanelNote(): string {
  return nativeInsightsPanelNote();
}

export function dashboardFilterPanels(dashboardKey: DashboardKey): PanelSeed[] {
  const dashboardId = dashboardIdByKey[dashboardKey];
  const ids = dashboardVariableIds[dashboardKey];
  const panels: PanelSeed[] = [];
  for (let index = 0; index < variableDefinitions.length; index += 1) {
    const definition = variableDefinitions[index];
    const panelId = ids[index];
    if (definition === undefined || panelId === undefined) {
      continue;
    }
    const row = index < 3 ? 1 : 5;
    const options: Record<string, unknown> = {
      field: definition.field,
      type: 'string',
      inter: 'input',
      options: { placeholder: definition.placeholder },
    };
    if (definition.defaultValue !== undefined) {
      options.defaultValue = definition.defaultValue;
    }
    panels.push({
      id: panelId,
      dashboard: dashboardId,
      name: definition.name,
      type: 'variable',
      position_x: definition.position_x,
      position_y: row,
      width: 12,
      height: 4,
      options,
    });
  }
  return panels;
}

function readProvisionAnalyticsEnvironment(): string {
  const raw = process.env.ANALYTICS_ENVIRONMENT?.trim();
  if (raw === 'staging' || raw === 'prod' || raw === 'local') {
    return raw;
  }
  return 'local';
}
