/**
 * The player character controller. This is the heart of the game: a kinematic
 * capsule with a deep movement kit inspired by Titanfall 2, Ghostrunner, Mirror's
 * Edge and Quake-style air movement.
 *
 * Mechanics: run/walk, crouch, slide (+slope accel), double jump, dash, air
 * strafing, bunnyhop, wall run, wall kick/jump, climb, mantle/vault, glide/slow
 * fall, fast fall/ground pound, grapple (swing + pull), recoil/rocket jump,
 * swimming, ziplines, jump pads, moving platforms, low-gravity zones, plus
 * coyote time and input buffering for forgiving, responsive feel.
 */
import * as THREE from 'three';
import { CFG } from './config';
import { Input } from './input';
import { CollisionWorld } from './collision';
import type { World } from './world';
import { clamp, damp, dampAngle } from './mathx';

export type WallSide = -1 | 0 | 1;

export interface PlayerEvents {
  jumped: boolean;
  doubleJumped: boolean;
  walljumped: boolean;
  dashed: boolean;
  landed: number; // landing impact speed, 0 if none
  groundPound: THREE.Vector3 | null;
  rocket: { center: THREE.Vector3; dir: THREE.Vector3 } | null;
  grappleFired: boolean;
  mantled: boolean;
}

const UP = new THREE.Vector3(0, 1, 0);

export class Player {
  pos = new THREE.Vector3(0, 4, 18);
  vel = new THREE.Vector3();
  spawn = new THREE.Vector3(0, 4, 18);

  yaw = 0; // camera yaw, used as movement basis
  pitch = 0;
  aim = new THREE.Vector3(0, 0, -1);
  moveYaw = 0; // smoothed facing of the lower body

  height: number = CFG.standHeight;
  radius: number = CFG.radius;

  // state flags (read by camera / model / hud)
  grounded = false;
  crouching = false;
  sliding = false;
  gliding = false;
  climbing = false;
  mantling = false;
  swimming = false;
  onZipline = false;
  wallSide: WallSide = 0;
  wallRunning = false;
  dashing = false;
  grappleMode: 'none' | 'swing' | 'pull' = 'none';

  speed = 0; // horizontal speed
  strafeInput = 0; // last strafe axis, for camera tilt
  grapplePoint = new THREE.Vector3();

  events: PlayerEvents = this.blankEvents();

  // timers / counters
  private sinceGround = 99;
  private airJumps = 0;
  private airDashes = 0;
  private dashCd = 0;
  private dashTimer = 0;
  private dashDir = new THREE.Vector3();
  private slideTimer = 0;
  private wallTimer = 0;
  private wallCoyote = 0;
  private lastWallNormal = new THREE.Vector3();
  private climbStamina: number = CFG.climbMaxTime;
  private rocketCd = 0;
  private grappleCd = 0;
  private ropeLength = 0;
  private mantleTimer = 0;
  private mantleStart = new THREE.Vector3();
  private mantleEnd = new THREE.Vector3();
  private ziplineRef: import('./world').Zipline | null = null;
  private ziplineT = 0;
  private ziplineDir = 1;
  private ziplineCd = 0;
  private padCd = 0;
  private wasGrounded = false;

  // scratch
  private fwd = new THREE.Vector3();
  private right = new THREE.Vector3();
  private wish = new THREE.Vector3();

  constructor(
    private input: Input,
    private col: CollisionWorld,
    private world: World,
  ) {}

  private blankEvents(): PlayerEvents {
    return {
      jumped: false,
      doubleJumped: false,
      walljumped: false,
      dashed: false,
      landed: 0,
      groundPound: null,
      rocket: null,
      grappleFired: false,
      mantled: false,
    };
  }

  get eyePos(): THREE.Vector3 {
    return new THREE.Vector3(this.pos.x, this.pos.y + this.height * CFG.eyeHeightFactor, this.pos.z);
  }

  // --- readouts for the HUD (0..1 readiness, 1 = ready) ---
  get dashReady(): number {
    return 1 - this.dashCd / CFG.dashCooldown;
  }
  get rocketReady(): number {
    return 1 - this.rocketCd / CFG.rocketCooldown;
  }
  get airDashesLeft(): number {
    return Math.max(0, CFG.maxAirDashes - this.airDashes);
  }
  get jumpsLeft(): number {
    return Math.max(0, CFG.maxAirJumps - this.airJumps);
  }

