import { z } from 'zod';

const serviceAccountSchema = z.object({
  client_email: z.string().min(1),
  private_key: z.string().min(1),
  token_uri: z.string().url(),
});

export type GoogleServiceAccount = z.infer<typeof serviceAccountSchema>;

export function readGoogleServiceAccount(raw: string): GoogleServiceAccount | null {
  const result = serviceAccountSchema.safeParse(parseJsonOrNull(raw));
  if (!result.success) {
    return null;
  }
  return result.data;
}

// The JSON error is dropped: its message quotes the input, which holds the private key.
function parseJsonOrNull(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
