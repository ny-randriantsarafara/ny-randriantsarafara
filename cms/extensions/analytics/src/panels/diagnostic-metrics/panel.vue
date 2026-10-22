<template>
  <div class="panel-root">
    <p v-if="loading">Loading diagnostic metrics…</p>
    <p v-else-if="error">{{ error }}</p>
    <template v-else>
      <section class="coverage">
        <h3>Coverage and job health</h3>
        <dl>
          <div v-for="row in coverageRows" :key="row.label">
            <dt>{{ row.label }}</dt>
            <dd>{{ row.value }}</dd>
          </div>
        </dl>
      </section>
      <dl class="metrics">
        <div v-for="row in rows" :key="row.label">
          <dt>{{ row.label }}</dt>
          <dd>
            {{ formatMetric(row.current) }}
            <span class="delta">Δ {{ formatMetric(row.delta) }}</span>
          </dd>
        </div>
      </dl>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';

import { useAnalyticsFilterParams } from '../shared/analytics-filter-params.ts';

type MetricRow = { label: string; current: number | null; delta: number | null };
type CoverageRow = { label: string; value: string };

function readNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function formatMetric(value: number | null): string {
  if (value === null) {
    return 'unavailable';
  }
  return String(value);
}

export default defineComponent({
  setup() {
    const api = useApi();
    const filterParams = useAnalyticsFilterParams();
    const loading = ref(true);
    const error = ref('');
    const rows = ref<MetricRow[]>([]);
    const coverageRows = ref<CoverageRow[]>([]);

    async function loadSummary() {
      loading.value = true;
      error.value = '';
      try {
        const response = await api.get('/portfolio-analytics/summary', {
          params: filterParams.value,
        });
        const payload = response.data.data;
        const current = payload.current;
        const previous = payload.previous;
        const status = payload.coverage.analytics_status;
        const keys = [
          ['visitors', 'Visitors'],
          ['visitor_days', 'Visitor-days'],
          ['page_views', 'Page views'],
          ['chat_rendered', 'Browser renders'],
          ['model_exchanges', 'Server model exchanges'],
          ['cache_deliveries', 'Cache deliveries'],
          ['contact_stored', 'Stored contacts'],
          ['cv_link_clicks', 'CV link clicks'],
          ['generations_unknown_cost', 'Generations with unknown cost'],
        ] as const;
        rows.value = keys.map(([key, label]) => {
          const currentValue = readNumber(current[key]);
          const previousValue = readNumber(previous[key]);
          const delta =
            currentValue === null || previousValue === null ? null : currentValue - previousValue;
          return { label, current: currentValue, delta };
        });
        coverageRows.value = [
          { label: 'Environment', value: String(status.environment ?? 'unknown') },
          { label: 'Analytics version', value: String(status.analytics_version ?? 'unknown') },
          { label: 'Last refresh', value: String(status.last_refresh_at ?? 'unknown') },
          { label: 'Last rollup success', value: String(status.last_success_at ?? 'unknown') },
          { label: 'Last failure', value: String(status.last_failure_at ?? 'none') },
          { label: 'Job progress', value: String(status.progress_details ?? 'none') },
        ];
      } catch (caught) {
        error.value = caught instanceof Error ? caught.message : 'Failed to load metrics.';
      } finally {
        loading.value = false;
      }
    }

    onMounted(loadSummary);
    watch(filterParams, loadSummary);

    return { loading, error, rows, coverageRows, formatMetric };
  },
});
</script>

<style scoped>
.panel-root {
  padding: 12px;
}
.metrics,
.coverage dl {
  display: grid;
  gap: 8px;
}
.coverage {
  margin-bottom: 16px;
}
dt {
  font-weight: 600;
}
.delta {
  opacity: 0.7;
  font-size: 0.85em;
}
</style>