  stateLabel(): string {
    if (this.grappleMode === 'swing') return 'GRAPPLE · SWING';
    if (this.grappleMode === 'pull') return 'GRAPPLE · PULL';
    if (this.onZipline) return 'ZIPLINE';
    if (this.mantling) return 'MANTLE';
    if (this.swimming) return 'SWIM';
    if (this.wallRunning) return this.wallSide < 0 ? 'WALLRUN ◀' : 'WALLRUN ▶';
    if (this.climbing) return 'CLIMB';
    if (this.dashing) return 'DASH';
    if (this.sliding) return 'SLIDE';
    if (this.gliding) return 'GLIDE';
    if (this.grounded) return this.crouching ? 'CROUCH' : this.speed > 1 ? 'RUN' : 'IDLE';
    return 'AIRBORNE';
  }

  /** Fingertip muzzle position, roughly at the raised-hand height & forward. */
  muzzlePos(out: THREE.Vector3): THREE.Vector3 {
    const eye = this.eyePos;
    out.copy(eye).addScaledVector(this.aim, 0.55);
    out.y -= 0.12;
    return out;
  }

  respawn() {
    this.pos.copy(this.spawn);
    this.vel.set(0, 0, 0);
    this.wallRunning = false;
    this.sliding = false;
    this.gliding = false;
    this.climbing = false;
    this.mantling = false;
    this.grappleMode = 'none';
    this.onZipline = false;
    this.ziplineRef = null;
    this.height = CFG.standHeight;
    this.airJumps = 0;
    this.airDashes = 0;
  }

  update(dt: number, yaw: number, pitch: number, aim: THREE.Vector3) {
    this.events = this.blankEvents();
    this.yaw = yaw;
    this.pitch = pitch;
    this.aim.copy(aim);

    // movement basis (horizontal, camera-relative)
    this.fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    this.right.set(Math.cos(yaw), 0, -Math.sin(yaw));
    this.wish
      .copy(this.fwd)
      .multiplyScalar(this.input.moveZ)
      .addScaledVector(this.right, this.input.moveX);
    const hasWish = this.wish.lengthSq() > 1e-4;
    if (hasWish) this.wish.normalize();
    this.strafeInput = this.input.moveX;

    // tick timers
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.rocketCd = Math.max(0, this.rocketCd - dt);
    this.grappleCd = Math.max(0, this.grappleCd - dt);
    this.wallCoyote = Math.max(0, this.wallCoyote - dt);
    this.ziplineCd = Math.max(0, this.ziplineCd - dt);
    this.padCd = Math.max(0, this.padCd - dt);
    this.sinceGround += dt;

    if (this.input.consume('reset', 0.05) || this.pos.y < -45) {
      this.respawn();
      return;
    }

    // crouch toggle / height
    this.updateCrouch(dt);

    // ----- top-level state dispatch -----
    const waterY = this.world.waterTopAt(this.pos, this.height);
    this.swimming = waterY !== null && this.eyePos.y < waterY + 0.2;

    // weapon-independent ability inputs that can start a state
    this.handleGrappleInputs();
    this.handleRocket();

    if (this.grappleMode === 'swing') {
      this.updateSwing(dt);
    } else if (this.grappleMode === 'pull') {
      this.updatePull(dt);
    } else if (this.onZipline) {
      this.updateZipline(dt);
    } else if (this.mantling) {
      this.updateMantle(dt);
    } else if (this.swimming && waterY !== null) {
      this.updateSwim(dt, waterY, hasWish);
    } else if (this.wallRunning) {
      this.updateWallRun(dt, hasWish);
    } else if (this.climbing) {
      this.updateClimb(dt, hasWish);
    } else {
      this.updateLocomotion(dt, hasWish);
    }

    // integrate + collide for free-body states (zipline & mantle move directly)
    if (!this.onZipline && !this.mantling) {
      this.integrateAndCollide(dt);
    }

    // post-move world interactions
    if (!this.onZipline && !this.mantling) this.checkJumpPads();
    if (this.ziplineCd <= 0 && !this.onZipline && this.grappleMode === 'none') this.tryGrabZipline();

    this.speed = Math.hypot(this.vel.x, this.vel.z);

    // facing for the lower body: face movement when on ground & moving, else aim
    const targetFace =
      this.grounded && this.speed > 1.5 && !this.wallRunning
        ? Math.atan2(-this.vel.x, -this.vel.z)
        : yaw;
    this.moveYaw = dampAngle(this.moveYaw, targetFace, 12, dt);

    this.wasGrounded = this.grounded;
  }

