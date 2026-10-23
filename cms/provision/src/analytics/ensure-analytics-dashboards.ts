import type { AnalyticsEnvironment } from '@portfolio/cms-schema';

import type { Log } from '../directus-client.ts';
import { analyticsDashboardIds } from './dashboard-ids.ts';
import {
  dailyStatsReportingFilter,
  dailyStatsVariableFilter,
  dashboardFilterPanels,
  dashboardSharedFilterNote,
  eventsVariableFilter,
  nativeEventsListPanelNote,
  nativeInsightsPanelNote,
  reportingWindowRange,
} from './filter-panels.ts';
import { isOwnedPanelId } from './dashboard-ids.ts';

type DashboardSeed = {
  id: string;
  name: string;
  icon: string;
  note: string;
  color: string;
};

type PanelSeed = {
  id: string;
  dashboard: string;
  name: string;
  type: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  options: Record<string, unknown>;
  note?: string;
};

function dailyStatsMetricOptions(field: string): Record<string, unknown> {
  return {
    collection: 'daily_stats',
    field,
    function: 'sum',
    filter: dailyStatsReportingFilter(),
  };
}

const dashboards: DashboardSeed[] = [
  {
    id: analyticsDashboardIds.overview,
    name: 'Overview',
    icon: 'dashboard',
    note: `Portfolio analytics overview with 30-day Europe/Paris comparison. ${dashboardSharedFilterNote()}`,
    color: '#2F6F4E',
  },
  {
    id: analyticsDashboardIds.acquisition,
    name: 'Acquisition and engagement',
    icon: 'travel_explore',
    note: `Traffic sources, device mix and visible engagement. ${dashboardSharedFilterNote()}`,
    color: '#355C7D',
  },
  {
    id: analyticsDashboardIds.journey,
    name: 'Journey and conversions',
    icon: 'conversion_path',
    note: `Document-bounded journeys, ordered funnel and stored conversions. ${dashboardSharedFilterNote()}`,
    color: '#6C5B7B',
  },
  {
    id: analyticsDashboardIds.chatReview,
    name: 'Chat review',
    icon: 'forum',
    note: `Conversation inspection and owner review tags. ${dashboardSharedFilterNote()}`,
    color: '#C06C84',
  },
  {
    id: analyticsDashboardIds.modelOperations,
    name: 'Model operations',
    icon: 'model_training',
    note: `Generation spend, cache deliveries and validation health. ${dashboardSharedFilterNote()}`,
    color: '#F67280',
  },
];

function overviewPanels(analyticsEnvironment: AnalyticsEnvironment): PanelSeed[] {
  return [
    ...dashboardFilterPanels('overview', analyticsEnvironment),
    {
      id: 'b1000003-0000-4000-8000-000000000003',
      dashboard: analyticsDashboardIds.overview,
      name: 'Diagnostic metrics',
      type: 'portfolio-diagnostic-metrics',
      position_x: 1,
      position_y: 10,
      width: 36,
      height: 12,
      options: { metricGroup: 'overview' },
    },
    {
      id: 'b1000004-0000-4000-8000-000000000004',
      dashboard: analyticsDashboardIds.overview,
      name: 'Daily visitors',
      type: 'time-series',
      position_x: 1,
      position_y: 23,
      width: 18,
      height: 10,
      options: {
        collection: 'daily_stats',
        dateField: 'day',
        valueField: 'visitors',
        function: 'sum',
        precision: 'day',
        range: reportingWindowRange,
        filter: dailyStatsVariableFilter(),
      },
      note: nativeInsightsPanelNote(),
    },
    {
      id: 'b1000005-0000-4000-8000-000000000005',
      dashboard: analyticsDashboardIds.overview,
      name: 'Model cost (EUR)',
      type: 'time-series',
      position_x: 20,
      position_y: 23,
      width: 18,
      height: 10,
      options: {
        collection: 'daily_stats',
        dateField: 'day',
        valueField: 'model_cost_eur',
        function: 'sum',
        precision: 'day',
        range: reportingWindowRange,
        filter: dailyStatsVariableFilter(),
      },
      note: nativeInsightsPanelNote(),
    },
  ];
}

