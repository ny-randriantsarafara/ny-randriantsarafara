import type { JsonValue } from '@portfolio/cms-schema';

export type AlertPayload = {
  kind: string;
  dedupKey: string;
  subject: string;
  text: string;
  details: JsonValue;
  // Sent with the email only: the alert row outlives contact-message retention, so it holds no address.
  replyTo?: string;
};

export type AlertCreateResult = { created: true } | { created: false; reason: 'duplicate' };

export type AlertStore = {
  create(payload: AlertPayload): Promise<AlertCreateResult>;
};

export type AlertEmailSender = {
  send(options: { subject: string; text: string; replyTo?: string }): Promise<void>;
};

// Never rejects: callers fire it without awaiting, and an unhandled rejection stops the process.
export type RaiseAlert = (payload: AlertPayload) => Promise<void>;

export type RaiseAlertDependencies = {
  store: AlertStore;
  email: AlertEmailSender;
  log: (message: string) => void;
  emailEnabled?: boolean;
};

export function createRaiseAlert(dependencies: RaiseAlertDependencies): RaiseAlert {
  const emailEnabled = dependencies.emailEnabled ?? true;
  return (payload) => persistAndNotify(payload, dependencies, emailEnabled);
}

async function persistAndNotify(
  payload: AlertPayload,
  dependencies: RaiseAlertDependencies,
  emailEnabled: boolean
): Promise<void> {
  const stored = await storeAlert(payload, dependencies);
  if (!stored) {
    return;
  }
  if (!emailEnabled) {
    dependencies.log('Alert email skipped: SMTP is not configured.');
    return;
  }
  try {
    await dependencies.email.send({
      subject: payload.subject,
      text: payload.text,
      replyTo: payload.replyTo,
    });
  } catch {
    dependencies.log('Alert email delivery failed.');
  }
}

// Without a stored row there is no deduplication, so the email is skipped rather than repeated.
async function storeAlert(
  payload: AlertPayload,
  dependencies: RaiseAlertDependencies
): Promise<boolean> {
  try {
    const result = await dependencies.store.create(payload);
    return result.created;
  } catch {
    dependencies.log(`Alert ${payload.kind} could not be stored: email skipped.`);
    return false;
  }
}
