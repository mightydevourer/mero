import * as THREE from '../vendor/three.module.js';
import { clamp } from './util.js';

// ---------------------------------------------------------------------------
// The movement controller. One rule above all: NO MECHANIC EVER SLOWS YOU
// DOWN. Below the cap everything adds speed; at the cap everything preserves
// and redirects it. Wide timing windows, buffered inputs, coyote time,
// auto-catches — the forgiveness layer lives here too.
// ---------------------------------------------------------------------------

// speed model — tuned for control: a firm cap, modest gains
const CAP = 22;            // horizontal speed cap
const RUN = 10;            // speed plain running reaches almost instantly
const RUN_BUILD_MAX = 12.5; // sustained running keeps building to this
const GRAV = 26;
const JUMP_V = 10.6;

// forgiveness windows (generous on purpose)
const COYOTE = 0.18;
const JUMP_BUFFER = 0.16;
const POST_JUMP_GRACE = 0.35; // strong redirect window after every jump
const BHOP_GRACE = 0.35;      // no ground decay for this long after landing

const R = 0.42;            // capsule radius
const H_STAND = 1.7;
const H_CROUCH = 1.05;

const UP = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _d = new THREE.Vector3();
const _e = new THREE.Vector3();

export class Player {
  constructor(world, emit) {
    this.world = world;
    this.emit = emit || (() => {});
    this.pos = new THREE.Vector3();   // feet
    this.vel = new THREE.Vector3();
    this.t = 0;
    this.reset(world.spawn);
  }

  reset(p) {
    this.pos.copy(p);
    this.vel.set(0, 0, 0);
    this.height = H_STAND;
    this.grounded = false;
    this.groundN = new THREE.Vector3(0, 1, 0);
    this.groundCol = null;
    this.sinceGrounded = 9;
    this.sinceJump = 9;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.postJumpGrace = 0;
    this.bhopGrace = 0;
    this.runBuild = 0;
    this.crouchHeld = false;
    this.sliding = false;
    this.canDoubleJump = true;
    this.glide = false;
    this.pound = false;
    this.poundStoredH = 0;
    this.poundImpact = 0;
    this.poundFling = 0;
    this.climbTime = 0;
    this.mantleCooldown = 0;
    this.dashCharges = 1;      // one dash — no chaining
    this.dashCooldown = 0;
    this.grappleQueue = 0;
    this.wallrun = null;          // {n, t, side, timer, contact}
    this.wallCooldownCol = null;
    this.wallCooldown = 0;
    this.grapple = null;          // {mode:'held'|'swing'|'pull', point, len, heldTime}
    this.grappleCooldown = 0;
    this.zip = null;              // {zl, t, dir, speed}
    this.zipCooldown = 0;
    this.inWater = false;
    this.carrier = null;
    this.carrierVel = new THREE.Vector3();
    this.lastSafe = p.clone();
    this.safeTimer = 0;
    this.landPulse = 0;           // for squash & stretch
    this.contacts = [];
  }

  hspeed() { return Math.hypot(this.vel.x, this.vel.z); }
  speedFrac() { return clamp(this.hspeed() / CAP, 0, 1); }
  center() { return _c.set(this.pos.x, this.pos.y + this.height * 0.55, this.pos.z); }

  clampH() {
    const s = this.hspeed();
    if (s > CAP) { const k = CAP / s; this.vel.x *= k; this.vel.z *= k; }
  }

  // add speed along dir (or current direction); clamped to CAP — this is how
  // every mechanic "adds below cap, preserves at cap"
  boost(add, dir = null, floor = 0) {
    const s = this.hspeed();
    const ns = Math.max(Math.min(CAP, s + add), floor);
    let dx, dz;
    if (dir && (dir.x || dir.z)) {
      const m = Math.hypot(dir.x, dir.z); dx = dir.x / m; dz = dir.z / m;
    } else if (s > 0.01) {
      dx = this.vel.x / s; dz = this.vel.z / s;
    } else { return; }
    this.vel.x = dx * ns; this.vel.z = dz * ns;
  }

  // rotate horizontal velocity toward wish, preserving magnitude (redirect)
  steer(wish, rate, dt) {
    const s = this.hspeed();
    if (s < 0.1 || (!wish.x && !wish.z)) return;
    const cur = Math.atan2(this.vel.x, this.vel.z);
    const want = Math.atan2(wish.x, wish.z);
    let d = want - cur;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    const step = clamp(d, -rate * dt, rate * dt);
    const ang = cur + step;
    this.vel.x = Math.sin(ang) * s;
    this.vel.z = Math.cos(ang) * s;
  }

