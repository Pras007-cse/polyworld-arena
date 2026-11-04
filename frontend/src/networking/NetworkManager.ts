import { io, Socket } from 'socket.io-client';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  WelcomePayload,
  PlayerMovedPayload,
  PlayerAnimatedPayload,
  ChatBroadcastPayload,
  JoinResponse,
  ItemCollectedBroadcast,
  ItemRespawnedBroadcast,
  CrownChangedBroadcast,
} from '@shared/protocols/messages';
import { AnimationState, CharacterAppearance, CollectibleItem, PlayerState, Vector3D } from '@shared/types';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'p2p_tabs';

export interface NetworkCallbacks {
  onWelcome?: (data: WelcomePayload) => void;
  onPlayerJoined?: (player: PlayerState) => void;
  onPlayerLeft?: (playerId: string) => void;
  onPlayerMoved?: (data: PlayerMovedPayload) => void;
  onPlayerAnimated?: (data: PlayerAnimatedPayload) => void;
  onChatBroadcast?: (message: ChatBroadcastPayload) => void;
  onItemCollected?: (data: ItemCollectedBroadcast) => void;
  onItemRespawned?: (data: ItemRespawnedBroadcast) => void;
  onCrownChanged?: (data: CrownChangedBroadcast) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  onPingUpdate?: (pingMs: number) => void;
}

export class NetworkManager {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private channel: BroadcastChannel | null = null;
  private heartbeatInterval: number | null = null;
  public status: ConnectionStatus = 'disconnected';
  public localPlayerId: string = `p_${Math.random().toString(36).substring(2, 9)}`;
  public pingMs: number = 0;
  private pingInterval: number | null = null;
  private lastMoveSentTime: number = 0;
  private moveSendIntervalMs: number = 45; // ~22Hz update rate
  private callbacks: NetworkCallbacks = {};
  private localPlayerState: PlayerState | null = null;
  private p2pPeers: Map<string, number> = new Map();

