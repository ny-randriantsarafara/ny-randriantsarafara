import { z } from 'zod';

import { publicationContentSchema } from './publication.ts';

export const activePublicationSchema = z.object({
  publicationId: z.uuid(),
  activatedAt: z.iso.datetime({ offset: true }),
  content: publicationContentSchema,
});

export type ActivePublication = z.infer<typeof activePublicationSchema>;
