/**
 * Input manager: keyboard + mouse with pointer lock, edge detection and an
 * input buffer. Buffering means a press registered slightly before it's
 * actionable (e.g. tapping jump just before landing) still fires — essential
 * for bunnyhopping and a responsive feel.
 */

export type ButtonName =
  | 'jump'
  | 'dash'
  | 'crouch'
  | 'fire'
  | 'swing'
  | 'pull'
  | 'rocket'
  | 'walk'
  | 'reset';

const KEY_MAP: Record<string, ButtonName> = {
  Space: 'jump',
  ShiftLeft: 'dash',
  ShiftRight: 'dash',
  ControlLeft: 'crouch',
  KeyC: 'crouch',
  KeyF: 'pull',
  KeyQ: 'rocket',
  AltLeft: 'walk',
  KeyR: 'reset',
};

export class Input {
  private down = new Set<ButtonName>();
  private pressedAt = new Map<ButtonName, number>();
  private consumed = new Set<ButtonName>();

  // movement axes (-1..1)
  moveX = 0; // strafe: +right
  moveZ = 0; // forward: +forward

  // accumulated look (radians), applied & reset each frame by the camera
  lookYaw = 0;
  lookPitch = 0;

  locked = false;
  time = 0;

  private keys = new Set<string>();
  private el: HTMLElement;

  constructor(el: HTMLElement) {
    this.el = el;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    el.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onLockChange);
    el.addEventListener('click', () => {
      if (!this.locked) el.requestPointerLock();
    });
    window.addEventListener('blur', () => {
      this.down.clear();
      this.keys.clear();
    });
  }

  private press(b: ButtonName) {
    if (!this.down.has(b)) {
      this.down.add(b);
      this.pressedAt.set(b, this.time);
      this.consumed.delete(b);
    }
  }
  private release(b: ButtonName) {
    this.down.delete(b);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    this.keys.add(e.code);
    const b = KEY_MAP[e.code];
    if (b) {
      this.press(b);
      if (e.code === 'Space') e.preventDefault();
    }
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
    const b = KEY_MAP[e.code];
    if (b) this.release(b);
  };
  private onMouseDown = (e: MouseEvent) => {
    if (!this.locked) return;
    if (e.button === 0) this.press('fire');
    if (e.button === 2) this.press('swing');
    if (e.button === 1) this.press('rocket');
  };
  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.release('fire');
    if (e.button === 2) this.release('swing');
    if (e.button === 1) this.release('rocket');
  };
  private onMouseMove = (e: MouseEvent) => {
    if (!this.locked) return;
    this.lookYaw -= e.movementX;
    this.lookPitch -= e.movementY;
  };
  private onLockChange = () => {
    this.locked = document.pointerLockElement === this.el;
  };

  /** Recompute movement axes from currently held keys. Call once per frame. */
  update(dt: number) {
    this.time += dt;
    let x = 0;
    let z = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    this.moveX = x;
    this.moveZ = z;
  }

  isDown(b: ButtonName): boolean {
    return this.down.has(b);
  }

  /** True once for a fresh press (edge), within `window` seconds, then consumes it. */
  consume(b: ButtonName, window: number): boolean {
    const t = this.pressedAt.get(b);
    if (t === undefined) return false;
    if (this.consumed.has(b)) return false;
    if (this.time - t <= window) {
      this.consumed.add(b);
      return true;
    }
    return false;
  }

  /** Edge press this frame (no buffering window), still respecting consume(). */
  pressed(b: ButtonName): boolean {
    return this.consume(b, 0.001);
  }

  hasMoveInput(): boolean {
    return this.moveX !== 0 || this.moveZ !== 0;
  }
}