  applyBlast(blastPos, radius, power) {
    const c = this.center();
    _a.copy(c).sub(blastPos);
    const d = _a.length();
    if (d > radius) return false;
    const falloff = 1 - (d / radius) * 0.75;
    // superjump bias: a blast below you throws you UP; wall blasts push out+up
    _a.y += blastPos.y < c.y - 0.3 ? 0.85 : 0.5;
    _a.normalize();
    const tuck = this.crouchHeld ? 1.22 : 1;
    // the blast owns this moment: kick off whatever you were riding
    this.wallrun = null;
    if (this.zip) this.detachZip(true);
    this.vel.addScaledVector(_a, power * falloff * tuck);
    if (this.vel.y > 3) {
      this.grounded = false;
      this.canDoubleJump = true;
      this.pound = false;
    }
    this.clampH();
    this.emit('rocketjump', { power: power * falloff });
    return true;
  }

  // ------------------------------------------------------------------
  update(dt, inp, camYaw, aim) {
    this.t += dt;
    this.sinceGrounded += dt;
    this.sinceJump += dt;
    this.coyote = Math.max(0, this.coyote - dt);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.postJumpGrace = Math.max(0, this.postJumpGrace - dt);
    this.bhopGrace = Math.max(0, this.bhopGrace - dt);
    this.poundFling = Math.max(0, this.poundFling - dt);
    this.wallCooldown = Math.max(0, this.wallCooldown - dt);
    this.grappleCooldown = Math.max(0, this.grappleCooldown - dt);
    this.zipCooldown = Math.max(0, this.zipCooldown - dt);
    this.mantleCooldown = Math.max(0, this.mantleCooldown - dt);
    this.landPulse = Math.max(0, this.landPulse - dt * 4);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.grappleQueue = Math.max(0, this.grappleQueue - dt);
    this.crouchHeld = inp.crouchHeld;

    // wish direction in world space from camera yaw
    const wish = _b.set(
      inp.move.x * Math.cos(camYaw) + inp.move.z * Math.sin(camYaw),
      0,
      -inp.move.z * Math.cos(camYaw) + inp.move.x * Math.sin(camYaw),
    );
    const wishMag = Math.hypot(wish.x, wish.z);

    if (inp.jump) this.jumpBuffer = JUMP_BUFFER;

    const gravScale = this.world.gravityScaleAt(this.center());
    const lowGrav = gravScale < 1;

    // --------- grapple input ---------
    this.updateGrapple(dt, inp, aim);

    // --------- dash: a pure redirect — same speed, new direction ---------
    // one charge, no chaining; refills on landing / wall / rail / pad
    if (inp.dash && this.dashCharges > 0 && this.dashCooldown <= 0) {
      this.dashCharges = 0;
      this.dashCooldown = 0.9;
      if (this.zip) this.detachZip(false);
      if (this.grapple) this.endGrapple(false);
      this.pound = false;
      const dir = wishMag > 0.1 ? wish : _a.set(Math.sin(camYaw), 0, -Math.cos(camYaw));
      // keep exactly the speed you had (floored at run speed so a standing
      // dash still moves you — never more than running would)
      this.boost(0, dir, RUN);
      if (!this.grounded && this.vel.y < 0) this.vel.y = 0; // air dash floats
      this.postJumpGrace = Math.max(this.postJumpGrace, 0.22);
      this.emit('dash', { dir: dir.clone() });
    }

    // --------- zipline riding ---------
    if (this.zip) { this.updateZip(dt, inp); return this.finish(dt); }

    // --------- grapple pull (reel straight to the point) ---------
    if (this.grapple && this.grapple.mode === 'pull') {
      const c = this.center();
      _a.copy(this.grapple.point).sub(c);
      const d = _a.length();
      _a.normalize();
      const pullSpeed = this.grapple.pullSpeed;
      this.vel.copy(_a).multiplyScalar(pullSpeed);
      this.grapple.timer -= dt;
      if (this.jumpBuffer > 0) {
        // jump cancels the pull, keeping everything
        this.jumpBuffer = 0;
        this.vel.y = Math.max(this.vel.y, JUMP_V * 0.9);
        this.clampH();
        this.sinceJump = 0;
        this.postJumpGrace = POST_JUMP_GRACE;
        this.emit('jump', {});
        this.endGrapple(false);
      } else if (d < 3.2 || this.grapple.timer <= 0) {
        // arrive carrying it all, with a pop so you never bonk to a stop
        this.vel.y = Math.max(this.vel.y, 3.5);
        this.clampH();
        this.canDoubleJump = true;
        this.emit('grapple_pull_arrive', {});
        this.endGrapple(false);
      }
      this.integrate(dt);
      this.collide(dt);
      return this.finish(dt);
    }

    // --------- water ---------
    const water = this.world.waterAt(this.center());
    if (water) { this.updateSwim(dt, inp, wish, wishMag, water); return this.finish(dt); }
    if (this.inWater) { this.inWater = false; this.emit('splash', { out: true }); }

    // --------- pound (slam straight down) ---------
    if (inp.pound && !this.grounded && !this.pound) {
      this.pound = true;
      this.glide = false;
      if (this.grapple) this.endGrapple(false);
      this.poundStoredH = this.hspeed();
      this.vel.x *= 0.3; this.vel.z *= 0.3;
      this.vel.y = -55; // same hard slam whether you were rising or falling
      this.emit('pound_start', {});
    }

    // --------- wall-running ---------
    if (this.wallrun) this.updateWallrun(dt, inp, wish, wishMag);

    // --------- jumping (buffered, coyote, double) ---------
    if (this.jumpBuffer > 0) this.tryJump(wish, wishMag, camYaw);

    // --------- movement per state ---------
    if (!this.wallrun) {
      if (this.grounded) this.moveGround(dt, inp, wish, wishMag);
      else this.moveAir(dt, inp, wish, wishMag, lowGrav);
    }

    // --------- gravity ---------
    let g = GRAV * gravScale;
    if (this.wallrun) g *= 0.14;
    if (this.grapple && this.grapple.mode === 'swing') g *= 0.35; // floaty swings
    this.glide = false;
    if (!this.grounded && !this.wallrun && !this.pound && inp.jumpHeld &&
        this.vel.y < 0 && this.sinceJump > 0.3) {
      this.glide = true;
      if (!this.wasGliding) this.emit('glide_start', {});
    }
    this.wasGliding = this.glide;
    this.vel.y -= g * dt;
    if (this.glide) this.vel.y = Math.max(this.vel.y, lowGrav ? -1.6 : -3.5);
    this.vel.y = Math.max(this.vel.y, this.pound ? -85 : -60);

    // --------- swing constraint ---------
    if (this.grapple && this.grapple.mode === 'swing') this.updateSwing(dt);

    this.integrate(dt);
    this.collide(dt);
    this.finish(dt);
  }

