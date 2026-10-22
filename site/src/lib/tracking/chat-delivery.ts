import type { ChatTransportFailure } from '@/lib/chat/send-chat-message.ts';
import type { ChatMode } from '@portfolio/chat';

export type ChatFailureReason = 'network' | 'timeout' | 'http' | 'invalid_response' | 'unavailable';

export type ChatCancelReason = 'superseded' | 'navigation' | 'user';

export function mapTransportFailure(failure: ChatTransportFailure): ChatFailureReason {
  if (failure === 'contract') {
    return 'invalid_response';
  }
  return failure;
}

export type RenderMode = 'model' | 'scripted' | 'local';

export function readRenderMode(apiMode: ChatMode | null, usedFallback: boolean): RenderMode {
  if (usedFallback) {
    return 'local';
  }
  if (apiMode === 'model') {
    return 'model';
  }
  return 'scripted';
}

export type DeliveryState = 'submitted' | 'failed' | 'cancelled' | 'local_fallback' | 'rendered';

export class ChatDeliveryEmissionGuard {
  private readonly emitted = new Set<string>();

  stateKey(requestId: string, state: DeliveryState): string {
    return `${requestId}:${state}`;
  }

  shouldEmit(requestId: string, state: DeliveryState): boolean {
    const key = this.stateKey(requestId, state);
    if (this.emitted.has(key)) {
      return false;
    }
    this.emitted.add(key);
    return true;
  }

  resetForTests(): void {
    this.emitted.clear();
  }
}

export const chatDeliveryEmissionGuard = new ChatDeliveryEmissionGuard();

export function truncateFallbackText(text: string, maxLength = 2000): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return trimmed.slice(0, maxLength);
}
