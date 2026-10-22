<template>
  <div class="panel-root">
    <p v-if="loading">Loading funnel…</p>
    <p v-else-if="error">{{ error }}</p>
    <ol v-else>
      <li v-for="step in steps" :key="step.key">{{ step.label }} — {{ step.count }}</li>
    </ol>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';

import { useAnalyticsFilterParams } from '../shared/analytics-filter-params.ts';

type FunnelStep = { key: string; label: string; count: number };

function readFunnelSteps(raw: unknown): FunnelStep[] {
  if (raw === null || typeof raw !== 'object' || !('steps' in raw)) {
    return [];
  }
  const steps = raw.steps;
  if (!Array.isArray(steps)) {
    return [];
  }
  const parsed: FunnelStep[] = [];
  for (const step of steps) {
    if (step === null || typeof step !== 'object') {
      continue;
    }
    if (!('key' in step) || !('label' in step) || !('count' in step)) {
      continue;
    }
    if (typeof step.key !== 'string' || typeof step.label !== 'string') {
      continue;
    }
    const count = Number(step.count);
    if (!Number.isFinite(count)) {
      continue;
    }
    parsed.push({ key: step.key, label: step.label, count });
  }
  return parsed;
}

export default defineComponent({
  setup() {
    const api = useApi();
    const filterParams = useAnalyticsFilterParams();
    const loading = ref(true);
    const error = ref('');
    const steps = ref<FunnelStep[]>([]);

    async function loadFunnel() {
      loading.value = true;
      error.value = '';
      try {
        const response = await api.get('/portfolio-analytics/funnel', {
          params: filterParams.value,
        });
        steps.value = readFunnelSteps(response.data.data.funnel);
      } catch (caught) {
        error.value = caught instanceof Error ? caught.message : 'Failed to load funnel.';
      } finally {
        loading.value = false;
      }
    }

    onMounted(loadFunnel);
    watch(filterParams, loadFunnel);

    return { loading, error, steps };
  },
});
</script>

<style scoped>
.panel-root {
  padding: 12px;
}
</style>
