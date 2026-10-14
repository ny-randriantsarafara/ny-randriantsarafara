import type { AlertPayload } from '../alerts/raise-alert.ts';
import type { ContactRequest } from './contact-request.ts';
import { buildContactSubject } from './subject-line.ts';

export function buildContactMessageAlert(request: ContactRequest, messageId: string): AlertPayload {
  return {
    kind: 'contact_message',
    dedupKey: `contact:${messageId}`,
    subject: buildContactSubject(request.name, request.topic),
    text: buildContactAlertBody(request),
    details: { locale: request.locale, replyTo: request.email },
  };
}

function buildContactAlertBody(request: ContactRequest): string {
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