  // ---------------------------------------------------------------- crouch
  private updateCrouch(dt: number) {
    const wantCrouch = this.input.isDown('crouch');
    const target = wantCrouch ? CFG.crouchHeight : CFG.standHeight;
    if (target > this.height) {
      // only stand if there is headroom
      if (this.col.hasHeadroom(this.pos, this.radius, target)) {
        this.height = damp(this.height, target, 16, dt);
      }
    } else {
      this.height = damp(this.height, target, 16, dt);
    }
    this.crouching = this.height < (CFG.standHeight + CFG.crouchHeight) / 2;
  }

  // ----------------------------------------------------------- locomotion
  private updateLocomotion(dt: number, hasWish: boolean) {
    const gscale = this.world.gravityScaleAt(this.pos);

    // refresh wall contact timer for wall-coyote
    if (this.lastWallNormal.lengthSq() > 0 && this.wallCoyote <= 0) this.lastWallNormal.set(0, 0, 0);

    // GROUND
    if (this.grounded) {
      this.airJumps = 0;
      this.airDashes = 0;
      this.climbStamina = Math.min(CFG.climbMaxTime, this.climbStamina + CFG.climbRegen * dt);
      this.gliding = false;

      // bunnyhop: a buffered jump on the landing frame keeps all momentum
      const bufferedJump = this.input.consume('jump', CFG.jumpBuffer);
      const onSlope = this.col.groundProbe(this.pos, this.radius, 0.6).normal.y < 0.98;

      // slide
      if (this.input.isDown('crouch') && (this.sliding || this.speed > CFG.runSpeed * 0.6)) {
        this.updateSlide(dt, hasWish);
      } else {
        this.sliding = false;
        if (!bufferedJump) this.applyFriction(dt, CFG.groundFriction);
        const wishSpeed = this.input.isDown('walk') ? CFG.walkSpeed : this.crouching ? CFG.crouchSpeed : CFG.runSpeed;
        this.accelerate(dt, wishSpeed, CFG.groundAccel);
      }

      if (bufferedJump) this.doJump(this.sliding ? CFG.slideJumpBoost : 1);

      // slope sliding accel when crouched on a ramp
      if (this.sliding && onSlope) {
        const n = this.col.groundProbe(this.pos, this.radius, 0.6).normal;
        this.vel.x += n.x * CFG.slopeSlideAccel * dt;
        this.vel.z += n.z * CFG.slopeSlideAccel * dt;
      }
    } else {
      // AIR
      this.handleAir(dt, hasWish, gscale);
    }

    // dash works on ground & in air
    this.handleDash(dt);

    // attempt wallrun / climb / mantle from the air
    if (!this.grounded) this.tryWallStates(dt, hasWish);
  }

  private handleAir(dt: number, hasWish: boolean, gscale: number) {
    // jump: double-jump or coyote
    if (this.input.consume('jump', CFG.jumpBuffer)) {
      if (this.sinceGround <= CFG.coyoteTime && this.airJumps === 0) {
        this.doJump(1);
      } else if (this.wallCoyote > 0 && this.lastWallNormal.lengthSq() > 0) {
        this.doWallJump();
      } else if (this.airJumps < CFG.maxAirJumps) {
        this.airJumps++;
        this.vel.y = CFG.doubleJumpSpeed;
        this.events.doubleJumped = true;
      }
    }

    // glide / slow fall (hold jump while falling) vs fast fall / ground pound (crouch)
    const fastFall = this.input.isDown('crouch');
    if (fastFall && this.vel.y < 6) {
      this.vel.y = -CFG.groundPoundSpeed;
      this.gliding = false;
    } else if (this.input.isDown('jump') && this.vel.y < 0.5 && !fastFall) {
      this.gliding = true;
    } else {
      this.gliding = false;
    }

    let g = CFG.gravity * gscale;
    if (this.gliding) {
      g *= CFG.glideGravityScale;
      if (this.vel.y < -CFG.glideMaxFall) this.vel.y = -CFG.glideMaxFall;
      // a little forward push while gliding
      if (hasWish) this.accelerate(dt, CFG.glideForwardBoost, CFG.airAccel * 0.5);
    }
    this.vel.y -= g * dt;
    if (this.vel.y < -CFG.maxFallSpeed) this.vel.y = -CFG.maxFallSpeed;

    this.airMove(dt, hasWish);
  }

