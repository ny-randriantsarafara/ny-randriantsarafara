import nodemailer from 'nodemailer';
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

export function createSmtpTransport(configuration: SmtpConfiguration): Transporter {
  return nodemailer.createTransport({
    host: configuration.host,
    port: configuration.port,
    secure: configuration.port === 465,
    auth: {
      user: configuration.user,
      pass: configuration.password,
    },
  });
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
