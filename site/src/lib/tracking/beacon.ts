import { readTrackingApiUrl } from './api-url.ts';

import type { WireEventBody } from './wire-event.ts';

const deliveredEventIds = new Set<string>();

function localhostTrackingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_LOCALHOST_TRACKING === 'true';
}

function isLocalStaticPreview(): boolean {
  if (localhostTrackingEnabled()) {
    return false;
  }
  if (typeof window === 'undefined') {
    return false;
  }
  const host = window.location.hostname;
  if (host === 'localhost') {
    return true;
  }
  if (host === '127.0.0.1') {
    return true;
  }
  return false;
}

function readGlobalPrivacyControl(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  if (!('globalPrivacyControl' in navigator)) {
    return false;
  }
  const value = navigator.globalPrivacyControl;
  return value === true;
}

export function trackingAllowed(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  if (readGlobalPrivacyControl()) {
    return false;
  }
  if (navigator.doNotTrack === '1') {
    return false;
  }
  if (isLocalStaticPreview()) {
    return false;
  }
  return true;
}

export function resetBeaconDeliveryForTests(): void {
  deliveredEventIds.clear();
}

function ensureEventId(fields: WireEventBody): WireEventBody {
  if (fields.eventId !== undefined) {
    return fields;
  }
  return { ...fields, eventId: crypto.randomUUID() };
}

function markDelivered(eventId: string): boolean {
  if (deliveredEventIds.has(eventId)) {
    return false;
  }
  deliveredEventIds.add(eventId);
  return true;
}

export function sendEventBeacon(fields: WireEventBody): void {
  if (!trackingAllowed()) {
    return;
  }
  const withId = ensureEventId(fields);
  const eventId = withId.eventId;
  if (eventId === undefined) {
    return;
  }
  if (!markDelivered(eventId)) {
    return;
  }
  const cleaned = Object.fromEntries(
    Object.entries(withId).filter((entry) => entry[1] !== undefined)
  );
  const body = JSON.stringify(cleaned);
  const beaconBody = new Blob([body], { type: 'text/plain;charset=UTF-8' });
  const url = `${readTrackingApiUrl()}/events`;
  if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(url, beaconBody)) {
    return;
  }
  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: beaconBody,
    keepalive: true,
  });
}
