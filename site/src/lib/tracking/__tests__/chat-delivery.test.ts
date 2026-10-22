import { describe, expect, it } from 'vitest';

import {
  ChatDeliveryEmissionGuard,
  mapTransportFailure,
  readRenderMode,
  truncateFallbackText,
} from '../chat-delivery.ts';

describe('chat delivery helpers', () => {
  it('maps transport failures to analytics reasons', () => {
    expect(mapTransportFailure('network')).toBe('network');
    expect(mapTransportFailure('contract')).toBe('invalid_response');
  });

  it('labels render mode for fallback and api replies', () => {
    expect(readRenderMode('scripted', false)).toBe('scripted');
    expect(readRenderMode('model', false)).toBe('model');
    expect(readRenderMode('scripted', true)).toBe('local');
  });

  it('emits each delivery state only once per request id', () => {
    const guard = new ChatDeliveryEmissionGuard();
    const requestId = '22222222-2222-4222-8222-222222222222';
    expect(guard.shouldEmit(requestId, 'submitted')).toBe(true);
    expect(guard.shouldEmit(requestId, 'submitted')).toBe(false);
    expect(guard.shouldEmit(requestId, 'rendered')).toBe(true);
    expect(guard.shouldEmit(requestId, 'rendered')).toBe(false);
  });

  it('bounds fallback text length', () => {
    const long = 'a'.repeat(2500);
    expect(truncateFallbackText(long).length).toBe(2000);
  });
});
