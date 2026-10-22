import { defineHook } from '@directus/extensions-sdk';

import { requireAnalyticsDatabase } from '../query/analytics-database.ts';
import { readAnalyticsJobConfig, runAnalyticsJobs } from '../query/jobs.ts';

export default defineHook(({ schedule }, context) => {
  const jobConfig = readAnalyticsJobConfig(context.env);
  schedule('*/15 * * * *', async () => {
    try {
      await runAnalyticsJobs(requireAnalyticsDatabase(context.database), new Date(), jobConfig);
    } catch (error) {
      context.logger.error(error, 'Portfolio analytics scheduled job failed.');
    }
  });
});
