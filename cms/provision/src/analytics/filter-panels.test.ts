import { describe, expect, it } from 'vitest';

import {
  dailyStatsReportingFilter,
  dailyStatsVariableFilter,
  dashboardSharedFilterNote,
  eventsVariableFilter,
  nativeInsightsPanelNote,
  optionalVariableEqualsFilter,
} from './filter-panels.ts';
import {
  collectEqOperands,
  substituteInsightsPanelOptions,
} from './insights-variable-substitution.ts';

const emptyDashboardVariables = {
  analytics_locale: '',
  analytics_environment: '',
  analytics_device_class: '',
  analytics_utm_source: '',
};

/** Round-3 shape: plain `_eq` placeholders with empty-string defaults. */
function legacyEventsVariableFilter(): Record<string, unknown> {
  return {
    _and: [
      { locale: { _eq: '{{analytics_locale}}' } },
      { environment: { _eq: '{{analytics_environment}}' } },
      { device_class: { _eq: '{{analytics_device_class}}' } },
      { utm_source: { _eq: '{{analytics_utm_source}}' } },
    ],
  };
}

describe('analytics dashboard variable filters', () => {
  it('shows legacy plain _eq filters substitute to empty operands (Directus 12.5.0 rejects them)', () => {
    const resolved = substituteInsightsPanelOptions(
      { filter: legacyEventsVariableFilter() },
      emptyDashboardVariables
    ).filter;
    expect(collectEqOperands(resolved)).toEqual(['', '', '', '']);
  });

  it('uses the Directus optional-variable _or pattern for exact match when values are set', () => {
    expect(optionalVariableEqualsFilter('locale', 'analytics_locale')).toEqual({
      _or: [
        { locale: { _eq: '{{analytics_locale}}' } },
        { _and: [{ locale: { _null: true } }, { locale: { _nnull: true } }] },
      ],
    });
  });

  it('scopes native events list to environment only on first load (no unset-variable undefined operands)', () => {
    const scope = { analytics_environment: 'local' };
    const resolved = substituteInsightsPanelOptions(
      { filter: eventsVariableFilter() },
      scope
    ).filter;
    expect(collectEqOperands(resolved)).toEqual(['local']);
    expect(collectEqOperands(resolved)).not.toContain('undefined');
    expect(collectEqOperands(resolved)).not.toContain('');
  });

  it('ignores cleared optional dashboard variables for native events list filters', () => {
    const scope = {
      analytics_environment: 'local',
      analytics_locale: '',
      analytics_device_class: '',
      analytics_utm_source: '',
    };
    const resolved = substituteInsightsPanelOptions(
      { filter: eventsVariableFilter() },
      scope
    ).filter;
    expect(collectEqOperands(resolved)).toEqual(['local']);
  });

  it('does not bind locale, device or UTM even when those dashboard variables are set', () => {
    const scope = {
      analytics_environment: 'local',
      analytics_locale: 'en',
      analytics_device_class: 'mobile',
      analytics_utm_source: 'newsletter',
    };
    const resolved = substituteInsightsPanelOptions(
      { filter: eventsVariableFilter() },
      scope
    ).filter;
    expect(collectEqOperands(resolved)).toEqual(['local']);
  });

  it('scopes native daily_stats panels to environment with the optional pattern', () => {
    const resolved = substituteInsightsPanelOptions(
      { filter: dailyStatsVariableFilter() },
      { analytics_environment: 'local' }
    ).filter;
    expect(collectEqOperands(resolved)).toEqual(['local']);
  });

  it('limits native metric panels to the environment and the 30 complete days before today', () => {
    const resolved = substituteInsightsPanelOptions(
      { filter: dailyStatsReportingFilter() },
      { analytics_environment: 'staging' }
    ).filter;
    expect(collectEqOperands(resolved)).toEqual(['staging']);
    expect(resolved).toEqual({
      _and: [
        {
          _or: [
            { environment: { _eq: 'staging' } },
            { _and: [{ environment: { _null: true } }, { environment: { _nnull: true } }] },
          ],
        },
        { day: { _gte: '$NOW(-31 days)' } },
      ],
    });
  });

  it('surfaces filter behaviour in dashboard and native panel notes', () => {
    expect(dashboardSharedFilterNote()).toContain('Directus');
    expect(dashboardSharedFilterNote()).toContain('API panels only');
    expect(nativeInsightsPanelNote()).toContain('Portfolio API panels');
  });
});
