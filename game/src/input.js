// Input: keyboard + mouse with edge-press capture so the game loop never
// misses a tap between frames (part of the forgiveness layer).

export class Input {
  constructor(dom) {
    this.dom = dom;
    this.keys = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.pointerLocked = false;

    // edge flags, cleared each snapshot
    this.edges = {
      jump: false, dash: false, crouch: false, pound: false,
      blast: false, grapple: false, grappleUp: false, shoot: false,
      respawn: false, help: false,
    };
    this.mouseHeld = new Set();

    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'Space') { this.edges.jump = true; e.preventDefault(); }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.edges.dash = true;
      if (e.code === 'KeyC' || e.code === 'ControlLeft') this.edges.crouch = true;
      if (e.code === 'KeyX') this.edges.pound = true;
      if (e.code === 'KeyQ') this.edges.blast = true;
      if (e.code === 'KeyR') this.edges.respawn = true;
      if (e.code === 'KeyH') this.edges.help = true;
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.mouseHeld.clear(); });

    dom.addEventListener('mousedown', (e) => {
      if (!this.pointerLocked) return;
      this.mouseHeld.add(e.button);
      if (e.button === 0) this.edges.shoot = true;
      if (e.button === 2) this.edges.grapple = true;
    });
    addEventListener('mouseup', (e) => {
      this.mouseHeld.delete(e.button);
      if (e.button === 2) this.edges.grappleUp = true;
    });
    addEventListener('contextmenu', (e) => e.preventDefault());

    addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === dom;
      if (!this.pointerLocked) { this.keys.clear(); this.mouseHeld.clear(); }
    });
  }

  requestLock() {
    try {
      const p = this.dom.requestPointerLock();
      if (p && p.catch) p.catch(() => { /* headless / denied */ });
    } catch (_) { /* headless / denied */ }
  }

  key(c) { return this.keys.has(c); }

  // Movement axes in local space: x = strafe right, z = forward
  moveAxes() {
    let x = 0, z = 0;
    if (this.key('KeyW') || this.key('ArrowUp')) z += 1;
    if (this.key('KeyS') || this.key('ArrowDown')) z -= 1;
    if (this.key('KeyA') || this.key('ArrowLeft')) x -= 1;
    if (this.key('KeyD') || this.key('ArrowRight')) x += 1;
    const m = Math.hypot(x, z);
    if (m > 1) { x /= m; z /= m; }
    return { x, z };
  }

  // Returns a snapshot of this frame's input and clears the edge flags.
  snapshot() {
    const s = {
      move: this.moveAxes(),
      jumpHeld: this.key('Space'),
      crouchHeld: this.key('KeyC') || this.key('ControlLeft'),
      shootHeld: this.mouseHeld.has(0),
      grappleHeld: this.mouseHeld.has(2),
      ...this.edges,
    };
    for (const k in this.edges) this.edges[k] = false;
    return s;
  }

  consumeMouseDelta() {
    const d = { x: this.mouseDX, y: this.mouseDY };
    this.mouseDX = 0; this.mouseDY = 0;
    return d;
  }
}