  // ------------------------------------------------------------------
  tryJump(wish, wishMag, camYaw) {
    const tuck = this.crouchHeld ? 1.16 : 1;
    if (this.wallrun) {
      // wall-kick: launch off, speed preserved, modest push off the wall
      // (want more height/distance? blast the wall with Q)
      const w = this.wallrun;
      const s = Math.max(this.hspeed(), 9);
      this.vel.x = w.t.x * s + w.n.x * 4.5;
      this.vel.z = w.t.z * s + w.n.z * 4.5;
      this.vel.y = 7.0 * tuck;
      this.clampH();
      this.wallCooldownCol = w.col;
      this.wallCooldown = 0.55;
      this.wallrun = null;
      this.jumpBuffer = 0;
      this.sinceJump = 0;
      this.postJumpGrace = POST_JUMP_GRACE;
      this.canDoubleJump = true;
      this.emit('wallkick', {});
      return;
    }
    if (this.grounded || this.coyote > 0) {
      this.leaveGround();
      this.vel.y = JUMP_V * tuck;
      if (this.poundFling > 0) {
        // fling back out of a ground-pound carrying your stored speed
        const target = Math.max(this.poundStoredH, this.poundImpact * 0.45) + 2;
        this.boost(0, wishMag > 0.1 ? wish : null, Math.min(CAP, target));
        this.vel.y = JUMP_V * 1.15 * tuck;
        this.poundFling = 0;
        this.emit('slidehop', {});
      } else if (this.sliding) {
        this.boost(2, null, 0);
        this.emit('slidehop', {});
      } else if (this.bhopGrace > 0 && this.crouchHeld && this.hspeed() > RUN * 0.8) {
        // speed gain only for the crouch-bhop; a plain bhop just keeps it all
        this.boost(1.5, null, 0);
        this.emit('bhop', {});
      } else {
        if (this.bhopGrace > 0 && this.hspeed() > RUN * 0.8) this.emit('bhop', {});
        else this.emit('jump', {});
      }
      this.sliding = false;
      this.grounded = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.sinceJump = 0;
      this.postJumpGrace = POST_JUMP_GRACE;
      return;
    }
    if (this.canDoubleJump && !this.grapple && !this.pound) {
      this.canDoubleJump = false;
      this.vel.y = Math.max(this.vel.y, 9.6 * tuck);
      if (wishMag > 0.1) {
        // redirect the leap toward where you're steering — no speed change
        this.boost(0, wish, 0);
      }
      this.jumpBuffer = 0;
      this.sinceJump = 0;
      this.postJumpGrace = POST_JUMP_GRACE;
      this.emit('doublejump', {});
    }
    // otherwise the buffer stays alive and fires the instant we land (bhop!)
  }

