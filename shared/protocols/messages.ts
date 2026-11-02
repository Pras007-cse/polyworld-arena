import {
  AnimationState,
  CharacterAppearance,
  CollectibleItem,
  PlayerState,
  Vector3D,
} from '../types';

export interface JoinPayload {
  username: string;
  appearance: CharacterAppearance;
}

export interface JoinResponse {
  success: boolean;
  playerId?: string;
  player?: PlayerState;
  existingPlayers?: PlayerState[];
  collectibles?: CollectibleItem[];
  crownHolderId?: string | null;
  crownPosition?: Vector3D;
  error?: string;
}

export interface WelcomePayload {
  playerId: string;
  player: PlayerState;
  existingPlayers: PlayerState[];
  collectibles: CollectibleItem[];
  crownHolderId: string | null;
  crownPosition: Vector3D;
  serverTime: number;
}

export interface PlayerMovePayload {
  position: Vector3D;
  rotation: number;
  velocity?: Vector3D;
  animation?: AnimationState;
  timestamp: number;
}

export interface PlayerMovedPayload {
  playerId: string;
  position: Vector3D;
  rotation: number;
  velocity?: Vector3D;
  animation?: AnimationState;
  timestamp: number;
}

export interface PlayerAnimationPayload {
  animation: AnimationState;
}

export interface PlayerAnimatedPayload {
  playerId: string;
  animation: AnimationState;
}

export interface ChatMessagePayload {
  text: string;
}

export interface ChatBroadcastPayload {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface CollectItemPayload {
  itemId: string;
}

export interface ItemCollectedBroadcast {
  itemId: string;
  playerId: string;
  playerName: string;
  newScore: number;
  newLevel: number;
  value: number;
}

export interface ItemRespawnedBroadcast {
  item: CollectibleItem;
}

export interface CrownClaimPayload {
  targetPlayerId?: string | null;
}

export interface CrownChangedBroadcast {
  crownHolderId: string | null;
  holderName: string | null;
  crownPosition: Vector3D;
  scores: { id: string; score: number; level: number }[];
}

export interface ClientToServerEvents {
  player_join: (data: JoinPayload, callback?: (res: JoinResponse) => void) => void;
  player_move: (data: PlayerMovePayload) => void;
  player_animation: (data: PlayerAnimationPayload) => void;
  chat_message: (data: ChatMessagePayload) => void;
  collect_item: (data: CollectItemPayload) => void;
  claim_crown: (data: CrownClaimPayload) => void;
  ping: (timestamp: number) => void;
}

export interface ServerToClientEvents {
  welcome: (data: WelcomePayload) => void;
  player_joined: (player: PlayerState) => void;
  player_left: (data: { playerId: string; crownPosition?: Vector3D }) => void;
  player_moved: (data: PlayerMovedPayload) => void;
  player_animated: (data: PlayerAnimatedPayload) => void;
  chat_broadcast: (data: ChatBroadcastPayload) => void;
  item_collected: (data: ItemCollectedBroadcast) => void;
  item_respawned: (data: ItemRespawnedBroadcast) => void;
  crown_changed: (data: CrownChangedBroadcast) => void;
  pong: (data: { clientTime: number; serverTime: number }) => void;
  error_message: (data: { message: string }) => void;
}
