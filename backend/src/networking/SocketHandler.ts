import { Server, Socket } from 'socket.io';
import { WorldManager } from '../world/WorldManager';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  JoinPayload,
  JoinResponse,
  PlayerMovePayload,
  PlayerAnimationPayload,
  ChatMessagePayload,
  CollectItemPayload,
  CrownClaimPayload,
} from '../../../shared/protocols/messages';

export class SocketHandler {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private world: WorldManager;

  constructor(
    io: Server<ClientToServerEvents, ServerToClientEvents>,
    world: WorldManager
  ) {
    this.io = io;
    this.world = world;

    // Passive score tick for Crown Holder every 2 seconds
    setInterval(() => {
      if (this.world.crownHolderId) {
        const holder = this.world.playerManager.addScore(this.world.crownHolderId, 5);
        if (holder) {
          this.world.crownPosition = {
            x: holder.position.x,
            y: holder.position.y + 2.6,
            z: holder.position.z,
          };
          this.io.emit('crown_changed', {
            crownHolderId: this.world.crownHolderId,
            holderName: holder.username,
            crownPosition: this.world.crownPosition,
            scores: this.world.playerManager.getAllPlayers().map((p) => ({
              id: p.id,
              score: p.score,
              level: p.level,
            })),
          });
        } else {
          this.world.crownHolderId = null;
        }
      }
    }, 2000);
  }

  public registerEvents() {
    this.io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
      console.log(`[SocketHandler] Client connected: ${socket.id}`);

      socket.on('player_join', (data: JoinPayload, callback?: (res: JoinResponse) => void) => {
        try {
          const existingPlayers = this.world.playerManager.getAllPlayers();
          const newPlayer = this.world.playerManager.registerPlayer(
            socket.id,
            data.username,
            data.appearance
          );

          const collectibles = this.world.getCollectibles();

          socket.emit('welcome', {
            playerId: socket.id,
            player: newPlayer,
            existingPlayers,
            collectibles,
            crownHolderId: this.world.crownHolderId,
            crownPosition: this.world.crownPosition,
            serverTime: Date.now(),
          });

          socket.broadcast.emit('player_joined', newPlayer);

          if (callback) {
            callback({
              success: true,
              playerId: socket.id,
              player: newPlayer,
              existingPlayers,
              collectibles,
              crownHolderId: this.world.crownHolderId,
              crownPosition: this.world.crownPosition,
            });
          }
        } catch (err: unknown) {
          console.error(`[SocketHandler] Join error for socket ${socket.id}:`, err);
          if (callback) {
            callback({
              success: false,
              error: 'Failed to join world',
            });
          }
        }
      });

      socket.on('player_move', (data: PlayerMovePayload) => {
        const isValid = this.world.playerManager.updateMovement(
          socket.id,
          data.position,
          data.rotation,
          data.velocity,
          data.animation
        );

        if (isValid) {
          socket.broadcast.emit('player_moved', {
            playerId: socket.id,
            position: data.position,
            rotation: data.rotation,
            velocity: data.velocity,
            animation: data.animation,
            timestamp: data.timestamp || Date.now(),
          });
        }
      });

      socket.on('player_animation', (data: PlayerAnimationPayload) => {
        const updated = this.world.playerManager.updateAnimation(
          socket.id,
          data.animation
        );
        if (updated) {
          socket.broadcast.emit('player_animated', {
            playerId: socket.id,
            animation: data.animation,
          });
        }
      });

      socket.on('chat_message', (data: ChatMessagePayload) => {
        const player = this.world.playerManager.getPlayer(socket.id);
        if (!player) return;

        const broadcastMsg = this.world.chatManager.processMessage(
          socket.id,
          player.username,
          data.text
        );

        if (broadcastMsg) {
          player.lastChat = broadcastMsg.text;
          player.lastChatTime = broadcastMsg.timestamp;
          this.io.emit('chat_broadcast', broadcastMsg);
        }
      });

      socket.on('collect_item', (data: CollectItemPayload) => {
        if (!data || !data.itemId) return;
        const result = this.world.collectItem(socket.id, data.itemId, (respawnedItem) => {
          this.io.emit('item_respawned', { item: respawnedItem });
        });

        if (result) {
          this.io.emit('item_collected', {
            itemId: result.item.id,
            playerId: socket.id,
            playerName: result.playerName,
            newScore: result.newScore,
            newLevel: result.newLevel,
            value: result.item.value,
          });
        }
      });

      socket.on('claim_crown', (_data: CrownClaimPayload) => {
        const claimed = this.world.claimCrown(socket.id);
        if (claimed) {
          const holder = this.world.playerManager.getPlayer(socket.id);
          this.io.emit('crown_changed', {
            crownHolderId: socket.id,
            holderName: holder ? holder.username : null,
            crownPosition: holder ? { x: holder.position.x, y: holder.position.y + 2.6, z: holder.position.z } : this.world.crownPosition,
            scores: this.world.playerManager.getAllPlayers().map((p) => ({
              id: p.id,
              score: p.score,
              level: p.level,
            })),
          });
        }
      });

      socket.on('ping', (clientTime: number) => {
        socket.emit('pong', {
          clientTime,
          serverTime: Date.now(),
        });
      });

      socket.on('disconnect', () => {
        const droppedCrown = this.world.handlePlayerDisconnect(socket.id);
        const removed = this.world.playerManager.removePlayer(socket.id);
        this.world.chatManager.removeUser(socket.id);

        if (removed) {
          this.io.emit('player_left', {
            playerId: socket.id,
            crownPosition: droppedCrown ? this.world.crownPosition : undefined,
          });
          if (droppedCrown) {
            this.io.emit('crown_changed', {
              crownHolderId: null,
              holderName: null,
              crownPosition: this.world.crownPosition,
              scores: this.world.playerManager.getAllPlayers().map((p) => ({
                id: p.id,
                score: p.score,
                level: p.level,
              })),
            });
          }
        }
      });
    });
  }
}