  leaveGround() {
    if (this.carrier) {
      this.vel.add(this.carrierVel); // platform speed folds into yours
      this.clampH();
      this.carrier = null;
    }
  }

  // ------------------------------------------------------------------
  moveGround(dt, inp, wish, wishMag) {
    const s = this.hspeed();

    // start / stop sliding
    if (this.crouchHeld && s > 5.5 && !this.sliding) {
      this.sliding = true;
      this.emit('slide_start', {});
    }
    if (this.sliding && (!this.crouchHeld || s < 4)) this.sliding = false;

    if (this.sliding) {
      // slide: frictionless; downhill feeds you speed
      const n = this.groundN;
      const steep = Math.sqrt(Math.max(0, 1 - n.y * n.y));
      if (steep > 0.05) {
        _a.set(n.x, 0, n.z).normalize(); // downhill direction
        this.vel.x += _a.x * GRAV * steep * 1.5 * dt;
        this.vel.z += _a.z * GRAV * steep * 1.5 * dt;
        this.clampH();
      } else if (this.bhopGrace <= 0) {
        // flat ground: a whisper of decay, never below a healthy glide
        const ns = Math.max(8, s - 1.5 * dt);
        if (s > 0.01) { const k = ns / s; this.vel.x *= k; this.vel.z *= k; }
      }
      if (wishMag > 0.1) this.steer(wish, 2.6, dt);
      return;
    }

    if (wishMag > 0.1) {
      this.runBuild = Math.min(this.runBuild + dt, 6);
      const target = Math.min(RUN + this.runBuild * 1.2, RUN_BUILD_MAX);
      if (s < target) {
        // light and eager: reach run speed almost instantly
        this.vel.x += wish.x * 80 * dt;
        this.vel.z += wish.z * 80 * dt;
        const s2 = this.hspeed();
        if (s2 > target) { const k = target / s2; this.vel.x *= k; this.vel.z *= k; }
      } else {
        this.steer(wish, 6, dt);
        if (this.bhopGrace <= 0 && s > target) {
          // gentle settle toward run speed — hop to keep everything
          const ns = Math.max(target, s - 5 * dt);
          const k = ns / s; this.vel.x *= k; this.vel.z *= k;
        }
      }
    } else {
      this.runBuild = Math.max(0, this.runBuild - dt * 2);
      // you asked to stop; stopping is the one deceleration in the game
      const ns = Math.max(0, s - 30 * dt);
      if (s > 0.01) { const k = ns / s; this.vel.x *= k; this.vel.z *= k; }
    }

    // run straight at a wall to start climbing it
    if (wishMag > 0.3 && this.climbTime < 1.2) {
      const wallC = this.contacts.find((k) => Math.abs(k.n.y) < 0.35);
      if (wallC) {
        const into = -(wish.x * wallC.n.x + wish.z * wallC.n.z);
        if (into > 0.55) this.vel.y = Math.max(this.vel.y, 6);
      }
    }
  }

  moveAir(dt, inp, wish, wishMag, lowGrav) {
    if (this.pound) return; // slamming: committed, straight down
    const s = this.hspeed();
    const grace = this.postJumpGrace > 0;
    let rate = grace ? 8 : 3.2;           // redirect hard right after a jump
    if (this.glide) rate = Math.max(rate, 4.5);
    if (lowGrav) rate *= 1.5;
    if (wishMag > 0.1) {
      if (s < RUN) {
        // getting moving in mid-air is always possible
        this.vel.x += wish.x * 30 * dt;
        this.vel.z += wish.z * 30 * dt;
        const s2 = this.hspeed();
        if (s2 > RUN) { const k = RUN / s2; this.vel.x *= k; this.vel.z *= k; }
      } else {
        this.steer(wish, rate, dt);
        // a whisper of air-strafe gain, and only up to cruising pace —
        // real speed comes from crouch-bhops, slides, and the toys
        const ceiling = lowGrav ? 18 : RUN_BUILD_MAX + 2;
        if (s < ceiling) {
          const gain = Math.min((lowGrav ? 5 : 2) * dt * wishMag, ceiling - s);
          this.boost(gain, null, 0);
        }
      }
    }
    // climbing / mantling assists
    this.autoCatch(dt, inp, wish, wishMag);
  }

