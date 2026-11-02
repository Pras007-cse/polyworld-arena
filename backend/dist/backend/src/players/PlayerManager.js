"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerManager = void 0;
const world_1 = require("../../../shared/constants/world");
class PlayerManager {
    constructor() {
        this.players = new Map();
        this.lastUpdateTimes = new Map();
    }
    registerPlayer(socketId, rawUsername, appearance) {
        const sanitizedUsername = this.sanitizeUsername(rawUsername);
        const spawnPos = this.generateSpawnPosition();
        const player = {
            id: socketId,
            username: sanitizedUsername,
            position: spawnPos,
            rotation: 0,
            animation: 'idle',
            appearance: {
                color: (appearance === null || appearance === void 0 ? void 0 : appearance.color) || '#ffdbac',
                shirtColor: (appearance === null || appearance === void 0 ? void 0 : appearance.shirtColor) || '#3b82f6',
                pantsColor: (appearance === null || appearance === void 0 ? void 0 : appearance.pantsColor) || '#1e293b',
                avatarType: (appearance === null || appearance === void 0 ? void 0 : appearance.avatarType) || 'casual',
                accessory: (appearance === null || appearance === void 0 ? void 0 : appearance.accessory) || 'none',
            },
            score: 0,
            level: 1,
            hasCrown: false,
        };
        this.players.set(socketId, player);
        this.lastUpdateTimes.set(socketId, Date.now());
        return player;
    }
    removePlayer(socketId) {
        const player = this.players.get(socketId);
        this.players.delete(socketId);
        this.lastUpdateTimes.delete(socketId);
        return player;
    }
    getPlayer(socketId) {
        return this.players.get(socketId);
    }
    getAllPlayers() {
        return Array.from(this.players.values());
    }
    getPlayerCount() {
        return this.players.size;
    }
    addScore(socketId, points) {
        const player = this.players.get(socketId);
        if (!player)
            return undefined;
        player.score += points;
        player.level = Math.max(1, Math.floor(player.score / 100) + 1);
        return player;
    }
    updateMovement(socketId, position, rotation, _velocity, animation) {
        const player = this.players.get(socketId);
        if (!player)
            return false;
        const maxBound = world_1.WORLD_CONSTANTS.MAP_SIZE / 2;
        if (!position ||
            typeof position.x !== 'number' ||
            typeof position.y !== 'number' ||
            typeof position.z !== 'number' ||
            isNaN(position.x) ||
            isNaN(position.y) ||
            isNaN(position.z) ||
            position.x < -maxBound ||
            position.x > maxBound ||
            position.z < -maxBound ||
            position.z > maxBound ||
            position.y < -5 ||
            position.y > 80) {
            return false;
        }
        this.lastUpdateTimes.set(socketId, Date.now());
        player.position = {
            x: Number(position.x.toFixed(3)),
            y: Number(position.y.toFixed(3)),
            z: Number(position.z.toFixed(3)),
        };
        player.rotation = Number((rotation || 0).toFixed(3));
        if (animation) {
            player.animation = animation;
        }
        return true;
    }
    updateAnimation(socketId, animation) {
        const player = this.players.get(socketId);
        if (!player)
            return false;
        player.animation = animation;
        return true;
    }
    sanitizeUsername(name) {
        if (!name || typeof name !== 'string') {
            return `Explorer_${Math.floor(100 + Math.random() * 900)}`;
        }
        const clean = name.replace(/[^\w\s-]/gi, '').trim().substring(0, 18);
        return clean || `Explorer_${Math.floor(100 + Math.random() * 900)}`;
    }
    generateSpawnPosition() {
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * 8;
        return {
            x: Number((Math.cos(angle) * radius).toFixed(2)),
            y: 0,
            z: Number((Math.sin(angle) * radius).toFixed(2)),
        };
    }
}
exports.PlayerManager = PlayerManager;