function acquisitionPanels(analyticsEnvironment: AnalyticsEnvironment): PanelSeed[] {
  return [
    ...dashboardFilterPanels('acquisition', analyticsEnvironment),
    {
      id: 'b1000006-0000-4000-8000-000000000006',
      dashboard: analyticsDashboardIds.acquisition,
      name: 'Page views',
      type: 'metric',
      position_x: 1,
      position_y: 10,
      width: 12,
      height: 6,
      options: dailyStatsMetricOptions('page_views'),
      note: nativeInsightsPanelNote(),
    },
    {
      id: 'b1000007-0000-4000-8000-000000000007',
      dashboard: analyticsDashboardIds.acquisition,
      name: 'Content impressions',
      type: 'metric',
      position_x: 14,
      position_y: 10,
      width: 12,
      height: 6,
      options: dailyStatsMetricOptions('content_impressions'),
      note: nativeInsightsPanelNote(),
    },
    {
      id: 'b1000008-0000-4000-8000-000000000008',
      dashboard: analyticsDashboardIds.acquisition,
      name: 'Recent events',
      type: 'list',
      position_x: 1,
      position_y: 17,
      width: 36,
      height: 14,
      options: {
        collection: 'events',
        displayTemplate: '{{received_at}} · {{type}} · {{path}}',
        limit: 20,
        sort: ['-received_at'],
        filter: eventsVariableFilter(),
      },
      note: nativeEventsListPanelNote(),
    },
  ];
}

function journeyPanels(analyticsEnvironment: AnalyticsEnvironment): PanelSeed[] {
  return [
    ...dashboardFilterPanels('journey', analyticsEnvironment),
    {
      id: 'b1000009-0000-4000-8000-000000000009',
      dashboard: analyticsDashboardIds.journey,
      name: 'Ordered funnel',
      type: 'portfolio-ordered-funnel',
      position_x: 1,
      position_y: 10,
      width: 24,
      height: 14,
      options: {},
    },
    {
      id: 'b1000010-0000-4000-8000-000000000010',
      dashboard: analyticsDashboardIds.journey,
      name: 'CV link clicks',
      type: 'metric',
      position_x: 26,
      position_y: 10,
      width: 12,
      height: 6,
      options: dailyStatsMetricOptions('cv_link_clicks'),
      note: nativeInsightsPanelNote(),
    },
    {
      id: 'b1000011-0000-4000-8000-000000000011',
      dashboard: analyticsDashboardIds.journey,
      name: 'Stored contacts',
      type: 'metric',
      position_x: 26,
      position_y: 17,
      width: 12,
      height: 6,
      options: dailyStatsMetricOptions('contact_stored'),
      note: nativeInsightsPanelNote(),
    },
  ];
}

function chatReviewPanels(analyticsEnvironment: AnalyticsEnvironment): PanelSeed[] {
  return [
    ...dashboardFilterPanels('chatReview', analyticsEnvironment),
    {
      id: 'b1000012-0000-4000-8000-000000000012',
      dashboard: analyticsDashboardIds.chatReview,
      name: 'Conversation review',
      type: 'portfolio-conversation-review',
      position_x: 1,
      position_y: 10,
      width: 36,
      height: 18,
      options: {},
    },
  ];
}

