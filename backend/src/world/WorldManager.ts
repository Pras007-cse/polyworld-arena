import { PlayerManager } from '../players/PlayerManager';
import { ChatManager } from '../chat/ChatManager';
import { CollectibleItem, CollectibleType, Vector3D } from '../../../shared/types';

export class WorldManager {
  public playerManager: PlayerManager;
  public chatManager: ChatManager;
  public startTime: number;
  public collectibles: Map<string, CollectibleItem> = new Map();
  public crownHolderId: string | null = null;
  public crownPosition: Vector3D = { x: 0, y: 1.5, z: -12 };
  private lastCrownTransferTime: number = 0;

  constructor() {
    this.playerManager = new PlayerManager();
    this.chatManager = new ChatManager();
    this.startTime = Date.now();
    this.initializeCollectibles();
  }

  private initializeCollectibles() {
    const presetSpots: { x: number; y: number; z: number; type: CollectibleType }[] = [
      // Central Plaza Ring
      { x: 10, y: 1.0, z: 0, type: 'cyan' },
      { x: -10, y: 1.0, z: 0, type: 'cyan' },
      { x: 0, y: 1.0, z: 12, type: 'cyan' },
      { x: 0, y: 1.0, z: -12, type: 'cyan' },
      { x: 8, y: 1.0, z: 8, type: 'gold' },
      { x: -8, y: 1.0, z: -8, type: 'gold' },
      // Fountain Top
      { x: 0, y: 4.2, z: 0, type: 'amethyst' },
      // Serene Lake & Dock
      { x: 29, y: 1.2, z: 0, type: 'gold' },
      { x: 45, y: 1.8, z: 0, type: 'amethyst' },
      { x: 35, y: 1.0, z: 14, type: 'cyan' },
      { x: 35, y: 1.0, z: -14, type: 'cyan' },
      // Whispering Pine Forest
      { x: -15, y: 1.0, z: -42, type: 'cyan' },
      { x: 15, y: 1.0, z: -42, type: 'cyan' },
      { x: 0, y: 1.5, z: -55, type: 'amethyst' },
      { x: -24, y: 1.2, z: -60, type: 'gold' },
      { x: 24, y: 1.2, z: -60, type: 'gold' },
      // Sunlit Village
      { x: -30, y: 1.0, z: -8, type: 'cyan' },
      { x: -30, y: 1.0, z: 8, type: 'cyan' },
      { x: -42, y: 1.5, z: 2, type: 'gold' },
      { x: -48, y: 6.5, z: -8, type: 'amethyst' },
      // South City District
      { x: -8, y: 1.0, z: 36, type: 'cyan' },
      { x: 8, y: 1.0, z: 36, type: 'cyan' },
      { x: 0, y: 1.5, z: 48, type: 'gold' },
      { x: -16, y: 10.5, z: 42, type: 'amethyst' },
      { x: 16, y: 9.5, z: 42, type: 'amethyst' },
    ];

    presetSpots.forEach((spot, index) => {
      const id = `crystal_${index + 1}`;
      const value = spot.type === 'amethyst' ? 50 : spot.type === 'gold' ? 25 : 10;
      this.collectibles.set(id, {
        id,
        type: spot.type,
        position: { x: spot.x, y: spot.y, z: spot.z },
        value,
        active: true,
      });
    });
  }

  public getCollectibles(): CollectibleItem[] {
    return Array.from(this.collectibles.values());
  }

  public collectItem(
    playerId: string,
    itemId: string,
    onRespawn: (item: CollectibleItem) => void
  ): { item: CollectibleItem; newScore: number; newLevel: number; playerName: string } | null {
    const item = this.collectibles.get(itemId);
    if (!item || !item.active) return null;

    const player = this.playerManager.getPlayer(playerId);
    if (!player) return null;

    item.active = false;
    this.playerManager.addScore(playerId, item.value);

    // Respawn after 12 seconds
    setTimeout(() => {
      item.active = true;
      onRespawn(item);
    }, 12000);

    return {
      item,
      newScore: player.score,
      newLevel: player.level,
      playerName: player.username,
    };
  }

  public claimCrown(requesterId: string): boolean {
    const now = Date.now();
    if (now - this.lastCrownTransferTime < 2000) return false; // 2s cooldown shield

    const player = this.playerManager.getPlayer(requesterId);
    if (!player) return false;

    if (this.crownHolderId === requesterId) return false;

    // Clear previous holder flag
    if (this.crownHolderId) {
      const prev = this.playerManager.getPlayer(this.crownHolderId);
      if (prev) prev.hasCrown = false;
    }

    this.crownHolderId = requesterId;
    player.hasCrown = true;
    this.lastCrownTransferTime = now;
    this.playerManager.addScore(requesterId, 15);
    return true;
  }

  public handlePlayerDisconnect(playerId: string): boolean {
    const player = this.playerManager.getPlayer(playerId);
    if (this.crownHolderId === playerId) {
      this.crownHolderId = null;
      if (player) {
        this.crownPosition = {
          x: player.position.x,
          y: Math.max(1.2, player.position.y + 1.2),
          z: player.position.z,
        };
      } else {
        this.crownPosition = { x: 0, y: 1.5, z: -12 };
      }
      return true;
    }
    return false;
  }

  public getStats() {
    return {
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      onlinePlayers: this.playerManager.getPlayerCount(),
      activeCollectibles: Array.from(this.collectibles.values()).filter((c) => c.active).length,
      crownHolderId: this.crownHolderId,
    };
  }
}
