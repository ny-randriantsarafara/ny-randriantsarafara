import { definePanel } from '@directus/extensions-sdk';

import Panel from './panel.vue';

export default definePanel({
  id: 'portfolio-conversation-review',
  name: 'Portfolio conversation review',
  icon: 'forum',
  description: 'Lists recent exchanges and opens the inspector detail route.',
  component: Panel,
  options: [],
  minWidth: 18,
  minHeight: 12,
});
