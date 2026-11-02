import * as THREE from 'three';
import { LocalPlayer } from '../player/LocalPlayer';
import { RemotePlayer } from '../player/RemotePlayer';
import { InputManager } from '../systems/InputManager';
import {
  AnimationState,
  CharacterAppearance,
  CollectibleItem,
  CollectibleType,
  PlayerState,
  Vector3D,
} from '@shared/types';
import { WORLD_CONSTANTS } from '@shared/constants/world';
import { soundManager } from '../systems/SoundManager';

export type PlayerUpdateCallback = (
  pos: THREE.Vector3,
  rot: number,
  anim: AnimationState
) => void;

export interface LeaderboardEntry {
  id: string;
  username: string;
  score: number;
  level: number;
  hasCrown: boolean;
  isLocal?: boolean;
  isBot?: boolean;
}

interface BurstParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
}

export class WorldScene {
  public container: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public p2Camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public player: LocalPlayer;
  public player2: LocalPlayer | null = null;
  public remotePlayers: Map<string, RemotePlayer> = new Map();
  public aiBots: Map<string, RemotePlayer> = new Map();
  public inputManager: InputManager;
  public onPlayerUpdate?: PlayerUpdateCallback;
  public onCollectCrystal?: (item: CollectibleItem, newScore: number, newLevel: number) => void;
  public onCrownClaimed?: (holderId: string, holderName: string, pos: Vector3D) => void;

  // Camera orbit controls
  public cameraYaw: number = 0;
  public cameraPitch: number = 0.36;
  public cameraDistance: number = 7.0;
  private targetDistance: number = 7.0;
  public p2CameraYaw: number = 0;

  // World & Gameplay state
  public collisionBoxes: THREE.Box3[] = [];
  public jumpPads: THREE.Vector3[] = [];
  public speedRings: THREE.Vector3[] = [];
  public collectibleData: Map<string, CollectibleItem> = new Map();
  private collectibleMeshes: Map<string, THREE.Group> = new Map();
  public crownHolderId: string | null = null;
  public crownWorldPos: THREE.Vector3 = new THREE.Vector3(0, 1.5, -12);
  private worldCrownGroup!: THREE.Group;
  private lastCrownTransfer: number = 0;
  private crownScoreTimer: number = 0;

  // Lighting & Time of Day
  private ambientLight!: THREE.AmbientLight;
  private sunLight!: THREE.DirectionalLight;
  private lampLights: THREE.PointLight[] = [];
  public timeOfDay: 'day' | 'sunset' | 'night' = 'day';

  private animatedObjects: { update: (time: number, delta: number) => void }[] = [];
  private particles: BurstParticle[] = [];
  private clock: THREE.Clock;
  private isDestroyed: boolean = false;
  private reqId: number | null = null;
  public botsEnabled: boolean = true;

  constructor(
    container: HTMLElement,
    localId: string,
    username: string,
    appearance: CharacterAppearance,
    onPlayerUpdate?: PlayerUpdateCallback
  ) {
    this.container = container;
    this.onPlayerUpdate = onPlayerUpdate;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x93c5fd);
    this.scene.fog = new THREE.FogExp2(0x93c5fd, 0.0022);

