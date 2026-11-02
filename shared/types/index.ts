export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export type AnimationState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'dance'
  | 'wave'
  | 'spin'
  | 'sit';

export type AccessoryType = 'none' | 'crown' | 'wizard' | 'visor' | 'cap' | 'halo';

export interface CharacterAppearance {
  color: string;
  shirtColor: string;
  pantsColor: string;
  avatarType: 'casual' | 'athletic' | 'formal';
  accessory?: AccessoryType;
}

export interface PlayerState {
  id: string;
  username: string;
  position: Vector3D;
  rotation: number; // yaw in radians
  animation: AnimationState;
  appearance: CharacterAppearance;
  score: number;
  level: number;
  hasCrown?: boolean;
  isBot?: boolean;
  lastChat?: string;
  lastChatTime?: number;
}

export type CollectibleType = 'cyan' | 'gold' | 'amethyst';

export interface CollectibleItem {
  id: string;
  type: CollectibleType;
  position: Vector3D;
  value: number;
  active: boolean;
}

export interface WorldObjectData {
  id: string;
  type: 'bench' | 'lamp' | 'fountain' | 'tree' | 'building' | 'sign' | 'jumppad' | 'boost' | 'shrine';
  position: Vector3D;
  rotation?: number;
  interactive?: boolean;
  prompt?: string;
}
