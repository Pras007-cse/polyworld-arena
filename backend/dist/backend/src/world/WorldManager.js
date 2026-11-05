"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorldManager = void 0;
const PlayerManager_1 = require("../players/PlayerManager");
const ChatManager_1 = require("../chat/ChatManager");
class WorldManager {
    constructor() {
        this.collectibles = new Map();
        this.crownHolderId = null;
        this.crownPosition = { x: 0, y: 1.5, z: -12 };
        this.lastCrownTransferTime = 0;
        this.playerManager = new PlayerManager_1.PlayerManager();
        this.chatManager = new ChatManager_1.ChatManager();
        this.startTime = Date.now();
        this.initializeCollectibles();
    }
    initializeCollectibles() {
        const presetSpots = [
      // Central Plaza
      { x: 10, y: 1.0, z: 0, type: 'cyan' },
      { x: -10, y: 1.0, z: 0, type: 'cyan' },
      { x: 0, y: 1.0, z: 12, type: 'cyan' },
      { x: 0, y: 1.0, z: -12, type: 'cyan' },
      { x: 8, y: 1.0, z: 8, type: 'gold' },
      { x: -8, y: 1.0, z: -8, type: 'gold' },
      { x: 0, y: 4.2, z: 0, type: 'amethyst' },
      // Crystal Lake & Causeway Bridge
      { x: 42, y: 1.2, z: 0, type: 'cyan' },
      { x: 65, y: 1.6, z: 0, type: 'amethyst' },
      { x: 88, y: 1.2, z: 0, type: 'gold' },
      // Coral Harbor & Lighthouse (Far East)
      { x: 135, y: 1.0, z: 0, type: 'cyan' },
      { x: 175, y: 1.2, z: 0, type: 'gold' },
      { x: 205, y: 1.5, z: 0, type: 'gold' },
      { x: 195, y: 1.5, z: 14, type: 'amethyst' },
      // Whispering Pine Forest (Mid North)
      { x: -15, y: 1.0, z: -48, type: 'cyan' },
      { x: 15, y: 1.0, z: -48, type: 'cyan' },
      { x: 0, y: 1.5, z: -70, type: 'gold' },
      // Frostpeak Alpine Citadel (Far North)
      { x: 0, y: 1.0, z: -125, type: 'cyan' },
      { x: 0, y: 1.2, z: -165, type: 'gold' },
      { x: 0, y: 1.5, z: -195, type: 'amethyst' },
      { x: -16, y: 1.2, z: -195, type: 'gold' },
      { x: 16, y: 1.2, z: -195, type: 'gold' },
      // Sunlit Windmill Village (Mid West)
      { x: -30, y: 1.0, z: -8, type: 'cyan' },
      { x: -30, y: 1.0, z: 8, type: 'cyan' },
      { x: -48, y: 6.5, z: -8, type: 'amethyst' },
      // Mirage Desert & Great Pyramid (Far West)
      { x: -125, y: 1.0, z: 0, type: 'cyan' },
      { x: -165, y: 1.2, z: 0, type: 'gold' },
      { x: -195, y: 1.5, z: 0, type: 'gold' },
      { x: -195, y: 17.5, z: -24, type: 'amethyst' },
      // Sky-Citadel District (Mid South)
      { x: -8, y: 1.0, z: 36, type: 'cyan' },
      { x: 8, y: 1.0, z: 36, type: 'cyan' },
      { x: -16, y: 10.5, z: 42, type: 'amethyst' },
      { x: 16, y: 9.5, z: 42, type: 'amethyst' },
      // Emberforge Volcano Crater (Far South)
      { x: 0, y: 1.0, z: 125, type: 'cyan' },
      { x: 0, y: 1.4, z: 170, type: 'gold' },
      { x: 0, y: 1.8, z: 195, type: 'amethyst' },
      { x: 0, y: 1.4, z: 215, type: 'gold' },
      // Starlight Observatory (NE) & Ancient Aether Ruins (SW)
      { x: 95, y: 1.0, z: -95, type: 'cyan' },
      { x: 140, y: 1.5, z: -140, type: 'amethyst' },
      { x: -95, y: 1.0, z: 95, type: 'cyan' },
      { x: -140, y: 1.5, z: 140, type: 'amethyst' },
      // Upper-Floor Window Shards inside the Enterable Multi-Floor Towers
      { x: -26, y: 5.6, z: -21, type: 'gold' },
      { x: -26, y: 10.2, z: -21, type: 'gold' },
      { x: -26, y: 14.8, z: -21, type: 'amethyst' },
      { x: 26, y: 5.6, z: 21, type: 'gold' },
      { x: 26, y: 10.2, z: 21, type: 'gold' },
      { x: 26, y: 14.8, z: 21, type: 'amethyst' },
      { x: -16, y: 5.6, z: 36, type: 'gold' },
      { x: -16, y: 10.2, z: 36, type: 'amethyst' },
      { x: 16, y: 5.6, z: 36, type: 'gold' },
      { x: 16, y: 10.2, z: 36, type: 'amethyst' },
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
    getCollectibles() {
        return Array.from(this.collectibles.values());
    }
    collectItem(playerId, itemId, onRespawn) {
        const item = this.collectibles.get(itemId);
        if (!item || !item.active)
            return null;
        const player = this.playerManager.getPlayer(playerId);
        if (!player)
            return null;
        item.active = false;
        this.playerManager.addScore(playerId, item.value);
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
    claimCrown(requesterId) {
        const now = Date.now();
        if (now - this.lastCrownTransferTime < 2000)
            return false;
        const player = this.playerManager.getPlayer(requesterId);
        if (!player)
            return false;
        if (this.crownHolderId === requesterId)
            return false;
        if (this.crownHolderId) {
            const prev = this.playerManager.getPlayer(this.crownHolderId);
            if (prev)
                prev.hasCrown = false;
        }
        this.crownHolderId = requesterId;
        player.hasCrown = true;
        this.lastCrownTransferTime = now;
        this.playerManager.addScore(requesterId, 15);
        return true;
    }
    handlePlayerDisconnect(playerId) {
        const player = this.playerManager.getPlayer(playerId);
        if (this.crownHolderId === playerId) {
            this.crownHolderId = null;
            if (player) {
                this.crownPosition = {
                    x: player.position.x,
                    y: Math.max(1.2, player.position.y + 1.2),
                    z: player.position.z,
                };
            }
            else {
                this.crownPosition = { x: 0, y: 1.5, z: -12 };
            }
            return true;
        }
        return false;
    }
    getStats() {
        return {
            uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
            onlinePlayers: this.playerManager.getPlayerCount(),
            activeCollectibles: Array.from(this.collectibles.values()).filter((c) => c.active).length,
            crownHolderId: this.crownHolderId,
        };
    }
}
exports.WorldManager = WorldManager;