  // scramble up short walls + auto-grab near-miss ledges
  autoCatch(dt, inp, wish, wishMag) {
    if (this.mantleCooldown > 0) return;
    const wallC = this.contacts.find((k) => Math.abs(k.n.y) < 0.35);
    if (!wallC) { if (this.grounded) this.climbTime = 0; return; }
    const n = wallC.n;
    const into = -(wish.x * n.x + wish.z * n.z); // pushing toward the wall?
    if (into < 0.3) return;
    const c = this.center();
    _a.set(-n.x, -n.y, -n.z);
    const headFree = !this.world.raycast(_c.set(c.x, this.pos.y + this.height + 0.25, c.z), _a, R + 1.1);
    const chestHit = this.world.raycast(_c.set(c.x, this.pos.y + this.height * 0.45, c.z), _a, R + 1.1);
    if (headFree && chestHit) {
      // ledge in reach: mantle up and over instead of falling
      if (this.vel.y < 8) {
        this.vel.y = 8;
        this.vel.x += -n.x * 1.5;
        this.vel.z += -n.z * 1.5;
        this.mantleCooldown = 0.45;
        this.emit('mantle', {});
      }
    } else if (!headFree && this.climbTime < 1.2) {
      // scramble straight up vertical faces while pushing into them
      this.climbTime += dt;
      this.vel.y = Math.max(this.vel.y, 6);
    }
  }

  // ------------------------------------------------------------------
  updateWallrun(dt, inp, wish, wishMag) {
    const w = this.wallrun;
    w.timer += dt;
    w.contact -= dt;
    // steering away from the wall detaches gently
    const away = wish.x * w.n.x + wish.z * w.n.z;
    if (w.contact <= 0 || w.timer > 3.5 || this.grounded || away > 0.75) {
      this.wallCooldownCol = w.col;
      this.wallCooldown = 0.4;
      this.wallrun = null;
      return;
    }
    // stay glued: cast into the wall, refresh contact, hug the surface
    _d.set(this.pos.x, this.pos.y + this.height * 0.5, this.pos.z);
    _e.copy(w.n).multiplyScalar(-1);
    const hug = this.world.raycast(_d, _e, R + 0.6);
    if (hug && Math.abs(hug.normal.y) < 0.35) {
      w.contact = 0.2;
      w.n.copy(hug.normal);
      if (hug.dist > R + 0.12) this.pos.addScaledVector(w.n, -(hug.dist - R - 0.08));
    }
    // feed a little speed along the wall, up to the cap
    let s = this.vel.x * w.t.x + this.vel.z * w.t.z;
    s = Math.min(CAP, Math.max(s, 10) + 4 * dt);
    this.vel.x = w.t.x * s - w.n.x * 1.2; // slight stick into the wall
    this.vel.z = w.t.z * s - w.n.z * 1.2;
    // vertical: a slight rise that relaxes into a shallow glide
    if (w.timer < 0.35) this.vel.y = Math.max(this.vel.y, 1.6);
    this.vel.y = Math.max(this.vel.y, -3.5);
  }

  tryStartWallrun() {
    if (this.wallrun || this.grounded || this.pound || this.zip) return;
    if (this.grapple && this.grapple.mode === 'pull') return;
    const c = this.contacts.find((k) => Math.abs(k.n.y) < 0.35);
    if (!c) return;
    if (this.wallCooldown > 0 && c.col === this.wallCooldownCol) return;
    if (this.vel.y < -16) return;
    // tangent along the wall, matching where you're already going
    _a.crossVectors(c.n, UP).normalize();
    const along = this.vel.x * _a.x + this.vel.z * _a.z;
    if (Math.abs(along) < 3.5) return;
    if (along < 0) _a.multiplyScalar(-1);
    const side = Math.sign(c.n.x * -_a.z + c.n.z * _a.x) || 1;
    this.wallrun = { n: c.n.clone(), t: _a.clone(), side, timer: 0, contact: 0.15, col: c.col };
    this.canDoubleJump = true;
    this.dashCharges = 1;
    this.boost(0, null, 11); // never start a wall-run slower than a jog
    this.emit('wallrun_start', { side });
  }

  // ------------------------------------------------------------------
  updateGrapple(dt, inp, aim) {
    // pressing the button queues the attempt for a beat, so a click while
    // turning toward a surface still latches instead of dying silently
    if (inp.grapple) this.grappleQueue = 0.3;
    if (this.grappleQueue > 0 && !this.grapple && this.grappleCooldown <= 0 &&
        (inp.grapple || inp.grappleHeld)) {
      const hit = this.acquireGrapple(aim);
      if (hit) {
        this.grappleQueue = 0;
        this.grapple = {
          mode: 'held', point: hit, heldTime: 0,
          timer: 3, pullSpeed: Math.max(20, this.hspeed() + 2),
        };
        this.emit('grapple_fire', { point: hit.clone() });
      } else if (inp.grapple) {
        this.emit('fizzle', {});
      }
    }
    if (!this.grapple) return;
    const g = this.grapple;
    if (g.mode === 'held') {
      g.heldTime += dt;
      if (g.heldTime >= 0.25) {
        g.mode = 'swing';
        this.canDoubleJump = true;
        this.emit('grapple_latch', {});
      }
    }
    // safety: if the button state was lost (alt-tab etc.), treat as release
    const released = inp.grappleUp || (g.mode === 'swing' && !inp.grappleHeld);
    if (released) {
      if (g.mode === 'held') {
        // tap = pull: consistent, predictable, never a bonk
        g.mode = 'pull';
        this.pound = false;
        this.emit('grapple_latch', {});
      } else if (g.mode === 'swing') {
        // let go: keep exactly what the swing gave you
        this.clampH();
        this.canDoubleJump = true;
        this.postJumpGrace = 0.3;
        this.emit('grapple_release', {});
        this.endGrapple(true);
      }
    }
  }

