import * as THREE from 'three';
import { LocalPlayer } from '../player/LocalPlayer';
import { RemotePlayer } from '../player/RemotePlayer';
import { InputManager } from '../systems/InputManager';
import {
  AnimationState,
  CameraControlMode,
  CameraViewMode,
  CharacterAppearance,
  CollectibleItem,
  CollectibleType,
  PetType,
  PlayerState,
  Vector3D,
  WeatherMode,
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

export interface QuestState {
  id: string;
  title: string;
  goal: number;
  progress: number;
}

interface BurstParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
}

interface SlantedRamp {
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
  yStart: number;
  yEnd: number;
  dir: 'z+' | 'z-' | 'x+' | 'x-' | 'flat';
  isMultiFloor?: boolean;
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
  public onToast?: (message: string) => void;

  // Camera orbit & mode controls
  public cameraYaw: number = 0;
  public cameraPitch: number = 0.36;
  public cameraDistance: number = 7.0;
  private targetDistance: number = 7.0;
  public p2CameraYaw: number = 0;
  public cameraViewMode: CameraViewMode = 'third_person';

  // World & Gameplay state
  public collisionBoxes: THREE.Box3[] = [];
  public vehicleBlockerBoxes: THREE.Box3[] = [];
  public slantedRamps: SlantedRamp[] = [];
  public jumpPads: THREE.Vector3[] = [];
  public speedRings: THREE.Vector3[] = [];
  public collectibleData: Map<string, CollectibleItem> = new Map();
  private collectibleMeshes: Map<string, THREE.Group | THREE.Mesh> = new Map();
  public crownHolderId: string | null = null;
  public crownWorldPos: THREE.Vector3 = new THREE.Vector3(0, 1.5, -12);
  private worldCrownGroup!: THREE.Group;
  private lastCrownTransfer: number = 0;
  private crownScoreTimer: number = 0;

  // Vehicles, Aircraft, Boats, Bus & Rides
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public townBus: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public controllableVehicles: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public controllableBoats: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public controllablePlanes: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public rescueHeli: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public skyTrain: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public interactiveSeesaws: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public interactiveCarousels: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public interactiveSwings: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public ferrisWheelRide: any = null;

  // Mini-Games & Interactive World Components
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private soccerBall: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private bowlingGame: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private basketballGame: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private interactivePianoKeys: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private interactiveTreasureChests: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private teleportPortals: any[] = [];
  private discoFloorTiles: THREE.MeshStandardMaterial[] = [];

  // Roadmap Gadgets, Weather, Pets, Quests & Race
  public weatherMode: WeatherMode = 'clear';
  private weatherParticles: THREE.Points | null = null;
  private rainbowGroup: THREE.Group | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private paintballs: any[] = [];
  private grappleLine: THREE.Line | null = null;
  private petMeshGroup: THREE.Group | null = null;
  public currentPetType: PetType = 'dragon';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private activeMeteors: any[] = [];

  public questsList: QuestState[] = [
    { id: 'q_shards', title: 'Mayor Aria: Collect 3 Aether Shards', goal: 3, progress: 0 },
    { id: 'q_window', title: 'Sky Daredevil: Reach 9m+ Height & Jump/Glide', goal: 1, progress: 0 },
    { id: 'q_blaster', title: 'Arena Sharpshooter: Fire 3 Paintball Orbs (G)', goal: 3, progress: 0 },
    { id: 'q_builder', title: 'Master Architect: Build 2 Custom Ramps/Blocks (B)', goal: 2, progress: 0 },
  ];
  public currentQuestIdx: number = 0;

