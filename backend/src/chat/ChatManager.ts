import { ChatBroadcastPayload } from '../../../shared/protocols/messages';

export class ChatManager {
  private lastMessageTimes: Map<string, number> = new Map();
  private maxMessageLength = 200;
  private minIntervalMs = 600; // anti-spam: 1 message per 600ms

  public processMessage(
    senderId: string,
    senderName: string,
    rawText: string
  ): ChatBroadcastPayload | null {
    if (!rawText || typeof rawText !== 'string') return null;

    const trimmed = rawText.trim();
    if (trimmed.length === 0 || trimmed.length > this.maxMessageLength) {
      return null;
    }

    // Rate-limit check
    const now = Date.now();
    const lastTime = this.lastMessageTimes.get(senderId) || 0;
    if (now - lastTime < this.minIntervalMs) {
      return null; // Dropped due to spam threshold
    }
    this.lastMessageTimes.set(senderId, now);

    return {
      id: `msg_${now}_${Math.random().toString(36).substring(2, 7)}`,
      senderId,
      senderName,
      text: trimmed,
      timestamp: now,
    };
  }

  public removeUser(senderId: string) {
    this.lastMessageTimes.delete(senderId);
  }
}
