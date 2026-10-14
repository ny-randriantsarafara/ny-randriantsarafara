import type { Transporter } from 'nodemailer';

import type { SmtpConfiguration } from '../environment.ts';
import type { AlertEmailSender } from './raise-alert.ts';

export type SmtpAlertEmailDependencies = {
  configuration: SmtpConfiguration;
  transport: Transporter;
};

export function createSmtpAlertEmailSender(
  dependencies: SmtpAlertEmailDependencies
): AlertEmailSender {
  return {
    send: (options) => sendAlertEmail(dependencies, options),
  };
}

async function sendAlertEmail(
  dependencies: SmtpAlertEmailDependencies,
  options: { subject: string; text: string; replyTo?: string }
): Promise<void> {
  await dependencies.transport.sendMail({
    from: dependencies.configuration.contactSender,
    to: dependencies.configuration.contactRecipient,
    replyTo: options.replyTo,
    subject: options.subject,
    text: options.text,
  });
}
