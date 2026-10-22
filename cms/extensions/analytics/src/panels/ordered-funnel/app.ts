import { definePanel } from '@directus/extensions-sdk';

import Panel from './panel.vue';

export default definePanel({
  id: 'portfolio-ordered-funnel',
  name: 'Portfolio ordered funnel',
  icon: 'filter_alt',
  description: 'Ordered journey funnel with document-bounded journeys.',
  component: Panel,
  options: [],
  minWidth: 12,
  minHeight: 10,
});
