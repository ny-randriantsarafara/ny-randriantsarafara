import { defineOperationApp } from '@directus/extensions-sdk';
import { PREPARE_OPERATION } from '@portfolio/cms-schema/operations';

export default defineOperationApp({
  id: PREPARE_OPERATION,
  name: 'Prepare publication',
  icon: 'fact_check',
  description:
    'Validates the working content and stores it as a prepared publication with its changes.',
  overview: () => [
    { label: 'Effect', text: 'Discards earlier prepared publications. Publishes nothing.' },
  ],
  options: [],
});
