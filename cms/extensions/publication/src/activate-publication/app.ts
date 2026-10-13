import { defineOperationApp } from '@directus/extensions-sdk';
import { ACTIVATE_OPERATION } from '@portfolio/cms-schema/operations';

export default defineOperationApp({
  id: ACTIVATE_OPERATION,
  name: 'Activate publication',
  icon: 'publish',
  description: 'Makes the selected publication the one visitors see, then notifies the API.',
  overview: () => [
    { label: 'Effect', text: 'Supersedes the active publication and calls the publication hook.' },
  ],
  options: [],
});
