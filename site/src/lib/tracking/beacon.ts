import { readTrackingApiUrl } from './api-url.ts';

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
  return true;
}

export function sendEventBeacon(payload: Record<string, string | undefined>): void {
  if (!trackingAllowed()) {
    return;
  }
  const cleaned = Object.fromEntries(
    Object.entries(payload).filter((entry) => entry[1] !== undefined)
  );
  const body = JSON.stringify(cleaned);
  const url = `${readTrackingApiUrl()}/events`;
  if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(url, body)) {
    return;
  }
  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body,
    keepalive: true,
  });
}