    const aspect = Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 950);
    this.p2Camera = new THREE.PerspectiveCamera(60, aspect / 2, 0.1, 950);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    container.appendChild(this.renderer.domElement);

    this.inputManager = new InputManager();
    this.inputManager.attach(this.renderer.domElement);

    const spawnPos = new THREE.Vector3(
      WORLD_CONSTANTS.DEFAULT_SPAWN.x,
      WORLD_CONSTANTS.DEFAULT_SPAWN.y,
      WORLD_CONSTANTS.DEFAULT_SPAWN.z
    );
    this.player = new LocalPlayer(localId, username, appearance, spawnPos);
    this.scene.add(this.player.mesh);

    this.setupLighting();
    this.setupSky();
    this.buildTerrain();
    this.buildPlaza();
    this.buildLake();
    this.buildForest();
    this.buildHouses();
    this.buildCityArea();
    this.buildInteractiveArenaProps();
    this.initDefaultCollectibles();
    this.buildWorldCrown();
    this.spawnAIBots();

    this.onWindowResize = this.onWindowResize.bind(this);
    window.addEventListener('resize', this.onWindowResize);

    this.animate = this.animate.bind(this);
    this.animate();
  }

  public setTimeOfDay(mode: 'day' | 'sunset' | 'night') {
    this.timeOfDay = mode;
    if (mode === 'day') {
      this.scene.background = new THREE.Color(0x8ecae6);
      this.scene.fog = new THREE.FogExp2(0x8ecae6, 0.006);
      this.ambientLight.color.setHex(0xdbeafe);
      this.ambientLight.intensity = 0.7;
      this.sunLight.color.setHex(0xfffbeb);
      this.sunLight.intensity = 1.35;
      this.sunLight.position.set(45, 65, 35);
      this.lampLights.forEach((l) => (l.intensity = 0.2));
    } else if (mode === 'sunset') {
      this.scene.background = new THREE.Color(0xfb923c);
      this.scene.fog = new THREE.FogExp2(0xfdba74, 0.007);
      this.ambientLight.color.setHex(0xfed7aa);
      this.ambientLight.intensity = 0.55;
      this.sunLight.color.setHex(0xf97316);
      this.sunLight.intensity = 1.25;
      this.sunLight.position.set(-60, 22, 30);
      this.lampLights.forEach((l) => (l.intensity = 1.1));
    } else {
      this.scene.background = new THREE.Color(0x090d16);
      this.scene.fog = new THREE.FogExp2(0x090d16, 0.008);
      this.ambientLight.color.setHex(0x3b82f6);
      this.ambientLight.intensity = 0.35;
      this.sunLight.color.setHex(0x93c5fd);
      this.sunLight.intensity = 0.55;
      this.sunLight.position.set(30, 55, -40);
      this.lampLights.forEach((l) => (l.intensity = 1.8));
    }
  }

  public setSplitScreen(enabled: boolean) {
    this.inputManager.splitScreenEnabled = enabled;
    if (enabled && !this.player2) {
      this.player2 = new LocalPlayer(
        'local_p2',
        `${this.player.username}_P2`,
        {
          color: '#f1c27d',
          shirtColor: '#ec4899',
          pantsColor: '#0f172a',
          avatarType: 'athletic',
          accessory: 'visor',
        },
        this.player.position.clone().add(new THREE.Vector3(2.8, 0, 0))
      );
      this.scene.add(this.player2.mesh);
    } else if (!enabled && this.player2) {
      this.scene.remove(this.player2.mesh);
      if (this.crownHolderId === 'local_p2') {
        this.crownHolderId = null;
      }
      this.player2 = null;
      this.renderer.setScissorTest(false);
      this.renderer.setViewport(0, 0, this.container.clientWidth, this.container.clientHeight);
    }
  }

  public setBotsEnabled(enabled: boolean) {
    this.botsEnabled = enabled;
    for (const bot of this.aiBots.values()) {
      bot.mesh.visible = enabled;
    }
  }

  private spawnAIBots() {
    const botProfiles: { name: string; shirt: string; acc: 'wizard' | 'visor' | 'cap' | 'halo'; x: number; z: number }[] = [
      { name: 'Nova_AI', shirt: '#8b5cf6', acc: 'wizard', x: 12, z: -10 },
      { name: 'Zephyr_AI', shirt: '#10b981', acc: 'visor', x: -14, z: 8 },
      { name: 'Lyra_AI', shirt: '#f59e0b', acc: 'halo', x: 18, z: 16 },
    ];

    botProfiles.forEach((b, idx) => {
      const id = `bot_${idx + 1}`;
      const state: PlayerState = {
        id,
        username: b.name,
        position: { x: b.x, y: 0, z: b.z },
        rotation: 0,
        animation: 'walk',
        appearance: {
          color: '#ffdbac',
          shirtColor: b.shirt,
          pantsColor: '#1e293b',
          avatarType: 'athletic',
          accessory: b.acc,
        },
        score: (idx + 1) * 20,
        level: 1,
        isBot: true,
      };
      const bot = new RemotePlayer(state);
      bot.aiTarget.set((Math.random() - 0.5) * 60, 0, (Math.random() - 0.5) * 60);
      this.aiBots.set(id, bot);
      this.scene.add(bot.mesh);
    });
  }

  private updateAIBots(delta: number) {
    if (!this.botsEnabled) return;

    for (const bot of this.aiBots.values()) {
      bot.aiTimer -= delta;
      if (bot.aiTimer <= 0) {
        bot.aiTimer = 3.5 + Math.random() * 4;
        // Pick an active crystal or random plaza point
        const activeCrystals = Array.from(this.collectibleData.values()).filter((c) => c.active);
        if (activeCrystals.length > 0 && Math.random() > 0.35) {
          const pick = activeCrystals[Math.floor(Math.random() * activeCrystals.length)];
          bot.aiTarget.set(pick.position.x, 0, pick.position.z);
        } else {
          bot.aiTarget.set((Math.random() - 0.5) * 70, 0, (Math.random() - 0.5) * 70);
        }
      }

      const dx = bot.aiTarget.x - bot.avatar.position.x;
      const dz = bot.aiTarget.z - bot.avatar.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 1.5) {
        const speed = 6.2;
        const vx = (dx / dist) * speed;
        const vz = (dz / dist) * speed;
        bot.targetPosition.x += vx * delta;
        bot.targetPosition.z += vz * delta;
        bot.targetRotation = Math.atan2(vx, vz);
        bot.avatar.currentAnimation = 'walk';
      } else {
        bot.avatar.currentAnimation = Math.random() > 0.5 ? 'wave' : 'idle';
      }

      bot.update(delta);
      this.checkPlayerCollectibles(bot.avatar, true);
    }
  }

  public upsertRemotePlayer(state: PlayerState) {
    if (state.id === this.player.id) return;
    let remote = this.remotePlayers.get(state.id);
    if (!remote) {
      remote = new RemotePlayer(state);
      this.remotePlayers.set(state.id, remote);
      this.scene.add(remote.mesh);
    } else {
      remote.applyNetworkMove(state.position, state.rotation, state.animation);
      remote.avatar.score = state.score || remote.avatar.score;
      remote.avatar.level = state.level || remote.avatar.level;
      remote.avatar.hasCrown = !!state.hasCrown;
      remote.avatar.updateNameplate();
    }
  }

  public removeRemotePlayer(playerId: string) {
    const remote = this.remotePlayers.get(playerId);
    if (remote) {
      this.scene.remove(remote.mesh);
      this.remotePlayers.delete(playerId);
    }
  }

  public moveRemotePlayer(playerId: string, pos: Vector3D, rot: number, anim?: AnimationState) {
    const remote = this.remotePlayers.get(playerId);
    if (remote) {
      remote.applyNetworkMove(pos, rot, anim);
    }
  }

  public animateRemotePlayer(playerId: string, anim: AnimationState) {
    const remote = this.remotePlayers.get(playerId);
    if (remote) {
      remote.applyAnimation(anim);
    }
  }

  public showPlayerChat(senderId: string, text: string) {
    if (senderId === this.player.id) {
      this.player.showChatBubble(text);
      return;
    }
    const remote = this.remotePlayers.get(senderId) || this.aiBots.get(senderId);
    if (remote) {
      remote.avatar.showChatBubble(text);
    }
  }

  public getLeaderboard(): LeaderboardEntry[] {
    const list: LeaderboardEntry[] = [
      {
        id: this.player.id,
        username: this.player.username,
        score: this.player.score,
        level: this.player.level,
        hasCrown: this.crownHolderId === this.player.id,
        isLocal: true,
      },
    ];
    if (this.player2) {
      list.push({
        id: this.player2.id,
        username: this.player2.username,
        score: this.player2.score,
        level: this.player2.level,
        hasCrown: this.crownHolderId === this.player2.id,
        isLocal: true,
      });
    }
    for (const r of this.remotePlayers.values()) {
      list.push({
        id: r.id,
        username: r.username,
        score: r.avatar.score,
        level: r.avatar.level,
        hasCrown: this.crownHolderId === r.id,
      });
    }
    if (this.botsEnabled) {
      for (const b of this.aiBots.values()) {
        list.push({
          id: b.id,
          username: b.username,
          score: b.avatar.score,
          level: b.avatar.level,
          hasCrown: this.crownHolderId === b.id,
          isBot: true,
        });
      }
    }
    return list.sort((a, b) => b.score - a.score);
  }

  private initDefaultCollectibles() {
    const spots: { x: number; y: number; z: number; type: CollectibleType }[] = [
      { x: 10, y: 1.0, z: 0, type: 'cyan' },
      { x: -10, y: 1.0, z: 0, type: 'cyan' },
      { x: 0, y: 1.0, z: 12, type: 'cyan' },
      { x: 0, y: 1.0, z: -12, type: 'cyan' },
      { x: 8, y: 1.0, z: 8, type: 'gold' },
      { x: -8, y: 1.0, z: -8, type: 'gold' },
      { x: 0, y: 4.2, z: 0, type: 'amethyst' },
      { x: 29, y: 1.2, z: 0, type: 'gold' },
      { x: 45, y: 1.8, z: 0, type: 'amethyst' },
      { x: 35, y: 1.0, z: 14, type: 'cyan' },
      { x: 35, y: 1.0, z: -14, type: 'cyan' },
      { x: -15, y: 1.0, z: -42, type: 'cyan' },
      { x: 15, y: 1.0, z: -42, type: 'cyan' },
      { x: 0, y: 1.5, z: -55, type: 'amethyst' },
      { x: -24, y: 1.2, z: -60, type: 'gold' },
      { x: 24, y: 1.2, z: -60, type: 'gold' },
      { x: -30, y: 1.0, z: -8, type: 'cyan' },
      { x: -30, y: 1.0, z: 8, type: 'cyan' },
      { x: -42, y: 1.5, z: 2, type: 'gold' },
      { x: -48, y: 6.5, z: -8, type: 'amethyst' },
      { x: -8, y: 1.0, z: 36, type: 'cyan' },
      { x: 8, y: 1.0, z: 36, type: 'cyan' },
      { x: 0, y: 1.5, z: 48, type: 'gold' },
      { x: -16, y: 10.5, z: 42, type: 'amethyst' },
      { x: 16, y: 9.5, z: 42, type: 'amethyst' },
    ];

    spots.forEach((s, idx) => {
      const id = `crystal_${idx + 1}`;
      const value = s.type === 'amethyst' ? 50 : s.type === 'gold' ? 25 : 10;
      const item: CollectibleItem = {
        id,
        type: s.type,
        position: { x: s.x, y: s.y, z: s.z },
        value,
        active: true,
      };
      this.collectibleData.set(id, item);
      const mesh = this.createCrystalMesh(s.type);
      mesh.position.set(s.x, s.y, s.z);
      this.scene.add(mesh);
      this.collectibleMeshes.set(id, mesh);
    });
  }

  public syncServerCollectibles(items: CollectibleItem[]) {
    for (const item of items) {
      this.collectibleData.set(item.id, item);
      const mesh = this.collectibleMeshes.get(item.id);
      if (mesh) {
        mesh.visible = item.active;
      }
    }
  }

  public handleNetworkItemCollected(itemId: string, playerId: string, newScore: number, newLevel: number) {
    const item = this.collectibleData.get(itemId);
    if (item) {
      item.active = false;
      const mesh = this.collectibleMeshes.get(itemId);
      if (mesh) {
        this.spawnBurst(mesh.position, item.type === 'amethyst' ? 0xc084fc : item.type === 'gold' ? 0xfacc15 : 0x22d3ee);
        mesh.visible = false;
      }
    }
    if (playerId === this.player.id) {
      this.player.score = newScore;
      this.player.level = newLevel;
      this.player.updateNameplate();
    } else {
      const r = this.remotePlayers.get(playerId);
      if (r) {
        r.avatar.score = newScore;
        r.avatar.level = newLevel;
        r.avatar.updateNameplate();
      }
    }
  }

  public handleNetworkItemRespawned(item: CollectibleItem) {
    this.collectibleData.set(item.id, item);
    const mesh = this.collectibleMeshes.get(item.id);
    if (mesh) {
      mesh.visible = true;
    }
  }

  private createCrystalMesh(type: CollectibleType): THREE.Group {
    const group = new THREE.Group();
    const color = type === 'amethyst' ? 0xa855f7 : type === 'gold' ? 0xfacc15 : 0x06b6d4;
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.45,
      metalness: 0.8,
      roughness: 0.15,
    });
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(type === 'amethyst' ? 0.55 : 0.42, 0), mat);
    gem.castShadow = true;
    group.add(gem);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.58, 16),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.6;
    group.add(ring);
    return group;
  }

  private buildWorldCrown() {
    this.worldCrownGroup = new THREE.Group();
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xd97706,
      emissiveIntensity: 0.6,
      metalness: 0.9,
      roughness: 0.15,
    });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.52, 0.4, 12), goldMat);
    this.worldCrownGroup.add(base);

    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 14, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
      })
    );
    beacon.position.y = 6.5;
    this.worldCrownGroup.add(beacon);

    this.worldCrownGroup.position.copy(this.crownWorldPos);
    this.scene.add(this.worldCrownGroup);
  }

  public applyCrownState(holderId: string | null, crownPos: Vector3D, scores?: { id: string; score: number; level: number }[]) {
    this.crownHolderId = holderId;
    this.crownWorldPos.set(crownPos.x, crownPos.y, crownPos.z);
    this.worldCrownGroup.position.copy(this.crownWorldPos);
    this.worldCrownGroup.visible = !holderId;

    this.player.hasCrown = holderId === this.player.id;
    this.player.updateNameplate();

    if (this.player2) {
      this.player2.hasCrown = holderId === this.player2.id;
      this.player2.updateNameplate();
    }

    for (const r of this.remotePlayers.values()) {
      r.avatar.hasCrown = holderId === r.id;
      r.avatar.updateNameplate();
    }
    for (const b of this.aiBots.values()) {
      b.avatar.hasCrown = holderId === b.id;
      b.avatar.updateNameplate();
    }

    if (scores) {
      for (const s of scores) {
        if (s.id === this.player.id) {
          this.player.score = s.score;
          this.player.level = s.level;
          this.player.updateNameplate();
        } else {
          const r = this.remotePlayers.get(s.id);
          if (r) {
            r.avatar.score = s.score;
            r.avatar.level = s.level;
            r.avatar.updateNameplate();
          }
        }
      }
    }
  }

  private spawnBurst(pos: THREE.Vector3, colorHex: number) {
    const geo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        2 + Math.random() * 5,
        (Math.random() - 0.5) * 6
      );
      this.scene.add(m);
      this.particles.push({ mesh: m, vel, life: 0.65 });
    }
  }

  private checkPlayerCollectibles(targetPlayer: LocalPlayer, isBot: boolean = false) {
    for (const [id, item] of this.collectibleData.entries()) {
      if (!item.active) continue;
      const dx = targetPlayer.position.x - item.position.x;
      const dy = targetPlayer.position.y + 1.0 - item.position.y;
      const dz = targetPlayer.position.z - item.position.z;
      if (dx * dx + dy * dy + dz * dz < 2.4) {
        item.active = false;
        const mesh = this.collectibleMeshes.get(id);
        if (mesh) {
          this.spawnBurst(
            mesh.position,
            item.type === 'amethyst' ? 0xc084fc : item.type === 'gold' ? 0xfacc15 : 0x22d3ee
          );
          mesh.visible = false;
        }
        targetPlayer.score += item.value;
        targetPlayer.level = Math.max(1, Math.floor(targetPlayer.score / 100) + 1);
        targetPlayer.updateNameplate();

        if (!isBot) {
          soundManager.playCollect(item.value);
          this.onCollectCrystal?.(item, targetPlayer.score, targetPlayer.level);
        }

        // Local respawn fallback after 11s
        window.setTimeout(() => {
          item.active = true;
          if (mesh) mesh.visible = true;
        }, 11000);
      }
    }

    // Check Crown pickup or tag steal
    const now = performance.now();
    if (now - this.lastCrownTransfer > 2000) {
      if (!this.crownHolderId) {
        const dx = targetPlayer.position.x - this.crownWorldPos.x;
        const dz = targetPlayer.position.z - this.crownWorldPos.z;
        if (dx * dx + dz * dz < 3.2) {
          this.lastCrownTransfer = now;
          this.applyCrownState(targetPlayer.id, targetPlayer.position);
          if (!isBot) {
            soundManager.playCrown();
            this.onCrownClaimed?.(targetPlayer.id, targetPlayer.username, targetPlayer.position);
          }
        }
      } else if (this.crownHolderId !== targetPlayer.id) {
        // Check if targetPlayer tags the current Crown Holder
        let holderPos: THREE.Vector3 | null = null;
        if (this.crownHolderId === this.player.id) holderPos = this.player.position;
        else if (this.player2 && this.crownHolderId === this.player2.id) holderPos = this.player2.position;
        else if (this.remotePlayers.has(this.crownHolderId)) holderPos = this.remotePlayers.get(this.crownHolderId)!.avatar.position;
        else if (this.aiBots.has(this.crownHolderId)) holderPos = this.aiBots.get(this.crownHolderId)!.avatar.position;

        if (holderPos) {
          const dx = targetPlayer.position.x - holderPos.x;
          const dz = targetPlayer.position.z - holderPos.z;
          if (dx * dx + dz * dz < 2.2) {
            this.lastCrownTransfer = now;
            targetPlayer.score += 15;
            targetPlayer.level = Math.max(1, Math.floor(targetPlayer.score / 100) + 1);
            this.applyCrownState(targetPlayer.id, targetPlayer.position);
            this.spawnBurst(targetPlayer.position.clone().add(new THREE.Vector3(0, 2, 0)), 0xfacc15);
            if (!isBot) {
              soundManager.playCrown();
              this.onCrownClaimed?.(targetPlayer.id, targetPlayer.username, targetPlayer.position);
            }
          }
        }
      }
    }
  }

  private setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0xd9ebff, 0.7);
    this.scene.add(this.ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x446622, 0.45);
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.35);
    this.sunLight.position.set(45, 65, 35);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 160;
    const d = 55;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);
  }

  private setupSky() {
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
    });
    for (let i = 0; i < 16; i++) {
      const cloudGroup = new THREE.Group();
      const numPuffs = 3 + Math.floor(Math.random() * 3);
      for (let p = 0; p < numPuffs; p++) {
        const puff = new THREE.Mesh(
          new THREE.DodecahedronGeometry(4 + Math.random() * 2.5, 1),
          cloudMat
        );
        puff.position.set((p - numPuffs / 2) * 4.2, (Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 2.5);
        puff.scale.set(1.4, 0.7, 1);
        cloudGroup.add(puff);
      }
      const angle = (i / 16) * Math.PI * 2;
      const dist = 45 + Math.random() * 70;
      cloudGroup.position.set(Math.cos(angle) * dist, 36 + Math.random() * 14, Math.sin(angle) * dist);
      this.scene.add(cloudGroup);
    }
  }

  private buildTerrain() {
    const size = WORLD_CONSTANTS.MAP_SIZE;
    const groundGeo = new THREE.PlaneGeometry(size, size, 40, 40);
    groundGeo.rotateX(-Math.PI / 2);

    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter > 30 && Math.abs(x) > 8 && Math.abs(z) > 8) {
        const h = Math.sin(x * 0.06) * Math.cos(z * 0.06) * 0.45;
        posAttr.setY(i, Math.max(-0.1, h));
      }
    }
    groundGeo.computeVertexNormals();

    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x4da83b,
      roughness: 0.85,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, grassMat);
    ground.receiveShadow = true;
    this.scene.add(ground);

    const roadMat = new THREE.MeshStandardMaterial({
      color: 0xd6c7b2,
      roughness: 0.9,
    });

    const nsRoadGeo = new THREE.PlaneGeometry(7, size - 20);
    nsRoadGeo.rotateX(-Math.PI / 2);
    const nsRoad = new THREE.Mesh(nsRoadGeo, roadMat);
    nsRoad.position.set(0, 0.02, 0);
    nsRoad.receiveShadow = true;
    this.scene.add(nsRoad);

    const ewRoadGeo = new THREE.PlaneGeometry(size - 30, 8);
    ewRoadGeo.rotateX(-Math.PI / 2);
    const ewRoad = new THREE.Mesh(ewRoadGeo, roadMat);
    ewRoad.position.set(0, 0.025, 0);
    ewRoad.receiveShadow = true;
    this.scene.add(ewRoad);

    // Outer Scenic Loop Ring Road at radius 195m connecting all outer regions
    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(190, 198, 72),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.85, side: THREE.DoubleSide })
    );
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.set(0, 0.03, 0);
    outerRing.receiveShadow = true;
    this.scene.add(outerRing);
  }

  private buildPlaza() {
    const plazaGroup = new THREE.Group();

    const plazaGeo = new THREE.CylinderGeometry(20, 20.4, 0.1, 36);
    const plazaMat = new THREE.MeshStandardMaterial({ color: 0xded4c3, roughness: 0.75 });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.position.set(0, 0.05, 0);
    plaza.receiveShadow = true;
    plazaGroup.add(plaza);

    const fountainGroup = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7c756d, roughness: 0.7 });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85,
    });

    const basinLower = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5.0, 0.8, 24), stoneMat);
    basinLower.position.y = 0.4;
    basinLower.castShadow = true;
    basinLower.receiveShadow = true;
    fountainGroup.add(basinLower);

    const basinWater = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.1, 24), waterMat);
    basinWater.position.y = 0.75;
    fountainGroup.add(basinWater);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 2.2, 16), stoneMat);
    pillar.position.y = 1.3;
    pillar.castShadow = true;
    fountainGroup.add(pillar);

    const basinUpper = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 0.5, 20), stoneMat);
    basinUpper.position.y = 2.4;
    basinUpper.castShadow = true;
    fountainGroup.add(basinUpper);

    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 16), stoneMat);
    spire.position.y = 3.2;
    spire.castShadow = true;
    fountainGroup.add(spire);

    const jetGeo = new THREE.CylinderGeometry(0.08, 0.18, 1.4, 8);
    const jetMat = new THREE.MeshBasicMaterial({ color: 0xdff9fb, transparent: true, opacity: 0.75 });
    const jets: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const jet = new THREE.Mesh(jetGeo, jetMat);
      const angle = (i / 6) * Math.PI * 2;
      jet.position.set(Math.cos(angle) * 1.3, 2.8, Math.sin(angle) * 1.3);
      jet.rotation.z = Math.cos(angle) * 0.3;
      jet.rotation.x = Math.sin(angle) * 0.3;
      fountainGroup.add(jet);
      jets.push(jet);
    }

    this.animatedObjects.push({
      update: (time) => {
        jets.forEach((jet, idx) => {
          jet.scale.y = 0.9 + Math.sin(time * 6 + idx) * 0.25;
        });
      },
    });

    plazaGroup.add(fountainGroup);
    this.collisionBoxes.push(
      new THREE.Box3(new THREE.Vector3(-4.2, 0, -4.2), new THREE.Vector3(4.2, 3.6, 4.2))
    );
    this.scene.add(plazaGroup);
  }

  private buildLake() {
    const lakeGroup = new THREE.Group();
    lakeGroup.position.set(45, 0, 0);

    const sandBed = new THREE.Mesh(
      new THREE.CylinderGeometry(23, 24, 0.3, 32),
      new THREE.MeshStandardMaterial({ color: 0xe0c896, roughness: 0.95 })
    );
    sandBed.position.y = -0.15;
    sandBed.receiveShadow = true;
    lakeGroup.add(sandBed);

    const waterMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(20, 20, 0.2, 32),
      new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.1,
        metalness: 0.7,
        transparent: true,
        opacity: 0.85,
      })
    );
    waterMesh.position.y = -0.04;
    lakeGroup.add(waterMesh);

    // Central Mystic Island Shrine in the Lake
    const island = new THREE.Mesh(
      new THREE.CylinderGeometry(4.5, 5.5, 0.8, 16),
      new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.8 })
    );
    island.position.y = 0.35;
    lakeGroup.add(island);

    // Wooden Pier
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6e4726, roughness: 0.8 });
    const dock = new THREE.Mesh(new THREE.BoxGeometry(12, 0.25, 3.5), woodMat);
    dock.position.set(-14, 0.2, 0);
    dock.castShadow = true;
    lakeGroup.add(dock);

    this.scene.add(lakeGroup);
  }

  private buildForest() {
    const forestGroup = new THREE.Group();
    for (let i = 0; i < 55; i++) {
      const x = (Math.random() - 0.5) * 130;
      const z = -35 - Math.random() * 50;
      if (Math.abs(x) < 6 && z > -75) continue;

      const scale = 0.85 + Math.random() * 0.55;
      const tree = this.createPineTree(scale);
      tree.position.set(x, 0, z);
      forestGroup.add(tree);

      this.collisionBoxes.push(
        new THREE.Box3(
          new THREE.Vector3(x - 0.45 * scale, 0, z - 0.45 * scale),
          new THREE.Vector3(x + 0.45 * scale, 5 * scale, z + 0.45 * scale)
        )
      );
    }
    this.scene.add(forestGroup);
  }

  private createPineTree(scale: number): THREE.Group {
    const group = new THREE.Group();
    group.scale.set(scale, scale, scale);
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.45, 2.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.9 })
    );
    trunk.position.y = 1.1;
    trunk.castShadow = true;
    group.add(trunk);

    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
    for (let t = 0; t < 3; t++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(2.3 - t * 0.5, 2.4, 8), foliageMat);
      cone.position.y = 2.4 + t * 1.4;
      cone.castShadow = true;
      group.add(cone);
    }
    return group;
  }

  private buildHouses() {
    const housesGroup = new THREE.Group();
    const houseConfigs = [
      { x: -36, z: -15, rot: 0.2, color: 0xd97757, roofColor: 0x7c2d12, width: 8, depth: 7, height: 5.5 },
      { x: -48, z: -8, rot: -0.1, color: 0xe2e8f0, roofColor: 0x1e3a8a, width: 9, depth: 8, height: 6.0 },
      { x: -35, z: 12, rot: -0.3, color: 0xfcd34d, roofColor: 0x991b1b, width: 7.5, depth: 7, height: 5.2 },
    ];
    for (const conf of houseConfigs) {
      housesGroup.add(this.createBuilding(conf));
    }

    // Animated Village Windmill
    const windmill = new THREE.Group();
    windmill.position.set(-48, 0, 18);
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 3.2, 11, 12),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.8 })
    );
    tower.position.y = 5.5;
    tower.castShadow = true;
    windmill.add(tower);

    const bladesGroup = new THREE.Group();
    bladesGroup.position.set(0, 9.2, 2.4);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.8, 0.12), bladeMat);
      b.position.y = 2.2;
      const pivot = new THREE.Group();
      pivot.rotation.z = (i * Math.PI) / 2;
      pivot.add(b);
      bladesGroup.add(pivot);
    }
    windmill.add(bladesGroup);
    this.animatedObjects.push({
      update: (_time, delta) => {
        bladesGroup.rotation.z -= delta * 1.4;
      },
    });
    housesGroup.add(windmill);
    this.scene.add(housesGroup);
  }

  private buildCityArea() {
    const cityGroup = new THREE.Group();
    const cityConfigs = [
      { x: -16, z: 42, rot: 0, color: 0xcbd5e1, roofColor: 0x334155, width: 11, depth: 9, height: 9.5 },
      { x: 16, z: 42, rot: 0, color: 0xfde047, roofColor: 0xb45309, width: 10, depth: 9, height: 8.5 },
    ];
    for (const conf of cityConfigs) {
      cityGroup.add(this.createBuilding(conf));
    }
    this.scene.add(cityGroup);
  }

  private createBuilding(conf: {
    x: number;
    z: number;
    rot: number;
    color: number;
    roofColor: number;
    width: number;
    depth: number;
    height: number;
  }): THREE.Group {
    const group = new THREE.Group();
    group.position.set(conf.x, 0, conf.z);
    group.rotation.y = conf.rot;

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(conf.width, conf.height, conf.depth),
      new THREE.MeshStandardMaterial({ color: conf.color, roughness: 0.8 })
    );
    body.position.y = conf.height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const roofHeight = conf.height * 0.42;
    const roofGeo = new THREE.ConeGeometry(
      Math.sqrt(conf.width * conf.width + conf.depth * conf.depth) * 0.58,
      roofHeight,
      4
    );
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(
      roofGeo,
      new THREE.MeshStandardMaterial({ color: conf.roofColor, roughness: 0.65 })
    );
    roof.position.y = conf.height + roofHeight / 2;
    roof.castShadow = true;
    group.add(roof);

    const halfW = conf.width / 2 + 0.25;
    const halfD = conf.depth / 2 + 0.25;
    this.collisionBoxes.push(
      new THREE.Box3(
        new THREE.Vector3(conf.x - halfW, 0, conf.z - halfD),
        new THREE.Vector3(conf.x + halfW, conf.height, conf.z + halfD)
      )
    );
    return group;
  }

  private buildInteractiveArenaProps() {
    // 1. Glowing Jump Pads (launch players onto rooftops or into the air)
    const padCoords = [
      new THREE.Vector3(0, 0, 18),
      new THREE.Vector3(-42, 0, -8),
      new THREE.Vector3(-10, 0, 38),
      new THREE.Vector3(10, 0, 38),
    ];
    for (const p of padCoords) {
      this.jumpPads.push(p);
      const padGroup = new THREE.Group();
      padGroup.position.copy(p);
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.7, 0.25, 20),
        new THREE.MeshStandardMaterial({
          color: 0xec4899,
          emissive: 0xec4899,
          emissiveIntensity: 0.6,
        })
      );
      base.position.y = 0.12;
      padGroup.add(base);
      this.scene.add(padGroup);
    }

    // 2. Speed Boost Rings
    const boostCoords = [
      new THREE.Vector3(0, 0, -24),
      new THREE.Vector3(22, 0, 0),
      new THREE.Vector3(-22, 0, 0),
    ];
    for (const b of boostCoords) {
      this.speedRings.push(b);
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(2.2, 0.18, 12, 24),
        new THREE.MeshStandardMaterial({
          color: 0x22d3ee,
          emissive: 0x06b6d4,
          emissiveIntensity: 0.7,
        })
      );
      arch.position.set(b.x, 2.0, b.z);
      this.scene.add(arch);
    }

    // 3. Street Lamps with PointLights
    const lampPositions = [
      { x: -5, z: 12 }, { x: 5, z: 12 },
      { x: -5, z: -12 }, { x: 5, z: -12 },
      { x: -5, z: 28 }, { x: 5, z: 28 },
    ];
    for (const pos of lampPositions) {
      const lamp = this.createStreetLamp();
      lamp.position.set(pos.x, 0, pos.z);
      this.scene.add(lamp);
    }
  }

  private createStreetLamp(): THREE.Group {
    const group = new THREE.Group();
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.35 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 4.2, 8), ironMat);
    pole.position.y = 2.1;
    pole.castShadow = true;
    group.add(pole);

    const bulb = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.24, 1),
      new THREE.MeshBasicMaterial({ color: 0xfff3bf })
    );
    bulb.position.y = 4.1;
    group.add(bulb);

    const pointLight = new THREE.PointLight(0xfffae0, 0.3, 16);
    pointLight.position.y = 4.0;
    group.add(pointLight);
    this.lampLights.push(pointLight);
    return group;
  }

  private onWindowResize() {
    if (!this.container || this.isDestroyed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.p2Camera.aspect = width / 2 / height;
    this.p2Camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private updateCameraForPlayer(
    cam: THREE.PerspectiveCamera,
    targetPlayer: LocalPlayer,
    yaw: number,
    pitch: number,
    dist: number,
    delta: number
  ) {
    const target = targetPlayer.position.clone().add(new THREE.Vector3(0, 1.55, 0));
    const horizontalDist = dist * Math.cos(pitch);
    const verticalDist = dist * Math.sin(pitch);

    const camX = target.x + horizontalDist * Math.sin(yaw);
    const camZ = target.z + horizontalDist * Math.cos(yaw);
    const camY = Math.max(0.5, target.y + verticalDist);

    cam.position.lerp(new THREE.Vector3(camX, camY, camZ), Math.min(1, delta * 15));
    cam.lookAt(target);
  }

  private animate() {
    if (this.isDestroyed) return;
    this.reqId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    const input = this.inputManager.state;
    this.cameraYaw -= input.cameraDeltaX * 0.0035;
    this.cameraPitch = THREE.MathUtils.clamp(
      this.cameraPitch + input.cameraDeltaY * 0.0035,
      0.08,
      Math.PI / 2.3
    );
    this.targetDistance = THREE.MathUtils.clamp(this.targetDistance + input.cameraZoom, 3.5, 15.0);
    this.cameraDistance = THREE.MathUtils.lerp(this.cameraDistance, this.targetDistance, delta * 10);
    this.inputManager.resetDelta();

    // Update Local Player 1
    this.player.update(
      delta,
      this.inputManager.state,
      this.cameraYaw,
      this.collisionBoxes,
      this.jumpPads,
      this.speedRings
    );
    this.checkPlayerCollectibles(this.player, false);

    // Update Local Player 2 (if Split-Screen active)
    if (this.player2 && this.inputManager.splitScreenEnabled) {
      this.player2.update(
        delta,
        this.inputManager.p2State,
        this.p2CameraYaw,
        this.collisionBoxes,
        this.jumpPads,
        this.speedRings
      );
      this.checkPlayerCollectibles(this.player2, false);
    }

    // Update Remote Players
    for (const remote of this.remotePlayers.values()) {
      remote.update(delta);
    }

    // Update AI Bots
    this.updateAIBots(delta);

    // Crown passive score tick (local fallback when not overridden by server)
    this.crownScoreTimer += delta;
    if (this.crownScoreTimer >= 2.0) {
      this.crownScoreTimer = 0;
      if (this.crownHolderId === this.player.id) {
        this.player.score += 5;
        this.player.level = Math.max(1, Math.floor(this.player.score / 100) + 1);
        this.player.updateNameplate();
      } else if (this.player2 && this.crownHolderId === this.player2.id) {
        this.player2.score += 5;
        this.player2.level = Math.max(1, Math.floor(this.player2.score / 100) + 1);
        this.player2.updateNameplate();
      } else if (this.crownHolderId && this.aiBots.has(this.crownHolderId)) {
        const bot = this.aiBots.get(this.crownHolderId)!;
        bot.avatar.score += 5;
        bot.avatar.level = Math.max(1, Math.floor(bot.avatar.score / 100) + 1);
        bot.avatar.updateNameplate();
      }
    }

    // Animate collectibles & crown
    for (const [id, mesh] of this.collectibleMeshes.entries()) {
      if (!mesh.visible) continue;
      const item = this.collectibleData.get(id);
      mesh.rotation.y = elapsedTime * 2.2;
      if (item) {
        mesh.position.y = item.position.y + Math.sin(elapsedTime * 3 + item.position.x) * 0.18;
      }
    }
    if (this.worldCrownGroup && this.worldCrownGroup.visible) {
      this.worldCrownGroup.rotation.y = elapsedTime * 1.8;
    }

    // Update burst particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      p.mesh.position.addScaledVector(p.vel, delta);
      p.vel.y -= 12 * delta;
      p.mesh.scale.setScalar(Math.max(0.01, p.life * 1.5));
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }

    if (this.onPlayerUpdate) {
      this.onPlayerUpdate(
        this.player.position,
        this.player.rotationYaw,
        this.player.currentAnimation
      );
    }

    for (const obj of this.animatedObjects) {
      obj.update(elapsedTime, delta);
    }

    // Render Single-Screen or 2P Split-Screen
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    if (this.player2 && this.inputManager.splitScreenEnabled) {
      this.renderer.setScissorTest(true);

      // Left Half: Player 1
      this.camera.aspect = (w / 2) / h;
      this.camera.updateProjectionMatrix();
      this.updateCameraForPlayer(this.camera, this.player, this.cameraYaw, this.cameraPitch, this.cameraDistance, delta);
      this.renderer.setViewport(0, 0, w / 2, h);
      this.renderer.setScissor(0, 0, w / 2, h);
      this.renderer.render(this.scene, this.camera);

      // Right Half: Player 2
      this.p2Camera.aspect = (w / 2) / h;
      this.p2Camera.updateProjectionMatrix();
      this.updateCameraForPlayer(this.p2Camera, this.player2, this.p2CameraYaw, 0.36, 7.0, delta);
      this.renderer.setViewport(w / 2, 0, w / 2, h);
      this.renderer.setScissor(w / 2, 0, w / 2, h);
      this.renderer.render(this.scene, this.p2Camera);
    } else {
      this.renderer.setScissorTest(false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.updateCameraForPlayer(this.camera, this.player, this.cameraYaw, this.cameraPitch, this.cameraDistance, delta);
      this.renderer.setViewport(0, 0, w, h);
      this.renderer.render(this.scene, this.camera);
    }
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.reqId !== null) {
      cancelAnimationFrame(this.reqId);
    }
    window.removeEventListener('resize', this.onWindowResize);
    this.inputManager.detach();

    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