  // -------------------------------------------------------------- slide
  private updateSlide(dt: number, _hasWish: boolean) {
    if (!this.sliding) {
      this.sliding = true;
      this.slideTimer = 0;
      // entry boost in current movement direction
      const boost = Math.max(this.speed, CFG.slideInSpeed);
      const h = Math.hypot(this.vel.x, this.vel.z) || 1;
      this.vel.x = (this.vel.x / h) * boost;
      this.vel.z = (this.vel.z / h) * boost;
    }
    this.slideTimer += dt;
    this.applyFriction(dt, CFG.slideFriction);
    // slight steer
    this.vel.x += this.right.x * this.input.moveX * CFG.slideSteer * dt;
    this.vel.z += this.right.z * this.input.moveX * CFG.slideSteer * dt;
    if (this.speed < CFG.slideMinSpeed || !this.input.isDown('crouch')) this.sliding = false;
  }

  // -------------------------------------------------------------- dash
  private handleDash(dt: number) {
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.vel.x = this.dashDir.x * CFG.dashSpeed;
      this.vel.z = this.dashDir.z * CFG.dashSpeed;
      this.vel.y = Math.max(this.vel.y, this.dashDir.y * CFG.dashSpeed);
      this.dashing = this.dashTimer > 0;
      return;
    }
    this.dashing = false;
    if (this.input.consume('dash', 0.05) && this.dashCd <= 0) {
      if (!this.grounded && this.airDashes >= CFG.maxAirDashes) return;
      if (!this.grounded) this.airDashes++;
      // dash toward movement input, else toward facing
      this.dashDir.copy(this.wish);
      if (this.dashDir.lengthSq() < 1e-4) this.dashDir.copy(this.fwd);
      this.dashDir.y = CFG.dashUpBias;
      this.dashDir.normalize();
      this.dashTimer = CFG.dashTime;
      this.dashCd = CFG.dashCooldown;
      this.dashing = true;
      this.events.dashed = true;
    }
  }

  // ----------------------------------------------------------- wall states
  private tryWallStates(dt: number, hasWish: boolean) {
    // mantle has priority (auto vault onto ledges)
    if (this.tryMantle()) return;

    // detect a wall to the side for wall running
    const chest = new THREE.Vector3(this.pos.x, this.pos.y + this.height * 0.55, this.pos.z);
    const probe = this.radius + 0.35;
    const rightHit = this.col.raycast(chest, this.right, probe);
    const leftHit = this.col.raycast(chest, this.right.clone().multiplyScalar(-1), probe);

    let side: WallSide = 0;
    let normal: THREE.Vector3 | null = null;
    if (rightHit && (!leftHit || rightHit.dist < leftHit.dist)) {
      side = 1;
      normal = rightHit.normal;
    } else if (leftHit) {
      side = -1;
      normal = leftHit.normal;
    }

    if (side !== 0 && normal && Math.abs(normal.y) < 0.4) {
      this.lastWallNormal.copy(normal);
      this.wallCoyote = CFG.wallCoyote;
      const movingEnough = this.speed >= CFG.wallRunMinSpeed;
      const goingUpOK = this.vel.y > -9;
      // start wallrun if moving along wall fast enough
      if (movingEnough && goingUpOK && this.vel.y < CFG.jumpSpeed * 0.8) {
        this.startWallRun(side, normal);
        return;
      }
      // otherwise allow climbing if pressing into the wall & looking up
      if (this.input.moveZ > 0 && this.pitch > 0.1 && this.climbStamina > 0) {
        const fwdHit = this.col.raycast(chest, this.fwd, this.radius + 0.4);
        if (fwdHit && Math.abs(fwdHit.normal.y) < 0.4) {
          this.climbing = true;
          this.lastWallNormal.copy(fwdHit.normal);
        }
      }
    }
  }

  private startWallRun(side: WallSide, normal: THREE.Vector3) {
    this.wallRunning = true;
    this.wallSide = side;
    this.wallTimer = 0;
    this.lastWallNormal.copy(normal);
    this.airJumps = 0; // refresh double jump on wall
    if (this.vel.y < 0) this.vel.y *= 0.4;
    this.vel.y += CFG.wallRunUpBoostOnEnter;
  }

  private updateWallRun(dt: number, hasWish: boolean) {
    this.wallTimer += dt;
    const chest = new THREE.Vector3(this.pos.x, this.pos.y + this.height * 0.55, this.pos.z);
    const dir = this.right.clone().multiplyScalar(this.wallSide);
    const hit = this.col.raycast(chest, dir, this.radius + 0.5);
    const stillOnWall = hit && Math.abs(hit.normal.y) < 0.45;

    if (this.tryMantle()) {
      this.wallRunning = false;
      return;
    }

    if (!stillOnWall || this.wallTimer > CFG.wallRunMaxTime || this.input.isDown('crouch')) {
      this.wallRunning = false;
      this.wallSide = 0;
      this.wallCoyote = CFG.wallCoyote;
      return;
    }
    this.lastWallNormal.copy(hit!.normal);
    this.wallCoyote = CFG.wallCoyote;

    // tangent along the wall, biased to camera forward
    const n = hit!.normal;
    const tangent = this.fwd.clone().addScaledVector(n, -this.fwd.dot(n));
    tangent.y = 0;
    if (tangent.lengthSq() < 1e-4) tangent.copy(this.right).multiplyScalar(this.wallSide === 1 ? -1 : 1);
    tangent.normalize();

    const along = this.vel.x * tangent.x + this.vel.z * tangent.z;
    const target = Math.max(along, CFG.wallRunSpeed);
    this.vel.x = tangent.x * target;
    this.vel.z = tangent.z * target;
    // stick to wall
    this.vel.x -= n.x * CFG.wallRunStick * dt;
    this.vel.z -= n.z * CFG.wallRunStick * dt;

    // reduced gravity (gentle slide down over time)
    this.vel.y -= CFG.wallRunGravity * dt;
    this.vel.y = Math.max(this.vel.y, -7);

    if (this.input.consume('jump', CFG.jumpBuffer)) {
      this.doWallJump();
      this.wallRunning = false;
      this.wallSide = 0;
    }
    this.handleDash(dt);
  }

  private doWallJump() {
    const n = this.lastWallNormal;
    this.vel.x += n.x * CFG.wallJumpAway;
    this.vel.z += n.z * CFG.wallJumpAway;
    this.vel.x += this.fwd.x * CFG.wallJumpForward;
    this.vel.z += this.fwd.z * CFG.wallJumpForward;
    this.vel.y = CFG.wallJumpUp;
    this.airJumps = 0;
    this.wallCoyote = 0;
    this.events.walljumped = true;
  }

  // -------------------------------------------------------------- climb
  private updateClimb(dt: number, hasWish: boolean) {
    this.climbStamina -= dt;
    const chest = new THREE.Vector3(this.pos.x, this.pos.y + this.height * 0.55, this.pos.z);
    const hit = this.col.raycast(chest, this.fwd, this.radius + 0.45);
    const onWall = hit && Math.abs(hit.normal.y) < 0.45;

    if (this.tryMantle()) {
      this.climbing = false;
      return;
    }
    if (!onWall || this.climbStamina <= 0 || this.input.moveZ <= 0 || this.grounded) {
      this.climbing = false;
      this.wallCoyote = CFG.wallCoyote;
      return;
    }
    this.lastWallNormal.copy(hit!.normal);
    this.wallCoyote = CFG.wallCoyote;
    this.vel.set(0, CFG.climbSpeed, 0);
    // small horizontal stick + lateral shimmy
    this.vel.x = -hit!.normal.x * 2 + this.right.x * this.input.moveX * 3;
    this.vel.z = -hit!.normal.z * 2 + this.right.z * this.input.moveX * 3;

    if (this.input.consume('jump', CFG.jumpBuffer)) {
      this.doWallJump();
      this.climbing = false;
    }
  }

  // -------------------------------------------------------------- mantle
  private tryMantle(): boolean {
    if (this.vel.y > CFG.jumpSpeed * 0.6) return false; // only near apex/falling
    const eye = new THREE.Vector3(this.pos.x, this.pos.y + this.height * 0.65, this.pos.z);
    const fwdHit = this.col.raycast(eye, this.fwd, this.radius + 0.45);
    if (!fwdHit || Math.abs(fwdHit.normal.y) > 0.4) return false;

    // probe down from above-and-forward to find the ledge top
    const ahead = new THREE.Vector3(
      this.pos.x + this.fwd.x * (this.radius + 0.5),
      this.pos.y + CFG.mantleReach + 0.4,
      this.pos.z + this.fwd.z * (this.radius + 0.5),
    );
    const down = this.col.raycast(ahead, new THREE.Vector3(0, -1, 0), CFG.mantleReach + 0.6);
    if (!down) return false;
    const ledgeY = down.point.y;
    const rise = ledgeY - this.pos.y;
    if (rise < 0.4 || rise > CFG.mantleReach) return false;

    const target = new THREE.Vector3(
      this.pos.x + this.fwd.x * CFG.mantleForward,
      ledgeY + 0.02,
      this.pos.z + this.fwd.z * CFG.mantleForward,
    );
    if (!this.col.hasHeadroom(target, this.radius, CFG.standHeight)) return false;

    this.mantling = true;
    this.mantleTimer = 0;
    this.mantleStart.copy(this.pos);
    this.mantleEnd.copy(target);
    this.vel.set(0, 0, 0);
    this.events.mantled = true;
    return true;
  }

  private updateMantle(dt: number) {
    this.mantleTimer += dt;
    const t = clamp(this.mantleTimer / CFG.mantleTime, 0, 1);
    // ease up first, then forward (a vault feel)
    const ey = t * t * (3 - 2 * t);
    this.pos.x = this.mantleStart.x + (this.mantleEnd.x - this.mantleStart.x) * ey;
    this.pos.z = this.mantleStart.z + (this.mantleEnd.z - this.mantleStart.z) * ey;
    this.pos.y = this.mantleStart.y + (this.mantleEnd.y - this.mantleStart.y) * Math.sqrt(t);
    if (t >= 1) {
      this.mantling = false;
      this.vel.set(this.fwd.x * 4, 0, this.fwd.z * 4);
      this.airJumps = 0;
    }
  }

  // -------------------------------------------------------------- grapple
  private handleGrappleInputs() {
    if (this.grappleCd > 0) return;
    if (this.grappleMode === 'none') {
      if (this.input.isDown('swing')) {
        if (this.fireGrapple()) this.grappleMode = 'swing';
      } else if (this.input.consume('pull', 0.05)) {
        if (this.fireGrapple()) this.grappleMode = 'pull';
      }
    } else {
      // release
      if (this.grappleMode === 'swing' && !this.input.isDown('swing')) this.endGrapple(true);
      if (this.grappleMode === 'pull' && this.input.consume('pull', 0.05)) this.endGrapple(false);
    }
  }

  private fireGrapple(): boolean {
    const origin = this.eyePos;
    const hit = this.col.raycast(origin, this.aim, CFG.grappleMaxLength);
    if (!hit) return false;
    this.grapplePoint.copy(hit.point);
    this.ropeLength = origin.distanceTo(hit.point);
    this.grappleCd = CFG.grappleCooldown;
    this.events.grappleFired = true;
    return true;
  }

  private endGrapple(boost: boolean) {
    if (boost) this.vel.y += 2.5; // little pop on release
    this.grappleMode = 'none';
    this.grappleCd = CFG.grappleCooldown;
  }

  private updateSwing(dt: number) {
    const gscale = this.world.gravityScaleAt(this.pos);
    this.vel.y -= CFG.gravity * gscale * dt;

    // rope length control with forward/back
    this.ropeLength = clamp(
      this.ropeLength - this.input.moveZ * CFG.swingRopeAdjust * dt,
      3,
      CFG.grappleMaxLength,
    );

    // pump: accelerate along current horizontal velocity when holding forward
    if (this.input.moveZ > 0) {
      const h = Math.hypot(this.vel.x, this.vel.z) || 1;
      this.vel.x += (this.vel.x / h) * CFG.swingPump * dt;
      this.vel.z += (this.vel.z / h) * CFG.swingPump * dt;
    }
    this.airMove(dt, this.wish.lengthSq() > 1e-4);

    // pendulum constraint: keep player within ropeLength of the anchor
    const anchor = this.grapplePoint;
    const eye = this.eyePos;
    const to = new THREE.Vector3().subVectors(eye, anchor); // anchor->player
    const dist = to.length();
    if (dist > this.ropeLength) {
      to.multiplyScalar(1 / dist);
      const correction = dist - this.ropeLength;
      this.pos.addScaledVector(to, -correction);
      // remove the outward (rope-stretching) velocity component
      const outward = this.vel.dot(to);
      if (outward > 0) this.vel.addScaledVector(to, -outward);
    }

    if (this.input.consume('jump', 0.05)) {
      this.endGrapple(true);
      this.vel.y = Math.max(this.vel.y, CFG.jumpSpeed * 0.7);
    }
    this.handleDash(dt);
  }

  private updatePull(dt: number) {
    const eye = this.eyePos;
    const to = new THREE.Vector3().subVectors(this.grapplePoint, eye);
    const dist = to.length();
    if (dist < 2.5) {
      this.endGrapple(false);
      this.vel.multiplyScalar(0.4);
      return;
    }
    to.multiplyScalar(1 / dist);
    this.vel.copy(to).multiplyScalar(CFG.pullSpeed);
    if (this.input.consume('jump', 0.05)) this.endGrapple(true);
  }

  // -------------------------------------------------------------- rocket
  private handleRocket() {
    if (this.rocketCd > 0) return;
    if (this.input.consume('rocket', 0.05)) {
      // detonate where we're aiming (short range) and shove ourselves away
      const origin = this.eyePos;
      const hit = this.col.raycast(origin, this.aim, CFG.rocketRadius * 1.4);
      const center = hit ? hit.point : origin.clone().addScaledVector(this.aim, CFG.rocketRadius);
      this.applyExplosion(center, CFG.rocketRadius, CFG.rocketImpulse * CFG.rocketSelfBoost);
      this.rocketCd = CFG.rocketCooldown;
      this.events.rocket = { center, dir: this.aim.clone() };
    }
  }

  applyExplosion(center: THREE.Vector3, radius: number, force: number) {
    const eye = this.eyePos;
    const d = new THREE.Vector3().subVectors(eye, center);
    const dist = d.length();
    if (dist > radius) return;
    d.multiplyScalar(1 / (dist || 1));
    const falloff = 1 - dist / radius;
    this.vel.addScaledVector(d, force * falloff);
    this.vel.y += force * falloff * 0.45; // bias upward for satisfying pops
    this.airJumps = 0;
    this.sinceGround = 99;
    this.grounded = false;
  }

  // -------------------------------------------------------------- swim
  private updateSwim(dt: number, waterY: number, hasWish: boolean) {
    this.airJumps = 0;
    this.airDashes = 0;
    this.gliding = false;
    this.wallRunning = false;
    // buoyancy toward the surface, plus drag
    const submersion = clamp((waterY - this.eyePos.y) / 1.0, 0, 1);
    this.vel.y += CFG.buoyancy * submersion * dt;
    this.vel.y -= CFG.waterGravity * dt;
    this.vel.multiplyScalar(Math.max(0, 1 - CFG.swimDrag * dt));

    // full 3D swim toward aim when holding forward, plus vertical via jump/crouch
    const move = new THREE.Vector3();
    if (hasWish) move.add(this.wish);
    if (this.input.moveZ > 0) move.addScaledVector(this.aim, 0.6);
    if (this.input.isDown('jump')) move.y += 1;
    if (this.input.isDown('crouch')) move.y -= 1;
    if (move.lengthSq() > 1e-4) {
      move.normalize();
      this.vel.addScaledVector(move, CFG.swimAccel * dt);
      const sp = this.vel.length();
      if (sp > CFG.swimSpeed) this.vel.multiplyScalar(CFG.swimSpeed / sp);
    }
    // jump out of water near the surface
    if (this.input.consume('jump', 0.05) && this.eyePos.y > waterY - 0.5) {
      this.vel.y = CFG.jumpSpeed * 0.9;
    }
    this.handleDash(dt);
  }

  // -------------------------------------------------------------- zipline
  private tryGrabZipline() {
    const grab = this.world.nearestZipline(this.pos, 1.4);
    if (!grab) return;
    this.onZipline = true;
    this.ziplineRef = grab.zip;
    this.ziplineT = grab.t;
    // ride toward the lower end, or keep current momentum direction
    const downhill = grab.zip.a.y > grab.zip.b.y ? 1 : -1;
    this.ziplineDir = downhill;
    this.vel.set(0, 0, 0);
  }

  private updateZipline(dt: number) {
    const zip = this.ziplineRef!;
    const len = zip.a.distanceTo(zip.b);
    const slope = Math.abs((zip.b.y - zip.a.y) / len);
    // steeper cables ride faster (gravity assist)
    const speed = CFG.ziplineSpeed + CFG.ziplineGravityAssist * slope;
    this.ziplineT += ((speed * this.ziplineDir) / len) * dt;
    const t = clamp(this.ziplineT, 0, 1);
    this.pos.lerpVectors(zip.a, zip.b, t);
    this.pos.y -= this.height * 0.5; // hang below the cable
    // implied velocity for hop-off
    const dir = new THREE.Vector3().subVectors(zip.b, zip.a).normalize().multiplyScalar(this.ziplineDir);
    this.vel.copy(dir).multiplyScalar(speed);

    if (this.input.consume('jump', 0.05)) {
      this.vel.y = CFG.jumpSpeed;
      this.dismountZipline();
    } else if (this.ziplineT <= 0 || this.ziplineT >= 1) {
      this.dismountZipline();
    }
  }

  private dismountZipline() {
    this.onZipline = false;
    this.ziplineRef = null;
    this.ziplineCd = 0.4;
  }

  // -------------------------------------------------------------- jump pads
  private checkJumpPads() {
    if (this.padCd > 0) return;
    const pad = this.world.checkJumpPad(this.pos, this.radius);
    if (pad) {
      this.vel.x = pad.launch.x;
      this.vel.z = pad.launch.z;
      this.vel.y = pad.launch.y;
      this.padCd = 0.3;
      this.grounded = false;
      this.sinceGround = 99;
      this.airJumps = 0;
      this.airDashes = 0;
    }
  }

  // -------------------------------------------------------- core helpers
  private accelerate(dt: number, wishSpeed: number, accel: number) {
    if (this.wish.lengthSq() < 1e-4) return;
    const current = this.vel.x * this.wish.x + this.vel.z * this.wish.z;
    const add = wishSpeed - current;
    if (add <= 0) return;
    const accelSpeed = Math.min(accel * dt * wishSpeed, add);
    this.vel.x += this.wish.x * accelSpeed;
    this.vel.z += this.wish.z * accelSpeed;
  }

  /** Quake-style air acceleration: clamped wishspeed lets strafing build speed. */
  private airMove(dt: number, hasWish: boolean) {
    if (!hasWish) return;
    const wishSpeed = Math.min(CFG.airCap, this.input.isDown('walk') ? CFG.walkSpeed : CFG.runSpeed);
    const current = this.vel.x * this.wish.x + this.vel.z * this.wish.z;
    const add = wishSpeed - current;
    if (add <= 0) return;
    const accelSpeed = Math.min(CFG.airAccel * dt, add) * CFG.airControl;
    this.vel.x += this.wish.x * accelSpeed;
    this.vel.z += this.wish.z * accelSpeed;
  }

  private applyFriction(dt: number, friction: number) {
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (sp < 0.01) {
      this.vel.x = 0;
      this.vel.z = 0;
      return;
    }
    const control = sp < CFG.stopSpeed ? CFG.stopSpeed : sp;
    const drop = control * friction * dt;
    const newSpeed = Math.max(0, sp - drop) / sp;
    this.vel.x *= newSpeed;
    this.vel.z *= newSpeed;
  }

  private doJump(boost: number) {
    this.vel.y = CFG.jumpSpeed * boost;
    this.grounded = false;
    this.sinceGround = 99;
    this.sliding = false;
    this.events.jumped = true;
  }

  private integrateAndCollide(dt: number) {
    // inherit platform motion when standing on one
    const probe = this.col.groundProbe(this.pos, this.radius, CFG.stepHeight + 0.05);
    if (probe.hit && probe.platform && this.grounded) {
      this.pos.addScaledVector(probe.platform.velocity, dt);
    }

    this.pos.addScaledVector(this.vel, dt);

    const res = this.col.resolve(this.pos, this.radius, this.height);

    // remove velocity into walls / ceilings (slide along surfaces)
    if (res.wall) {
      const into = this.vel.dot(res.wallNormal);
      if (into < 0) this.vel.addScaledVector(res.wallNormal, -into);
    }
    if (res.ceiling && this.vel.y > 0) this.vel.y = 0;

    // ground snapping + grounded state via a downward probe
    const wasAir = !this.grounded;
    const gp = this.col.groundProbe(this.pos, this.radius, this.grounded ? CFG.stepHeight + 0.1 : 0.08);
    if ((res.grounded || gp.hit) && this.vel.y <= 0.001) {
      this.grounded = true;
      if (gp.hit) this.pos.y = gp.y; // snap to surface
      if (this.vel.y < 0) {
        if (wasAir) {
          const impact = -this.vel.y;
          this.events.landed = impact;
          // ground pound shockwave on a hard fast-fall landing
          if (impact > CFG.groundPoundSpeed * 0.8) {
            this.events.groundPound = this.pos.clone();
            this.world.damageInRadius(this.pos, CFG.groundPoundShock, 40);
          }
        }
        this.vel.y = 0;
      }
      this.sinceGround = 0;
    } else {
      this.grounded = false;
    }
  }
}
