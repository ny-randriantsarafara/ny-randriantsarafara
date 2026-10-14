import type { JsonValue } from '@portfolio/cms-schema';

export type AlertPayload = {
  kind: string;
  dedupKey: string;
  subject: string;
  text: string;
  details: JsonValue;
};

export type AlertCreateResult = { created: true } | { created: false; reason: 'duplicate' };

export type AlertStore = {
  create(payload: AlertPayload): Promise<AlertCreateResult>;
};

export type AlertEmailSender = {
  send(options: { subject: string; text: string; replyTo?: string }): Promise<void>;
};

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
  const stored = await dependencies.store.create(payload);
  if (!stored.created) {
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
      replyTo: readReplyTo(payload.details),
    });
  } catch {
    dependencies.log('Alert email delivery failed.');
  }
}

function readReplyTo(details: JsonValue): string | undefined {
  if (!isRecord(details)) {
    return undefined;
  }
  const replyTo = details.replyTo;
  if (typeof replyTo !== 'string' || replyTo.length === 0) {
    return undefined;
  }
  return replyTo;
}

function isRecord(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
