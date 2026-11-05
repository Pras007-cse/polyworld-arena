import { AnimationState, CameraControlMode } from '@shared/types';

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  dash: boolean;
  jump: boolean;
  interact: boolean;
  emote: AnimationState | null;
  cameraDeltaX: number;
  cameraDeltaY: number;
  cameraZoom: number;
  joyX: number;
  joyY: number;
}

export interface ActionCallbacks {
  onInteract?: () => void;
  onP2Interact?: () => void;
  onGrapple?: () => void;
  onBlaster?: () => void;
  onToggleJetpack?: () => void;
  onToggleHoverboard?: () => void;
  onBuildRamp?: () => void;
  onToggleCameraMode?: () => void;
  onCycleCameraView?: () => void;
}

export class InputManager {
  public state: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    dash: false,
    jump: false,
    interact: false,
    emote: null,
    cameraDeltaX: 0,
    cameraDeltaY: 0,
    cameraZoom: 0,
    joyX: 0,
    joyY: 0,
  };

  public p2State: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    dash: false,
    jump: false,
    interact: false,
    emote: null,
    cameraDeltaX: 0,
    cameraDeltaY: 0,
    cameraZoom: 0,
    joyX: 0,
    joyY: 0,
  };

  public splitScreenEnabled: boolean = false;
  public cameraControlMode: CameraControlMode = 'drag';
  public actions: ActionCallbacks = {};

  private isPointerDown = false;
  private hasMouseInit = false;
  private prevMouseX = 0;
  private prevMouseY = 0;
  private element: HTMLElement | null = null;

  constructor() {
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onWheel = this.onWheel.bind(this);
  }

  public attach(element: HTMLElement) {
    this.element = element;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    element.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    element.addEventListener('wheel', this.onWheel, { passive: true });
  }

  public detach() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    if (this.element) {
      this.element.removeEventListener('mousedown', this.onMouseDown);
      this.element.removeEventListener('wheel', this.onWheel);
    }
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
  }

  public resetDelta() {
    this.state.cameraDeltaX = 0;
    this.state.cameraDeltaY = 0;
    this.state.cameraZoom = 0;
  }

  public triggerEmote(emote: AnimationState | null) {
    this.state.emote = emote;
  }

  private onKeyDown(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      return;
    }

    switch (e.code) {
      case 'KeyW':
        this.state.forward = true;
        this.state.emote = null;
        break;
      case 'KeyS':
        this.state.backward = true;
        this.state.emote = null;
        break;
      case 'KeyA':
        this.state.left = true;
        this.state.emote = null;
        break;
      case 'KeyD':
        this.state.right = true;
        this.state.emote = null;
        break;
      case 'ShiftLeft':
        this.state.sprint = true;
        break;
      case 'KeyF':
        this.state.dash = true;
        break;
      case 'Space':
        this.state.jump = true;
        this.state.emote = null;
        e.preventDefault();
        break;
      case 'KeyE':
        this.state.interact = true;
        this.actions.onInteract?.();
        break;
      case 'KeyU':
        if (this.splitScreenEnabled) {
          this.actions.onP2Interact?.();
        }
        break;
      case 'KeyQ':
        this.actions.onGrapple?.();
        break;
      case 'KeyG':
        this.actions.onBlaster?.();
        break;
      case 'KeyJ':
        this.actions.onToggleJetpack?.();
        break;
      case 'KeyH':
        this.actions.onToggleHoverboard?.();
        break;
      case 'KeyB':
        this.actions.onBuildRamp?.();
        break;
      case 'KeyM':
        this.actions.onToggleCameraMode?.();
        break;
      case 'KeyV':
        this.actions.onCycleCameraView?.();
        break;
      case 'Digit1':
        this.state.emote = 'wave';
        break;
      case 'Digit2':
        this.state.emote = 'dance';
        break;
      case 'Digit3':
        this.state.emote = 'spin';
        break;
      case 'Digit4':
        this.state.emote = this.state.emote === 'sit' ? null : 'sit';
        break;

      case 'ArrowUp':
      case 'KeyI':
        if (this.splitScreenEnabled) {
          this.p2State.forward = true;
          this.p2State.emote = null;
        } else if (e.code === 'ArrowUp') {
          this.state.forward = true;
          this.state.emote = null;
        }
        e.preventDefault();
        break;
      case 'ArrowDown':
      case 'KeyK':
        if (this.splitScreenEnabled) {
          this.p2State.backward = true;
          this.p2State.emote = null;
        } else if (e.code === 'ArrowDown') {
          this.state.backward = true;
          this.state.emote = null;
        }
        e.preventDefault();
        break;
      case 'ArrowLeft':
      case 'KeyJ':
        if (this.splitScreenEnabled && e.code === 'ArrowLeft') {
          this.p2State.left = true;
          this.p2State.emote = null;
        } else if (e.code === 'ArrowLeft') {
          this.state.left = true;
          this.state.emote = null;
        }
        e.preventDefault();
        break;
      case 'ArrowRight':
      case 'KeyL':
        if (this.splitScreenEnabled) {
          this.p2State.right = true;
          this.p2State.emote = null;
        } else if (e.code === 'ArrowRight') {
          this.state.right = true;
          this.state.emote = null;
        }
        e.preventDefault();
        break;
      case 'ShiftRight':
      case 'KeyO':
        if (this.splitScreenEnabled) {
          this.p2State.sprint = true;
        } else {
          this.state.sprint = true;
        }
        break;
      case 'Enter':
      case 'Numpad0':
        if (this.splitScreenEnabled) {
          this.p2State.jump = true;
          this.p2State.emote = null;
        }
        break;
      case 'KeyP':
        if (this.splitScreenEnabled) {
          this.p2State.emote = this.p2State.emote === 'dance' ? 'wave' : 'dance';
        }
        break;
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    switch (e.code) {
      case 'KeyW':
        this.state.forward = false;
        break;
      case 'KeyS':
        this.state.backward = false;
        break;
      case 'KeyA':
        this.state.left = false;
        break;
      case 'KeyD':
        this.state.right = false;
        break;
      case 'ShiftLeft':
        this.state.sprint = false;
        break;
      case 'KeyF':
        this.state.dash = false;
        break;
      case 'Space':
        this.state.jump = false;
        break;
      case 'KeyE':
        this.state.interact = false;
        break;
      case 'ArrowUp':
      case 'KeyI':
        this.p2State.forward = false;
        if (e.code === 'ArrowUp') this.state.forward = false;
        break;
      case 'ArrowDown':
      case 'KeyK':
        this.p2State.backward = false;
        if (e.code === 'ArrowDown') this.state.backward = false;
        break;
      case 'ArrowLeft':
        this.p2State.left = false;
        this.state.left = false;
        break;
      case 'ArrowRight':
      case 'KeyL':
        this.p2State.right = false;
        if (e.code === 'ArrowRight') this.state.right = false;
        break;
      case 'ShiftRight':
      case 'KeyO':
        this.p2State.sprint = false;
        this.state.sprint = false;
        break;
      case 'Enter':
      case 'Numpad0':
        this.p2State.jump = false;
        break;
    }
  }

  private onMouseDown(e: MouseEvent) {
    if (e.button === 0 || e.button === 2) {
      this.isPointerDown = true;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    }
  }

  private onMouseUp() {
    this.isPointerDown = false;
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.hasMouseInit) {
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
      this.hasMouseInit = true;
      return;
    }
    const dx = e.clientX - this.prevMouseX;
    const dy = e.clientY - this.prevMouseY;
    this.prevMouseX = e.clientX;
    this.prevMouseY = e.clientY;

    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'BUTTON' || tag === 'TEXTAREA') {
      return;
    }

    if (this.isPointerDown || this.cameraControlMode === 'mouse_move') {
      this.state.cameraDeltaX += dx;
      this.state.cameraDeltaY += dy;
    }
  }

  private onWheel(e: WheelEvent) {
    this.state.cameraZoom += Math.sign(e.deltaY) * 0.7;
  }
}
