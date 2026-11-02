import * as THREE from 'three';
import { AnimationState, CharacterAppearance } from '@shared/types';
import { WORLD_CONSTANTS } from '@shared/constants/world';
import { InputState } from '../systems/InputManager';
import { soundManager } from '../systems/SoundManager';

export class LocalPlayer {
  public id: string;
  public mesh: THREE.Group;
  public username: string;
  public appearance: CharacterAppearance;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public rotationYaw: number = 0;
  public isGrounded: boolean = true;
  public currentAnimation: AnimationState = 'idle';
  public score: number = 0;
  public level: number = 1;
  public hasCrown: boolean = false;
  public dashCooldown: number = 0;
  public speedBoostTimer: number = 0;

  // Articulated 3D Body Parts
  private bodyGroup!: THREE.Group;
  private headGroup!: THREE.Group;
  private torsoMesh!: THREE.Mesh;
  private leftArmGroup!: THREE.Group;
  private rightArmGroup!: THREE.Group;
  private leftLegGroup!: THREE.Group;
  private rightLegGroup!: THREE.Group;
  private leftEyeMesh!: THREE.Mesh;
  private rightEyeMesh!: THREE.Mesh;
  private crownMesh!: THREE.Group;
  private auraRing!: THREE.Mesh;
  private nameplateSprite!: THREE.Sprite;
  private chatSprite: THREE.Sprite | null = null;
  private chatTimeout: number | null = null;

  private animTime: number = 0;
  private blinkTimer: number = 0;
  private landSquash: number = 0;

  constructor(
    id: string,
    username: string,
    appearance: CharacterAppearance,
    initialPosition: THREE.Vector3
  ) {
    this.id = id;
    this.username = username;
    this.appearance = appearance;
    this.position = initialPosition.clone();
    this.velocity = new THREE.Vector3();

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    this.buildCharacterMesh();
    this.updateNameplate();
  }

