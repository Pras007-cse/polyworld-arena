"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatManager = void 0;
class ChatManager {
    constructor() {
        this.lastMessageTimes = new Map();
        this.maxMessageLength = 200;
        this.minIntervalMs = 450;
    }
    processMessage(senderId, senderName, rawText) {
        if (!rawText || typeof rawText !== 'string')
            return null;
        const trimmed = rawText.trim();
        if (trimmed.length === 0 || trimmed.length > this.maxMessageLength) {
            return null;
        }
        const now = Date.now();
        const lastTime = this.lastMessageTimes.get(senderId) || 0;
        if (now - lastTime < this.minIntervalMs) {
            return null;
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
    removeUser(senderId) {
        this.lastMessageTimes.delete(senderId);
    }
}
exports.ChatManager = ChatManager;
