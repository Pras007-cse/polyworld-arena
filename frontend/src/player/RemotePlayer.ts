import * as THREE from 'three';
import { AnimationState, CharacterAppearance, PlayerState, Vector3D } from '@shared/types';
import { LocalPlayer } from './LocalPlayer';

export class RemotePlayer {
  public id: string;
  public username: string;
  public isBot: boolean;
  public avatar: LocalPlayer;
  public targetPosition: THREE.Vector3;
  public targetRotation: number = 0;

  // AI Bot state
  public aiTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public aiTimer: number = 0;

  constructor(state: PlayerState) {
    this.id = state.id;
    this.username = state.username;
    this.isBot = !!state.isBot;
    const initPos = new THREE.Vector3(state.position.x, state.position.y, state.position.z);
    this.targetPosition = initPos.clone();
    this.targetRotation = state.rotation || 0;

    this.avatar = new LocalPlayer(
      state.id,
      state.username,
      state.appearance || {
        color: '#ffdbac',
        shirtColor: '#10b981',
        pantsColor: '#1e293b',
        avatarType: 'casual',
      },
      initPos
    );
    this.avatar.score = state.score || 0;
    this.avatar.level = state.level || 1;
    this.avatar.hasCrown = !!state.hasCrown;
    this.avatar.currentAnimation = state.animation || 'idle';
    this.avatar.updateNameplate();
  }

  public get mesh(): THREE.Group {
    return this.avatar.mesh;
  }

  public applyNetworkMove(pos: Vector3D, rot: number, anim?: AnimationState) {
    this.targetPosition.set(pos.x, pos.y, pos.z);
    this.targetRotation = rot;
    if (anim) {
      this.avatar.currentAnimation = anim;
    }
  }

  public applyAnimation(anim: AnimationState) {
    this.avatar.currentAnimation = anim;
  }

  public update(delta: number) {
    // Smooth interpolation toward target position & yaw
    this.avatar.position.lerp(this.targetPosition, Math.min(1, delta * 12));
    this.avatar.mesh.position.copy(this.avatar.position);

    let diff = this.targetRotation - this.avatar.rotationYaw;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.avatar.rotationYaw += diff * Math.min(1, delta * 12);
    this.avatar.mesh.rotation.y = this.avatar.rotationYaw;

    this.avatar.animateRig(delta);
  }

  public setAppearance(appearance: CharacterAppearance) {
    this.avatar.appearance = appearance;
  }
}
