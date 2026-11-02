import { PlayerState, CharacterAppearance, Vector3D, AnimationState } from '../../../shared/types';
import { WORLD_CONSTANTS } from '../../../shared/constants/world';

export class PlayerManager {
  private players: Map<string, PlayerState> = new Map();
  private lastUpdateTimes: Map<string, number> = new Map();

  public registerPlayer(
    socketId: string,
    rawUsername: string,
    appearance: CharacterAppearance
  ): PlayerState {
    const sanitizedUsername = this.sanitizeUsername(rawUsername);
    const spawnPos = this.generateSpawnPosition();

    const player: PlayerState = {
      id: socketId,
      username: sanitizedUsername,
      position: spawnPos,
      rotation: 0,
      animation: 'idle',
      appearance: {
        color: appearance?.color || '#ffdbac',
        shirtColor: appearance?.shirtColor || '#3b82f6',
        pantsColor: appearance?.pantsColor || '#1e293b',
        avatarType: appearance?.avatarType || 'casual',
        accessory: appearance?.accessory || 'none',
      },
      score: 0,
      level: 1,
      hasCrown: false,
    };

    this.players.set(socketId, player);
    this.lastUpdateTimes.set(socketId, Date.now());
    return player;
  }

  public removePlayer(socketId: string): PlayerState | undefined {
    const player = this.players.get(socketId);
    this.players.delete(socketId);
    this.lastUpdateTimes.delete(socketId);
    return player;
  }

  public getPlayer(socketId: string): PlayerState | undefined {
    return this.players.get(socketId);
  }

  public getAllPlayers(): PlayerState[] {
    return Array.from(this.players.values());
  }

  public getPlayerCount(): number {
    return this.players.size;
  }

  public addScore(socketId: string, points: number): PlayerState | undefined {
    const player = this.players.get(socketId);
    if (!player) return undefined;
    player.score += points;
    player.level = Math.max(1, Math.floor(player.score / 100) + 1);
    return player;
  }

  public updateMovement(
    socketId: string,
    position: Vector3D,
    rotation: number,
    _velocity?: Vector3D,
    animation?: AnimationState
  ): boolean {
    const player = this.players.get(socketId);
    if (!player) return false;

    const maxBound = WORLD_CONSTANTS.MAP_SIZE / 2;
    if (
      !position ||
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
      position.y > 80
    ) {
      return false;
    }

    const now = Date.now();
    const lastTime = this.lastUpdateTimes.get(socketId) || now;
    const dt = Math.max((now - lastTime) / 1000, 0.01);
    this.lastUpdateTimes.set(socketId, now);

    const dx = position.x - player.position.x;
    const dz = position.z - player.position.z;
    const distSq = dx * dx + dz * dz;
    const maxAllowedDist = (WORLD_CONSTANTS.DASH_SPEED + 15) * dt + 6.0;

    if (distSq > maxAllowedDist * maxAllowedDist && dt < 1.0) {
      // Clamp rather than drop so teleports/portals or network bursts recover smoothly
      player.position = {
        x: Number(position.x.toFixed(3)),
        y: Number(position.y.toFixed(3)),
        z: Number(position.z.toFixed(3)),
      };
    } else {
      player.position = {
        x: Number(position.x.toFixed(3)),
        y: Number(position.y.toFixed(3)),
        z: Number(position.z.toFixed(3)),
      };
    }
    player.rotation = Number((rotation || 0).toFixed(3));
    if (animation) {
      player.animation = animation;
    }
    return true;
  }

  public updateAnimation(socketId: string, animation: AnimationState): boolean {
    const player = this.players.get(socketId);
    if (!player) return false;
    player.animation = animation;
    return true;
  }

  private sanitizeUsername(name: string): string {
    if (!name || typeof name !== 'string') {
      return `Explorer_${Math.floor(100 + Math.random() * 900)}`;
    }
    const clean = name.replace(/[^\w\s-]/gi, '').trim().substring(0, 18);
    return clean || `Explorer_${Math.floor(100 + Math.random() * 900)}`;
  }

  private generateSpawnPosition(): Vector3D {
    const angle = Math.random() * Math.PI * 2;
    const radius = 5 + Math.random() * 8;
    return {
      x: Number((Math.cos(angle) * radius).toFixed(2)),
      y: 0,
      z: Number((Math.sin(angle) * radius).toFixed(2)),
    };
  }
}
