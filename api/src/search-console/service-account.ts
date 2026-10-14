import { z } from 'zod';

const serviceAccountSchema = z.object({
  client_email: z.string().min(1),
  private_key: z.string().min(1),
  token_uri: z.string().url(),
});

export type GoogleServiceAccount = z.infer<typeof serviceAccountSchema>;

export function parseGoogleServiceAccount(raw: string): GoogleServiceAccount {
  const parsed: unknown = JSON.parse(raw);
  return serviceAccountSchema.parse(parsed);
}
