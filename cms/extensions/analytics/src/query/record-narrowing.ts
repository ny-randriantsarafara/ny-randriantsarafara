import type {
  ChatExchangeMode,
  ChatExchangeOutcome,
  ChatExchangeRecord,
  EventRecord,
  EventType,
} from '@portfolio/cms-schema';

const eventTypes: EventType[] = [
  'page_view',
  'quick_view_open',
  'block_view',
  'suggestion_click',
  'cv_download',
  'contact_click',
  'contact_submit',
  'locale_switch',
  'chat_submitted',
  'chat_rendered',
  'chat_failed',
  'chat_cancelled',
  'chat_local_fallback',
  'content_impression',
  'content_click',
  'engagement',
  'cv_click',
  'contact_stored',
];

const exchangeModes: ChatExchangeMode[] = ['model', 'scripted'];
const exchangeOutcomes: ChatExchangeOutcome[] = [
  'answered',
  'unknown',
  'sensitive',
  'refused',
  'clarification_required',
  'temporarily_unavailable',
];
const deliverySources: NonNullable<ChatExchangeRecord['delivery_source']>[] = [
  'provider',
  'cache',
  'shared',
  'scripted',
];

export function parseEventType(raw: unknown): EventType | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw !== 'string') {
    return null;
  }
  for (const type of eventTypes) {
    if (type === raw) {
      return type;
    }
  }
  return null;
}

export function parseChatExchangeMode(raw: unknown): ChatExchangeMode | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw !== 'string') {
    return null;
  }
  for (const mode of exchangeModes) {
    if (mode === raw) {
      return mode;
    }
  }
  return null;
}

export function parseChatExchangeOutcome(raw: unknown): ChatExchangeOutcome | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw !== 'string') {
    return null;
  }
  for (const outcome of exchangeOutcomes) {
    if (outcome === raw) {
      return outcome;
    }
  }
  return null;
}

export function parseDeliverySource(raw: unknown): ChatExchangeRecord['delivery_source'] | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw !== 'string') {
    return null;
  }
  for (const source of deliverySources) {
    if (source === raw) {
      return source;
    }
  }
  return null;
}