  acquireGrapple(aim) {
    // generous aim assist: any ring within ~18 degrees wins first
    let best = null, bestScore = 0.951;
    for (const a of this.world.anchors) {
      _a.copy(a.pos).sub(aim.origin);
      const d = _a.length();
      if (d > 130 || d < 2) continue;
      _a.divideScalar(d);
      const dot = _a.dot(aim.dir);
      if (dot > bestScore) { bestScore = dot; best = a.pos; }
    }
    if (best) return best.clone();
    // latch to whatever surface you're looking at — everything is grappleable
    const hit = this.world.raycast(aim.origin, aim.dir, 130);
    if (hit && hit.dist > 3) return hit.point.clone();
    // near-miss forgiveness: fan a cone of rays around the crosshair
    _d.crossVectors(aim.dir, UP);
    if (_d.lengthSq() < 1e-4) _d.set(1, 0, 0); else _d.normalize();
    _e.crossVectors(aim.dir, _d).normalize();
    for (const spread of [0.05, 0.11]) {
      for (let i = 0; i < 8; i++) {
        const th = (i / 8) * Math.PI * 2;
        _a.copy(aim.dir)
          .addScaledVector(_d, Math.cos(th) * spread)
          .addScaledVector(_e, Math.sin(th) * spread)
          .normalize();
        const h = this.world.raycast(aim.origin, _a, 130);
        if (h && h.dist > 3) return h.point.clone();
      }
    }
    return null;
  }

  // held grapple: a firm pull toward the point that keeps your sideways
  // motion, so it naturally arcs into a swing (Echo Point Nova style)
  updateSwing(dt) {
    const g = this.grapple;
    const c = this.center();
    _a.copy(g.point).sub(c);
    const d = _a.length();
    _a.divideScalar(Math.max(d, 1e-4));
    const vr = this.vel.dot(_a); // speed toward the point
    if (d < 3 || (d < 7 && vr < 0)) {
      // arrived (or slung past): let go cleanly, keep everything
      this.vel.y = Math.max(this.vel.y, 3);
      this.clampH();
      this.canDoubleJump = true;
      this.postJumpGrace = 0.3;
      this.emit('grapple_pull_arrive', {});
      this.endGrapple();
      return;
    }
    this.vel.addScaledVector(_a, 36 * dt);            // reel toward the point
    const vr2 = this.vel.dot(_a);
    if (vr2 > 24) this.vel.addScaledVector(_a, 24 - vr2); // cap the reel speed
    this.clampH();
  }

  endGrapple() {
    this.grapple = null;
    this.grappleCooldown = 0.25;
  }

  // ------------------------------------------------------------------
  // one system rides both overhead ziplines and ground grind-rails
  tryAttachLines() {
    if (this.zip || this.zipCooldown > 0) return;
    if (this.grapple && this.grapple.mode !== 'held') return;

    const tryOne = (zl, refPoint, maxD, needAlong) => {
      _a.copy(zl.a).add(zl.b).multiplyScalar(0.5);
      const half = zl.a.distanceTo(zl.b) / 2 + 4;
      if (refPoint.distanceToSquared(_a) > half * half) return false;
      let bestI = -1, bestD = maxD;
      for (let i = 0; i < zl.points.length; i++) {
        const d = refPoint.distanceTo(zl.points[i]);
        if (d < bestD) { bestD = d; bestI = i; }
      }
      if (bestI < 0) return false;
      const t = bestI / (zl.points.length - 1);
      const tan = zl.curve.getTangentAt(clamp(t, 0, 1));
      const along = this.vel.x * tan.x + this.vel.z * tan.z;
      if (Math.abs(along) < needAlong) return false;
      const dir = along >= 0 ? 1 : -1;
      const floor = zl.type === 'rail' ? 12 : 14;
      this.zip = { zl, t, dir, type: zl.type || 'zip', speed: Math.max(floor, this.hspeed()) };
      this.canDoubleJump = true;
      this.dashCharges = 1;
      this.pound = false;
      this.emit('zip_attach', { type: zl.type || 'zip' });
      return true;
    };

    if (!this.grounded) {
      const chest = this.center();
      for (const zl of this.world.ziplines) {
        if (tryOne(zl, chest, 2.6, 0)) return;
      }
    }
    // rails grab from the feet, on the ground or falling onto them
    if (this.vel.y < 3) {
      _b.copy(this.pos);
      for (const rl of this.world.rails) {
        if (tryOne(rl, _b, 1.15, 4)) return;
      }
    }
  }

