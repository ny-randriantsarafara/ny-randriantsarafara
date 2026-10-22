import { definePanel } from '@directus/extensions-sdk';

import Panel from './panel.vue';

export default definePanel({
  id: 'portfolio-diagnostic-metrics',
  name: 'Portfolio diagnostic metrics',
  icon: 'monitoring',
  description: 'Compares current and previous 30-day Europe/Paris windows.',
  component: Panel,
  options: [
    {
      field: 'metricGroup',
      type: 'string',
      name: 'Metric group',
      meta: { interface: 'input', width: 'full' },
    },
  ],
  minWidth: 12,
  minHeight: 8,
});