function modelOperationsPanels(analyticsEnvironment: AnalyticsEnvironment): PanelSeed[] {
  return [
    ...dashboardFilterPanels('modelOperations', analyticsEnvironment),
    {
      id: 'b1000013-0000-4000-8000-000000000013',
      dashboard: analyticsDashboardIds.modelOperations,
      name: 'Generation attempts',
      type: 'metric',
      position_x: 1,
      position_y: 10,
      width: 12,
      height: 6,
      options: dailyStatsMetricOptions('generation_attempts'),
      note: nativeInsightsPanelNote(),
    },
    {
      id: 'b1000014-0000-4000-8000-000000000014',
      dashboard: analyticsDashboardIds.modelOperations,
      name: 'Known-cost generations',
      type: 'metric',
      position_x: 14,
      position_y: 10,
      width: 12,
      height: 6,
      options: dailyStatsMetricOptions('generations_known_cost'),
      note: nativeInsightsPanelNote(),
    },
    {
      id: 'b1000015-0000-4000-8000-000000000015',
      dashboard: analyticsDashboardIds.modelOperations,
      name: 'Cache deliveries',
      type: 'metric',
      position_x: 27,
      position_y: 10,
      width: 12,
      height: 6,
      options: dailyStatsMetricOptions('cache_deliveries'),
      note: nativeInsightsPanelNote(),
    },
  ];
}

function analyticsPanels(analyticsEnvironment: AnalyticsEnvironment): PanelSeed[] {
  return [
    ...overviewPanels(analyticsEnvironment),
    ...acquisitionPanels(analyticsEnvironment),
    ...journeyPanels(analyticsEnvironment),
    ...chatReviewPanels(analyticsEnvironment),
    ...modelOperationsPanels(analyticsEnvironment),
  ];
}

export async function ensureAnalyticsDashboards(
  directusUrl: string,
  adminToken: string,
  analyticsEnvironment: AnalyticsEnvironment,
  log: Log
): Promise<void> {
  const headers = {
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  };

  const existingDashboards = await readIds(`${directusUrl}/dashboards?limit=-1&fields=id`, headers);
  for (const dashboard of dashboards) {
    if (existingDashboards.has(dashboard.id)) {
      const response = await fetch(`${directusUrl}/dashboards/${dashboard.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          name: dashboard.name,
          icon: dashboard.icon,
          note: dashboard.note,
          color: dashboard.color,
        }),
      });
      if (!response.ok) {
        throw new Error(`Failed to update dashboard ${dashboard.name}.`);
      }
      log(`Dashboard updated: ${dashboard.name}`);
      continue;
    }
    const response = await fetch(`${directusUrl}/dashboards`, {
      method: 'POST',
      headers,
      body: JSON.stringify(dashboard),
    });
    if (!response.ok) {
      throw new Error(`Failed to create dashboard ${dashboard.name}.`);
    }
    log(`Dashboard created: ${dashboard.name}`);
  }

  const existingPanels = await readIds(`${directusUrl}/panels?limit=-1&fields=id`, headers);
  for (const panel of analyticsPanels(analyticsEnvironment)) {
    if (!isOwnedPanelId(panel.id)) {
      continue;
    }
    const payload = {
      ...panel,
      show_header: true,
      icon: null,
      color: null,
      note: panel.note ?? null,
    };
    if (existingPanels.has(panel.id)) {
      const response = await fetch(`${directusUrl}/panels/${panel.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`Failed to update panel ${panel.name}.`);
      }
      continue;
    }
    const response = await fetch(`${directusUrl}/panels`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Failed to create panel ${panel.name}.`);
    }
  }

  log('Analytics dashboards and owned panels provisioned.');
}

async function readIds(url: string, headers: Record<string, string>): Promise<Set<string>> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed to read Directus insights metadata.`);
  }
  const body: unknown = await response.json();
  if (!isIdListBody(body)) {
    throw new Error('Directus insights metadata response was invalid.');
  }
  return new Set(body.data.map((row) => row.id));
}

function isIdListBody(value: unknown): value is { data: { id: string }[] } {
  if (value === null || typeof value !== 'object' || !('data' in value)) {
    return false;
  }
  const data = value.data;
  if (!Array.isArray(data)) {
    return false;
  }
  for (const row of data) {
    if (row === null || typeof row !== 'object' || !('id' in row)) {
      return false;
    }
    if (typeof row.id !== 'string') {
      return false;
    }
  }
  return true;
}