  updateZip(dt, inp) {
    this.glide = false;
    const z = this.zip;
    const rail = z.type === 'rail';
    z.speed = Math.min(20, z.speed + (rail ? 2 : 3) * dt);
    z.t += (z.dir * z.speed * dt) / z.zl.len;
    const end = z.t <= 0 || z.t >= 1;
    const tt = clamp(z.t, 0, 1);
    const p = z.zl.curve.getPointAt(tt);
    const tan = z.zl.curve.getTangentAt(tt).multiplyScalar(z.dir);
    // hang from a zipline; stand on a rail
    this.pos.set(p.x, p.y - (rail ? -0.02 : 2.0), p.z);
    this.vel.set(tan.x, Math.min(tan.y, 0.2), tan.z).normalize().multiplyScalar(z.speed);
    this.grounded = false;

    if (this.jumpBuffer > 0) {
      // launch off the line, speed intact
      this.jumpBuffer = 0;
      this.detachZip(true);
      this.vel.y = rail ? JUMP_V : 8.5;
      this.sinceJump = 0;
      this.postJumpGrace = POST_JUMP_GRACE;
      this.emit('zip_dismount', {});
    } else if (inp.crouch) {
      // drop off cleanly
      this.detachZip(true);
      this.boost(1, null, 0);
      this.vel.y = 1.5;
      this.emit('zip_dismount', {});
    } else if (end) {
      this.detachZip(true);
      this.vel.y += rail ? 2 : 3;
      this.emit('zip_dismount', {});
    }
  }

  detachZip() {
    this.zip = null;
    this.zipCooldown = 0.7;
    this.canDoubleJump = true;
  }

  // ------------------------------------------------------------------
  updateSwim(dt, inp, wish, wishMag, water) {
    if (!this.inWater) {
      this.inWater = true;
      if (this.vel.y < -18) this.vel.y *= 0.45; // soften the plunge
      this.emit('splash', { impact: -this.vel.y });
    }
    this.pound = false;
    this.glide = false;
    this.canDoubleJump = true;
    const c = this.center();
    // stay fluid: swim keeps pace, buoyancy lifts you to the surface
    const upDown = (inp.jumpHeld ? 7 : 0) - (inp.crouchHeld ? 7 : 0);
    _a.set(wish.x * 12, upDown + clamp((water.surfaceY - c.y) * 2.2, -3, 6), wish.z * 12);
    this.vel.x += (_a.x - this.vel.x) * Math.min(1, 3.5 * dt);
    this.vel.y += (_a.y - this.vel.y) * Math.min(1, 3.0 * dt);
    this.vel.z += (_a.z - this.vel.z) * Math.min(1, 3.5 * dt);
    // near the surface, a buffered jump = a dolphin leap out
    if (this.jumpBuffer > 0 && c.y > water.surfaceY - 1.3) {
      this.jumpBuffer = 0;
      this.vel.y = 13;
      this.boost(0, wishMag > 0.1 ? wish : null, 10);
      this.sinceJump = 0;
      this.postJumpGrace = POST_JUMP_GRACE;
      this.inWater = false;
      this.emit('splash', { out: true });
      this.emit('jump', {});
    }
    this.integrate(dt);
    this.collide(dt);
  }

  // ------------------------------------------------------------------
  integrate(dt) {
    this.pos.addScaledVector(this.vel, dt);
    // ride the platform you're standing on
    if (this.carrier) {
      this.pos.addScaledVector(this.carrierVel, dt);
    }
  }