  private buildCharacterMesh() {
    this.bodyGroup = new THREE.Group();
    this.mesh.add(this.bodyGroup);

    const skinMat = new THREE.MeshStandardMaterial({
      color: this.appearance.color || '#ffdbac',
      roughness: 0.6,
    });
    const shirtMat = new THREE.MeshStandardMaterial({
      color: this.appearance.shirtColor || '#3b82f6',
      roughness: 0.5,
      metalness: 0.1,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: this.appearance.pantsColor || '#1e293b',
      roughness: 0.7,
    });
    const shoesMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.4 });
    const hairMat = new THREE.MeshStandardMaterial({ color: '#271709', roughness: 0.8 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#0f172a' });
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0xb45309,
      emissiveIntensity: 0.35,
    });

    // Ground aura ring
    const auraGeo = new THREE.RingGeometry(0.48, 0.62, 24);
    auraGeo.rotateX(-Math.PI / 2);
    const auraMat = new THREE.MeshBasicMaterial({
      color: this.appearance.shirtColor || '#3b82f6',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });
    this.auraRing = new THREE.Mesh(auraGeo, auraMat);
    this.auraRing.position.y = 0.03;
    this.mesh.add(this.auraRing);

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.72, 0.82, 0.44);
    this.torsoMesh = new THREE.Mesh(torsoGeo, shirtMat);
    this.torsoMesh.position.y = 1.12;
    this.torsoMesh.castShadow = true;
    this.torsoMesh.receiveShadow = true;
    this.bodyGroup.add(this.torsoMesh);

    // Belt / Waist trim
    const beltMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.74, 0.1, 0.46),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, roughness: 0.4 })
    );
    beltMesh.position.set(0, -0.35, 0);
    this.torsoMesh.add(beltMesh);

    // Adventurer Backpack / Cape detail
    if (this.appearance.avatarType === 'athletic' || this.appearance.avatarType === 'casual') {
      const pack = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.52, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 })
      );
      pack.position.set(0, 0.05, -0.3);
      pack.castShadow = true;
      this.torsoMesh.add(pack);
    }

    // Head Group (pivots at neck)
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.82, 0);
    this.bodyGroup.add(this.headGroup);

    const headGeo = new THREE.BoxGeometry(0.58, 0.56, 0.56);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = true;
    this.headGroup.add(headMesh);

    // Stylized Hair
    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.2, 0.62), hairMat);
    hairTop.position.set(0, 0.24, -0.02);
    this.headGroup.add(hairTop);

    // Eyes (with blink scaling)
    const eyeWhiteGeo = new THREE.BoxGeometry(0.11, 0.12, 0.03);
    const leftWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    leftWhite.position.set(-0.14, 0.02, 0.28);
    const rightWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    rightWhite.position.set(0.14, 0.02, 0.28);

    const pupilGeo = new THREE.BoxGeometry(0.065, 0.085, 0.04);
    this.leftEyeMesh = new THREE.Mesh(pupilGeo, eyeMat);
    this.leftEyeMesh.position.set(-0.14, 0.01, 0.29);
    this.rightEyeMesh = new THREE.Mesh(pupilGeo, eyeMat);
    this.rightEyeMesh.position.set(0.14, 0.01, 0.29);

    this.headGroup.add(leftWhite, rightWhite, this.leftEyeMesh, this.rightEyeMesh);

    // Custom Accessory
    this.buildAccessory(this.appearance.accessory || 'none', goldMat);

    // Floating Golden Arena Crown (visible when player holds the Arena Crown)
    this.crownMesh = new THREE.Group();
    const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.18, 8), goldMat);
    this.crownMesh.add(crownBase);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 4), goldMat);
      spike.position.set(Math.cos(a) * 0.22, 0.16, Math.sin(a) * 0.22);
      this.crownMesh.add(spike);
    }
    this.crownMesh.position.set(0, 0.52, 0);
    this.crownMesh.visible = this.hasCrown || this.appearance.accessory === 'crown';
    this.headGroup.add(this.crownMesh);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.24, 0.68, 0.24);
    armGeo.translate(0, -0.28, 0);
    const handGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);

    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(-0.49, 1.46, 0);
    const leftArm = new THREE.Mesh(armGeo, shirtMat);
    leftArm.castShadow = true;
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.set(0, -0.64, 0);
    this.leftArmGroup.add(leftArm, leftHand);
    this.bodyGroup.add(this.leftArmGroup);

    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(0.49, 1.46, 0);
    const rightArm = new THREE.Mesh(armGeo, shirtMat);
    rightArm.castShadow = true;
    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.set(0, -0.64, 0);
    this.rightArmGroup.add(rightArm, rightHand);
    this.bodyGroup.add(this.rightArmGroup);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.28, 0.68, 0.28);
    legGeo.translate(0, -0.34, 0);
    const shoeGeo = new THREE.BoxGeometry(0.3, 0.16, 0.42);

    this.leftLegGroup = new THREE.Group();
    this.leftLegGroup.position.set(-0.19, 0.72, 0);
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.castShadow = true;
    const leftShoe = new THREE.Mesh(shoeGeo, shoesMat);
    leftShoe.position.set(0, -0.64, 0.06);
    this.leftLegGroup.add(leftLeg, leftShoe);
    this.bodyGroup.add(this.leftLegGroup);

    this.rightLegGroup = new THREE.Group();
    this.rightLegGroup.position.set(0.19, 0.72, 0);
    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.castShadow = true;
    const rightShoe = new THREE.Mesh(shoeGeo, shoesMat);
    rightShoe.position.set(0, -0.64, 0.06);
    this.rightLegGroup.add(rightLeg, rightShoe);
    this.bodyGroup.add(this.rightLegGroup);
  }

  private buildAccessory(type: string, goldMat: THREE.Material) {
    if (type === 'wizard') {
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 0.05, 16),
        new THREE.MeshStandardMaterial({ color: 0x4c1d95, roughness: 0.6 })
      );
      brim.position.y = 0.32;
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.36, 0.75, 16),
        new THREE.MeshStandardMaterial({ color: 0x6d28d9, roughness: 0.6 })
      );
      cone.position.y = 0.68;
      this.headGroup.add(brim, cone);
    } else if (type === 'visor') {
      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.16, 0.14),
        new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          emissive: 0x06b6d4,
          emissiveIntensity: 0.7,
          metalness: 0.9,
          roughness: 0.1,
        })
      );
      visor.position.set(0, 0.03, 0.26);
      this.headGroup.add(visor);
    } else if (type === 'cap') {
      const bill = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.06, 0.35),
        new THREE.MeshStandardMaterial({ color: this.appearance.shirtColor || 0x3b82f6 })
      );
      bill.position.set(0, 0.2, 0.32);
      this.headGroup.add(bill);
    } else if (type === 'halo') {
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.34, 0.045, 12, 24),
        goldMat
      );
      halo.rotation.x = Math.PI / 2;
      halo.position.set(0, 0.56, 0);
      this.headGroup.add(halo);
    }
  }

  public updateNameplate() {
    if (this.nameplateSprite) {
      this.mesh.remove(this.nameplateSprite);
    }
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.beginPath();
      ctx.roundRect(12, 14, 296, 52, 16);
      ctx.fill();
      ctx.strokeStyle = this.hasCrown ? '#facc15' : 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = this.hasCrown ? 3 : 2;
      ctx.stroke();

      const label = `${this.hasCrown ? '👑 ' : ''}${this.username} • Lv.${this.level}`;
      ctx.font = 'bold 21px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 160, 40);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    this.nameplateSprite = new THREE.Sprite(spriteMat);
    this.nameplateSprite.scale.set(2.4, 0.6, 1);
    this.nameplateSprite.position.set(0, 2.55, 0);
    this.mesh.add(this.nameplateSprite);

    if (this.crownMesh) {
      this.crownMesh.visible = this.hasCrown || this.appearance.accessory === 'crown';
    }
  }

  public showChatBubble(text: string) {
    if (this.chatSprite) {
      this.mesh.remove(this.chatSprite);
      this.chatSprite = null;
    }
    if (this.chatTimeout) {
      window.clearTimeout(this.chatTimeout);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.roundRect(12, 10, 360, 64, 18);
      ctx.fill();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const display = text.length > 28 ? text.substring(0, 26) + '…' : text;
      ctx.fillText(display, 192, 42);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    this.chatSprite = new THREE.Sprite(mat);
    this.chatSprite.scale.set(2.9, 0.72, 1);
    this.chatSprite.position.set(0, 3.2, 0);
    this.mesh.add(this.chatSprite);

    this.chatTimeout = window.setTimeout(() => {
      if (this.chatSprite) {
        this.mesh.remove(this.chatSprite);
        this.chatSprite = null;
      }
    }, 5500);
  }

  public update(
    delta: number,
    input: InputState,
    cameraYaw: number,
    collisionBoxes: THREE.Box3[],
    jumpPads: THREE.Vector3[] = [],
    speedRings: THREE.Vector3[] = []
  ) {
    if (this.dashCooldown > 0) this.dashCooldown = Math.max(0, this.dashCooldown - delta);
    if (this.speedBoostTimer > 0) this.speedBoostTimer = Math.max(0, this.speedBoostTimer - delta);

    const hasKeyMove = input.forward || input.backward || input.left || input.right;
    const hasJoyMove = Math.abs(input.joyX) > 0.08 || Math.abs(input.joyY) > 0.08;
    const isMoving = hasKeyMove || hasJoyMove;

    if (input.dash && this.dashCooldown <= 0) {
      this.dashCooldown = 1.6;
      this.speedBoostTimer = 0.45;
      soundManager.playDash();
    }

    let baseSpeed = input.sprint ? WORLD_CONSTANTS.RUN_SPEED : WORLD_CONSTANTS.WALK_SPEED;
    if (this.speedBoostTimer > 0) {
      baseSpeed = WORLD_CONSTANTS.DASH_SPEED;
    }

    const moveDir = new THREE.Vector3();
    if (input.forward) moveDir.z -= 1;
    if (input.backward) moveDir.z += 1;
    if (input.left) moveDir.x -= 1;
    if (input.right) moveDir.x += 1;
    if (hasJoyMove) {
      moveDir.x += input.joyX;
      moveDir.z += input.joyY;
    }

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);

      const targetRotation = Math.atan2(moveDir.x, moveDir.z);
      let diff = targetRotation - this.rotationYaw;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.rotationYaw += diff * Math.min(1, delta * 14);
      this.mesh.rotation.y = this.rotationYaw;

      this.velocity.x = moveDir.x * baseSpeed;
      this.velocity.z = moveDir.z * baseSpeed;
    } else {
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, 0, Math.min(1, delta * 14));
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, 0, Math.min(1, delta * 14));
    }

    // Jump
    if (input.jump && this.isGrounded) {
      this.velocity.y = WORLD_CONSTANTS.JUMP_FORCE;
      this.isGrounded = false;
      soundManager.playJump();
    }

    // Jump pads check
    for (const pad of jumpPads) {
      const dx = this.position.x - pad.x;
      const dz = this.position.z - pad.z;
      if (dx * dx + dz * dz < 4.5 && this.position.y < 2.2) {
        this.velocity.y = WORLD_CONSTANTS.JUMP_PAD_FORCE;
        this.isGrounded = false;
        soundManager.playJumpPad();
        break;
      }
    }

    // Speed Boost Rings check
    for (const ring of speedRings) {
      const dx = this.position.x - ring.x;
      const dz = this.position.z - ring.z;
      if (dx * dx + dz * dz < 6.0 && this.speedBoostTimer <= 0.1) {
        this.speedBoostTimer = 2.2;
        soundManager.playDash();
        break;
      }
    }

    this.velocity.y += WORLD_CONSTANTS.GRAVITY * delta;

    const wasAirborne = !this.isGrounded;
    const nextPos = this.position.clone();
    nextPos.x += this.velocity.x * delta;
    nextPos.z += this.velocity.z * delta;
    nextPos.y += this.velocity.y * delta;

    if (nextPos.y <= 0) {
      nextPos.y = 0;
      this.velocity.y = 0;
      this.isGrounded = true;
      if (wasAirborne) {
        this.landSquash = 0.25;
      }
    }

    // Collision check with sliding
    const playerRadius = 0.45;
    const playerBox = new THREE.Box3(
      new THREE.Vector3(nextPos.x - playerRadius, nextPos.y + 0.1, nextPos.z - playerRadius),
      new THREE.Vector3(nextPos.x + playerRadius, nextPos.y + 1.8, nextPos.z + playerRadius)
    );

    for (const box of collisionBoxes) {
      if (playerBox.intersectsBox(box)) {
        // Allow standing on top of roofs/platforms
        if (this.position.y >= box.max.y - 0.35 && this.velocity.y <= 0) {
          nextPos.y = box.max.y;
          this.velocity.y = 0;
          this.isGrounded = true;
          continue;
        }

        const testX = new THREE.Box3(
          new THREE.Vector3(nextPos.x - playerRadius, this.position.y + 0.1, this.position.z - playerRadius),
          new THREE.Vector3(nextPos.x + playerRadius, this.position.y + 1.8, this.position.z + playerRadius)
        );
        if (testX.intersectsBox(box)) {
          nextPos.x = this.position.x;
          this.velocity.x = 0;
        }

        const testZ = new THREE.Box3(
          new THREE.Vector3(this.position.x - playerRadius, this.position.y + 0.1, nextPos.z - playerRadius),
          new THREE.Vector3(this.position.x + playerRadius, this.position.y + 1.8, nextPos.z + playerRadius)
        );
        if (testZ.intersectsBox(box)) {
          nextPos.z = this.position.z;
          this.velocity.z = 0;
        }
        break;
      }
    }

    const maxBound = WORLD_CONSTANTS.MAP_SIZE / 2 - 2;
    nextPos.x = THREE.MathUtils.clamp(nextPos.x, -maxBound, maxBound);
    nextPos.z = THREE.MathUtils.clamp(nextPos.z, -maxBound, maxBound);

    this.position.copy(nextPos);
    this.mesh.position.copy(this.position);

    // Determine animation state
    if (!this.isGrounded) {
      this.currentAnimation = 'jump';
    } else if (isMoving) {
      this.currentAnimation = input.sprint || this.speedBoostTimer > 0 ? 'run' : 'walk';
    } else if (input.emote) {
      this.currentAnimation = input.emote;
    } else {
      this.currentAnimation = 'idle';
    }

    this.animateRig(delta);
  }

  public animateRig(delta: number) {
    this.animTime += delta;
    this.blinkTimer += delta;

    // Periodic eye blink
    const isBlinking = this.blinkTimer % 3.6 > 3.45;
    const eyeScaleY = isBlinking ? 0.15 : 1.0;
    this.leftEyeMesh.scale.y = eyeScaleY;
    this.rightEyeMesh.scale.y = eyeScaleY;

    // Landing squash recovery
    if (this.landSquash > 0) {
      this.landSquash = Math.max(0, this.landSquash - delta * 2.2);
      this.bodyGroup.scale.set(1 + this.landSquash * 0.35, 1 - this.landSquash * 0.35, 1 + this.landSquash * 0.35);
    } else {
      this.bodyGroup.scale.lerp(new THREE.Vector3(1, 1, 1), delta * 12);
    }

    // Rotate aura ring & crown
    if (this.auraRing) {
      this.auraRing.rotation.z += delta * 1.2;
    }
    if (this.crownMesh && this.crownMesh.visible) {
      this.crownMesh.rotation.y += delta * 2.0;
    }

    // Reset default torso/body transforms smoothly
    this.bodyGroup.position.y = THREE.MathUtils.lerp(this.bodyGroup.position.y, 0, delta * 10);
    this.bodyGroup.rotation.x = THREE.MathUtils.lerp(
      this.bodyGroup.rotation.x,
      this.currentAnimation === 'run' ? 0.18 : 0,
      delta * 10
    );

    if (this.currentAnimation === 'walk' || this.currentAnimation === 'run') {
      const freq = this.currentAnimation === 'run' ? 16 : 10;
      const t = this.animTime * freq;
      const swing = Math.sin(t);
      const amp = this.currentAnimation === 'run' ? 0.88 : 0.62;

      this.leftLegGroup.rotation.x = swing * amp;
      this.rightLegGroup.rotation.x = -swing * amp;
      this.leftArmGroup.rotation.x = -swing * amp * 0.9;
      this.rightArmGroup.rotation.x = swing * amp * 0.9;
      this.leftArmGroup.rotation.z = 0;
      this.rightArmGroup.rotation.z = 0;

      const bob = Math.abs(Math.cos(t)) * (this.currentAnimation === 'run' ? 0.09 : 0.05);
      this.torsoMesh.position.y = 1.12 + bob;
      this.headGroup.position.y = 1.82 + bob;
      this.headGroup.rotation.z = Math.sin(t * 0.5) * 0.04;
    } else if (this.currentAnimation === 'jump') {
      this.leftLegGroup.rotation.x = THREE.MathUtils.lerp(this.leftLegGroup.rotation.x, -0.45, delta * 12);
      this.rightLegGroup.rotation.x = THREE.MathUtils.lerp(this.rightLegGroup.rotation.x, 0.35, delta * 12);
      this.leftArmGroup.rotation.x = THREE.MathUtils.lerp(this.leftArmGroup.rotation.x, -2.4, delta * 12);
      this.rightArmGroup.rotation.x = THREE.MathUtils.lerp(this.rightArmGroup.rotation.x, -2.4, delta * 12);
    } else if (this.currentAnimation === 'wave') {
      const w = Math.sin(this.animTime * 10);
      this.rightArmGroup.rotation.x = -2.6;
      this.rightArmGroup.rotation.z = 0.35 + w * 0.35;
      this.leftArmGroup.rotation.x = THREE.MathUtils.lerp(this.leftArmGroup.rotation.x, 0, delta * 10);
      this.headGroup.rotation.z = w * 0.08;
    } else if (this.currentAnimation === 'dance') {
      const d = this.animTime * 9;
      this.bodyGroup.position.y = Math.abs(Math.sin(d)) * 0.14;
      this.bodyGroup.rotation.y = Math.sin(d * 0.5) * 0.45;
      this.leftArmGroup.rotation.x = -1.8 + Math.sin(d) * 0.8;
      this.rightArmGroup.rotation.x = -1.8 - Math.sin(d) * 0.8;
      this.leftArmGroup.rotation.z = -0.35;
      this.rightArmGroup.rotation.z = 0.35;
      this.leftLegGroup.rotation.x = Math.sin(d) * 0.5;
      this.rightLegGroup.rotation.x = -Math.sin(d) * 0.5;
      this.headGroup.rotation.z = Math.cos(d) * 0.12;
    } else if (this.currentAnimation === 'spin') {
      this.bodyGroup.rotation.y += delta * 11;
      this.bodyGroup.position.y = 0.25 + Math.sin(this.animTime * 8) * 0.15;
      this.leftArmGroup.rotation.z = -1.2;
      this.rightArmGroup.rotation.z = 1.2;
    } else if (this.currentAnimation === 'sit') {
      this.bodyGroup.position.y = -0.32;
      this.leftLegGroup.rotation.x = -1.45;
      this.rightLegGroup.rotation.x = -1.45;
      this.leftArmGroup.rotation.x = -0.35;
      this.rightArmGroup.rotation.x = -0.35;
    } else {
      // Smooth idle breathing
      const breath = Math.sin(this.animTime * 2.4) * 0.025;
      this.torsoMesh.position.y = 1.12 + breath;
      this.headGroup.position.y = 1.82 + breath;
      this.bodyGroup.rotation.y = THREE.MathUtils.lerp(this.bodyGroup.rotation.y, 0, delta * 10);
      this.headGroup.rotation.z = THREE.MathUtils.lerp(this.headGroup.rotation.z, 0, delta * 10);
      this.leftLegGroup.rotation.x = THREE.MathUtils.lerp(this.leftLegGroup.rotation.x, 0, delta * 10);
      this.rightLegGroup.rotation.x = THREE.MathUtils.lerp(this.rightLegGroup.rotation.x, 0, delta * 10);
      this.leftArmGroup.rotation.x = THREE.MathUtils.lerp(this.leftArmGroup.rotation.x, Math.sin(this.animTime * 1.6) * 0.06, delta * 10);
      this.rightArmGroup.rotation.x = THREE.MathUtils.lerp(this.rightArmGroup.rotation.x, -Math.sin(this.animTime * 1.6) * 0.06, delta * 10);
      this.leftArmGroup.rotation.z = THREE.MathUtils.lerp(this.leftArmGroup.rotation.z, 0, delta * 10);
      this.rightArmGroup.rotation.z = THREE.MathUtils.lerp(this.rightArmGroup.rotation.z, 0, delta * 10);
    }
  }
}
