import * as THREE from '../vendor/three.module.js';
import { clamp, damp } from './util.js';

// Third-person camera: orbits the runner, widens its FOV with speed, leans
// into turns and wall-runs, kicks on dashes and launches. Selling the speed
// is this file's whole job.

const BASE_FOV = 74;
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _pivot = new THREE.Vector3();
const _want = new THREE.Vector3();
const _dir = new THREE.Vector3();

export class CameraRig {
  constructor(aspect) {
    this.camera = new THREE.PerspectiveCamera(BASE_FOV, aspect, 0.1, 2000);
    this.yaw = 0;
    this.pitch = -0.12;
    this.dist = 5.4;
    this.smoothDist = 5.4;
    this.roll = 0;
    this.kick = 0;      // fov spring
    this.shake = 0;
    this.eyeH = 1.55;
    this.sens = 0.0023;
    this.idle = 9; // seconds since the mouse last moved
  }

  applyMouse(dx, dy) {
    if (dx || dy) this.idle = 0;
    this.yaw += dx * this.sens;   // mouse right = look right
    this.pitch -= dy * this.sens;
    this.pitch = clamp(this.pitch, -1.35, 1.25);
  }

  addKick(k) { this.kick = Math.min(this.kick + k, 18); }
  addShake(s) { this.shake = Math.min(this.shake + s, 1); }

  forward(out) {
    const cp = Math.cos(this.pitch);
    return out.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
  }

  aim() {
    const origin = this.camera.getWorldPosition(new THREE.Vector3());
    const dir = this.camera.getWorldDirection(new THREE.Vector3());
    return { origin, dir };
  }

  update(dt, player, world, moveX) {
    // semi-auto follow: ease behind where you're moving once the mouse has
    // been quiet for a beat — manual input always wins
    this.idle += dt;
    if (this.idle > 0.55) {
      const s = player.hspeed();
      if (s > 6) {
        const want = Math.atan2(player.vel.x, -player.vel.z);
        let d = want - this.yaw;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        // don't fight a deliberate over-the-shoulder look
        if (Math.abs(d) < 2.5) this.yaw += d * Math.min(1, dt * (1.0 + s * 0.09));
      }
    }

    // eye height follows crouch
    const targetEye = 0.55 + player.height * 0.62;
    this.eyeH = damp(this.eyeH, targetEye, 12, dt);

    _pivot.set(player.pos.x, player.pos.y + this.eyeH, player.pos.z);
    this.forward(_fwd);
    _right.set(Math.cos(this.yaw), 0, Math.sin(this.yaw));

    // boom: pull back a touch more at speed
    const frac = player.speedFrac();
    const wantDist = this.dist + frac * 1.4;
    _want.copy(_pivot).addScaledVector(_fwd, -wantDist).addScaledVector(_right, 0.75);

    // keep the camera out of walls
    _dir.copy(_want).sub(_pivot);
    const len = _dir.length();
    _dir.divideScalar(len);
    const hit = world.raycast(_pivot, _dir, len + 0.3);
    const targetLen = hit ? Math.max(0.6, hit.dist - 0.35) : len;
    this.smoothDist = targetLen < this.smoothDist
      ? targetLen // snap in instantly so we never clip
      : damp(this.smoothDist, targetLen, 6, dt);

    this.camera.position.copy(_pivot).addScaledVector(_dir, this.smoothDist);

    // shake
    if (this.shake > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.35;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.35;
      this.shake = damp(this.shake, 0, 8, dt);
    }

    // look ahead of the runner
    _want.copy(_pivot).addScaledVector(_fwd, 8);
    this.camera.lookAt(_want);

    // camera tilt: carve into wall-runs, lean into strafes and slides
    let rollTarget = -moveX * 0.045;
    if (player.wallrun) rollTarget = player.wallrun.side * 0.21;
    else if (player.sliding) rollTarget += 0.06;
    this.roll = damp(this.roll, rollTarget, 8, dt);
    this.camera.rotateZ(this.roll);

    // FOV: wider with speed + kicks on big moves
    this.kick = damp(this.kick, 0, 6, dt);
    const targetFov = BASE_FOV + 24 * Math.pow(frac, 1.15) + this.kick;
    this.camera.fov = damp(this.camera.fov, targetFov, 10, dt);
    this.camera.updateProjectionMatrix();
  }
}