  collide(dt) {
    const wasGrounded = this.grounded;
    const vyBefore = this.vel.y;
    this.grounded = false;
    let groundCol = null;
    const contacts = [];
    // capsule as three spheres, three relaxation passes; each sphere reads
    // the live position so corrections don't stack up and over-eject
    const sphereYs = [R, 0.5, 1];
    for (let pass = 0; pass < 3; pass++) {
      let any = false;
      for (const sy of sphereYs) {
        const cy = sy === R ? R : (sy === 0.5 ? this.height * 0.5 : this.height - R);
        const cen = _a.set(this.pos.x, this.pos.y + cy, this.pos.z);
        const hits = this.world.sphereContacts(cen, R, []);
        for (const h of hits) {
          this.pos.addScaledVector(h.n, h.depth);
          cen.addScaledVector(h.n, h.depth);
          const vn = this.vel.x * h.n.x + this.vel.y * h.n.y + this.vel.z * h.n.z;
          if (vn < 0) {
            this.vel.x -= h.n.x * vn;
            this.vel.y -= h.n.y * vn;
            this.vel.z -= h.n.z * vn;
          }
          if (pass === 0) contacts.push(h);
          if (h.n.y > 0.55) { this.grounded = true; groundCol = h.col; this.groundN.copy(h.n); }
          any = true;
        }
      }
      if (!any) break;
    }
    this.contacts = contacts;

    // stick to slopes when running downhill (no accidental launches)
    if (!this.grounded && wasGrounded && this.vel.y <= 0.5 && this.sinceJump > 0.15) {
      _a.set(this.pos.x, this.pos.y + 0.3, this.pos.z);
      const hit = this.world.raycast(_a, _b.set(0, -1, 0), 0.95);
      if (hit && hit.normal.y > 0.55) {
        this.pos.y = hit.point.y;
        this.grounded = true;
        groundCol = hit.col;
        this.groundN.copy(hit.normal);
        const vn = this.vel.dot(hit.normal);
        if (vn < 0) this.vel.addScaledVector(hit.normal, -vn);
      }
    }

    // landing
    if (this.grounded) {
      if (!wasGrounded) {
        const impact = Math.max(0, -vyBefore);
        this.bhopGrace = BHOP_GRACE;
        this.coyote = COYOTE;
        this.canDoubleJump = true;
        this.dashCharges = 1;
        this.climbTime = 0;
        this.landPulse = clamp(impact / 22, 0, 1);
        if (this.pound) {
          this.pound = false;
          this.poundImpact = impact;
          this.poundFling = 0.6;
          this.emit('pound_land', { impact });
        } else if (impact > 3) {
          this.emit('land', { impact });
        }
        this.wallrun = null;
      }
      this.sinceGrounded = 0;
      this.coyote = COYOTE;
      // platform carrying
      if (groundCol && groundCol.platform) {
        this.carrier = groundCol;
        this.carrierVel.copy(groundCol.vel);
      } else if (this.carrier) {
        this.leaveGround();
      }
      this.groundCol = groundCol;
    } else {
      if (wasGrounded && this.carrier) this.leaveGround();
      // wallrun contact refresh / start
      if (this.wallrun) {
        const wc = contacts.find((k) => Math.abs(k.n.y) < 0.35);
        if (wc) { this.wallrun.contact = 0.15; this.wallrun.n.copy(wc.n); }
      } else {
        this.tryStartWallrun();
      }
    }
    this.tryAttachLines(); // ziplines in the air, grind rails on the ground
  }

  finish(dt) {
    // capsule height eases toward crouch/stand
    const targetH = (this.crouchHeld || this.sliding || this.pound) ? H_CROUCH : H_STAND;
    this.height += (targetH - this.height) * Math.min(1, 14 * dt);

    // jump pads: step on one, get launched — zero skill required
    for (const pad of this.world.pads) {
      if (this.t - pad.lastFire < 0.35) continue;
      const dx = this.pos.x - pad.pos.x, dz = this.pos.z - pad.pos.z;
      const dy = this.pos.y - pad.pos.y;
      if (dx * dx + dz * dz < 2.4 * 2.4 && dy > -1.2 && dy < 1.4) {
        pad.lastFire = this.t;
        const d = pad.dir;
        const vAlong = this.vel.dot(d);
        this.vel.addScaledVector(d, pad.power - Math.max(0, vAlong));
        this.clampH();
        this.grounded = false;
        this.canDoubleJump = true;
        this.pound = false;
        this.dashCharges = 1;
        this.emit('pad', { pos: pad.pos.clone() });
      }
    }

    // remember safe ground for respawns
    this.safeTimer -= dt;
    if (this.grounded && this.groundN.y > 0.75 && this.safeTimer <= 0 &&
        this.groundCol && !this.groundCol.platform) {
      this.lastSafe.copy(this.pos);
      this.lastSafe.y += 0.1;
      this.safeTimer = 0.4;
    }

    // fell off the world
    if (this.pos.y < -60) {
      const keep = Math.min(this.hspeed(), 14);
      this.pos.copy(this.lastSafe);
      this.vel.set(0, 0, 0);
      if (this.grapple) this.endGrapple(false);
      this.zip = null;
      this.pound = false;
      // never respawn helpless: a little forward speed to build from
      this.boost(0, null, keep);
      this.emit('respawn', {});
    }
  }
}

export const PLAYER_CAP = CAP;