  private raceCheckpoints: THREE.Vector3[] = [
    new THREE.Vector3(0, 1.5, -35),
    new THREE.Vector3(0, 1.5, -85),
    new THREE.Vector3(55, 1.5, -85),
    new THREE.Vector3(85, 1.5, -35),
    new THREE.Vector3(85, 1.5, 35),
    new THREE.Vector3(35, 1.5, 85),
    new THREE.Vector3(-35, 1.5, 85),
    new THREE.Vector3(-35, 1.5, 0),
  ];
  private raceRingMeshes: THREE.Mesh[] = [];
  public raceActive: boolean = false;
  public raceIndex: number = 0;
  public raceStartTime: number = 0;
  public raceElapsedSec: string = '0.0';

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
    onPlayerUpdate?: PlayerUpdateCallback,
    onToast?: (msg: string) => void
  ) {
    this.container = container;
    this.onPlayerUpdate = onPlayerUpdate;
    this.onToast = onToast;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8ecae6);
    this.scene.fog = new THREE.FogExp2(0x8ecae6, 0.0022);

    const aspect = Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1250);
    this.p2Camera = new THREE.PerspectiveCamera(60, aspect / 2, 0.1, 1250);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    container.appendChild(this.renderer.domElement);

    this.inputManager = new InputManager();
    this.inputManager.cameraControlMode = appearance.cameraControlMode || 'drag';
    this.inputManager.attach(this.renderer.domElement);

    this.inputManager.actions = {
      onInteract: () => this.interactNearest(this.player),
      onP2Interact: () => {
        if (this.player2) this.interactNearest(this.player2);
      },
      onGrapple: () => this.fireGrapplingHook(),
      onBlaster: () => this.firePaintballBlaster(),
      onToggleJetpack: () => this.toggleJetpack(),
      onToggleHoverboard: () => this.toggleHoverboard(),
      onBuildRamp: () => this.spawnCustomBuilderBlock(),
      onToggleCameraMode: () => this.toggleCameraControlMode(),
      onCycleCameraView: () => this.cycleCameraViewMode(),
    };

    const spawnPos = new THREE.Vector3(
      WORLD_CONSTANTS.DEFAULT_SPAWN.x,
      WORLD_CONSTANTS.DEFAULT_SPAWN.y,
      WORLD_CONSTANTS.DEFAULT_SPAWN.z
    );
    this.player = new LocalPlayer(localId, username, appearance, spawnPos);
    this.scene.add(this.player.mesh);

    this.getSlopeHeight = this.getSlopeHeight.bind(this);
    this.isForbiddenWaterForLand = this.isForbiddenWaterForLand.bind(this);

    this.setupLighting();
    this.setupSky();
    this.buildTerrain();
    this.buildPlaza();
    this.buildLake();
    this.buildForest();
    this.buildHousesAndEnterableTowers();
    this.buildOuterBiomes();
    this.buildInteractiveArenaProps();
    this.buildSlantedRampsAndOverpasses();
    this.buildPlaygroundAndAmusementRides();
    this.buildTownTravelBus();
    this.buildVehiclesBoatsPlanesAndHeli();
    this.buildDenseNeighborhoodsShapesAndMiniGames();
    this.initDefaultCollectibles();
    this.buildWorldCrown();
    this.spawnAIBots();
    this.initRoadmapSystems(appearance.petType || 'dragon');

    this.onWindowResize = this.onWindowResize.bind(this);
    window.addEventListener('resize', this.onWindowResize);

    this.animate = this.animate.bind(this);
    this.animate();
  }

  private emitToast(msg: string) {
    this.onToast?.(msg);
  }

  // ==================== SLOPE & MULTI-FLOOR ELEVATION HELPER ====================
  public getSlopeHeight(x: number, z: number, currentY?: number): number {
    let maxH = 0;
    for (let i = 0; i < this.slantedRamps.length; i++) {
      const r = this.slantedRamps[i];
      if (x >= r.xMin && x <= r.xMax && z >= r.zMin && z <= r.zMax) {
        let h = 0;
        if (r.dir === 'z+') {
          const t = (z - r.zMin) / Math.max(0.01, r.zMax - r.zMin);
          h = r.yStart + t * (r.yEnd - r.yStart);
        } else if (r.dir === 'z-') {
          const t = (r.zMax - z) / Math.max(0.01, r.zMax - r.zMin);
          h = r.yStart + t * (r.yEnd - r.yStart);
        } else if (r.dir === 'x+') {
          const t = (x - r.xMin) / Math.max(0.01, r.xMax - r.xMin);
          h = r.yStart + t * (r.yEnd - r.yStart);
        } else if (r.dir === 'x-') {
          const t = (r.xMax - x) / Math.max(0.01, r.xMax - r.xMin);
          h = r.yStart + t * (r.yEnd - r.yStart);
        } else {
          h = r.yStart;
        }
        if (r.isMultiFloor && typeof currentY === 'number') {
          if (h > currentY + 1.25) continue;
        }
        if (h > maxH) maxH = h;
      }
    }
    return maxH;
  }

  // ==================== WATER VS. LAND & BRIDGE BOUNDARY HELPERS ====================
  public isBridgeOrPierAt(x: number, z: number): boolean {
    if (this.getSlopeHeight(x, z) > 0.25) return true;
    if (x >= 35 && x <= 95 && Math.abs(z) <= 3.6) return true;
    if (Math.hypot(x - 65, z) <= 6.2) return true;
    if (x >= 178 && x <= 234 && Math.abs(z) <= 4.8) return true;
    if (Math.abs(x) <= 3.6 && z >= 166 && z <= 224) return true;
    if ((Math.abs(x - 110) <= 5.5 || Math.abs(x - 194) <= 5.5) && z >= 6 && z <= 24) return true;
    return false;
  }

  public isWaterSurfaceAt(x: number, z: number): boolean {
    const dLake = Math.hypot(x - 65, z);
    if (dLake <= 25.5 && dLake >= 6.4) return true;
    const dBay = Math.hypot(x - 230, z);
    if (dBay <= 47.0 && !(x >= 180 && x <= 233 && Math.abs(z) <= 4.5)) return true;
    if (x >= 60 && x <= 220 && z >= 8.0 && z <= 22.0) return true;
    return false;
  }

  public isForbiddenWaterForLand(x: number, z: number): boolean {
    if (this.isBridgeOrPierAt(x, z)) return false;
    if (Math.hypot(x - 65, z) < 25.0) return true;
    if (Math.hypot(x - 230, z) < 46.5) return true;
    if (x >= 62 && x <= 218 && z >= 8.5 && z <= 21.5) return true;
    if (Math.hypot(x, z - 195) < 23.0) return true;
    return false;
  }

  public isSafeForNeighborhoodBuilding(x: number, z: number, pad: number = 11): boolean {
    if (Math.abs(x) < pad + 5 || Math.abs(z) < pad + 5) return false;
    if (Math.abs(Math.abs(x) - Math.abs(z)) < pad + 4) return false;
    const r = Math.hypot(x, z);
    if (r < 30) return false;
    if (Math.abs(r - 110) < pad + 6) return false;
    if (Math.abs(r - 194) < pad + 6) return false;
    if (Math.abs(r - 300) < pad + 6) return false;
    if (Math.abs(r - 420) < pad + 6) return false;
    if (this.isForbiddenWaterForLand(x, z)) return false;
    if (x > 52 && x < 98 && z > -95 && z < -15) return false;
    if (x > -85 && x < -35 && z > 35 && z < 95) return false;
    if (x > -135 && x < -85 && z > -140 && z < -80) return false;
    if (x > 80 && x < 135 && z > 80 && z < 140) return false;
    if (Math.hypot(x - 65, z) < 34 || Math.hypot(x - 215, z) < 55) return false;
    if (Math.hypot(x, z + 195) < 48 || Math.hypot(x + 195, z) < 48 || Math.hypot(x, z - 195) < 48) return false;
    return true;
  }

  public setTimeOfDay(mode: 'day' | 'sunset' | 'night') {
    this.timeOfDay = mode;
    if (mode === 'day') {
      this.scene.background = new THREE.Color(0x8ecae6);
      this.scene.fog = new THREE.FogExp2(0x8ecae6, 0.0022);
      this.ambientLight.color.setHex(0xdbeafe);
      this.ambientLight.intensity = 0.7;
      this.sunLight.color.setHex(0xfffbeb);
      this.sunLight.intensity = 1.35;
      this.sunLight.position.set(45, 65, 35);
      this.lampLights.forEach((l) => (l.intensity = 0.2));
    } else if (mode === 'sunset') {
      this.scene.background = new THREE.Color(0xfb923c);
      this.scene.fog = new THREE.FogExp2(0xfdba74, 0.0025);
      this.ambientLight.color.setHex(0xfed7aa);
      this.ambientLight.intensity = 0.55;
      this.sunLight.color.setHex(0xf97316);
      this.sunLight.intensity = 1.25;
      this.sunLight.position.set(-60, 22, 30);
      this.lampLights.forEach((l) => (l.intensity = 1.1));
    } else {
      this.scene.background = new THREE.Color(0x090d16);
      this.scene.fog = new THREE.FogExp2(0x090d16, 0.0028);
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
          accessory: 'crown',
        },
        this.player.position.clone().add(new THREE.Vector3(2.8, 0, 0))
      );
      this.scene.add(this.player2.mesh);
      this.emitToast('🎮 2-Player Split-Screen Activated! P1: WASD | P2: Arrow Keys / IJKL');
    } else if (!enabled && this.player2) {
      if (this.player2.mountedInfo) this.unmountCharacter(this.player2);
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

  public setCameraControlMode(mode: CameraControlMode) {
    this.inputManager.cameraControlMode = mode;
    this.emitToast(
      mode === 'mouse_move'
        ? '🎯 Camera Mode: Free Mouse Move (Camera follows cursor automatically!)'
        : '🖱️ Camera Mode: Normal Drag & Move (Hold click to orbit camera)'
    );
  }

  public toggleCameraControlMode(): CameraControlMode {
    const next: CameraControlMode = this.inputManager.cameraControlMode === 'drag' ? 'mouse_move' : 'drag';
    this.setCameraControlMode(next);
    return next;
  }

  public cycleCameraViewMode(): CameraViewMode {
    const order: CameraViewMode[] = ['third_person', 'first_person', 'cinematic'];
    this.cameraViewMode = order[(order.indexOf(this.cameraViewMode) + 1) % order.length];
    if (this.cameraViewMode === 'first_person') {
      this.targetDistance = 0.2;
      if (this.player.headGroup) this.player.headGroup.visible = false;
      this.emitToast('👁️ Switched to 1st-Person View (Shortcut: V)');
    } else if (this.cameraViewMode === 'cinematic') {
      this.targetDistance = 13.5;
      if (this.player.headGroup) this.player.headGroup.visible = true;
      this.emitToast('🎬 Switched to Wide Cinematic Camera');
    } else {
      this.targetDistance = 7.0;
      if (this.player.headGroup) this.player.headGroup.visible = true;
      this.emitToast('🎥 Switched to 3rd-Person Orbit Camera');
    }
    return this.cameraViewMode;
  }

  public cycleWeather(): WeatherMode {
    const modes: WeatherMode[] = ['clear', 'rain', 'snow', 'rainbow'];
    this.weatherMode = modes[(modes.indexOf(this.weatherMode) + 1) % modes.length];
    if (this.weatherMode === 'clear') {
      if (this.weatherParticles) this.weatherParticles.visible = false;
      if (this.rainbowGroup) this.rainbowGroup.visible = false;
    } else if (this.weatherMode === 'rain') {
      if (this.weatherParticles) {
        this.weatherParticles.visible = true;
        (this.weatherParticles.material as THREE.PointsMaterial).color.setHex(0x38bdf8);
      }
      if (this.rainbowGroup) this.rainbowGroup.visible = false;
      this.emitToast('🌧️ Dynamic Rainstorm Activated!');
    } else if (this.weatherMode === 'snow') {
      if (this.weatherParticles) {
        this.weatherParticles.visible = true;
        (this.weatherParticles.material as THREE.PointsMaterial).color.setHex(0xffffff);
      }
      if (this.rainbowGroup) this.rainbowGroup.visible = false;
      this.emitToast('❄️ Alpine Snowfall Activated!');
    } else {
      if (this.weatherParticles) this.weatherParticles.visible = false;
      if (this.rainbowGroup) this.rainbowGroup.visible = true;
      this.emitToast('🌈 Giant 3D Sky Rainbow Appeared!');
    }
    return this.weatherMode;
  }

  private spawnAIBots() {
    const botProfiles: { name: string; shirt: string; acc: 'wizard' | 'visor' | 'cap' | 'halo' | 'crown'; x: number; z: number }[] = [
      { name: 'Nova_AI', shirt: '#8b5cf6', acc: 'wizard', x: 12, z: -10 },
      { name: 'Zephyr_AI', shirt: '#10b981', acc: 'visor', x: -14, z: 8 },
      { name: 'Lyra_AI', shirt: '#f59e0b', acc: 'halo', x: 55, z: 0 },
      { name: 'Orion_AI', shirt: '#ef4444', acc: 'crown', x: 0, z: -120 },
      { name: 'Vega_AI', shirt: '#14b8a6', acc: 'cap', x: -120, z: 0 },
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
      bot.aiTarget.set((Math.random() - 0.5) * 320, 0, (Math.random() - 0.5) * 320);
      this.aiBots.set(id, bot);
      this.scene.add(bot.mesh);
    });

    if (this.aiBots.has('bot_3') && this.townBus) {
      const touristBot = this.aiBots.get('bot_3')!;
      this.townBus.passengers[7] = touristBot.avatar;
      touristBot.avatar.mountedInfo = { kind: 'bus', seatIndex: 7 };
      this.townBus.updateSign();
    }
  }

  private updateAIBots(delta: number) {
    if (!this.botsEnabled) return;

    for (const bot of this.aiBots.values()) {
      if (bot.avatar.mountedInfo) {
        bot.avatar.currentAnimation = 'sit';
        bot.avatar.animateRig(delta);
        continue;
      }
      bot.aiTimer -= delta;
      if (bot.aiTimer <= 0) {
        bot.aiTimer = 3.5 + Math.random() * 4;
        const activeCrystals = Array.from(this.collectibleData.values()).filter((c) => c.active);
        if (activeCrystals.length > 0 && Math.random() > 0.25) {
          const pick = activeCrystals[Math.floor(Math.random() * activeCrystals.length)];
          bot.aiTarget.set(pick.position.x, 0, pick.position.z);
        } else {
          bot.aiTarget.set((Math.random() - 0.5) * 360, 0, (Math.random() - 0.5) * 360);
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
        bot.avatar.currentAnimation = 'wave';
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
      this.emitToast(`👋 ${remote.username} joined the world!`);
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
      { x: 42, y: 1.2, z: 0, type: 'cyan' },
      { x: 65, y: 1.6, z: 0, type: 'amethyst' },
      { x: 88, y: 1.2, z: 0, type: 'gold' },
      { x: 135, y: 1.0, z: 0, type: 'cyan' },
      { x: 175, y: 1.2, z: 0, type: 'gold' },
      { x: 205, y: 1.5, z: 0, type: 'gold' },
      { x: 195, y: 1.5, z: 14, type: 'amethyst' },
      { x: -15, y: 1.0, z: -48, type: 'cyan' },
      { x: 15, y: 1.0, z: -48, type: 'cyan' },
      { x: 0, y: 1.5, z: -70, type: 'gold' },
      { x: 0, y: 1.0, z: -125, type: 'cyan' },
      { x: 0, y: 1.2, z: -165, type: 'gold' },
      { x: 0, y: 1.5, z: -195, type: 'amethyst' },
      { x: -16, y: 1.2, z: -195, type: 'gold' },
      { x: 16, y: 1.2, z: -195, type: 'gold' },
      { x: -30, y: 1.0, z: -8, type: 'cyan' },
      { x: -30, y: 1.0, z: 8, type: 'cyan' },
      { x: -48, y: 6.5, z: -8, type: 'amethyst' },
      { x: -125, y: 1.0, z: 0, type: 'cyan' },
      { x: -165, y: 1.2, z: 0, type: 'gold' },
      { x: -195, y: 1.5, z: 0, type: 'gold' },
      { x: -195, y: 17.5, z: -24, type: 'amethyst' },
      { x: -8, y: 1.0, z: 36, type: 'cyan' },
      { x: 8, y: 1.0, z: 36, type: 'cyan' },
      { x: -16, y: 10.5, z: 42, type: 'amethyst' },
      { x: 16, y: 9.5, z: 42, type: 'amethyst' },
      { x: 0, y: 1.0, z: 125, type: 'cyan' },
      { x: 0, y: 1.4, z: 170, type: 'gold' },
      { x: 0, y: 1.8, z: 195, type: 'amethyst' },
      { x: 0, y: 1.4, z: 215, type: 'gold' },
      { x: 95, y: 1.0, z: -95, type: 'cyan' },
      { x: 140, y: 1.5, z: -140, type: 'amethyst' },
      { x: -95, y: 1.0, z: 95, type: 'cyan' },
      { x: -140, y: 1.5, z: 140, type: 'amethyst' },
      // Upper-Floor Window Shards inside Enterable Multi-Floor Towers
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
        this.spawnBurst(
          mesh.position,
          item.type === 'amethyst' ? 0xc084fc : item.type === 'gold' ? 0xfacc15 : 0x22d3ee
        );
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

  public applyCrownState(
    holderId: string | null,
    crownPos: Vector3D,
    scores?: { id: string; score: number; level: number }[]
  ) {
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

  public spawnBurst(pos: THREE.Vector3, colorHex: number) {
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
          this.advanceQuest('q_shards', 1);
          this.onCollectCrystal?.(item, targetPlayer.score, targetPlayer.level);
        }

        window.setTimeout(() => {
          item.active = true;
          if (mesh) mesh.visible = true;
        }, 11000);
      }
    }

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
            this.emitToast(`👑 ${targetPlayer.username} claimed the Golden Crown!`);
            this.onCrownClaimed?.(targetPlayer.id, targetPlayer.username, targetPlayer.position);
          }
        }
      } else if (this.crownHolderId !== targetPlayer.id) {
        let holderPos: THREE.Vector3 | null = null;
        if (this.crownHolderId === this.player.id) holderPos = this.player.position;
        else if (this.player2 && this.crownHolderId === this.player2.id) holderPos = this.player2.position;
        else if (this.remotePlayers.has(this.crownHolderId))
          holderPos = this.remotePlayers.get(this.crownHolderId)!.avatar.position;
        else if (this.aiBots.has(this.crownHolderId))
          holderPos = this.aiBots.get(this.crownHolderId)!.avatar.position;

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
              this.emitToast(`⚡ ${targetPlayer.username} stole the Golden Crown!`);
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
    for (let i = 0; i < 36; i++) {
      const cloudGroup = new THREE.Group();
      const numPuffs = 3 + (i % 3);
      for (let p = 0; p < numPuffs; p++) {
        const puff = new THREE.Mesh(
          new THREE.DodecahedronGeometry(5 + (p % 2) * 2.2, 1),
          cloudMat
        );
        puff.position.set((p - numPuffs / 2) * 5.0, (p % 2) * 1.0, 0);
        puff.scale.set(1.5, 0.7, 1);
        cloudGroup.add(puff);
      }
      const angle = (i / 36) * Math.PI * 2;
      const dist = 60 + (i % 6) * 42;
      cloudGroup.position.set(Math.cos(angle) * dist, 44 + (i % 4) * 6, Math.sin(angle) * dist);
      this.scene.add(cloudGroup);
    }
  }

  private buildTerrain() {
    const size = WORLD_CONSTANTS.MAP_SIZE;
    const groundGeo = new THREE.PlaneGeometry(size, size, 80, 80);
    groundGeo.rotateX(-Math.PI / 2);

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

    const nsRoad = new THREE.Mesh(new THREE.PlaneGeometry(8, size - 60), roadMat);
    nsRoad.rotation.x = -Math.PI / 2;
    nsRoad.position.set(0, 0.03, 0);
    nsRoad.receiveShadow = true;
    this.scene.add(nsRoad);

    const ewRoad = new THREE.Mesh(new THREE.PlaneGeometry(size - 60, 8), roadMat);
    ewRoad.rotation.x = -Math.PI / 2;
    ewRoad.position.set(0, 0.035, 0);
    ewRoad.receiveShadow = true;
    this.scene.add(ewRoad);

    const diagLen = 420;
    const diagRoad1 = new THREE.Mesh(new THREE.PlaneGeometry(6, diagLen), roadMat);
    diagRoad1.rotation.x = -Math.PI / 2;
    diagRoad1.rotation.z = -Math.PI / 4;
    diagRoad1.position.set(0, 0.028, 0);
    diagRoad1.receiveShadow = true;
    this.scene.add(diagRoad1);

    const diagRoad2 = new THREE.Mesh(new THREE.PlaneGeometry(6, diagLen), roadMat);
    diagRoad2.rotation.x = -Math.PI / 2;
    diagRoad2.rotation.z = Math.PI / 4;
    diagRoad2.position.set(0, 0.028, 0);
    diagRoad2.receiveShadow = true;
    this.scene.add(diagRoad2);

    // 4 Concentric Ring Roads (r = 110, 194, 300, 420)
    [
      { rIn: 106, rOut: 114, col: 0x94a3b8 },
      { rIn: 190, rOut: 198, col: 0xcbd5e1 },
      { rIn: 295, rOut: 305, col: 0x64748b },
      { rIn: 415, rOut: 425, col: 0x64748b },
    ].forEach((rr) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(rr.rIn, rr.rOut, 72),
        new THREE.MeshStandardMaterial({ color: rr.col, roughness: 0.85, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0, 0.03, 0);
      ring.receiveShadow = true;
      this.scene.add(ring);
    });

    // Secondary Grid Avenues at ±250m
    const subRoadMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.88 });
    [-250, 250].forEach((offset) => {
      const rNS = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 900), subRoadMat);
      rNS.rotation.x = -Math.PI / 2;
      rNS.position.set(offset, 0.024, 0);
      const rEW = new THREE.Mesh(new THREE.PlaneGeometry(900, 6.5), subRoadMat);
      rEW.rotation.x = -Math.PI / 2;
      rEW.position.set(0, 0.024, offset);
      this.scene.add(rNS, rEW);
    });
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
    lakeGroup.position.set(65, 0, 0);

    const sandBed = new THREE.Mesh(
      new THREE.CylinderGeometry(29, 30, 0.3, 36),
      new THREE.MeshStandardMaterial({ color: 0xe0c896, roughness: 0.95 })
    );
    sandBed.position.y = -0.14;
    sandBed.receiveShadow = true;
    lakeGroup.add(sandBed);

    const waterMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(26, 26, 0.22, 36),
      new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.1,
        metalness: 0.7,
        transparent: true,
        opacity: 0.85,
      })
    );
    waterMesh.position.y = -0.03;
    lakeGroup.add(waterMesh);

    const island = new THREE.Mesh(
      new THREE.CylinderGeometry(6.0, 7.0, 0.9, 20),
      new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.8 })
    );
    island.position.y = 0.4;
    lakeGroup.add(island);

    const bridgeWoodMat = new THREE.MeshStandardMaterial({ color: 0x6e4726, roughness: 0.8 });
    const lakeBridge = new THREE.Mesh(new THREE.BoxGeometry(56, 0.3, 4.8), bridgeWoodMat);
    lakeBridge.position.set(0, 0.28, 0);
    lakeBridge.castShadow = true;
    lakeBridge.receiveShadow = true;
    lakeGroup.add(lakeBridge);

    this.scene.add(lakeGroup);
  }

  private buildForest() {
    const forestGroup = new THREE.Group();
    for (let i = 0; i < 48; i++) {
      const angle = i * 1.618 * Math.PI;
      const x = Math.sin(angle * 2.3) * 62;
      const z = -36 - (i % 12) * 4.2;
      const rCenter = Math.hypot(x, z);
      if (Math.abs(x) < 9.5 || Math.abs(x - z) < 9.5 || Math.abs(x + z) < 9.5) continue;
      if (Math.abs(rCenter - 110) < 9.0) continue;

      const scale = 0.85 + (i % 4) * 0.15;
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

  public createBuilding(conf: {
    x: number;
    z: number;
    rot?: number;
    color: number;
    roofColor: number;
    w: number;
    d: number;
    h: number;
  }): THREE.Group {
    const group = new THREE.Group();
    group.position.set(conf.x, 0, conf.z);
    group.rotation.y = conf.rot || 0;

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(conf.w, conf.h, conf.d),
      new THREE.MeshStandardMaterial({ color: conf.color, roughness: 0.8 })
    );
    body.position.y = conf.h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const roofHeight = conf.h * 0.42;
    const roofGeo = new THREE.ConeGeometry(
      Math.sqrt(conf.w * conf.w + conf.d * conf.d) * 0.58,
      roofHeight,
      4
    );
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(
      roofGeo,
      new THREE.MeshStandardMaterial({ color: conf.roofColor, roughness: 0.65 })
    );
    roof.position.y = conf.h + roofHeight / 2;
    roof.castShadow = true;
    group.add(roof);

    const halfW = conf.w / 2 + 0.25;
    const halfD = conf.d / 2 + 0.25;
    this.collisionBoxes.push(
      new THREE.Box3(
        new THREE.Vector3(conf.x - halfW, 0, conf.z - halfD),
        new THREE.Vector3(conf.x + halfW, conf.h, conf.z + halfD)
      )
    );
    return group;
  }

  public createEnterableMultiFloorBuilding(conf: {
    x: number;
    z: number;
    w?: number;
    d?: number;
    floors?: number;
    color?: number;
    roofColor?: number;
  }): THREE.Group {
    const bx = conf.x;
    const bz = conf.z;
    const floors = conf.floors || 3;
    const storyH = 4.6;
    const w = conf.w || 15.0;
    const d = conf.d || 15.0;
    const hw = w / 2;
    const hd = d / 2;
    const totalH = floors * storyH;

    const g = new THREE.Group();
    g.position.set(bx, 0, bz);

    const wallMat = new THREE.MeshStandardMaterial({
      color: conf.color || 0xe2e8f0,
      roughness: 0.65,
      side: THREE.DoubleSide,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: conf.roofColor || 0x1e3a8a,
      roughness: 0.5,
    });
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xd6d3d1,
      roughness: 0.75,
      side: THREE.DoubleSide,
    });
    const stairMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.4,
      metalness: 0.2,
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
    });

    this.vehicleBlockerBoxes.push(
      new THREE.Box3(
        new THREE.Vector3(bx - hw - 0.5, 0, bz - hd - 0.5),
        new THREE.Vector3(bx + hw + 0.5, totalH, bz + hd + 0.5)
      )
    );

    const pilSize = 1.6;
    [
      { ox: -hw + pilSize / 2, oz: -hd + pilSize / 2 },
      { ox: hw - pilSize / 2, oz: -hd + pilSize / 2 },
      { ox: -hw + pilSize / 2, oz: hd - pilSize / 2 },
      { ox: hw - pilSize / 2, oz: hd - pilSize / 2 },
    ].forEach((co) => {
      const pil = new THREE.Mesh(new THREE.BoxGeometry(pilSize, totalH, pilSize), accentMat);
      pil.position.set(co.ox, totalH / 2, co.oz);
      pil.castShadow = true;
      pil.receiveShadow = true;
      g.add(pil);
      this.collisionBoxes.push(
        new THREE.Box3(
          new THREE.Vector3(bx + co.ox - pilSize / 2, 0, bz + co.oz - pilSize / 2),
          new THREE.Vector3(bx + co.ox + pilSize / 2, totalH, bz + co.oz + pilSize / 2)
        )
      );
    });

    const groundSlab = new THREE.Mesh(new THREE.BoxGeometry(w - 0.2, 0.16, d - 0.2), floorMat);
    groundSlab.position.y = 0.08;
    groundSlab.receiveShadow = true;
    g.add(groundSlab);

    for (let f = 0; f < floors; f++) {
      const y0 = f * storyH;
      const sillH = f === 0 ? 0.95 : 0.38;
      const headerH = 0.75;
      const winH = storyH - sillH - headerH;

      const lightBulb = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.12, 1.6),
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
      );
      lightBulb.position.set(0, y0 + storyH - 0.18, 0);
      g.add(lightBulb);

      [-hd, hd].forEach((wz) => {
        const header = new THREE.Mesh(new THREE.BoxGeometry(w, headerH, 0.35), wallMat);
        header.position.set(0, y0 + storyH - headerH / 2, wz);
        header.castShadow = true;
        g.add(header);

        if (f === 0) {
          const sideW = (w - 3.8) / 2;
          [-hw + sideW / 2, hw - sideW / 2].forEach((sx) => {
            const lowerWall = new THREE.Mesh(new THREE.BoxGeometry(sideW, 1.2, 0.38), wallMat);
            lowerWall.position.set(sx, y0 + 0.6, wz);
            g.add(lowerWall);
            this.collisionBoxes.push(
              new THREE.Box3(
                new THREE.Vector3(bx + sx - sideW / 2, 0, bz + wz - 0.3),
                new THREE.Vector3(bx + sx + sideW / 2, 2.2, bz + wz + 0.3)
              )
            );
          });
          const doorArch = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.28, 0.5), frameMat);
          doorArch.position.set(0, y0 + storyH - headerH, wz);
          g.add(doorArch);
        } else {
          const sill = new THREE.Mesh(new THREE.BoxGeometry(w, sillH, 0.35), wallMat);
          sill.position.set(0, y0 + sillH / 2, wz);
          const mullion = new THREE.Mesh(new THREE.BoxGeometry(1.4, winH, 0.35), wallMat);
          mullion.position.set(0, y0 + sillH + winH / 2, wz);
          g.add(sill, mullion);

          [-w * 0.24, w * 0.24].forEach((wx) => {
            const fTop = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.14, 0.42), frameMat);
            fTop.position.set(wx, y0 + sillH + winH, wz);
            const fBot = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.14, 0.48), frameMat);
            fBot.position.set(wx, y0 + sillH, wz);
            const paneL = new THREE.Mesh(new THREE.BoxGeometry(0.55, winH, 0.08), glassMat);
            paneL.position.set(wx - 1.5, y0 + sillH + winH / 2, wz);
            const paneR = new THREE.Mesh(new THREE.BoxGeometry(0.55, winH, 0.08), glassMat);
            paneR.position.set(wx + 1.5, y0 + sillH + winH / 2, wz);
            g.add(fTop, fBot, paneL, paneR);
          });
        }
      });

      [-hw, hw].forEach((wx) => {
        const header = new THREE.Mesh(new THREE.BoxGeometry(0.35, headerH, d), wallMat);
        header.position.set(wx, y0 + storyH - headerH / 2, 0);
        const sill = new THREE.Mesh(new THREE.BoxGeometry(0.35, sillH, d), wallMat);
        sill.position.set(wx, y0 + sillH / 2, 0);
        const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.35, winH, 1.5), wallMat);
        mullion.position.set(wx, y0 + sillH + winH / 2, 0);
        g.add(header, sill, mullion);

        if (f === 0) {
          this.collisionBoxes.push(
            new THREE.Box3(
              new THREE.Vector3(bx + wx - 0.3, 0, bz - hd),
              new THREE.Vector3(bx + wx + 0.3, 1.1, bz + hd)
            )
          );
        }

        [-d * 0.24, d * 0.24].forEach((wz) => {
          const fTop = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 3.6), frameMat);
          fTop.position.set(wx, y0 + sillH + winH, wz);
          const fBot = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 3.6), frameMat);
          fBot.position.set(wx, y0 + sillH, wz);
          g.add(fTop, fBot);
        });
      });

      if (f > 0) {
        const stairSide = f % 2 === 1 ? 1 : -1;
        const mainSlabW = w - 3.6;
        const mainSlabX = stairSide === 1 ? -1.8 : 1.8;

        const slabMesh = new THREE.Mesh(new THREE.BoxGeometry(mainSlabW, 0.28, d - 0.4), floorMat);
        slabMesh.position.set(mainSlabX, y0 - 0.14, 0);
        slabMesh.receiveShadow = true;
        g.add(slabMesh);

        this.slantedRamps.push({
          xMin: bx + mainSlabX - mainSlabW / 2,
          xMax: bx + mainSlabX + mainSlabW / 2,
          zMin: bz - hd + 0.2,
          zMax: bz + hd - 0.2,
          yStart: y0,
          yEnd: y0,
          dir: 'flat',
          isMultiFloor: true,
        });

        const landZ = f % 2 === 1 ? -hd + 2.2 : hd - 2.2;
        const landX = stairSide * (hw - 1.9);
        const landMesh = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.28, 4.0), floorMat);
        landMesh.position.set(landX, y0 - 0.14, landZ);
        g.add(landMesh);

        this.slantedRamps.push({
          xMin: bx + landX - 1.8,
          xMax: bx + landX + 1.8,
          zMin: bz + landZ - 2.1,
          zMax: bz + landZ + 2.1,
          yStart: y0,
          yEnd: y0,
          dir: 'flat',
          isMultiFloor: true,
        });

        const rug = new THREE.Mesh(
          new THREE.BoxGeometry(4.2, 0.04, 4.2),
          new THREE.MeshStandardMaterial({ color: conf.roofColor || 0x3b82f6 })
        );
        rug.position.set(mainSlabX, y0 + 0.02, 0);
        g.add(rug);
      }

      if (f < floors - 1) {
        const nextSide = (f + 1) % 2 === 1 ? 1 : -1;
        const stairX = nextSide * (hw - 1.9);
        const zStart = -hd + 3.8;
        const zEnd = hd - 3.8;
        const runLen = zEnd - zStart;
        const hyp = Math.sqrt(runLen * runLen + storyH * storyH);
        const ang = Math.atan2(storyH, runLen);
        const dir: 'z-' | 'z+' = (f + 1) % 2 === 1 ? 'z-' : 'z+';

        const stGroup = new THREE.Group();
        stGroup.position.set(stairX, y0 + storyH / 2, 0);
        stGroup.rotation.x = dir === 'z-' ? ang : -ang;

        const rampPlank = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.26, hyp), stairMat);
        rampPlank.castShadow = true;
        stGroup.add(rampPlank);

        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, hyp), frameMat);
        rail.position.set(-nextSide * 1.45, 0.4, 0);
        stGroup.add(rail);
        g.add(stGroup);

        this.slantedRamps.push({
          xMin: bx + stairX - 1.65,
          xMax: bx + stairX + 1.65,
          zMin: bz + zStart,
          zMax: bz + zEnd,
          yStart: y0,
          yEnd: y0 + storyH,
          dir,
          isMultiFloor: true,
        });
      }
    }

    const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4), accentMat);
    roofTrim.position.y = totalH + 0.25;
    g.add(roofTrim);

    this.scene.add(g);
    return g;
  }

  private buildHousesAndEnterableTowers() {
    const enterableTowers = [
      { x: -26, z: -28, w: 15, d: 15, floors: 4, color: 0xe2e8f0, roofColor: 0x1e3a8a },
      { x: 26, z: 28, w: 15, d: 15, floors: 4, color: 0xfef08a, roofColor: 0xb45309 },
      { x: -16, z: 42, w: 14, d: 14, floors: 3, color: 0xcbd5e1, roofColor: 0x334155 },
      { x: 16, z: 42, w: 14, d: 14, floors: 3, color: 0xbae6fd, roofColor: 0x0369a1 },
      { x: -36, z: -15, w: 12, d: 12, floors: 2, color: 0xfecdd3, roofColor: 0x991b1b },
      { x: -48, z: -8, w: 13, d: 13, floors: 3, color: 0xe2e8f0, roofColor: 0x1e3a8a },
      { x: -35, z: 12, w: 12, d: 12, floors: 2, color: 0xfde68a, roofColor: 0x7c2d12 },
      { x: -24, z: 72, w: 16, d: 16, floors: 4, color: 0xddd6fe, roofColor: 0x4c1d95 },
      { x: 24, z: 72, w: 15, d: 15, floors: 3, color: 0x99f6e4, roofColor: 0x065f46 },
      { x: 54, z: -55, w: 14, d: 14, floors: 3, color: 0xe2e8f0, roofColor: 0x0284c7 },
      { x: 162, z: 28, w: 15, d: 15, floors: 4, color: 0xfed7aa, roofColor: 0x9a3412 },
      { x: -78, z: -96, w: 14, d: 14, floors: 3, color: 0xfbcfe8, roofColor: 0x9d174d },
      { x: 205, z: -205, w: 16, d: 16, floors: 4, color: 0xbae6fd, roofColor: 0x1e40af },
      { x: -205, z: 205, w: 16, d: 16, floors: 4, color: 0xd9f99d, roofColor: 0x166534 },
    ];
    enterableTowers.forEach((et) => this.createEnterableMultiFloorBuilding(et));

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
    this.scene.add(windmill);
  }

  private buildOuterBiomes() {
    // A. Coral Harbor & Rotating Lighthouse (195, 0)
    const harborGroup = new THREE.Group();
    harborGroup.position.set(195, 0, 0);
    const oceanBay = new THREE.Mesh(
      new THREE.CylinderGeometry(48, 48, 0.25, 36),
      new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.12, metalness: 0.75 })
    );
    oceanBay.position.set(35, -0.05, 0);
    harborGroup.add(oceanBay);

    const harborPier = new THREE.Mesh(
      new THREE.BoxGeometry(46, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 })
    );
    harborPier.position.set(12, 0.25, 0);
    harborPier.castShadow = true;
    harborPier.receiveShadow = true;
    harborGroup.add(harborPier);

    const lhGroup = new THREE.Group();
    lhGroup.position.set(0, 0, -14);
    const lhBase = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 3.8, 22, 16),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 })
    );
    lhBase.position.y = 11;
    lhBase.castShadow = true;
    lhGroup.add(lhBase);

    const lhStripe = new THREE.Mesh(
      new THREE.CylinderGeometry(3.1, 3.4, 7, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
    );
    lhStripe.position.y = 10;
    lhGroup.add(lhStripe);

    const lhLantern = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 3.2, 12),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    lhLantern.position.y = 23.2;
    lhGroup.add(lhLantern);

    const lhBeamGroup = new THREE.Group();
    lhBeamGroup.position.set(0, 23.2, 0);
    const lhBeam = new THREE.Mesh(
      new THREE.ConeGeometry(4.5, 28, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
      })
    );
    lhBeam.rotation.z = Math.PI / 2;
    lhBeam.position.x = 14;
    lhBeamGroup.add(lhBeam);
    lhGroup.add(lhBeamGroup);
    this.animatedObjects.push({
      update: (_t, dt) => {
        lhBeamGroup.rotation.y += dt * 1.1;
      },
    });
    harborGroup.add(lhGroup);
    this.collisionBoxes.push(
      new THREE.Box3(new THREE.Vector3(191, 0, -18), new THREE.Vector3(199, 24, -10))
    );

    const boatGroup = new THREE.Group();
    boatGroup.position.set(32, 0.4, 14);
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(9, 1.6, 3.8),
      new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.7 })
    );
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 9, 8),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7 })
    );
    mast.position.y = 4.5;
    const sail = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 6.5, 4.2),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
    );
    sail.position.set(0, 5.0, 0);
    boatGroup.add(hull, mast, sail);
    harborGroup.add(boatGroup);
    this.animatedObjects.push({
      update: (time) => {
        boatGroup.position.y = 0.4 + Math.sin(time * 2.2) * 0.22;
        boatGroup.rotation.z = Math.sin(time * 1.6) * 0.06;
      },
    });
    this.scene.add(harborGroup);

    // B. Frostpeak Alpine Citadel (0, -195)
    const alpineGroup = new THREE.Group();
    alpineGroup.position.set(0, 0, -195);
    const snowField = new THREE.Mesh(
      new THREE.CylinderGeometry(58, 60, 0.18, 40),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.65 })
    );
    snowField.position.y = 0.04;
    snowField.receiveShadow = true;
    alpineGroup.add(snowField);

    const iceRink = new THREE.Mesh(
      new THREE.CylinderGeometry(20, 20, 0.22, 32),
      new THREE.MeshStandardMaterial({ color: 0x7dd3fc, roughness: 0.08, metalness: 0.85 })
    );
    iceRink.position.y = 0.08;
    alpineGroup.add(iceRink);

    const mountainMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
    const snowCapMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    [
      { x: -32, z: -28, r: 16, h: 36 },
      { x: 0, z: -38, r: 20, h: 46 },
      { x: 32, z: -28, r: 16, h: 34 },
    ].forEach((m) => {
      const peak = new THREE.Mesh(new THREE.ConeGeometry(m.r, m.h, 8), mountainMat);
      peak.position.set(m.x, m.h / 2, m.z);
      peak.castShadow = true;
      const cap = new THREE.Mesh(new THREE.ConeGeometry(m.r * 0.46, m.h * 0.44, 8), snowCapMat);
      cap.position.set(m.x, m.h * 0.78, m.z);
      alpineGroup.add(peak, cap);
    });
    this.scene.add(alpineGroup);

    // C. Golden Mirage Desert & Great Pyramid (-195, 0)
    const desertGroup = new THREE.Group();
    desertGroup.position.set(-195, 0, 0);
    const sandBiome = new THREE.Mesh(
      new THREE.CylinderGeometry(58, 60, 0.18, 40),
      new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.9 })
    );
    sandBiome.position.y = 0.04;
    sandBiome.receiveShadow = true;
    desertGroup.add(sandBiome);

    const pyrMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7, metalness: 0.2 });
    [
      { w: 28, h: 4, y: 2 },
      { w: 21, h: 4, y: 6 },
      { w: 14, h: 4, y: 10 },
      { w: 7, h: 4, y: 14 },
    ].forEach((t) => {
      const step = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, t.w), pyrMat);
      step.position.set(0, t.y, -24);
      step.castShadow = true;
      step.receiveShadow = true;
      desertGroup.add(step);
      this.collisionBoxes.push(
        new THREE.Box3(
          new THREE.Vector3(-195 - t.w / 2, t.y - 2, -24 - t.w / 2),
          new THREE.Vector3(-195 + t.w / 2, t.y + 2, -24 + t.w / 2)
        )
      );
    });

    const apex = new THREE.Mesh(
      new THREE.ConeGeometry(3.8, 4.0, 4),
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.65,
        metalness: 0.9,
      })
    );
    apex.rotation.y = Math.PI / 4;
    apex.position.set(0, 18, -24);
    desertGroup.add(apex);
    this.scene.add(desertGroup);

    // D. Emberforge Volcano Crater (0, 195)
    const volcanoGroup = new THREE.Group();
    volcanoGroup.position.set(0, 0, 195);
    const basaltGround = new THREE.Mesh(
      new THREE.CylinderGeometry(58, 60, 0.18, 40),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
    );
    basaltGround.position.y = 0.04;
    volcanoGroup.add(basaltGround);

    const lavaPool = new THREE.Mesh(
      new THREE.CylinderGeometry(24, 24, 0.24, 32),
      new THREE.MeshStandardMaterial({ color: 0xea580c, emissive: 0xdc2626, emissiveIntensity: 0.85 })
    );
    lavaPool.position.y = 0.08;
    volcanoGroup.add(lavaPool);

    const lavaBridge = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.45, 52),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 })
    );
    lavaBridge.position.set(0, 0.3, 0);
    lavaBridge.receiveShadow = true;
    volcanoGroup.add(lavaBridge);

    const spireMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6, roughness: 0.3 });
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2 + 0.3;
      if (Math.abs(Math.sin(ang)) < 0.25) continue;
      const sp = new THREE.Mesh(new THREE.ConeGeometry(4.5, 22 + (i % 3) * 5, 6), spireMat);
      sp.position.set(Math.cos(ang) * 32, 11, Math.sin(ang) * 32);
      sp.castShadow = true;
      volcanoGroup.add(sp);
    }
    this.scene.add(volcanoGroup);

    // E. Starlight Observatory (140, -140)
    const obsGroup = new THREE.Group();
    obsGroup.position.set(140, 0, -140);
    const obsPlinth = new THREE.Mesh(
      new THREE.CylinderGeometry(24, 26, 0.6, 32),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 })
    );
    obsPlinth.position.y = 0.3;
    obsGroup.add(obsPlinth);

    const obsRotunda = new THREE.Mesh(
      new THREE.CylinderGeometry(9, 9.5, 9, 24),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 })
    );
    obsRotunda.position.set(0, 4.8, -10);
    obsRotunda.castShadow = true;
    obsGroup.add(obsRotunda);

    const obsDome = new THREE.Mesh(
      new THREE.SphereGeometry(9, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.75, roughness: 0.2 })
    );
    obsDome.position.set(0, 9.2, -10);
    obsGroup.add(obsDome);
    this.collisionBoxes.push(
      new THREE.Box3(new THREE.Vector3(131, 0, -159), new THREE.Vector3(149, 14, -141))
    );
    this.scene.add(obsGroup);

    // F. Ancient Aether Monoliths (-140, 140)
    const ruinsGroup = new THREE.Group();
    ruinsGroup.position.set(-140, 0, 140);
    const ruinsCircle = new THREE.Mesh(
      new THREE.CylinderGeometry(24, 25, 0.4, 32),
      new THREE.MeshStandardMaterial({ color: 0xa8a29e, roughness: 0.85 })
    );
    ruinsCircle.position.y = 0.2;
    ruinsGroup.add(ruinsCircle);

    const monoMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.8 });
    const runeMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const mx = Math.cos(a) * 16;
      const mz = Math.sin(a) * 16;
      const pillarM = new THREE.Mesh(new THREE.BoxGeometry(2.4, 10, 1.6), monoMat);
      pillarM.position.set(mx, 5, mz);
      pillarM.lookAt(-140, 5, 140);
      pillarM.castShadow = true;
      const rune = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6, 1.7), runeMat);
      rune.position.copy(pillarM.position);
      ruinsGroup.add(pillarM, rune);
    }
    this.scene.add(ruinsGroup);
  }

  private buildInteractiveArenaProps() {
    const padCoords = [
      new THREE.Vector3(0, 0, 18),
      new THREE.Vector3(-42, 0, -8),
      new THREE.Vector3(-10, 0, 38),
      new THREE.Vector3(10, 0, 38),
      new THREE.Vector3(188, 0, -8),
      new THREE.Vector3(0, 0, -172),
      new THREE.Vector3(-180, 0, -10),
      new THREE.Vector3(0, 0, 172),
      new THREE.Vector3(135, 0, -135),
      new THREE.Vector3(-135, 0, 135),
    ];
    for (const p of padCoords) {
      this.jumpPads.push(p);
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(1.6, 1.8, 0.28, 20),
        new THREE.MeshStandardMaterial({
          color: 0xec4899,
          emissive: 0xec4899,
          emissiveIntensity: 0.65,
        })
      );
      base.position.set(p.x, 0.14, p.z);
      this.scene.add(base);
    }

    const boostCoords = [
      new THREE.Vector3(0, 0, -28),
      new THREE.Vector3(0, 0, -95),
      new THREE.Vector3(0, 0, -145),
      new THREE.Vector3(0, 0, 28),
      new THREE.Vector3(0, 0, 95),
      new THREE.Vector3(0, 0, 145),
      new THREE.Vector3(28, 0, 0),
      new THREE.Vector3(110, 0, 0),
      new THREE.Vector3(155, 0, 0),
      new THREE.Vector3(-28, 0, 0),
      new THREE.Vector3(-110, 0, 0),
      new THREE.Vector3(-155, 0, 0),
      new THREE.Vector3(75, 0, -75),
      new THREE.Vector3(-75, 0, 75),
    ];
    for (const b of boostCoords) {
      this.speedRings.push(b);
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(2.4, 0.2, 12, 24),
        new THREE.MeshStandardMaterial({
          color: 0x22d3ee,
          emissive: 0x06b6d4,
          emissiveIntensity: 0.75,
        })
      );
      arch.position.set(b.x, 2.1, b.z);
      if (Math.abs(b.x) > Math.abs(b.z)) arch.rotation.y = Math.PI / 2;
      else if (Math.abs(b.x) === Math.abs(b.z)) arch.rotation.y = Math.PI / 4;
      this.scene.add(arch);
    }

    const lampPositions = [
      { x: -5, z: 12 },
      { x: 5, z: 12 },
      { x: -5, z: -12 },
      { x: 5, z: -12 },
      { x: -5, z: 28 },
      { x: 5, z: 28 },
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

  public addSlantedRampMesh(
    xMin: number,
    xMax: number,
    zMin: number,
    zMax: number,
    yStart: number,
    yEnd: number,
    dir: 'z+' | 'z-' | 'x+' | 'x-' | 'flat',
    colorHex: number = 0x475569
  ) {
    this.slantedRamps.push({ xMin, xMax, zMin, zMax, yStart, yEnd, dir });
    const w = xMax - xMin;
    const d = zMax - zMin;
    const cx = (xMin + xMax) / 2;
    const cz = (zMin + zMax) / 2;
    const rampMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.7, metalness: 0.15 });
    const railMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xd97706,
      emissiveIntensity: 0.35,
    });

    if (dir === 'flat') {
      const deck = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d), rampMat);
      deck.position.set(cx, yStart - 0.2, cz);
      deck.castShadow = true;
      deck.receiveShadow = true;
      this.scene.add(deck);
      const pGeo = new THREE.CylinderGeometry(0.45, 0.55, yStart, 10);
      [-w / 2 + 0.6, w / 2 - 0.6].forEach((ox) => {
        [-d / 2 + 1.2, d / 2 - 1.2].forEach((oz) => {
          const pil = new THREE.Mesh(pGeo, rampMat);
          pil.position.set(cx + ox, yStart / 2, cz + oz);
          this.scene.add(pil);
        });
      });
    } else {
      const dy = yEnd - yStart;
      const run = dir === 'z+' || dir === 'z-' ? d : w;
      const len = Math.sqrt(run * run + dy * dy);
      const angle = Math.atan2(dy, run);
      const g = new THREE.Group();
      g.position.set(cx, (yStart + yEnd) / 2 - 0.15, cz);
      if (dir === 'z+') g.rotation.x = -angle;
      else if (dir === 'z-') g.rotation.x = angle;
      else if (dir === 'x+') g.rotation.z = angle;
      else if (dir === 'x-') g.rotation.z = -angle;

      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(
          dir === 'x+' || dir === 'x-' ? len : w,
          0.35,
          dir === 'z+' || dir === 'z-' ? len : d
        ),
        rampMat
      );
      slab.castShadow = true;
      slab.receiveShadow = true;
      g.add(slab);

      const railW = dir === 'x+' || dir === 'x-' ? len : 0.22;
      const railD = dir === 'z+' || dir === 'z-' ? len : 0.22;
      const r1 = new THREE.Mesh(new THREE.BoxGeometry(railW, 0.45, railD), railMat);
      const r2 = new THREE.Mesh(new THREE.BoxGeometry(railW, 0.45, railD), railMat);
      if (dir === 'z+' || dir === 'z-') {
        r1.position.set(-w / 2 + 0.2, 0.3, 0);
        r2.position.set(w / 2 - 0.2, 0.3, 0);
      } else {
        r1.position.set(0, 0.3, -d / 2 + 0.2);
        r2.position.set(0, 0.3, d / 2 - 0.2);
      }
      g.add(r1, r2);
      this.scene.add(g);
    }
  }

  private buildSlantedRampsAndOverpasses() {
    this.addSlantedRampMesh(10, 18, 16, 32, 0, 4.8, 'z+', 0x64748b);
    this.addSlantedRampMesh(10, 18, 32, 52, 4.8, 4.8, 'flat', 0x475569);
    this.addSlantedRampMesh(10, 18, 52, 68, 4.8, 0, 'z+', 0x64758b);

    this.addSlantedRampMesh(-94, -72, -32, -20, 0, 5.6, 'x-', 0x78716c);
    this.addSlantedRampMesh(-118, -94, -36, -16, 5.6, 5.6, 'flat', 0xa8a29e);
    this.addSlantedRampMesh(-138, -118, -32, -20, 5.6, 0, 'x-', 0x78716c);

    this.addSlantedRampMesh(96, 108, 86, 110, 0, 6.2, 'z+', 0x7c3aed);
    this.addSlantedRampMesh(112, 124, 110, 134, 6.2, 0, 'z+', 0x7c3aed);
    this.addSlantedRampMesh(86, 110, 112, 122, 0, 5.5, 'x+', 0x0284c7);

    this.addSlantedRampMesh(-182, -152, -28, -20, 0, 8.2, 'x-', 0xd97706);

    this.addSlantedRampMesh(150, 176, -16, -8, 0, 4.2, 'x+', 0x92400e);
    this.addSlantedRampMesh(176, 188, -16, -8, 4.2, 4.2, 'flat', 0x78350f);
  }

  private buildPlaygroundAndAmusementRides() {
    const createSeesaw = (id: string, x: number, z: number, rotY: number) => {
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      group.rotation.y = rotY;

      const base = new THREE.Mesh(
        new THREE.ConeGeometry(0.65, 1.1, 4),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 })
      );
      base.position.y = 0.55;
      base.rotation.y = Math.PI / 4;
      base.castShadow = true;
      group.add(base);

      const pivot = new THREE.Group();
      pivot.position.set(0, 1.05, 0);
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(6.4, 0.18, 0.75),
        new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.4 })
      );
      plank.castShadow = true;
      pivot.add(plank);

      const seatMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.5 });
      const handleMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, metalness: 0.7 });
      [-2.7, 2.7].forEach((sx) => {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.78), seatMat);
        seat.position.set(sx, 0.14, 0);
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.55, 8), handleMat);
        bar.position.set(sx > 0 ? sx - 0.45 : sx + 0.45, 0.35, 0);
        pivot.add(seat, bar);
      });

      group.add(pivot);
      this.scene.add(group);

      this.interactiveSeesaws.push({
        id,
        position: new THREE.Vector3(x, 0, z),
        rotY,
        pivot,
        angle: 0,
        phase: Math.random() * Math.PI * 2,
        riderA: null,
        riderB: null,
      });
    };

    createSeesaw('seesaw_plaza', 18, 14, 0.3);
    createSeesaw('seesaw_park', -102, -96, -0.4);

    const createCarousel = (id: string, x: number, z: number) => {
      const group = new THREE.Group();
      group.position.set(x, 0, z);

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(5.2, 5.5, 0.45, 24),
        new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5 })
      );
      base.position.y = 0.22;
      base.receiveShadow = true;
      group.add(base);

      const spinGroup = new THREE.Group();
      spinGroup.position.y = 0.45;

      const centerPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.55, 5.2, 16),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.2 })
      );
      centerPole.position.y = 2.6;
      spinGroup.add(centerPole);

      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(5.6, 2.2, 16),
        new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 })
      );
      canopy.position.y = 5.6;
      canopy.castShadow = true;
      spinGroup.add(canopy);

      const mounts: { mesh: THREE.Mesh; baseAngle: number; rider: LocalPlayer | null }[] = [];
      const mountColors = [0x3b82f6, 0x10b981, 0xa855f7, 0xf97316];
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2;
        const mx = Math.cos(ang) * 3.6;
        const mz = Math.sin(ang) * 3.6;

        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 4.8, 8),
          new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8 })
        );
        pole.position.set(mx, 2.4, mz);
        spinGroup.add(pole);

        const seatMount = new THREE.Mesh(
          new THREE.BoxGeometry(0.85, 0.45, 1.3),
          new THREE.MeshStandardMaterial({ color: mountColors[i], roughness: 0.4 })
        );
        seatMount.position.set(mx, 1.4, mz);
        seatMount.rotation.y = -ang;
        seatMount.castShadow = true;
        spinGroup.add(seatMount);
        mounts.push({ mesh: seatMount, baseAngle: ang, rider: null });
      }

      group.add(spinGroup);
      this.scene.add(group);

      this.interactiveCarousels.push({
        id,
        position: new THREE.Vector3(x, 0, z),
        spinGroup,
        mounts,
        angle: 0,
      });
    };

    createCarousel('carousel_plaza', -20, -14);
    createCarousel('carousel_park', -116, -108);

    const createSwingSet = (id: string, x: number, z: number) => {
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.5, roughness: 0.4 });
      const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.2, 8), frameMat);
      topBar.rotation.z = Math.PI / 2;
      topBar.position.y = 4.4;
      group.add(topBar);

      [-2.4, 2.4].forEach((lx) => {
        [-1.2, 1.2].forEach((lz) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 4.7, 8), frameMat);
          leg.position.set(lx, 2.2, lz / 2);
          leg.rotation.x = lz > 0 ? -0.25 : 0.25;
          group.add(leg);
        });
      });

      const swingPivot = new THREE.Group();
      swingPivot.position.set(0, 4.4, 0);
      const chainMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8 });
      [-0.45, 0.45].forEach((cx) => {
        const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.2, 6), chainMat);
        chain.position.set(cx, -1.6, 0);
        swingPivot.add(chain);
      });
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.1, 0.55),
        new THREE.MeshStandardMaterial({ color: 0xf43f5e })
      );
      seat.position.set(0, -3.2, 0);
      swingPivot.add(seat);
      group.add(swingPivot);
      this.scene.add(group);

      this.interactiveSwings.push({
        id,
        position: new THREE.Vector3(x, 0, z),
        pivot: swingPivot,
        seat,
        rider: null,
        phase: 0,
      });
    };

    createSwingSet('swing_plaza', 22, -14);
    createSwingSet('swing_park', -94, -112);

    // Giant 24m Ferris Wheel
    const fwGroup = new THREE.Group();
    fwGroup.position.set(-110, 0, -126);
    const supportMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.6, roughness: 0.3 });
    [-2.2, 2.2].forEach((zOff) => {
      const s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 15, 8), supportMat);
      s1.position.set(-4.5, 6.8, zOff);
      s1.rotation.z = -0.32;
      const s2 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 15, 8), supportMat);
      s2.position.set(4.5, 6.8, zOff);
      s2.rotation.z = 0.32;
      fwGroup.add(s1, s2);
    });

    const wheelPivot = new THREE.Group();
    wheelPivot.position.set(0, 13.5, 0);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x7e22ce, emissiveIntensity: 0.5 });
    const rim1 = new THREE.Mesh(new THREE.TorusGeometry(10.5, 0.22, 12, 36), rimMat);
    rim1.position.z = -1.6;
    const rim2 = new THREE.Mesh(new THREE.TorusGeometry(10.5, 0.22, 12, 36), rimMat);
    rim2.position.z = 1.6;
    wheelPivot.add(rim1, rim2);

    const gondolas: { group: THREE.Group; baseAngle: number; rider: LocalPlayer | null }[] = [];
    const gColors = [0xef4444, 0xf59e0b, 0x10b981, 0x06b6d4, 0x3b82f6, 0xec4899];
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 21, 6), supportMat);
      spoke.rotation.z = ang;
      wheelPivot.add(spoke);

      const cabinGroup = new THREE.Group();
      cabinGroup.position.set(Math.cos(ang) * 10.5, Math.sin(ang) * 10.5, 0);
      const cabinBox = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 1.4, 2.2),
        new THREE.MeshStandardMaterial({ color: gColors[i], roughness: 0.4 })
      );
      cabinGroup.add(cabinBox);
      wheelPivot.add(cabinGroup);
      gondolas.push({ group: cabinGroup, baseAngle: ang, rider: null });
    }

    fwGroup.add(wheelPivot);
    this.scene.add(fwGroup);

    this.ferrisWheelRide = {
      position: new THREE.Vector3(-110, 0, -126),
      wheelPivot,
      gondolas,
      angle: 0,
    };
  }

  private buildTownTravelBus() {
    const busGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35, metalness: 0.2 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
    });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.35, 9.2), bodyMat);
    chassis.position.y = 1.05;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    busGroup.add(chassis);

    const blueStripe = new THREE.Mesh(new THREE.BoxGeometry(3.46, 0.38, 9.24), stripeMat);
    blueStripe.position.y = 1.15;
    busGroup.add(blueStripe);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.22, 8.6), bodyMat);
    roof.position.y = 3.35;
    roof.castShadow = true;
    busGroup.add(roof);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(3.1, 1.5, 0.15), glassMat);
    windshield.position.set(0, 2.45, 4.45);
    busGroup.add(windshield);

    [-1.55, 1.55].forEach((px) => {
      [-4.1, -1.4, 1.4, 4.1].forEach((pz) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.65, 0.14), darkMat);
        post.position.set(px, 2.5, pz);
        busGroup.add(post);
      });
    });

    const hlMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    [-1.2, 1.2].forEach((lx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.25, 0.1), hlMat);
      hl.position.set(lx, 0.95, 4.62);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.25, 0.1), tlMat);
      tl.position.set(lx, 0.95, -4.62);
      busGroup.add(hl, tl);
    });

    const wheels: THREE.Mesh[] = [];
    const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.38, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    [-3.0, 0, 3.0].forEach((wz) => {
      [-1.72, 1.72].forEach((wx) => {
        const wMesh = new THREE.Mesh(wheelGeo, darkMat);
        wMesh.position.set(wx, 0.55, wz);
        wMesh.castShadow = true;
        busGroup.add(wMesh);
        wheels.push(wMesh);
      });
    });

    const seatOffsets: THREE.Vector3[] = [];
    const seatMeshMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 });
    [-2.7, -0.9, 0.9, 2.7].forEach((sz) => {
      [-0.95, 0.95].forEach((sx) => {
        const sBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.8), seatMeshMat);
        sBase.position.set(sx, 1.75, sz);
        busGroup.add(sBase);
        seatOffsets.push(new THREE.Vector3(sx, 1.75, sz));
      });
    });

    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 96;
    const signTex = new THREE.CanvasTexture(signCanvas);
    const signSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: signTex, transparent: true, depthTest: false })
    );
    signSprite.scale.set(5.2, 0.98, 1);
    signSprite.position.set(0, 4.45, 0);
    busGroup.add(signSprite);

    const waypoints: { x: number; z: number; isStop: boolean; name: string }[] = [];
    const stationNames: Record<number, string> = {
      0: 'East Lake & Canal Bridge Station',
      3: 'Aether Airport & Observatory Transfer',
      6: 'North Pine Forest & Frostpeak Transfer',
      9: 'Wonderland Playground & Amusement Park',
      12: 'West Windmill Village & Desert Transfer',
      15: 'Ancient Monoliths & Southwest Station',
      18: 'South Sky-Citadel & Volcano Transfer',
      21: 'Stunt Overpass Valley & Southeast Station',
    };
    const busRadius = 110;
    for (let k = 0; k < 24; k++) {
      const ang = -(k / 24) * Math.PI * 2;
      const wx = Math.round(Math.cos(ang) * busRadius * 10) / 10;
      const wz = Math.round(Math.sin(ang) * busRadius * 10) / 10;
      const stopName = stationNames[k] || null;
      waypoints.push({
        x: wx,
        z: wz,
        isStop: !!stopName,
        name: stopName || stationNames[Math.floor(k / 3) * 3] || 'Town Ring Boulevard',
      });
    }
    busGroup.position.set(busRadius, 0, 0);
    this.scene.add(busGroup);

    this.townBus = {
      mesh: busGroup,
      position: busGroup.position,
      rotationYaw: 0,
      wheels,
      seatOffsets,
      passengers: new Array(8).fill(null),
      waypoints,
      wpIndex: 1,
      stopTimer: 0,
      speed: 17.5,
      signCanvas,
      signTex,
      updateSign() {
        const ctx = this.signCanvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, 512, 96);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.beginPath();
        ctx.roundRect(8, 8, 496, 80, 18);
        ctx.fill();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.stroke();

        let count = 0;
        for (let i = 0; i < this.passengers.length; i++) {
          if (this.passengers[i]) count++;
        }
        const nextStop = this.waypoints[this.wpIndex].name;
        ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#facc15';
        ctx.textAlign = 'center';
        ctx.fillText(`🚌 TOWN TOUR BUS • NEXT: ${nextStop.toUpperCase()}`, 256, 36);
        ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(`Seats Occupied: ${count}/8 • Press [E] or Click "Board Tour Bus" to Ride!`, 256, 66);
        this.signTex.needsUpdate = true;
      },
    };
    this.townBus.updateSign();
  }

  private buildVehiclesBoatsPlanesAndHeli() {
    const createDrivableCar = (id: string, name: string, x: number, z: number, colorHex: number) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);

      const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.45, roughness: 0.25 });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55 });

      const lower = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.72, 4.4), bodyMat);
      lower.position.y = 0.65;
      lower.castShadow = true;
      lower.receiveShadow = true;
      g.add(lower);

      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 2.0), glassMat);
      hood.position.set(0, 1.22, -0.2);
      g.add(hood);

      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.45), darkMat);
      spoiler.position.set(0, 1.18, -2.05);
      g.add(spoiler);

      const hlMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      [-0.8, 0.8].forEach((lx) => {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), hlMat);
        hl.position.set(lx, 0.7, 2.22);
        g.add(hl);
      });

      const wheels: THREE.Mesh[] = [];
      const wGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 14);
      wGeo.rotateZ(Math.PI / 2);
      [-1.4, 1.4].forEach((wz) => {
        [-1.2, 1.2].forEach((wx) => {
          const w = new THREE.Mesh(wGeo, darkMat);
          w.position.set(wx, 0.42, wz);
          g.add(w);
          wheels.push(w);
        });
      });

      this.scene.add(g);
      this.controllableVehicles.push({
        id,
        name,
        type: 'car',
        mesh: g,
        position: g.position,
        rotationYaw: 0,
        speed: 0,
        velocityY: 0,
        isAirborne: false,
        pitch: 0,
        lastClimbVel: 0,
        wheels,
        driver: null,
      });
    };

    createDrivableCar('car_1', 'Crimson Turbo Roadster', -14, 14, 0xef4444);
    createDrivableCar('car_2', 'Neon Cyber Cruiser', 14, 14, 0x06b6d4);
    createDrivableCar('car_3', 'Solar Dune Buggy', -54, -10, 0xf59e0b);
    createDrivableCar('car_4', 'Emerald Alpine Rover', -16, -30, 0x10b981);

    const createDrivableBoat = (id: string, name: string, x: number, z: number, colorHex: number) => {
      const g = new THREE.Group();
      g.position.set(x, 0.15, z);

      const hullMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3, metalness: 0.3 });
      const deckMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 });

      const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 5.2), hullMat);
      hull.position.y = 0.35;
      hull.castShadow = true;
      g.add(hull);

      const bow = new THREE.Mesh(new THREE.ConeGeometry(1.7, 2.2, 4), hullMat);
      bow.rotation.x = Math.PI / 2;
      bow.rotation.z = Math.PI / 4;
      bow.position.set(0, 0.35, 3.4);
      g.add(bow);

      const deck = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, 3.8), deckMat);
      deck.position.set(0, 0.72, -0.2);
      g.add(deck);

      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 0.15), glassMat);
      windshield.position.set(0, 1.05, 0.9);
      windshield.rotation.x = -0.35;
      g.add(windshield);

      const wake = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 3.5),
        new THREE.MeshBasicMaterial({
          color: 0xe0f2fe,
          transparent: true,
          opacity: 0.0,
          side: THREE.DoubleSide,
        })
      );
      wake.rotation.x = -Math.PI / 2;
      wake.position.set(0, 0.05, -4.2);
      g.add(wake);

      this.scene.add(g);
      this.controllableBoats.push({
        id,
        name,
        type: 'boat',
        mesh: g,
        position: g.position,
        rotationYaw: 0,
        speed: 0,
        wake,
        driver: null,
      });
    };

    createDrivableBoat('boat_1', 'Crystal Lake Speedboat', 48, 12, 0x0284c7);
    createDrivableBoat('boat_2', 'Mystic Shrine Cruiser', 65, -14, 0x8b5cf6);
    createDrivableBoat('boat_3', 'Coral Harbor Wave-Runner', 208, 14, 0xf43f5e);

    // Navigable Water Canal & Ring Road Canal Bridges
    const canalWater = new THREE.Mesh(
      new THREE.PlaneGeometry(165, 14),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.75 })
    );
    canalWater.rotation.x = -Math.PI / 2;
    canalWater.position.set(142, 0.02, 15);
    this.scene.add(canalWater);

    const bankMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
    [7.6, 22.4].forEach((bz) => {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(160, 0.35, 0.8), bankMat);
      bank.position.set(142, 0.18, bz);
      this.scene.add(bank);
    });

    [110, 194].forEach((bx) => {
      const br = new THREE.Mesh(
        new THREE.BoxGeometry(10, 0.45, 16),
        new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.7 })
      );
      br.position.set(bx, 0.28, 15);
      br.receiveShadow = true;
      this.scene.add(br);
    });

    // Aether Airport & Controllable 3D Aeroplanes
    const runwayGroup = new THREE.Group();
    runwayGroup.position.set(75, 0, -55);
    const tarmac = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 72),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 })
    );
    tarmac.rotation.x = -Math.PI / 2;
    tarmac.position.y = 0.04;
    tarmac.receiveShadow = true;
    runwayGroup.add(tarmac);

    const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let dz = -30; dz <= 30; dz += 7) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 3.8), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.05, dz);
      runwayGroup.add(dash);
    }

    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.8, 14, 12),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 })
    );
    tower.position.set(-12, 7, -10);
    tower.castShadow = true;
    const towerCab = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 2.6, 3.2, 12),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.6, roughness: 0.2 })
    );
    towerCab.position.set(-12, 15.2, -10);
    runwayGroup.add(tower, towerCab);
    this.scene.add(runwayGroup);

    const createAeroplane = (id: string, name: string, x: number, z: number, rotY: number, colorHex: number) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = rotY;

      const bodyGroup = new THREE.Group();
      g.add(bodyGroup);

      const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.35, roughness: 0.3 });
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55 });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });

      const fuselage = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 6.2), bodyMat);
      fuselage.position.y = 1.3;
      fuselage.castShadow = true;
      bodyGroup.add(fuselage);

      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.6, 8), whiteMat);
      nose.rotation.x = Math.PI / 2;
      nose.position.set(0, 1.3, 3.8);
      bodyGroup.add(nose);

      const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.75, 2.2), glassMat);
      canopy.position.set(0, 2.1, 0.4);
      bodyGroup.add(canopy);

      const mainWing = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.18, 1.8), whiteMat);
      mainWing.position.set(0, 1.85, 0.6);
      mainWing.castShadow = true;
      bodyGroup.add(mainWing);

      const wingStripe = new THREE.Mesh(new THREE.BoxGeometry(10.65, 0.2, 0.45), bodyMat);
      wingStripe.position.set(0, 1.85, 1.1);
      bodyGroup.add(wingStripe);

      const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.6, 1.3), bodyMat);
      tailFin.position.set(0, 2.3, -2.5);
      const hStab = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.14, 1.1), whiteMat);
      hStab.position.set(0, 1.6, -2.6);
      bodyGroup.add(tailFin, hStab);

      const wGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.24, 12);
      wGeo.rotateZ(Math.PI / 2);
      [-1.1, 1.1].forEach((wx) => {
        const w = new THREE.Mesh(wGeo, darkMat);
        w.position.set(wx, 0.35, 1.2);
        bodyGroup.add(w);
      });

      const propGroup = new THREE.Group();
      propGroup.position.set(0, 1.3, 4.65);
      const blade1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, 0.06), darkMat);
      const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.4, 0.06), darkMat);
      propGroup.add(blade1, blade2);
      bodyGroup.add(propGroup);

      this.scene.add(g);
      this.controllablePlanes.push({
        id,
        name,
        type: 'plane',
        mesh: g,
        bodyGroup,
        propeller: propGroup,
        position: g.position,
        rotationYaw: rotY,
        speed: 0,
        pitch: 0,
        roll: 0,
        pilot: null,
      });
    };

    createAeroplane('plane_1', 'Skyhawk Turbo Biplane', 75, -48, Math.PI, 0x8b5cf6);
    createAeroplane('plane_2', 'Coral Harbor Seaplane', 165, -28, -Math.PI / 2, 0xf43f5e);

    // Controllable 3D Rescue Helicopter on Helipad (28, -28)
    const heliPad = new THREE.Mesh(
      new THREE.CylinderGeometry(5.2, 5.5, 0.22, 24),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 })
    );
    heliPad.position.set(28, 0.11, -28);
    this.scene.add(heliPad);

    const hg = new THREE.Group();
    hg.position.set(28, 0.22, -28);
    const hBodyGroup = new THREE.Group();
    hg.add(hBodyGroup);

    const hMat = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.4, roughness: 0.3 });
    const hDark = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
    const hGlass = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.55 });

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 3.6), hMat);
    cabin.position.y = 1.4;
    cabin.castShadow = true;
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 12), hGlass);
    bubble.position.set(0, 1.45, 1.3);
    const tailBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.45, 4.2, 8), hMat);
    tailBoom.rotation.x = Math.PI / 2;
    tailBoom.position.set(0, 1.5, -3.4);

    [-0.95, 0.95].forEach((sx) => {
      const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.8, 8), hDark);
      skid.rotation.x = Math.PI / 2;
      skid.position.set(sx, 0.15, 0);
      hBodyGroup.add(skid);
    });

    const topRotor = new THREE.Group();
    topRotor.position.set(0, 2.45, 0);
    const rBlade1 = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.06, 0.35), hDark);
    const rBlade2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 7.8), hDark);
    topRotor.add(rBlade1, rBlade2);

    const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 0.2), hDark);
    tailRotor.position.set(0.28, 1.5, -5.3);

    hBodyGroup.add(cabin, bubble, tailBoom, topRotor, tailRotor);
    this.scene.add(hg);

    this.rescueHeli = {
      name: 'Aether Rescue Helicopter',
      mesh: hg,
      bodyGroup: hBodyGroup,
      topRotor,
      tailRotor,
      position: hg.position,
      rotationYaw: 0,
      speed: 0,
      pilot: null,
    };
  }

  private buildDenseNeighborhoodsShapesAndMiniGames() {
    // 1. Town Soccer Stadium (-60, 65)
    const stGroup = new THREE.Group();
    stGroup.position.set(-60, 0, 65);
    const pitch = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 48),
      new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8 })
    );
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.y = 0.04;
    pitch.receiveShadow = true;
    stGroup.add(pitch);

    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const centerRing = new THREE.Mesh(new THREE.RingGeometry(4.8, 5.1, 32), lineMat);
    centerRing.rotation.x = -Math.PI / 2;
    centerRing.position.y = 0.055;
    const midLine = new THREE.Mesh(new THREE.PlaneGeometry(32, 0.3), lineMat);
    midLine.rotation.x = -Math.PI / 2;
    midLine.position.y = 0.055;
    stGroup.add(centerRing, midLine);

    const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5, roughness: 0.3 });
    [-22, 22].forEach((gz) => {
      const gFrame = new THREE.Group();
      gFrame.position.set(0, 0, gz);
      const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7.6, 8), postMat);
      crossbar.rotation.z = Math.PI / 2;
      crossbar.position.y = 3.2;
      const pLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 8), postMat);
      pLeft.position.set(-3.8, 1.6, 0);
      const pRight = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 8), postMat);
      pRight.position.set(3.8, 1.6, 0);
      gFrame.add(crossbar, pLeft, pRight);
      stGroup.add(gFrame);
    });
    this.scene.add(stGroup);

    const ballMesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.75, 1),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.1 })
    );
    ballMesh.position.set(-60, 0.75, 65);
    ballMesh.castShadow = true;
    this.scene.add(ballMesh);
    this.soccerBall = { mesh: ballMesh, position: ballMesh.position, velocity: new THREE.Vector3() };

    // 2. 8 Bus Stop Shelters, Wind Turbine Farm & 8 Floating Hot Air Balloons
    const shelterMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 });

    for (let k = 0; k < 8; k++) {
      const ang = -(k / 8) * Math.PI * 2;
      const sx = Math.cos(ang) * 116.5;
      const sz = Math.sin(ang) * 116.5;
      const sh = new THREE.Group();
      sh.position.set(sx, 0, sz);
      sh.rotation.y = -ang + Math.PI / 2;

      const backGlass = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.3, 0.1), glassMat);
      backGlass.position.set(0, 1.2, -0.7);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.18, 1.8), roofMat);
      roof.position.set(0, 2.4, 0);
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.15, 0.55), shelterMat);
      bench.position.set(0, 0.55, -0.35);
      sh.add(backGlass, roof, bench);
      this.scene.add(sh);
    }

    const turbineMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    [
      { x: -145, z: -45 },
      { x: -162, z: -62 },
      { x: -135, z: -68 },
      { x: 145, z: 55 },
      { x: 162, z: 72 },
    ].forEach((wt, idx) => {
      const tg = new THREE.Group();
      tg.position.set(wt.x, 0, wt.z);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.85, 19, 12), turbineMat);
      mast.position.y = 9.5;
      mast.castShadow = true;
      tg.add(mast);

      const rotor = new THREE.Group();
      rotor.position.set(0, 19, 0.9);
      for (let b = 0; b < 3; b++) {
        const piv = new THREE.Group();
        piv.rotation.z = (b / 3) * Math.PI * 2;
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.45, 7.2, 0.12), turbineMat);
        blade.position.y = 3.6;
        piv.add(blade);
        rotor.add(piv);
      }
      tg.add(rotor);
      this.scene.add(tg);
      this.animatedObjects.push({
        update: (_t, dt) => {
          rotor.rotation.z -= dt * (1.8 + (idx % 2) * 0.4);
        },
      });
    });

    const balloonColors = [0xef4444, 0xf59e0b, 0x10b981, 0x3b82f6, 0x8b5cf6, 0xec4899, 0x14b8a6, 0xf97316];
    for (let i = 0; i < 8; i++) {
      const bg = new THREE.Group();
      const bAng = (i / 8) * Math.PI * 2 + 0.4;
      const bRad = 85 + (i % 3) * 55;
      const baseY = 28 + (i % 4) * 6;
      bg.position.set(Math.cos(bAng) * bRad, baseY, Math.sin(bAng) * bRad);

      const env = new THREE.Mesh(
        new THREE.DodecahedronGeometry(4.8, 2),
        new THREE.MeshStandardMaterial({ color: balloonColors[i], roughness: 0.5 })
      );
      env.scale.set(1, 1.25, 1);
      env.position.y = 4.5;
      const basket = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 1.4, 1.8),
        new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 })
      );
      bg.add(env, basket);
      this.scene.add(bg);

      this.animatedObjects.push({
        update: (time) => {
          bg.position.y = baseY + Math.sin(time * 0.9 + i) * 2.2;
          bg.rotation.y = time * 0.15;
        },
      });
    }

    // 3. 56+ Neighborhood Houses (half of them Multi-Floor Walk-In Houses with open jumpable windows!)
    const wallPalette = [0xfef08a, 0xbae6fd, 0xfecdd3, 0xa7f3d0, 0xe9d5ff, 0xfed7aa, 0xe2e8f0, 0x99f6e4];
    const roofPalette = [0x991b1b, 0x1e3a8a, 0x065f46, 0x581c87, 0x7c2d12, 0x0f172a, 0xb45309, 0xbe185d];
    const houseGridCoords: { x: number; z: number; ang: number; idx: number }[] = [];
    const rings = [52, 82, 138, 168, 225, 272, 345];

    rings.forEach((rad, rIdx) => {
      const count = 8 + rIdx * 4;
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + 0.19 * (rIdx + 1);
        const hx = Math.round(Math.cos(ang) * rad);
        const hz = Math.round(Math.sin(ang) * rad);
        if (Math.abs(hx - 250) < 12 || Math.abs(hx + 250) < 12 || Math.abs(hz - 250) < 12 || Math.abs(hz + 250) < 12)
          continue;
        if (this.isSafeForNeighborhoodBuilding(hx, hz, 11)) {
          houseGridCoords.push({ x: hx, z: hz, ang, idx: houseGridCoords.length });
        }
      }
    });

    houseGridCoords.forEach((hc) => {
      const i = hc.idx;
      if (i % 2 === 0) {
        this.createEnterableMultiFloorBuilding({
          x: hc.x,
          z: hc.z,
          w: 12.5,
          d: 12.5,
          floors: i % 4 === 0 ? 3 : 2,
          color: wallPalette[i % wallPalette.length],
          roofColor: roofPalette[i % roofPalette.length],
        });
        return;
      }
      const w = 7.0 + (i % 4) * 1.2;
      const d = 6.5 + ((i + 1) % 3) * 1.2;
      const h = 5.2 + (i % 5) * 1.8;
      const bGroup = this.createBuilding({
        x: hc.x,
        z: hc.z,
        rot: -hc.ang + Math.PI / 2,
        color: wallPalette[i % wallPalette.length],
        roofColor: roofPalette[i % roofPalette.length],
        w,
        d,
        h,
      });

      const winMat = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x451a03 });
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.2, 0.15), doorMat);
      door.position.set(0, 1.1, d / 2 + 0.05);
      const winL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.12), winMat);
      winL.position.set(-w * 0.26, 2.2, d / 2 + 0.05);
      const winR = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.12), winMat);
      winR.position.set(w * 0.26, 2.2, d / 2 + 0.05);
      bGroup.add(door, winL, winR);

      const yardTree = this.createPineTree(0.65 + (i % 3) * 0.15);
      yardTree.position.set(w / 2 + 1.8, 0, 1.5);
      bGroup.add(yardTree);
      this.scene.add(bGroup);
    });

    // 4. 60+ Rotating 3D Geometric Sculptures
    const shapeColors = [0x06b6d4, 0xf43f5e, 0xa855f7, 0xfacc15, 0x10b981, 0x3b82f6, 0xf97316];
    const sculptureRings = [38, 96, 152, 212, 260, 325, 385];
    const spinningShapes: THREE.Mesh[] = [];

    sculptureRings.forEach((rad, sIdx) => {
      const num = 8 + sIdx * 2;
      for (let j = 0; j < num; j++) {
        const ang = (j / num) * Math.PI * 2 + 0.37 * (sIdx + 1);
        const sx = Math.round(Math.cos(ang) * rad);
        const sz = Math.round(Math.sin(ang) * rad);
        if (!this.isSafeForNeighborhoodBuilding(sx, sz, 7)) continue;

        const sg = new THREE.Group();
        sg.position.set(sx, 0, sz);
        const col = shapeColors[(j + sIdx) % shapeColors.length];

        const plinth = new THREE.Mesh(
          new THREE.CylinderGeometry(1.6, 2.0, 0.8, 8),
          new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 })
        );
        plinth.position.y = 0.4;
        sg.add(plinth);

        const shapeType = (j + sIdx) % 5;
        const mat = new THREE.MeshStandardMaterial({
          color: col,
          emissive: col,
          emissiveIntensity: 0.35,
          metalness: 0.7,
          roughness: 0.2,
        });
        let shapeMesh: THREE.Mesh;
        if (shapeType === 0) {
          shapeMesh = new THREE.Mesh(new THREE.TorusKnotGeometry(1.15, 0.32, 48, 8), mat);
          shapeMesh.position.y = 2.8;
        } else if (shapeType === 1) {
          shapeMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 0), mat);
          shapeMesh.position.y = 2.6;
        } else if (shapeType === 2) {
          shapeMesh = new THREE.Mesh(new THREE.OctahedronGeometry(1.6, 0), mat);
          shapeMesh.position.y = 2.7;
        } else if (shapeType === 3) {
          shapeMesh = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.35, 12, 24), mat);
          shapeMesh.position.y = 2.6;
        } else {
          shapeMesh = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3.2, 6), mat);
          shapeMesh.position.y = 2.4;
        }
        shapeMesh.castShadow = true;
        sg.add(shapeMesh);
        this.scene.add(sg);
        spinningShapes.push(shapeMesh);
      }
    });

    this.animatedObjects.push({
      update: (time, dt) => {
        for (let i = 0; i < spinningShapes.length; i++) {
          spinningShapes[i].rotation.y += dt * 1.2;
          spinningShapes[i].rotation.x = Math.sin(time * 1.5 + i) * 0.35;
        }
      },
    });

    // 5. Giant Walk-On 3D Floor Piano (-28, 22)
    const pianoGroup = new THREE.Group();
    pianoGroup.position.set(-28, 0, 22);
    const pianoBase = new THREE.Mesh(
      new THREE.BoxGeometry(14.5, 0.2, 4.8),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 })
    );
    pianoBase.position.y = 0.1;
    pianoGroup.add(pianoBase);

    const noteFreqs = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
    const keyColors = [0xef4444, 0xf97316, 0xfacc15, 0x22c55e, 0x06b6d4, 0x3b82f6, 0x8b5cf6, 0xec4899];

    for (let k = 0; k < 8; k++) {
      const kx = -5.6 + k * 1.6;
      const keyMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: keyColors[k],
        emissiveIntensity: 0.25,
        roughness: 0.2,
      });
      const keyMesh = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.28, 4.0), keyMat);
      keyMesh.position.set(kx, 0.26, 0.2);
      keyMesh.castShadow = true;
      pianoGroup.add(keyMesh);

      if (k !== 2 && k !== 6 && k < 7) {
        const blackKey = new THREE.Mesh(
          new THREE.BoxGeometry(0.75, 0.42, 2.2),
          new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.3 })
        );
        blackKey.position.set(kx + 0.8, 0.36, -0.6);
        pianoGroup.add(blackKey);
      }

      this.interactivePianoKeys.push({
        worldX: -28 + kx,
        worldZ: 22.2,
        mesh: keyMesh,
        mat: keyMat,
        freq: noteFreqs[k],
        cooldown: 0,
      });
    }
    this.scene.add(pianoGroup);

    // 6. 10-Pin Bowling Alley (34, 28)
    const bowlGroup = new THREE.Group();
    bowlGroup.position.set(34, 0, 28);
    const laneWood = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 0.18, 24),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.1 })
    );
    laneWood.position.set(0, 0.09, 8);
    laneWood.receiveShadow = true;
    bowlGroup.add(laneWood);

    const gutterMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
    [-2.45, 2.45].forEach((gx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 24), gutterMat);
      rail.position.set(gx, 0.2, 8);
      bowlGroup.add(rail);
    });
    this.scene.add(bowlGroup);

    const bowlBallMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xec4899, metalness: 0.6, roughness: 0.15 })
    );
    bowlBallMesh.position.set(34, 0.72, 20);
    bowlBallMesh.castShadow = true;
    this.scene.add(bowlBallMesh);

    const pins: { mesh: THREE.Mesh; homeX: number; homeZ: number; knocked: boolean; vel: THREE.Vector3 }[] = [];
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    [
      [{ x: 0, z: 34 }],
      [{ x: -0.55, z: 35 }, { x: 0.55, z: 35 }],
      [{ x: -1.1, z: 36 }, { x: 0, z: 36 }, { x: 1.1, z: 36 }],
      [{ x: -1.65, z: 37 }, { x: -0.55, z: 37 }, { x: 0.55, z: 37 }, { x: 1.65, z: 37 }],
    ].forEach((row) => {
      row.forEach((pCoord) => {
        const pMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.1, 10), pinMat);
        pMesh.position.set(34 + pCoord.x, 0.65, pCoord.z);
        pMesh.castShadow = true;
        this.scene.add(pMesh);
        pins.push({
          mesh: pMesh,
          homeX: 34 + pCoord.x,
          homeZ: pCoord.z,
          knocked: false,
          vel: new THREE.Vector3(),
        });
      });
    });

    this.bowlingGame = {
      ballMesh: bowlBallMesh,
      ballPos: bowlBallMesh.position,
      ballVel: new THREE.Vector3(),
      pins,
      resetTimer: 0,
    };

    // 7. Basketball Court & Hoop (-34, 36)
    const bballGroup = new THREE.Group();
    bballGroup.position.set(-34, 0, 36);
    const courtFloor = new THREE.Mesh(
      new THREE.BoxGeometry(12, 0.14, 16),
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.5 })
    );
    courtFloor.position.y = 0.07;
    courtFloor.receiveShadow = true;
    bballGroup.add(courtFloor);

    const hoopPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.2, 5.2, 10),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 })
    );
    hoopPole.position.set(0, 2.6, 7.2);
    const backboard = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 1.8, 0.15),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc })
    );
    backboard.position.set(0, 4.8, 6.8);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.06, 8, 20),
      new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.4 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 4.3, 6.1);
    bballGroup.add(hoopPole, backboard, rim);
    this.scene.add(bballGroup);

    const bballMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 })
    );
    bballMesh.position.set(-34, 0.55, 33);
    bballMesh.castShadow = true;
    this.scene.add(bballMesh);

    this.basketballGame = {
      mesh: bballMesh,
      pos: bballMesh.position,
      vel: new THREE.Vector3(),
      rimPos: new THREE.Vector3(-34, 4.3, 42.1),
      shotActive: false,
    };

    // 8. 14 Interactive Golden Treasure Chests
    const chestCoords = [
      { x: 24, z: 8 },
      { x: -24, z: 8 },
      { x: 42, z: -36 },
      { x: -42, z: -36 },
      { x: 48, z: 42 },
      { x: -82, z: 32 },
      { x: 82, z: -82 },
      { x: -82, z: -62 },
      { x: 135, z: -38 },
      { x: -135, z: 38 },
      { x: 215, z: -215 },
      { x: -215, z: 215 },
      { x: 215, z: 215 },
      { x: -215, z: -215 },
    ];
    const chestWoodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.6 });
    const chestGoldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0xb45309,
      emissiveIntensity: 0.3,
    });

    chestCoords.forEach((cc, idx) => {
      const cg = new THREE.Group();
      cg.position.set(cc.x, 0, cc.z);
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1.0), chestWoodMat);
      box.position.y = 0.4;
      box.castShadow = true;
      const trim = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.16, 1.04), chestGoldMat);
      trim.position.y = 0.72;

      const lidPivot = new THREE.Group();
      lidPivot.position.set(0, 0.8, -0.5);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 1.0), chestWoodMat);
      lid.position.set(0, 0.22, 0.5);
      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.12), chestGoldMat);
      lock.position.set(0, 0.1, 1.02);
      lidPivot.add(lid, lock);

      cg.add(box, trim, lidPivot);
      this.scene.add(cg);

      this.interactiveTreasureChests.push({
        id: `chest_${idx + 1}`,
        position: new THREE.Vector3(cc.x, 0, cc.z),
        lidPivot,
        opened: false,
        timer: 0,
      });
    });

    // 9. Color-Changing Disco Floor (0, -20) & 4 Teleport Portals
    const discoGroup = new THREE.Group();
    discoGroup.position.set(0, 0.06, -20);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const tMat = new THREE.MeshStandardMaterial({
          color: shapeColors[(r * 4 + c) % shapeColors.length],
          emissive: shapeColors[(r * 4 + c) % shapeColors.length],
          emissiveIntensity: 0.55,
          roughness: 0.2,
        });
        const tile = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 1.7), tMat);
        tile.position.set((c - 1.5) * 1.8, 0, (r - 1.5) * 1.8);
        discoGroup.add(tile);
        this.discoFloorTiles.push(tMat);
      }
    }
    this.scene.add(discoGroup);

    [
      { x: 26, z: 0, targetX: 220, targetZ: -220, label: 'Northeast Suburbia' },
      { x: 225, z: -220, targetX: 22, targetZ: 0, label: 'Central Plaza' },
      { x: -26, z: 0, targetX: -220, targetZ: 220, label: 'Southwest Geometric Park' },
      { x: -225, z: 220, targetX: -22, targetZ: 0, label: 'Central Plaza' },
    ].forEach((pp) => {
      const pg = new THREE.Group();
      pg.position.set(pp.x, 0, pp.z);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.0, 0.22, 12, 28),
        new THREE.MeshStandardMaterial({ color: 0xc084fc, emissive: 0x9333ea, emissiveIntensity: 0.85 })
      );
      ring.position.y = 2.2;
      pg.add(ring);
      this.scene.add(pg);
      this.teleportPortals.push({
        position: new THREE.Vector3(pp.x, 0, pp.z),
        targetX: pp.targetX,
        targetZ: pp.targetZ,
        label: pp.label,
        ring,
      });
    });
  }

  private initRoadmapSystems(initialPet: PetType) {
    // 1. Elevated 3rd-Floor Monorail Sky-Train (r = 68m, y = 9.2m)
    const monorailRadius = 68;
    const monorailY = 9.2;
    const railTrack = new THREE.Mesh(
      new THREE.RingGeometry(monorailRadius - 0.6, monorailRadius + 0.6, 64),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.4,
        side: THREE.DoubleSide,
      })
    );
    railTrack.rotation.x = -Math.PI / 2;
    railTrack.position.y = monorailY;
    this.scene.add(railTrack);

    const colMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6 });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const cx = Math.cos(a) * monorailRadius;
      const cz = Math.sin(a) * monorailRadius;
      if (Math.abs(cx) < 6 || Math.abs(cz) < 6) continue;
      const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, monorailY, 10), colMat);
      pil.position.set(cx, monorailY / 2, cz);
      this.scene.add(pil);
    }

    const trainGroup = new THREE.Group();
    const tBodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.5, roughness: 0.2 });
    const tNeonMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 0.8 });
    [-2.8, 2.8].forEach((cz) => {
      const car = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 4.8), tBodyMat);
      car.position.set(0, 1.1, cz);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.68, 0.25, 4.85), tNeonMat);
      stripe.position.set(0, 1.1, cz);
      trainGroup.add(car, stripe);
    });
    trainGroup.position.set(monorailRadius, monorailY, 0);
    this.scene.add(trainGroup);

    this.skyTrain = {
      mesh: trainGroup,
      position: trainGroup.position,
      angle: 0,
      radius: monorailRadius,
      y: monorailY,
      rotationYaw: 0,
      rider: null,
    };

    // 2. Giant 3D Sky Rainbow + Weather Particles
    this.rainbowGroup = new THREE.Group();
    [0xef4444, 0xf97316, 0xfacc15, 0x22c55e, 0x06b6d4, 0x3b82f6, 0xa855f7].forEach((col, idx) => {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(240 - idx * 3.2, 1.5, 10, 64, Math.PI),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55 })
      );
      this.rainbowGroup!.add(arc);
    });
    this.rainbowGroup.position.set(0, -10, -180);
    this.rainbowGroup.visible = false;
    this.scene.add(this.rainbowGroup);

    const pGeo = new THREE.BufferGeometry();
    const pCount = 450;
    const pPositions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * 140;
      pPositions[i * 3 + 1] = Math.random() * 45;
      pPositions[i * 3 + 2] = (Math.random() - 0.5) * 140;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({ color: 0xbae6fd, size: 0.45, transparent: true, opacity: 0.8 });
    this.weatherParticles = new THREE.Points(pGeo, pMat);
    this.weatherParticles.visible = false;
    this.scene.add(this.weatherParticles);

    // 3. 3D Pet Companion
    this.petMeshGroup = new THREE.Group();
    this.scene.add(this.petMeshGroup);
    this.rebuildPetMesh(initialPet);

    // 4. Time-Trial Checkpoints
    const raceMat = new THREE.MeshStandardMaterial({ color: 0x84cc16, emissive: 0x65a30d, emissiveIntensity: 0.8 });
    this.raceCheckpoints.forEach((cp) => {
      const rMesh = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.24, 12, 24), raceMat);
      rMesh.position.copy(cp);
      rMesh.visible = false;
      this.scene.add(rMesh);
      this.raceRingMeshes.push(rMesh);
    });

    // 5. Named Quest NPCs
    [
      { name: 'Mayor Aria (!)', shirt: '#f43f5e', acc: 'crown' as const, x: 0, z: 15 },
      { name: 'Capt. Vance (!)', shirt: '#0284c7', acc: 'cap' as const, x: 172, z: 6 },
      { name: 'Pilot Maverick (!)', shirt: '#8b5cf6', acc: 'visor' as const, x: 68, z: -45 },
      { name: 'Archmage Sol (!)', shirt: '#f59e0b', acc: 'wizard' as const, x: 132, z: -132 },
    ].forEach((np, idx) => {
      const npc = new RemotePlayer({
        id: `npc_${idx}`,
        username: np.name,
        position: { x: np.x, y: 0, z: np.z },
        rotation: 0,
        animation: 'idle',
        appearance: {
          color: '#ffdbac',
          shirtColor: np.shirt,
          pantsColor: '#0f172a',
          avatarType: 'formal',
          accessory: np.acc,
        },
        score: 500,
        level: 5,
        isBot: true,
      });
      this.scene.add(npc.mesh);
    });
  }

  public rebuildPetMesh(petType: PetType) {
    this.currentPetType = petType;
    if (!this.petMeshGroup) return;
    while (this.petMeshGroup.children.length > 0) {
      this.petMeshGroup.remove(this.petMeshGroup.children[0]);
    }
    if (petType === 'none') return;

    if (petType === 'dragon') {
      const dMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xbe123c, emissiveIntensity: 0.3 });
      const wingMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, side: THREE.DoubleSide });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.7), dMat);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.32, 0.4), dMat);
      head.position.set(0, 0.2, 0.45);
      const wL = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.05, 0.4), wingMat);
      wL.position.set(-0.5, 0.15, 0);
      const wR = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.05, 0.4), wingMat);
      wR.position.set(0.5, 0.15, 0);
      this.petMeshGroup.add(body, head, wL, wR);
    } else if (petType === 'drone') {
      const cMat = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.7,
        metalness: 0.9,
      });
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 1), cMat);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 8, 20), cMat);
      ring.rotation.x = Math.PI / 2;
      this.petMeshGroup.add(core, ring);
    } else if (petType === 'pup') {
      const pMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.65), pMat);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.36), pMat);
      head.position.set(0, 0.22, 0.38);
      this.petMeshGroup.add(body, head);
    }
  }

  public advanceQuest(questId: string, amount: number = 1) {
    const q = this.questsList[this.currentQuestIdx];
    if (!q || q.id !== questId) return;
    q.progress = Math.min(q.goal, q.progress + amount);
    if (q.progress >= q.goal) {
      this.player.score += 100;
      this.player.level = Math.max(1, Math.floor(this.player.score / 100) + 1);
      this.player.updateNameplate();
      soundManager.playCrown();
      this.emitToast(`🏆 QUEST COMPLETE: ${q.title} (+100 XP!)`);
      window.setTimeout(() => {
        this.currentQuestIdx = (this.currentQuestIdx + 1) % this.questsList.length;
        this.questsList[this.currentQuestIdx].progress = 0;
      }, 1600);
    }
  }

  public nextQuest() {
    this.currentQuestIdx = (this.currentQuestIdx + 1) % this.questsList.length;
    soundManager.playEmote();
    this.emitToast(`📜 Switched Active Quest: ${this.questsList[this.currentQuestIdx].title}`);
  }

  // ==================== INTERACTION & MOUNTING HELPERS ====================
  public unmountCharacter(char: LocalPlayer) {
    if (!char.mountedInfo) return;
    const info = char.mountedInfo;
    char.mountedInfo = null;
    char.currentAnimation = 'idle';

    if (info.kind === 'bus' && this.townBus) {
      if (info.seatIndex !== undefined && this.townBus.passengers[info.seatIndex] === char) {
        this.townBus.passengers[info.seatIndex] = null;
      }
      this.townBus.updateSign();
      const bx = this.townBus.position.x + 3.2;
      const bz = this.townBus.position.z;
      char.position.set(bx, this.getSlopeHeight(bx, bz), bz);
      this.emitToast('🚌 Stepped off the Town Travel Bus');
    } else if (info.kind === 'skytrain' && info.ref) {
      info.ref.rider = null;
      char.position.set(info.ref.position.x, info.ref.y + 0.5, info.ref.position.z);
      char.isGrounded = false;
      this.emitToast('🚈 Stepped off the Elevated Sky-Train!');
    } else if (info.kind === 'heli' && info.ref) {
      info.ref.pilot = null;
      info.ref.speed = 0;
      info.ref.bodyGroup.rotation.set(0, 0, 0);
      char.position.set(info.ref.position.x + 2.8, Math.max(0, info.ref.position.y), info.ref.position.z);
      char.isGrounded = char.position.y <= this.getSlopeHeight(char.position.x, char.position.z) + 0.1;
      this.emitToast(`🚁 Exited ${info.ref.name}`);
    } else if (info.kind === 'plane' && info.ref) {
      info.ref.pilot = null;
      info.ref.speed = 0;
      info.ref.pitch = 0;
      info.ref.roll = 0;
      info.ref.bodyGroup.rotation.set(0, 0, 0);
      char.position.set(info.ref.position.x + 2.6, Math.max(0, info.ref.position.y), info.ref.position.z);
      char.isGrounded = char.position.y <= this.getSlopeHeight(char.position.x, char.position.z) + 0.1;
      this.emitToast(`✈️ Exited ${info.ref.name}`);
    } else if (info.kind === 'car' && info.ref) {
      info.ref.driver = null;
      info.ref.speed = 0;
      const cx = info.ref.position.x + 2.4;
      const cz = info.ref.position.z;
      char.position.set(cx, this.getSlopeHeight(cx, cz), cz);
      this.emitToast(`🏎️ Exited ${info.ref.name}`);
    } else if (info.kind === 'boat' && info.ref) {
      info.ref.driver = null;
      info.ref.speed = 0;
      info.ref.wake.material.opacity = 0;
      char.position.set(info.ref.position.x - 2.5, 0.3, info.ref.position.z);
      this.emitToast(`🚤 Stepped off ${info.ref.name}`);
    } else if (info.kind === 'seesaw' && info.ref) {
      if (info.ref.riderA === char) info.ref.riderA = null;
      if (info.ref.riderB === char) info.ref.riderB = null;
      char.position.set(info.ref.position.x, 0, info.ref.position.z + 2.5);
      this.emitToast('⚖️ Stepped off the Seesaw');
    } else if (info.kind === 'carousel' && info.ref) {
      if (info.mount) info.mount.rider = null;
      char.position.set(info.ref.position.x, 0, info.ref.position.z + 6.2);
      this.emitToast('🎠 Stepped off the Merry-Go-Round');
    } else if (info.kind === 'swing' && info.ref) {
      info.ref.rider = null;
      char.position.set(info.ref.position.x, 0, info.ref.position.z + 2.5);
      this.emitToast('🪑 Stepped off the Swing');
    } else if (info.kind === 'ferris' && info.ref) {
      if (info.gondola) info.gondola.rider = null;
      char.position.set(info.ref.position.x, 0, info.ref.position.z + 6.0);
      this.emitToast('🎡 Stepped off the Giant Ferris Wheel');
    }
    char.velocity.set(0, 0, 0);
    char.mesh.position.copy(char.position);
    soundManager.playJump();
  }

  public boardTownBus(char: LocalPlayer = this.player) {
    if (!this.townBus) return;
    if (char.mountedInfo && char.mountedInfo.kind === 'bus') {
      this.unmountCharacter(char);
      return;
    }
    if (char.mountedInfo) this.unmountCharacter(char);
    let freeSeat = -1;
    for (let i = 0; i < this.townBus.passengers.length; i++) {
      if (!this.townBus.passengers[i]) {
        freeSeat = i;
        break;
      }
    }
    if (freeSeat === -1) freeSeat = 0;
    this.townBus.passengers[freeSeat] = char;
    char.mountedInfo = { kind: 'bus', seatIndex: freeSeat };
    char.currentAnimation = 'sit';
    this.townBus.updateSign();
    soundManager.playHorn();
    const nextStop = this.townBus.waypoints[this.townBus.wpIndex].name;
    this.emitToast(`🚌 Boarded Town Travel Bus (Seat #${freeSeat + 1}/8) • Next Stop: ${nextStop}`);
  }

  public boardSkyTrain(char: LocalPlayer = this.player) {
    if (!this.skyTrain) return;
    if (char.mountedInfo && char.mountedInfo.kind === 'skytrain') {
      this.unmountCharacter(char);
      return;
    }
    if (char.mountedInfo) this.unmountCharacter(char);
    this.skyTrain.rider = char;
    char.mountedInfo = { kind: 'skytrain', ref: this.skyTrain };
    char.currentAnimation = 'sit';
    soundManager.playCrown();
    this.emitToast('🚈 Boarded the Elevated 3rd-Floor Monorail Sky-Train! Press [E] to step off!');
  }

  public summonAndDriveCar(char: LocalPlayer = this.player) {
    if (char.mountedInfo && char.mountedInfo.kind === 'car') {
      this.unmountCharacter(char);
      return;
    }
    if (char.mountedInfo) this.unmountCharacter(char);
    const car = this.controllableVehicles[0];
    if (!car) return;
    if (car.driver && car.driver !== char) car.driver.mountedInfo = null;
    car.position.set(char.position.x, this.getSlopeHeight(char.position.x, char.position.z), char.position.z);
    car.rotationYaw = char.rotationYaw;
    car.driver = char;
    char.mountedInfo = { kind: 'car', ref: car };
    char.currentAnimation = 'sit';
    soundManager.playHorn();
    this.emitToast(`🏎️ Driving ${car.name}! Steer with WASD, Shift/F for Nitro Boost, Space to Jump, E to Exit`);
  }

  public boardPlane(char: LocalPlayer = this.player) {
    if (char.mountedInfo && char.mountedInfo.kind === 'plane') {
      this.unmountCharacter(char);
      return;
    }
    if (char.mountedInfo) this.unmountCharacter(char);
    const pl = this.controllablePlanes[0];
    if (!pl) return;
    if (pl.pilot && pl.pilot !== char) pl.pilot.mountedInfo = null;
    pl.pilot = char;
    if (pl.position.y < 0.5) pl.speed = 24.0;
    char.mountedInfo = { kind: 'plane', ref: pl };
    char.currentAnimation = 'sit';
    soundManager.playCrown();
    this.emitToast(`✈️ Flying ${pl.name}! W/S: Throttle, A/D: Turn, Space: Climb Up, Shift: Descend, E: Exit`);
  }

  public boardHeli(char: LocalPlayer = this.player) {
    if (char.mountedInfo && char.mountedInfo.kind === 'heli') {
      this.unmountCharacter(char);
      return;
    }
    if (char.mountedInfo) this.unmountCharacter(char);
    if (!this.rescueHeli) return;
    if (this.rescueHeli.pilot && this.rescueHeli.pilot !== char) this.rescueHeli.pilot.mountedInfo = null;
    this.rescueHeli.pilot = char;
    char.mountedInfo = { kind: 'heli', ref: this.rescueHeli };
    char.currentAnimation = 'sit';
    soundManager.playCrown();
    this.emitToast(`🚁 Flying ${this.rescueHeli.name}! Space: Ascend Vertically, Shift: Descend, WASD: Fly, E: Exit`);
  }

  public boardBoat(char: LocalPlayer = this.player) {
    if (char.mountedInfo && char.mountedInfo.kind === 'boat') {
      this.unmountCharacter(char);
      return;
    }
    if (char.mountedInfo) this.unmountCharacter(char);
    const boat = this.controllableBoats[0];
    if (!boat) return;
    if (boat.driver && boat.driver !== char) boat.driver.mountedInfo = null;
    boat.driver = char;
    char.mountedInfo = { kind: 'boat', ref: boat };
    char.currentAnimation = 'sit';
    soundManager.playHorn();
    this.emitToast(`🚤 Piloting ${boat.name} on Crystal Lake! Steer with WASD, E to Exit`);
  }

  public interactNearest(char: LocalPlayer = this.player) {
    if (char.mountedInfo) {
      this.unmountCharacter(char);
      return;
    }
    const p = char.position;

    if (this.townBus && p.distanceTo(this.townBus.position) < 8.5) {
      this.boardTownBus(char);
      return;
    }
    if (this.rescueHeli && !this.rescueHeli.pilot && p.distanceTo(this.rescueHeli.position) < 6.5) {
      this.boardHeli(char);
      return;
    }
    for (const pl of this.controllablePlanes) {
      if (!pl.pilot && p.distanceTo(pl.position) < 7.0) {
        pl.pilot = char;
        char.mountedInfo = { kind: 'plane', ref: pl };
        char.currentAnimation = 'sit';
        soundManager.playCrown();
        this.emitToast(`✈️ Flying ${pl.name}! W/S: Throttle, A/D: Bank Turn, Space: Climb, Shift: Descend, E: Exit`);
        return;
      }
    }
    for (const car of this.controllableVehicles) {
      if (!car.driver && p.distanceTo(car.position) < 5.5) {
        car.driver = char;
        char.mountedInfo = { kind: 'car', ref: car };
        char.currentAnimation = 'sit';
        soundManager.playHorn();
        this.emitToast(`🏎️ Driving ${car.name}! WASD to Steer, Shift/F for Nitro, Space to Jump, E to Exit`);
        return;
      }
    }
    for (const boat of this.controllableBoats) {
      if (!boat.driver && p.distanceTo(boat.position) < 6.5) {
        boat.driver = char;
        char.mountedInfo = { kind: 'boat', ref: boat };
        char.currentAnimation = 'sit';
        soundManager.playHorn();
        this.emitToast(`🚤 Piloting ${boat.name}! Steer with WASD, Shift for Boost, E to Exit`);
        return;
      }
    }
    for (const ss of this.interactiveSeesaws) {
      if (p.distanceTo(ss.position) < 6.0) {
        if (!ss.riderA) {
          ss.riderA = char;
          char.mountedInfo = { kind: 'seesaw', ref: ss, side: -1 };
        } else if (!ss.riderB) {
          ss.riderB = char;
          char.mountedInfo = { kind: 'seesaw', ref: ss, side: 1 };
        }
        char.currentAnimation = 'sit';
        char.score += 10;
        char.updateNameplate();
        soundManager.playEmote();
        this.emitToast('⚖️ Playing on Seesaw! Press W/S or Space to pump higher, E to Hop Off (+10 XP)');
        return;
      }
    }
    for (const cr of this.interactiveCarousels) {
      if (p.distanceTo(cr.position) < 7.5) {
        const mount = cr.mounts[0].rider ? cr.mounts[1] : cr.mounts[0];
        mount.rider = char;
        char.mountedInfo = { kind: 'carousel', ref: cr, mount };
        char.currentAnimation = 'sit';
        char.score += 10;
        char.updateNameplate();
        soundManager.playEmote();
        this.emitToast('🎠 Riding the Merry-Go-Round Carousel! Press E to Hop Off (+10 XP)');
        return;
      }
    }
    for (const sw of this.interactiveSwings) {
      if (!sw.rider && p.distanceTo(sw.position) < 5.5) {
        sw.rider = char;
        char.mountedInfo = { kind: 'swing', ref: sw };
        char.currentAnimation = 'sit';
        char.score += 10;
        char.updateNameplate();
        soundManager.playEmote();
        this.emitToast('🪑 Swinging on the Park Swing! Press E to Hop Off (+10 XP)');
        return;
      }
    }
    if (this.ferrisWheelRide && p.distanceTo(this.ferrisWheelRide.position) < 14.0) {
      const gon = this.ferrisWheelRide.gondolas[0];
      gon.rider = char;
      char.mountedInfo = { kind: 'ferris', ref: this.ferrisWheelRide, gondola: gon };
      char.currentAnimation = 'sit';
      char.score += 20;
      char.updateNameplate();
      soundManager.playCrown();
      this.emitToast('🎡 Riding the Giant Ferris Wheel! Enjoy the panoramic view (Press E to Exit)');
      return;
    }
    if (this.basketballGame && p.distanceTo(this.basketballGame.pos) < 6.0) {
      this.basketballGame.pos.set(-34, 2.0, 34);
      this.basketballGame.vel.set(0, 10.5, 8.2);
      this.basketballGame.shotActive = true;
      soundManager.playJump();
      this.emitToast('🏀 Launched a 3-Point Jump Shot toward the Hoop!');
      return;
    }
    if (this.bowlingGame && p.distanceTo(this.bowlingGame.ballPos) < 6.0) {
      this.bowlingGame.ballPos.set(34, 0.72, 21);
      this.bowlingGame.ballVel.set((Math.random() - 0.5) * 0.8, 0, 24.0);
      soundManager.playDash();
      this.emitToast('🎳 Rolled the Bowling Ball down the lane!');
      return;
    }

    this.emitToast('💡 Walk near any Car, Plane, Heli, Boat, Bus, Seesaw, Carousel, Bowling, or Basketball & press [E]!');
  }

  // ==================== ROADMAP GADGET ACTIONS ====================
  public fireGrapplingHook() {
    if (this.player.mountedInfo) this.unmountCharacter(this.player);
    const dirX = -Math.sin(this.cameraYaw);
    const dirZ = -Math.cos(this.cameraYaw);
    const targetPos = new THREE.Vector3(
      this.player.position.x + dirX * 22,
      Math.max(this.player.position.y + 11.5, 13.8),
      this.player.position.z + dirZ * 22
    );
    if (this.grappleLine) this.scene.remove(this.grappleLine);
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      this.player.position.clone().add(new THREE.Vector3(0, 1.4, 0)),
      targetPos,
    ]);
    this.grappleLine = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x22d3ee }));
    this.scene.add(this.grappleLine);
    this.player.velocity.set(dirX * 24, 17.5, dirZ * 24);
    this.player.isGrounded = false;
    soundManager.playJumpPad();
    this.emitToast('🪝 Grappling Hook Fired! Hold [Space] at peak to deploy Glider Wing!');
    window.setTimeout(() => {
      if (this.grappleLine) {
        this.scene.remove(this.grappleLine);
        this.grappleLine = null;
      }
    }, 650);
  }

  public firePaintballBlaster() {
    const colors = [0xf43f5e, 0x06b6d4, 0xfacc15, 0xa855f7, 0x22c55e];
    const col = colors[Math.floor(Math.random() * colors.length)];
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 10, 10),
      new THREE.MeshBasicMaterial({ color: col })
    );
    const yaw = this.player.rotationYaw;
    orb.position.set(
      this.player.position.x + Math.sin(yaw) * 0.9,
      this.player.position.y + 1.35,
      this.player.position.z + Math.cos(yaw) * 0.9
    );
    this.scene.add(orb);
    this.paintballs.push({
      mesh: orb,
      color: col,
      vel: new THREE.Vector3(Math.sin(yaw) * 44, 1.2, Math.cos(yaw) * 44),
      life: 1.8,
    });
    soundManager.playDash();
    this.advanceQuest('q_blaster', 1);
  }

  public toggleJetpack() {
    this.player.jetpackActive = !this.player.jetpackActive;
    soundManager.playEmote();
    this.emitToast(this.player.jetpackActive ? '🚀 Jetpack ON! Hold [Space] to fly!' : '🚀 Jetpack OFF');
  }

  public toggleHoverboard() {
    this.player.hoverboardActive = !this.player.hoverboardActive;
    soundManager.playEmote();
    this.emitToast(this.player.hoverboardActive ? '🛹 Neon Street Hoverboard ON!' : '🛹 Hoverboard OFF');
  }

  public spawnCustomBuilderBlock() {
    const yaw = this.player.rotationYaw;
    const bx = Math.round(this.player.position.x + Math.sin(yaw) * 5.5);
    const bz = Math.round(this.player.position.z + Math.cos(yaw) * 5.5);
    const by = this.getSlopeHeight(bx, bz, this.player.position.y);
    this.addSlantedRampMesh(bx - 2.5, bx + 2.5, bz - 4.0, bz + 4.0, by, by + 3.2, 'z+', 0x06b6d4);
    this.spawnBurst(new THREE.Vector3(bx, by + 1.5, bz), 0x22d3ee);
    soundManager.playCrown();
    this.player.score += 10;
    this.player.updateNameplate();
    this.advanceQuest('q_builder', 1);
    this.emitToast(`🧱 Built a Custom 3D Neon Stunt Ramp at (${bx}, ${bz})!`);
  }

  public triggerMeteorShower() {
    this.emitToast('☄️ AETHER METEOR SHOWER INCOMING! Look for 100-XP Mega Meteor Shards!');
    soundManager.playCrown();
    for (let i = 0; i < 5; i++) {
      const mx = this.player.position.x + (Math.random() - 0.5) * 70;
      const mz = this.player.position.z + (Math.random() - 0.5) * 70;
      const meteorMesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.4, 0),
        new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xdc2626, emissiveIntensity: 0.9 })
      );
      meteorMesh.position.set(mx + 20, 55 + i * 12, mz - 20);
      this.scene.add(meteorMesh);
      this.activeMeteors.push({ mesh: meteorMesh, targetX: mx, targetZ: mz });
    }
  }

  public toggleTimeTrialRace(): boolean {
    this.raceActive = !this.raceActive;
    this.raceIndex = 0;
    this.raceStartTime = performance.now();
    this.raceRingMeshes.forEach((m, idx) => {
      m.visible = this.raceActive;
      m.scale.setScalar(idx === 0 ? 1.35 : 0.85);
    });
    if (this.raceActive) {
      this.player.position.set(0, 0.5, -18);
      soundManager.playCrown();
      this.emitToast('🏁 TIME-TRIAL RACE STARTED! Pass through all 8 Glowing Green Checkpoints!');
    } else {
      this.emitToast('🏁 Time-Trial Race Stopped');
    }
    return this.raceActive;
  }

  public fastTravelTo(tx: number, tz: number, label: string) {
    if (this.player.mountedInfo) this.unmountCharacter(this.player);
    this.player.position.set(tx, 1.2, tz);
    this.player.velocity.set(0, 0, 0);
    if (this.player2 && this.inputManager.splitScreenEnabled) {
      if (this.player2.mountedInfo) this.unmountCharacter(this.player2);
      this.player2.position.set(tx + 2.8, 1.2, tz);
      this.player2.velocity.set(0, 0, 0);
    }
    soundManager.playCrown();
    this.emitToast(`🚀 Fast-Traveled to ${label}`);
  }

  public drawMinimap(canvas: HTMLCanvasElement | null) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = 130;
    const h = 130;
    const cx = 65;
    const cy = 65;
    const scale = 0.26;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(203, 213, 225, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, 5);
    ctx.lineTo(cx, 125);
    ctx.moveTo(5, cy);
    ctx.lineTo(125, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 195 * scale, 0, Math.PI * 2);
    ctx.stroke();

    [
      { x: 0, z: 0, r: 6, col: 'rgba(222, 212, 195, 0.45)' },
      { x: 65, z: 0, r: 7, col: 'rgba(2, 132, 199, 0.45)' },
      { x: 195, z: 0, r: 9, col: 'rgba(14, 165, 233, 0.45)' },
      { x: 0, z: -195, r: 10, col: 'rgba(241, 245, 249, 0.45)' },
      { x: -195, z: 0, r: 10, col: 'rgba(245, 158, 11, 0.45)' },
      { x: 0, z: 195, r: 10, col: 'rgba(239, 68, 68, 0.45)' },
      { x: 140, z: -140, r: 6, col: 'rgba(56, 189, 248, 0.45)' },
      { x: -140, z: 140, r: 6, col: 'rgba(168, 85, 247, 0.45)' },
    ].forEach((hb) => {
      ctx.fillStyle = hb.col;
      ctx.beginPath();
      ctx.arc(cx + hb.x * scale, cy + hb.z * scale, hb.r, 0, Math.PI * 2);
      ctx.fill();
    });

    this.collectibleData.forEach((c) => {
      if (!c.active) return;
      ctx.fillStyle = c.type === 'amethyst' ? '#c084fc' : c.type === 'gold' ? '#facc15' : '#22d3ee';
      ctx.fillRect(cx + c.position.x * scale - 1.5, cy + c.position.z * scale - 1.5, 3, 3);
    });

    if (this.townBus) {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(cx + this.townBus.position.x * scale - 3, cy + this.townBus.position.z * scale - 3, 6, 6);
    }

    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(cx + this.player.position.x * scale, cy + this.player.position.z * scale, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
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
    if (this.cameraViewMode === 'first_person' && targetPlayer === this.player) {
      const eyePos = targetPlayer.position.clone().add(new THREE.Vector3(0, 1.85, 0));
      cam.position.copy(eyePos);
      const lookTarget = new THREE.Vector3(
        eyePos.x - Math.sin(yaw) * Math.cos(pitch) * 20,
        eyePos.y - Math.sin(pitch) * 20,
        eyePos.z - Math.cos(yaw) * Math.cos(pitch) * 20
      );
      cam.lookAt(lookTarget);
      return;
    }

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
    this.cameraYaw -= input.cameraDeltaX * 0.004;
    this.cameraPitch = THREE.MathUtils.clamp(
      this.cameraPitch + input.cameraDeltaY * 0.004,
      -0.25,
      Math.PI / 2.25
    );
    this.targetDistance = THREE.MathUtils.clamp(this.targetDistance + input.cameraZoom, 0.2, 16.0);
    this.cameraDistance = THREE.MathUtils.lerp(this.cameraDistance, this.targetDistance, delta * 10);
    this.inputManager.resetDelta();

    // Update Player 1
    this.player.update(
      delta,
      this.inputManager.state,
      this.cameraYaw,
      this.collisionBoxes,
      this.jumpPads,
      this.speedRings,
      this.getSlopeHeight,
      this.isForbiddenWaterForLand
    );
    this.checkPlayerCollectibles(this.player, false);

    // Update Player 2
    if (this.player2 && this.inputManager.splitScreenEnabled) {
      this.player2.update(
        delta,
        this.inputManager.p2State,
        this.p2CameraYaw,
        this.collisionBoxes,
        this.jumpPads,
        this.speedRings,
        this.getSlopeHeight,
        this.isForbiddenWaterForLand
      );
      this.checkPlayerCollectibles(this.player2, false);
    }

    for (const remote of this.remotePlayers.values()) {
      remote.update(delta);
    }

    this.updateAIBots(delta);

    if (this.player.position.y > 9.0) {
      this.advanceQuest('q_window', 1);
    }

    if (
      this.player.perkRainbowTrail &&
      (Math.abs(this.player.velocity.x) > 1 || Math.abs(this.player.velocity.z) > 1 || this.player.mountedInfo)
    ) {
      if (Math.random() < 0.35) {
        const trailCols = [0xef4444, 0xfacc15, 0x22c55e, 0x06b6d4, 0xa855f7];
        const tc = trailCols[Math.floor(Math.random() * trailCols.length)];
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.18, 0.18),
          new THREE.MeshBasicMaterial({ color: tc })
        );
        m.position.copy(this.player.position).add(new THREE.Vector3(0, 0.4, 0));
        this.scene.add(m);
        this.particles.push({ mesh: m, vel: new THREE.Vector3(0, 1.5, 0), life: 0.45 });
      }
    }

    // Update Autonomous 8-Seat Town Travel Bus
    if (this.townBus) {
      if (this.townBus.stopTimer > 0) {
        this.townBus.stopTimer -= delta;
      } else {
        const targetWP = this.townBus.waypoints[this.townBus.wpIndex];
        const dx = targetWP.x - this.townBus.position.x;
        const dz = targetWP.z - this.townBus.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 2.4) {
          this.townBus.stopTimer = targetWP.isStop ? 2.2 : 0;
          this.townBus.wpIndex = (this.townBus.wpIndex + 1) % this.townBus.waypoints.length;
          this.townBus.updateSign();
        } else {
          const vx = (dx / dist) * this.townBus.speed;
          const vz = (dz / dist) * this.townBus.speed;
          this.townBus.position.x += vx * delta;
          this.townBus.position.z += vz * delta;
          this.townBus.position.y = this.getSlopeHeight(this.townBus.position.x, this.townBus.position.z);

          const targetYaw = Math.atan2(vx, vz);
          let diff = targetYaw - this.townBus.rotationYaw;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          this.townBus.rotationYaw += diff * Math.min(1, delta * 8);
          this.townBus.mesh.rotation.y = this.townBus.rotationYaw;

          for (const w of this.townBus.wheels) {
            w.rotation.x += delta * 11;
          }
        }
      }

      for (let s = 0; s < this.townBus.passengers.length; s++) {
        const rider = this.townBus.passengers[s];
        if (!rider) continue;
        const offset = this.townBus.seatOffsets[s]
          .clone()
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.townBus.rotationYaw);
        rider.position.copy(this.townBus.position).add(offset);
        rider.mesh.position.copy(rider.position);
        rider.rotationYaw = this.townBus.rotationYaw;
        rider.mesh.rotation.y = rider.rotationYaw;
      }
    }

    // Update Controllable Land Vehicles (with Parabolic Ramp Jumps & Strict Building Collisions)
    const allBuildingBoxes = this.collisionBoxes.concat(this.vehicleBlockerBoxes);
    for (const car of this.controllableVehicles) {
      if (car.driver) {
        const inp = car.driver === this.player2 ? this.inputManager.p2State : this.inputManager.state;
        const maxSpd = inp.sprint || inp.dash ? 36.0 : 24.0;
        if (inp.forward) car.speed = THREE.MathUtils.lerp(car.speed, maxSpd, delta * 4.5);
        else if (inp.backward) car.speed = THREE.MathUtils.lerp(car.speed, -13.0, delta * 4.5);
        else car.speed = THREE.MathUtils.lerp(car.speed, 0, delta * (car.isAirborne ? 0.8 : 5.0));

        if (Math.abs(car.speed) > 0.4) {
          const turnDir = car.speed >= 0 ? 1 : -1;
          const turnRate = car.isAirborne ? 1.1 : 2.3;
          if (inp.left) car.rotationYaw += delta * turnRate * turnDir;
          if (inp.right) car.rotationYaw -= delta * turnRate * turnDir;
        }

        const prevGroundY = this.getSlopeHeight(car.position.x, car.position.z);
        let nextX = car.position.x + Math.sin(car.rotationYaw) * car.speed * delta;
        let nextZ = car.position.z + Math.cos(car.rotationYaw) * car.speed * delta;

        if (car.position.y < 1.8 && this.isForbiddenWaterForLand(nextX, nextZ)) {
          car.speed *= -0.25;
          nextX = car.position.x;
          nextZ = car.position.z;
        }

        const carRadius = 1.35;
        const carBox = new THREE.Box3(
          new THREE.Vector3(nextX - carRadius, car.position.y + 0.15, nextZ - carRadius),
          new THREE.Vector3(nextX + carRadius, car.position.y + 1.8, nextZ + carRadius)
        );
        for (const box of allBuildingBoxes) {
          if (carBox.intersectsBox(box)) {
            if (car.position.y >= box.max.y - 0.35 && (car.velocityY || 0) <= 0) {
              continue;
            }
            const testCarX = new THREE.Box3(
              new THREE.Vector3(nextX - carRadius, car.position.y + 0.15, car.position.z - carRadius),
              new THREE.Vector3(nextX + carRadius, car.position.y + 1.8, car.position.z + carRadius)
            );
            if (testCarX.intersectsBox(box)) nextX = car.position.x;
            const testCarZ = new THREE.Box3(
              new THREE.Vector3(car.position.x - carRadius, car.position.y + 0.15, nextZ - carRadius),
              new THREE.Vector3(car.position.x + carRadius, car.position.y + 1.8, nextZ + carRadius)
            );
            if (testCarZ.intersectsBox(box)) nextZ = car.position.z;
            car.speed *= -0.3;
            break;
          }
        }

        const maxB = WORLD_CONSTANTS.MAP_SIZE / 2 - 4;
        car.position.x = THREE.MathUtils.clamp(nextX, -maxB, maxB);
        car.position.z = THREE.MathUtils.clamp(nextZ, -maxB, maxB);

        const newGroundY = this.getSlopeHeight(car.position.x, car.position.z);

        if (!car.isAirborne) {
          const climbRate = (newGroundY - prevGroundY) / Math.max(0.005, delta);
          if (climbRate > 0.5) {
            car.lastClimbVel = Math.min(20.0, climbRate * 1.25);
            car.pitch = THREE.MathUtils.lerp(car.pitch || 0, -0.26, delta * 10);
          } else if (prevGroundY > newGroundY + 0.45 && Math.abs(car.speed) > 6.0) {
            car.velocityY = Math.max(car.lastClimbVel || 5.0, Math.abs(car.speed) * 0.45 + 4.5);
            car.isAirborne = true;
            car.lastClimbVel = 0;
            soundManager.playJumpPad();
          } else {
            car.pitch = THREE.MathUtils.lerp(car.pitch || 0, 0, delta * 10);
          }

          if (inp.jump) {
            car.velocityY = 10.5 + Math.abs(car.speed) * 0.22;
            car.isAirborne = true;
            soundManager.playHorn();
            inp.jump = false;
          }
        }

        if (car.isAirborne || car.position.y > newGroundY + 0.15) {
          car.isAirborne = true;
          car.velocityY = (car.velocityY || 0) + WORLD_CONSTANTS.GRAVITY * delta;
          car.position.y += car.velocityY * delta;
          car.pitch = THREE.MathUtils.clamp(-car.velocityY * 0.028, -0.45, 0.45);
          if (car.position.y <= newGroundY) {
            car.position.y = newGroundY;
            car.velocityY = 0;
            car.isAirborne = false;
            car.pitch = 0;
            this.spawnBurst(car.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 0xfacc15);
          }
        } else {
          car.position.y = newGroundY;
          car.velocityY = 0;
        }

        car.mesh.rotation.set(car.pitch || 0, car.rotationYaw, 0);
        for (const w of car.wheels) {
          w.rotation.x += car.speed * delta * 1.6;
        }

        car.driver.position.set(car.position.x, car.position.y + 0.85, car.position.z);
        car.driver.mesh.position.copy(car.driver.position);
        car.driver.rotationYaw = car.rotationYaw;
        car.driver.mesh.rotation.y = car.rotationYaw;
        this.checkPlayerCollectibles(car.driver, false);
      }
    }

    // Update Controllable Speedboats (Strictly Confined to Water)
    this.controllableBoats.forEach((boat, i) => {
      boat.position.y = 0.12 + Math.sin(elapsedTime * 2.6 + i) * 0.08;
      if (boat.driver) {
        const inp = boat.driver === this.player2 ? this.inputManager.p2State : this.inputManager.state;
        const maxSpd = inp.sprint || inp.dash ? 28.0 : 18.5;
        if (inp.forward) boat.speed = THREE.MathUtils.lerp(boat.speed, maxSpd, delta * 3.8);
        else if (inp.backward) boat.speed = THREE.MathUtils.lerp(boat.speed, -9.0, delta * 3.8);
        else boat.speed = THREE.MathUtils.lerp(boat.speed, 0, delta * 3.5);

        if (Math.abs(boat.speed) > 0.3) {
          if (inp.left) boat.rotationYaw += delta * 2.1;
          if (inp.right) boat.rotationYaw -= delta * 2.1;
        }
        if (inp.jump) {
          soundManager.playHorn();
          inp.jump = false;
        }

        const nextBX = boat.position.x + Math.sin(boat.rotationYaw) * boat.speed * delta;
        const nextBZ = boat.position.z + Math.cos(boat.rotationYaw) * boat.speed * delta;

        if (this.isWaterSurfaceAt(nextBX, nextBZ)) {
          boat.position.x = nextBX;
          boat.position.z = nextBZ;
        } else if (this.isWaterSurfaceAt(nextBX, boat.position.z)) {
          boat.position.x = nextBX;
          boat.speed *= 0.7;
        } else if (this.isWaterSurfaceAt(boat.position.x, nextBZ)) {
          boat.position.z = nextBZ;
          boat.speed *= 0.7;
        } else {
          boat.speed *= -0.35;
        }

        boat.mesh.rotation.y = boat.rotationYaw;
        boat.wake.material.opacity = Math.min(0.75, Math.abs(boat.speed) / 20);

        boat.driver.position.set(boat.position.x, boat.position.y + 0.75, boat.position.z - 0.3);
        boat.driver.mesh.position.copy(boat.driver.position);
        boat.driver.rotationYaw = boat.rotationYaw;
        boat.driver.mesh.rotation.y = boat.rotationYaw;
        this.checkPlayerCollectibles(boat.driver, false);
      }
    });

    // Update Controllable 3D Aeroplanes
    for (const pl of this.controllablePlanes) {
      if (pl.pilot) {
        const inp = pl.pilot === this.player2 ? this.inputManager.p2State : this.inputManager.state;
        const targetSpd = inp.forward
          ? inp.dash
            ? 52.0
            : 38.0
          : inp.backward
            ? 12.0
            : Math.max(pl.position.y > 1.0 ? 22.0 : 0, pl.speed * 0.99);
        pl.speed = THREE.MathUtils.lerp(pl.speed, targetSpd, delta * 3.0);
        pl.propeller.rotation.z += delta * (12 + pl.speed * 1.2);

        let targetRoll = 0;
        if (pl.speed > 2.0) {
          if (inp.left) {
            pl.rotationYaw += delta * 1.65;
            targetRoll = 0.42;
          } else if (inp.right) {
            pl.rotationYaw -= delta * 1.65;
            targetRoll = -0.42;
          }
        }
        pl.roll = THREE.MathUtils.lerp(pl.roll, targetRoll, delta * 6.0);

        let verticalVel = 0;
        let targetPitch = 0;
        if (inp.jump && pl.speed > 8.0) {
          verticalVel = 15.0;
          targetPitch = -0.28;
        } else if (inp.sprint) {
          verticalVel = -14.0;
          targetPitch = 0.25;
        } else if (pl.position.y > 1.0 && pl.speed < 10.0) {
          verticalVel = -8.0;
        }
        pl.pitch = THREE.MathUtils.lerp(pl.pitch, targetPitch, delta * 6.0);

        pl.position.x += Math.sin(pl.rotationYaw) * pl.speed * delta;
        pl.position.z += Math.cos(pl.rotationYaw) * pl.speed * delta;
        pl.position.y = THREE.MathUtils.clamp(
          pl.position.y + verticalVel * delta,
          this.getSlopeHeight(pl.position.x, pl.position.z),
          92.0
        );

        const maxB = WORLD_CONSTANTS.MAP_SIZE / 2 - 6;
        pl.position.x = THREE.MathUtils.clamp(pl.position.x, -maxB, maxB);
        pl.position.z = THREE.MathUtils.clamp(pl.position.z, -maxB, maxB);

        pl.mesh.rotation.y = pl.rotationYaw;
        pl.bodyGroup.rotation.set(pl.pitch, 0, pl.roll);

        pl.pilot.position.set(pl.position.x, pl.position.y + 1.15, pl.position.z);
        pl.pilot.mesh.position.copy(pl.pilot.position);
        pl.pilot.rotationYaw = pl.rotationYaw;
        pl.pilot.mesh.rotation.y = pl.rotationYaw;
        this.checkPlayerCollectibles(pl.pilot, false);
      } else {
        pl.propeller.rotation.z += delta * 2.5;
      }
    }

    // Update Controllable 3D Rescue Helicopter
    if (this.rescueHeli) {
      if (this.rescueHeli.pilot) {
        const inp =
          this.rescueHeli.pilot === this.player2 ? this.inputManager.p2State : this.inputManager.state;
        this.rescueHeli.topRotor.rotation.y += delta * 24.0;
        this.rescueHeli.tailRotor.rotation.x += delta * 28.0;

        const maxSpd = inp.dash ? 36.0 : 24.0;
        if (inp.forward)
          this.rescueHeli.speed = THREE.MathUtils.lerp(this.rescueHeli.speed, maxSpd, delta * 3.5);
        else if (inp.backward)
          this.rescueHeli.speed = THREE.MathUtils.lerp(this.rescueHeli.speed, -12.0, delta * 3.5);
        else this.rescueHeli.speed = THREE.MathUtils.lerp(this.rescueHeli.speed, 0, delta * 4.0);

        if (inp.left) this.rescueHeli.rotationYaw += delta * 1.9;
        if (inp.right) this.rescueHeli.rotationYaw -= delta * 1.9;

        let vY = 0;
        if (inp.jump) vY = 14.0;
        else if (inp.sprint) vY = -12.0;

        this.rescueHeli.position.x += Math.sin(this.rescueHeli.rotationYaw) * this.rescueHeli.speed * delta;
        this.rescueHeli.position.z += Math.cos(this.rescueHeli.rotationYaw) * this.rescueHeli.speed * delta;
        this.rescueHeli.position.y = THREE.MathUtils.clamp(
          this.rescueHeli.position.y + vY * delta,
          this.getSlopeHeight(this.rescueHeli.position.x, this.rescueHeli.position.z) + 0.22,
          88.0
        );

        this.rescueHeli.mesh.rotation.y = this.rescueHeli.rotationYaw;
        this.rescueHeli.bodyGroup.rotation.x = THREE.MathUtils.lerp(
          this.rescueHeli.bodyGroup.rotation.x,
          this.rescueHeli.speed * 0.01,
          delta * 6
        );

        this.rescueHeli.pilot.position.set(
          this.rescueHeli.position.x,
          this.rescueHeli.position.y + 1.1,
          this.rescueHeli.position.z
        );
        this.rescueHeli.pilot.mesh.position.copy(this.rescueHeli.pilot.position);
        this.rescueHeli.pilot.rotationYaw = this.rescueHeli.rotationYaw;
        this.rescueHeli.pilot.mesh.rotation.y = this.rescueHeli.rotationYaw;
        this.checkPlayerCollectibles(this.rescueHeli.pilot, false);
      } else {
        this.rescueHeli.topRotor.rotation.y += delta * 2.0;
      }
    }

    // Update Elevated Monorail Sky-Train
    if (this.skyTrain) {
      this.skyTrain.angle += delta * 0.26;
      this.skyTrain.position.x = Math.cos(this.skyTrain.angle) * this.skyTrain.radius;
      this.skyTrain.position.z = Math.sin(this.skyTrain.angle) * this.skyTrain.radius;
      this.skyTrain.rotationYaw = -this.skyTrain.angle;
      this.skyTrain.mesh.rotation.y = this.skyTrain.rotationYaw;
      if (this.skyTrain.rider) {
        this.skyTrain.rider.position.set(
          this.skyTrain.position.x,
          this.skyTrain.y + 1.2,
          this.skyTrain.position.z
        );
        this.skyTrain.rider.mesh.position.copy(this.skyTrain.rider.position);
        this.skyTrain.rider.rotationYaw = this.skyTrain.rotationYaw;
        this.skyTrain.rider.mesh.rotation.y = this.skyTrain.rotationYaw;
      }
    }

    // Update Seesaws, Carousels, Swings & Ferris Wheel
    for (const ss of this.interactiveSeesaws) {
      const hasHuman = ss.riderA || ss.riderB;
      const pumpSpeed = hasHuman && (input.forward || input.backward || input.jump) ? 5.2 : 2.6;
      ss.phase += delta * pumpSpeed;
      ss.angle = Math.sin(ss.phase) * 0.36;
      ss.pivot.rotation.z = ss.angle;

      if (ss.riderA) {
        const localEnd = new THREE.Vector3(-2.6, 1.05 - Math.sin(ss.angle) * 2.6 + 0.35, 0);
        localEnd.applyAxisAngle(new THREE.Vector3(0, 1, 0), ss.rotY);
        ss.riderA.position.copy(ss.position).add(localEnd);
        ss.riderA.mesh.position.copy(ss.riderA.position);
      }
      if (ss.riderB) {
        const localEndB = new THREE.Vector3(2.6, 1.05 + Math.sin(ss.angle) * 2.6 + 0.35, 0);
        localEndB.applyAxisAngle(new THREE.Vector3(0, 1, 0), ss.rotY);
        ss.riderB.position.copy(ss.position).add(localEndB);
        ss.riderB.mesh.position.copy(ss.riderB.position);
      }
    }

    for (const cr of this.interactiveCarousels) {
      cr.angle += delta * 1.35;
      cr.spinGroup.rotation.y = cr.angle;
      cr.mounts.forEach((mnt: { mesh: THREE.Mesh; baseAngle: number; rider: LocalPlayer | null }, m: number) => {
        const bobY = 1.4 + Math.sin(elapsedTime * 3.8 + m * 1.5) * 0.38;
        mnt.mesh.position.y = bobY;
        if (mnt.rider) {
          const totalAng = mnt.baseAngle + cr.angle;
          mnt.rider.position.set(
            cr.position.x + Math.cos(totalAng) * 3.6,
            bobY + 0.55,
            cr.position.z - Math.sin(totalAng) * 3.6
          );
          mnt.rider.mesh.position.copy(mnt.rider.position);
        }
      });
    }

    for (const sw of this.interactiveSwings) {
      const spd = sw.rider ? 3.6 : 1.4;
      const amp = sw.rider ? 0.85 : 0.18;
      sw.phase += delta * spd;
      const swingAng = Math.sin(sw.phase) * amp;
      sw.pivot.rotation.x = swingAng;
      if (sw.rider) {
        sw.rider.position.set(
          sw.position.x,
          4.4 - Math.cos(swingAng) * 3.1,
          sw.position.z + Math.sin(swingAng) * 3.1
        );
        sw.rider.mesh.position.copy(sw.rider.position);
      }
    }

    if (this.ferrisWheelRide) {
      this.ferrisWheelRide.angle += delta * 0.45;
      this.ferrisWheelRide.wheelPivot.rotation.z = this.ferrisWheelRide.angle;
      for (const gon of this.ferrisWheelRide.gondolas) {
        gon.group.rotation.z = -this.ferrisWheelRide.angle;
        if (gon.rider) {
          const totalA = gon.baseAngle + this.ferrisWheelRide.angle;
          gon.rider.position.set(
            this.ferrisWheelRide.position.x + Math.cos(totalA) * 10.5,
            13.5 + Math.sin(totalA) * 10.5,
            this.ferrisWheelRide.position.z
          );
          gon.rider.mesh.position.copy(gon.rider.position);
        }
      }
    }

    // Update Soccer Ball, Piano Keys, Bowling, Basketball, Chests, Portals & Disco
    if (this.soccerBall) {
      const kickers = [this.player];
      if (this.player2) kickers.push(this.player2);
      for (const kpObj of kickers) {
        const kp = kpObj.position;
        const dx = this.soccerBall.position.x - kp.x;
        const dz = this.soccerBall.position.z - kp.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 2.2 && Math.abs(this.soccerBall.position.y - kp.y) < 2.0) {
          this.soccerBall.velocity.set((dx / Math.max(0.1, dist)) * 22.0, 7.5, (dz / Math.max(0.1, dist)) * 22.0);
          soundManager.playJump();
        }
      }
      this.soccerBall.velocity.y += WORLD_CONSTANTS.GRAVITY * delta;
      this.soccerBall.position.addScaledVector(this.soccerBall.velocity, delta);
      this.soccerBall.velocity.x *= 1 - delta * 1.4;
      this.soccerBall.velocity.z *= 1 - delta * 1.4;
      if (this.soccerBall.position.y <= 0.75) {
        this.soccerBall.position.y = 0.75;
        this.soccerBall.velocity.y = this.soccerBall.velocity.y < -2.0 ? this.soccerBall.velocity.y * -0.55 : 0;
      }
      if (
        Math.abs(this.soccerBall.position.x - -60) < 3.8 &&
        (Math.abs(this.soccerBall.position.z - 43) < 1.6 || Math.abs(this.soccerBall.position.z - 87) < 1.6)
      ) {
        this.spawnBurst(this.soccerBall.position.clone(), 0xfacc15);
        soundManager.playCrown();
        this.player.score += 30;
        this.player.updateNameplate();
        this.emitToast('⚽ GOAL SCORED IN THE STADIUM! +30 XP!');
        this.soccerBall.position.set(-60, 2.0, 65);
        this.soccerBall.velocity.set(0, 0, 0);
      }
    }

    for (const pk of this.interactivePianoKeys) {
      if (pk.cooldown > 0) pk.cooldown -= delta;
      const dx = Math.abs(this.player.position.x - pk.worldX);
      const dz = Math.abs(this.player.position.z - pk.worldZ);
      if (dx < 0.72 && dz < 2.0 && this.player.position.y < 1.2) {
        pk.mesh.position.y = 0.16;
        pk.mat.emissiveIntensity = 0.95;
        if (pk.cooldown <= 0) {
          pk.cooldown = 0.32;
          soundManager.playTone(pk.freq, 0.28, 'triangle', 0.11);
          this.player.score += 2;
          this.player.updateNameplate();
        }
      } else {
        pk.mesh.position.y = THREE.MathUtils.lerp(pk.mesh.position.y, 0.26, delta * 10);
        pk.mat.emissiveIntensity = THREE.MathUtils.lerp(pk.mat.emissiveIntensity, 0.25, delta * 6);
      }
    }

    if (this.bowlingGame) {
      const bDist = Math.hypot(
        this.bowlingGame.ballPos.x - this.player.position.x,
        this.bowlingGame.ballPos.z - this.player.position.z
      );
      if (bDist < 1.8 && this.bowlingGame.ballVel.lengthSq() < 1.0) {
        this.bowlingGame.ballVel.set((this.bowlingGame.ballPos.x - this.player.position.x) * 3.0, 0, 22.0);
        soundManager.playDash();
      }
      this.bowlingGame.ballPos.addScaledVector(this.bowlingGame.ballVel, delta);
      this.bowlingGame.ballVel.multiplyScalar(1 - delta * 0.6);

      let knockedCount = 0;
      for (const pin of this.bowlingGame.pins) {
        if (!pin.knocked) {
          const pd = Math.hypot(
            this.bowlingGame.ballPos.x - pin.mesh.position.x,
            this.bowlingGame.ballPos.z - pin.mesh.position.z
          );
          if (pd < 0.95) {
            pin.knocked = true;
            pin.vel.set((Math.random() - 0.5) * 8, 4 + Math.random() * 4, 8 + Math.random() * 6);
            soundManager.playJump();
          }
        } else {
          knockedCount++;
          pin.mesh.position.addScaledVector(pin.vel, delta);
          pin.vel.y += WORLD_CONSTANTS.GRAVITY * delta;
          if (pin.mesh.position.y < 0.25) {
            pin.mesh.position.y = 0.25;
            pin.vel.set(0, 0, 0);
          }
          pin.mesh.rotation.x += delta * 6;
          pin.mesh.rotation.z += delta * 5;
        }
      }

      if (knockedCount > 0 || this.bowlingGame.ballPos.z > 40) {
        this.bowlingGame.resetTimer += delta;
        if (this.bowlingGame.resetTimer > 3.2) {
          this.bowlingGame.resetTimer = 0;
          this.player.score += knockedCount * 3;
          this.player.updateNameplate();
          this.emitToast(`🎳 Knocked down ${knockedCount}/10 Bowling Pins! (+${knockedCount * 3} XP)`);
          this.bowlingGame.ballPos.set(34, 0.72, 20);
          this.bowlingGame.ballVel.set(0, 0, 0);
          for (const pin of this.bowlingGame.pins) {
            pin.knocked = false;
            pin.vel.set(0, 0, 0);
            pin.mesh.position.set(pin.homeX, 0.65, pin.homeZ);
            pin.mesh.rotation.set(0, 0, 0);
          }
        }
      }
    }

    if (this.basketballGame) {
      const dBall = Math.hypot(
        this.basketballGame.pos.x - this.player.position.x,
        this.basketballGame.pos.z - this.player.position.z
      );
      if (dBall < 1.6 && !this.basketballGame.shotActive) {
        this.basketballGame.vel.set(
          (-34 - this.basketballGame.pos.x) * 1.2,
          10.2,
          (42.1 - this.basketballGame.pos.z) * 1.15
        );
        this.basketballGame.shotActive = true;
        soundManager.playJump();
      }
      if (this.basketballGame.shotActive) {
        this.basketballGame.vel.y += WORLD_CONSTANTS.GRAVITY * delta;
        this.basketballGame.pos.addScaledVector(this.basketballGame.vel, delta);
        if (this.basketballGame.pos.distanceTo(this.basketballGame.rimPos) < 1.15) {
          this.spawnBurst(this.basketballGame.rimPos.clone(), 0xf97316);
          soundManager.playCrown();
          this.player.score += 20;
          this.player.updateNameplate();
          this.emitToast('🏀 SWISH! Basketball Hoop Scored! (+20 XP)');
          this.basketballGame.pos.set(-34, 0.55, 33);
          this.basketballGame.vel.set(0, 0, 0);
          this.basketballGame.shotActive = false;
        } else if (this.basketballGame.pos.y <= 0.45) {
          this.basketballGame.pos.set(-34, 0.55, 33);
          this.basketballGame.vel.set(0, 0, 0);
          this.basketballGame.shotActive = false;
        }
      }
    }

    for (const ch of this.interactiveTreasureChests) {
      if (!ch.opened) {
        if (this.player.position.distanceTo(ch.position) < 2.6) {
          ch.opened = true;
          ch.timer = 15.0;
          this.spawnBurst(ch.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xfacc15);
          soundManager.playCrown();
          this.player.score += 35;
          this.player.level = Math.max(1, Math.floor(this.player.score / 100) + 1);
          this.player.updateNameplate();
          this.emitToast('💰 Opened a Neighborhood Treasure Chest! (+35 XP)');
        }
      } else {
        ch.lidPivot.rotation.x = THREE.MathUtils.lerp(ch.lidPivot.rotation.x, -1.35, delta * 8);
        ch.timer -= delta;
        if (ch.timer <= 0) {
          ch.opened = false;
          ch.lidPivot.rotation.x = 0;
        }
      }
    }

    for (const pt of this.teleportPortals) {
      pt.ring.rotation.z += delta * 2.5;
      if (this.player.position.distanceTo(pt.position) < 2.1 && this.player.portalCooldown <= 0) {
        this.player.portalCooldown = 3.0;
        this.player.position.set(pt.targetX, 1.0, pt.targetZ);
        soundManager.playCrown();
        this.emitToast(`🌀 Warped through Portal to ${pt.label}!`);
      }
    }
    if (this.player.portalCooldown > 0) this.player.portalCooldown -= delta;

    this.discoFloorTiles.forEach((tile, d) => {
      tile.emissiveIntensity = 0.35 + Math.sin(elapsedTime * 5 + d) * 0.35;
    });

    // Update 3D Pet Companion
    if (this.petMeshGroup && this.currentPetType !== 'none') {
      const petOffset = new THREE.Vector3(-1.15, 1.45 + Math.sin(elapsedTime * 4.2) * 0.22, -1.15);
      petOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.rotationYaw);
      this.petMeshGroup.position.lerp(this.player.position.clone().add(petOffset), Math.min(1, delta * 8));
      this.petMeshGroup.rotation.y = this.player.rotationYaw;
    }

    // Update Weather Particles
    if (this.weatherParticles && this.weatherParticles.visible) {
      const posAttr = this.weatherParticles.geometry.attributes.position as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;
      const fallSpd = this.weatherMode === 'rain' ? 26.0 : 6.5;
      for (let i = 0; i < posArr.length; i += 3) {
        posArr[i + 1] -= fallSpd * delta;
        if (posArr[i + 1] < 0) {
          posArr[i] = this.player.position.x + (Math.random() - 0.5) * 110;
          posArr[i + 1] = 38 + Math.random() * 10;
          posArr[i + 2] = this.player.position.z + (Math.random() - 0.5) * 110;
        }
      }
      posAttr.needsUpdate = true;
    }

    // Update Paintball Blaster Projectiles
    for (let i = this.paintballs.length - 1; i >= 0; i--) {
      const pb = this.paintballs[i];
      pb.life -= delta;
      pb.mesh.position.addScaledVector(pb.vel, delta);
      pb.vel.y -= 6.0 * delta;

      let hit = false;
      this.aiBots.forEach((bot) => {
        if (pb.mesh.position.distanceTo(bot.avatar.position.clone().add(new THREE.Vector3(0, 1.1, 0))) < 1.3) {
          hit = true;
          bot.targetPosition.addScaledVector(pb.vel.clone().normalize(), 3.5);
          this.player.score += 15;
          this.player.updateNameplate();
          this.emitToast(`🎯 Paintball Tag on ${bot.username}! (+15 XP)`);
        }
      });

      if (hit || pb.mesh.position.y <= 0.2 || pb.life <= 0) {
        if (hit || pb.mesh.position.y <= 0.2) {
          this.spawnBurst(pb.mesh.position.clone(), pb.color);
        }
        this.scene.remove(pb.mesh);
        this.paintballs.splice(i, 1);
      }
    }

    // Update Aether Meteors
    for (let m = this.activeMeteors.length - 1; m >= 0; m--) {
      const mt = this.activeMeteors[m];
      mt.mesh.position.x = THREE.MathUtils.lerp(mt.mesh.position.x, mt.targetX, delta * 2.5);
      mt.mesh.position.z = THREE.MathUtils.lerp(mt.mesh.position.z, mt.targetZ, delta * 2.5);
      mt.mesh.position.y -= 28.0 * delta;
      mt.mesh.rotation.x += delta * 5;
      if (mt.mesh.position.y <= 1.2) {
        this.spawnBurst(new THREE.Vector3(mt.targetX, 1.5, mt.targetZ), 0xf97316);
        soundManager.playJumpPad();
        const megaId = `meteor_shard_${Date.now()}_${m}`;
        this.collectibleData.set(megaId, {
          id: megaId,
          type: 'amethyst',
          position: { x: mt.targetX, y: 1.4, z: mt.targetZ },
          value: 100,
          active: true,
        });
        const mGem = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.95, 0),
          new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xef4444, emissiveIntensity: 0.8 })
        );
        mGem.position.set(mt.targetX, 1.4, mt.targetZ);
        this.scene.add(mGem);
        this.collectibleMeshes.set(megaId, mGem);

        this.scene.remove(mt.mesh);
        this.activeMeteors.splice(m, 1);
      }
    }

    // Update Time-Trial Race Checkpoints
    if (this.raceActive) {
      this.raceElapsedSec = ((performance.now() - this.raceStartTime) / 1000).toFixed(1);
      const targetCP = this.raceCheckpoints[this.raceIndex];
      if (
        targetCP &&
        Math.hypot(this.player.position.x - targetCP.x, this.player.position.z - targetCP.z) < 6.5
      ) {
        soundManager.playCollect(50);
        this.raceRingMeshes[this.raceIndex].visible = false;
        this.raceIndex++;
        if (this.raceIndex >= this.raceCheckpoints.length) {
          this.raceActive = false;
          this.player.score += 150;
          this.player.updateNameplate();
          soundManager.playCrown();
          this.emitToast(`🏆 TIME-TRIAL FINISHED in ${this.raceElapsedSec}s! (+150 XP Trophy!)`);
        } else {
          this.raceRingMeshes[this.raceIndex].scale.setScalar(1.35);
        }
      }
    }

    // Crown passive score tick
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

    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    if (this.player2 && this.inputManager.splitScreenEnabled) {
      this.renderer.setScissorTest(true);

      this.camera.aspect = w / 2 / h;
      this.camera.updateProjectionMatrix();
      this.updateCameraForPlayer(
        this.camera,
        this.player,
        this.cameraYaw,
        this.cameraPitch,
        this.cameraDistance,
        delta
      );
      this.renderer.setViewport(0, 0, w / 2, h);
      this.renderer.setScissor(0, 0, w / 2, h);
      this.renderer.render(this.scene, this.camera);

      this.p2Camera.aspect = w / 2 / h;
      this.p2Camera.updateProjectionMatrix();
      this.updateCameraForPlayer(this.p2Camera, this.player2, this.p2CameraYaw, 0.36, 7.0, delta);
      this.renderer.setViewport(w / 2, 0, w / 2, h);
      this.renderer.setScissor(w / 2, 0, w / 2, h);
      this.renderer.render(this.scene, this.p2Camera);
    } else {
      this.renderer.setScissorTest(false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.updateCameraForPlayer(
        this.camera,
        this.player,
        this.cameraYaw,
        this.cameraPitch,
        this.cameraDistance,
        delta
      );
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
