export function createConversationId(): string {
  return crypto.randomUUID();
}