  constructor(callbacks: NetworkCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public setCallbacks(callbacks: Partial<NetworkCallbacks>) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  private setupBroadcastChannel() {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    try {
      this.channel = new BroadcastChannel('polyworld_arena_multiplayer_v2');
      this.channel.onmessage = (event) => {
        const msg = event.data;
        if (!msg || msg.senderId === this.localPlayerId) return;

        this.p2pPeers.set(msg.senderId, Date.now());

        switch (msg.type) {
          case 'p2p_hello': {
            if (msg.player) {
              this.callbacks.onPlayerJoined?.(msg.player);
            }
            if (this.localPlayerState) {
              this.channel?.postMessage({
                type: 'p2p_welcome_peer',
                senderId: this.localPlayerId,
                player: this.localPlayerState,
              });
            }
            break;
          }
          case 'p2p_welcome_peer': {
            if (msg.player) {
              this.callbacks.onPlayerJoined?.(msg.player);
            }
            break;
          }
          case 'p2p_move': {
            this.callbacks.onPlayerMoved?.({
              playerId: msg.senderId,
              position: msg.position,
              rotation: msg.rotation,
              animation: msg.animation,
              timestamp: msg.timestamp,
            });
            break;
          }
          case 'p2p_anim': {
            this.callbacks.onPlayerAnimated?.({
              playerId: msg.senderId,
              animation: msg.animation,
            });
            break;
          }
          case 'p2p_chat': {
            this.callbacks.onChatBroadcast?.(msg.chat);
            break;
          }
          case 'p2p_collect': {
            this.callbacks.onItemCollected?.(msg.payload);
            break;
          }
          case 'p2p_crown': {
            this.callbacks.onCrownChanged?.(msg.payload);
            break;
          }
          case 'p2p_leave': {
            this.p2pPeers.delete(msg.senderId);
            this.callbacks.onPlayerLeft?.(msg.senderId);
            break;
          }
        }
      };

      this.heartbeatInterval = window.setInterval(() => {
        const now = Date.now();
        for (const [peerId, lastSeen] of this.p2pPeers.entries()) {
          if (now - lastSeen > 8000) {
            this.p2pPeers.delete(peerId);
            this.callbacks.onPlayerLeft?.(peerId);
          }
        }
        if (this.localPlayerState) {
          this.channel?.postMessage({
            type: 'p2p_welcome_peer',
            senderId: this.localPlayerId,
            player: this.localPlayerState,
          });
        }
      }, 2500);
    } catch {
      // Ignore BroadcastChannel errors in restricted iframes
    }
  }

  public connect(serverUrl?: string): Promise<boolean> {
    this.setupBroadcastChannel();

    const defaultUrl =
      typeof window === 'undefined'
        ? 'http://localhost:4000'
        : import.meta.env.DEV
          ? `http://${window.location.hostname || 'localhost'}:4000`
          : window.location.origin;

    const url = serverUrl || import.meta.env.VITE_SERVER_URL || defaultUrl;
    this.setStatus('connecting');

    return new Promise((resolve) => {
      let resolved = false;
      const fallbackTimer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.setStatus('p2p_tabs');
          resolve(false);
        }
      }, 2200);

      try {
        this.socket = io(url, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1500,
          timeout: 2000,
        });

        this.socket.on('connect', () => {
          clearTimeout(fallbackTimer);
          if (this.socket?.id) {
            this.localPlayerId = this.socket.id;
          }
          this.setStatus('connected');
          this.startPingLoop();
          if (!resolved) {
            resolved = true;
            resolve(true);
          }
        });

        this.socket.on('connect_error', () => {
          if (!resolved) {
            clearTimeout(fallbackTimer);
            resolved = true;
            this.setStatus('p2p_tabs');
            resolve(false);
          }
        });

        this.socket.on('disconnect', () => {
          this.setStatus('p2p_tabs');
          this.stopPingLoop();
        });

        this.socket.on('welcome', (data: WelcomePayload) => {
          this.localPlayerId = data.playerId;
          this.callbacks.onWelcome?.(data);
        });

        this.socket.on('player_joined', (player: PlayerState) => {
          this.callbacks.onPlayerJoined?.(player);
        });

        this.socket.on('player_left', (data: { playerId: string }) => {
          this.callbacks.onPlayerLeft?.(data.playerId);
        });

        this.socket.on('player_moved', (data: PlayerMovedPayload) => {
          this.callbacks.onPlayerMoved?.(data);
        });

        this.socket.on('player_animated', (data: PlayerAnimatedPayload) => {
          this.callbacks.onPlayerAnimated?.(data);
        });

        this.socket.on('chat_broadcast', (msg: ChatBroadcastPayload) => {
          this.callbacks.onChatBroadcast?.(msg);
        });

        this.socket.on('item_collected', (data: ItemCollectedBroadcast) => {
          this.callbacks.onItemCollected?.(data);
        });

        this.socket.on('item_respawned', (data: ItemRespawnedBroadcast) => {
          this.callbacks.onItemRespawned?.(data);
        });

        this.socket.on('crown_changed', (data: CrownChangedBroadcast) => {
          this.callbacks.onCrownChanged?.(data);
        });

        this.socket.on('pong', (data: { clientTime: number; serverTime: number }) => {
          this.pingMs = Math.max(1, Date.now() - data.clientTime);
          this.callbacks.onPingUpdate?.(this.pingMs);
        });
      } catch {
        clearTimeout(fallbackTimer);
        this.setStatus('p2p_tabs');
        resolve(false);
      }
    });
  }

  public joinWorld(
    username: string,
    appearance: CharacterAppearance
  ): Promise<JoinResponse> {
    this.localPlayerState = {
      id: this.localPlayerId,
      username,
      position: { x: 0, y: 0, z: 10 },
      rotation: 0,
      animation: 'idle',
      appearance,
      score: 0,
      level: 1,
    };

    // Announce over BroadcastChannel for instant multi-tab play
    try {
      this.channel?.postMessage({
        type: 'p2p_hello',
        senderId: this.localPlayerId,
        player: this.localPlayerState,
      });
    } catch {
      // Ignore
    }

    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        resolve({ success: true, playerId: this.localPlayerId, player: this.localPlayerState || undefined, existingPlayers: [] });
        return;
      }

      this.socket.emit('player_join', { username, appearance }, (res) => {
        if (res && res.success && res.playerId) {
          this.localPlayerId = res.playerId;
          if (this.localPlayerState) this.localPlayerState.id = res.playerId;
        }
        resolve(res || { success: true });
      });
    });
  }

  public sendMove(position: Vector3D, rotation: number, animation: AnimationState = 'idle', velocity?: Vector3D) {
    const now = Date.now();
    if (now - this.lastMoveSentTime < this.moveSendIntervalMs) {
      return;
    }
    this.lastMoveSentTime = now;

    const cleanPos = {
      x: Number(position.x.toFixed(3)),
      y: Number(position.y.toFixed(3)),
      z: Number(position.z.toFixed(3)),
    };
    const cleanRot = Number(rotation.toFixed(3));

    if (this.localPlayerState) {
      this.localPlayerState.position = cleanPos;
      this.localPlayerState.rotation = cleanRot;
      this.localPlayerState.animation = animation;
    }

    if (this.socket && this.socket.connected) {
      this.socket.emit('player_move', {
        position: cleanPos,
        rotation: cleanRot,
        velocity,
        animation,
        timestamp: now,
      });
    }

    try {
      this.channel?.postMessage({
        type: 'p2p_move',
        senderId: this.localPlayerId,
        position: cleanPos,
        rotation: cleanRot,
        animation,
        timestamp: now,
      });
    } catch {
      // Ignore
    }
  }

  public sendAnimation(animation: AnimationState) {
    if (this.localPlayerState) {
      this.localPlayerState.animation = animation;
    }
    if (this.socket && this.socket.connected) {
      this.socket.emit('player_animation', { animation });
    }
    try {
      this.channel?.postMessage({
        type: 'p2p_anim',
        senderId: this.localPlayerId,
        animation,
      });
    } catch {
      // Ignore
    }
  }

  public sendChatMessage(text: string, senderName: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (this.socket && this.socket.connected) {
      this.socket.emit('chat_message', { text: trimmed });
    } else {
      const msg: ChatBroadcastPayload = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderId: this.localPlayerId,
        senderName,
        text: trimmed,
        timestamp: Date.now(),
      };
      this.callbacks.onChatBroadcast?.(msg);
      try {
        this.channel?.postMessage({
          type: 'p2p_chat',
          senderId: this.localPlayerId,
          chat: msg,
        });
      } catch {
        // Ignore
      }
    }
  }

  public sendCollectItem(item: CollectibleItem, playerName: string, newScore: number, newLevel: number) {
    if (this.localPlayerState) {
      this.localPlayerState.score = newScore;
      this.localPlayerState.level = newLevel;
    }
    if (this.socket && this.socket.connected) {
      this.socket.emit('collect_item', { itemId: item.id });
    } else {
      const payload: ItemCollectedBroadcast = {
        itemId: item.id,
        playerId: this.localPlayerId,
        playerName,
        newScore,
        newLevel,
        value: item.value,
      };
      try {
        this.channel?.postMessage({
          type: 'p2p_collect',
          senderId: this.localPlayerId,
          payload,
        });
      } catch {
        // Ignore
      }
    }
  }

  public sendClaimCrown(holderName: string, crownPosition: Vector3D, score: number, level: number) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('claim_crown', {});
    } else {
      const payload: CrownChangedBroadcast = {
        crownHolderId: this.localPlayerId,
        holderName,
        crownPosition,
        scores: [{ id: this.localPlayerId, score, level }],
      };
      try {
        this.channel?.postMessage({
          type: 'p2p_crown',
          senderId: this.localPlayerId,
          payload,
        });
      } catch {
        // Ignore
      }
    }
  }

  private startPingLoop() {
    this.stopPingLoop();
    this.pingInterval = window.setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('ping', Date.now());
      }
    }, 3500);
  }

  private stopPingLoop() {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.callbacks.onStatusChange?.(status);
  }

  public disconnect() {
    this.stopPingLoop();
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    try {
      this.channel?.postMessage({
        type: 'p2p_leave',
        senderId: this.localPlayerId,
      });
      this.channel?.close();
    } catch {
      // Ignore
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.setStatus('disconnected');
  }
}
