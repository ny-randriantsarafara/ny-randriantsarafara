import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import type { SmtpConfiguration } from '../environment.ts';
import type { ContactNotifier } from './contact-notifier.ts';
import type { ContactRequest } from './contact-request.ts';
import { buildContactSubject } from './subject-line.ts';

export type NodemailerNotifierDependencies = {
  configuration: SmtpConfiguration;
  createTransport: (configuration: SmtpConfiguration) => Transporter;
  log: (message: string) => void;
};

export function createNodemailerContactNotifier(
  dependencies: NodemailerNotifierDependencies
): ContactNotifier {
  const transport = dependencies.createTransport(dependencies.configuration);
  return {
    async notify(request: ContactRequest): Promise<void> {
      try {
        await transport.sendMail({
          from: dependencies.configuration.contactSender,
          to: dependencies.configuration.contactRecipient,
          replyTo: request.email,
          subject: buildContactSubject(request.name, request.topic),
          text: buildBody(request),
        });
      } catch {
        dependencies.log('Contact email delivery failed.');
      }
    },
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

function buildBody(request: ContactRequest): string {
  const lines = [`Name: ${request.name}`, `Email: ${request.email}`, `Locale: ${request.locale}`];
  if (request.company !== undefined && request.company.length > 0) {
    lines.push(`Company: ${request.company}`);
  }
  if (request.topic !== undefined && request.topic.length > 0) {
    lines.push(`Topic: ${request.topic}`);
  }
  lines.push('', request.message);
  return lines.join('\n');
}
