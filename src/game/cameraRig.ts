/**
 * Third-person, over-the-shoulder camera. Owns look yaw/pitch, follows the
 * player with smoothing and wall collision, scales FOV with speed for a sense
 * of velocity, and rolls (camera tilt) during wall runs, slides and strafing.
 */
import * as THREE from 'three';
import { CFG } from './config';
import { Player } from './player';
import { Input } from './input';
import { CollisionWorld } from './collision';
import { clamp, damp, smoothstep } from './mathx';

export class CameraRig {
  yaw = 0;
  pitch = -0.05;
  private roll = 0;
  private fov: number = CFG.baseFov;
  private curPos = new THREE.Vector3(0, 5, 25);
  private dist = CFG.camDistance;

  constructor(
    public cam: THREE.PerspectiveCamera,
    private col: CollisionWorld,
  ) {}

  updateLook(input: Input) {
    this.yaw += input.lookYaw * CFG.mouseSensitivity;
    this.pitch += input.lookPitch * CFG.mouseSensitivity;
    this.pitch = clamp(this.pitch, CFG.camPitchMin, CFG.camPitchMax);
    input.lookYaw = 0;
    input.lookPitch = 0;
  }

  getAimDir(out = new THREE.Vector3()): THREE.Vector3 {
    const cp = Math.cos(this.pitch);
    return out.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp).normalize();
  }

  /** Where the crosshair points in the world (for bullet convergence). */
  aimPoint(player: Player, out = new THREE.Vector3()): THREE.Vector3 {
    const origin = player.eyePos;
    const dir = this.getAimDir();
    const worldHit = this.col.raycast(origin, dir, 220);
    const d = worldHit ? worldHit.dist : 220;
    return out.copy(origin).addScaledVector(dir, d);
  }

  update(player: Player, dt: number) {
    const forward = this.getAimDir();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();

    // pivot around the player's upper body
    const pivot = new THREE.Vector3(player.pos.x, player.pos.y + CFG.camHeight, player.pos.z);

    // desired camera position: behind the aim, over the shoulder
    const desired = pivot
      .clone()
      .addScaledVector(forward, -this.dist)
      .addScaledVector(right, CFG.camShoulder)
      .addScaledVector(up, 0.15);

    // pull the camera in if the view is blocked by geometry
    const toCam = new THREE.Vector3().subVectors(desired, pivot);
    const len = toCam.length();
    toCam.multiplyScalar(1 / len);
    const hit = this.col.raycast(pivot, toCam, len + 0.3);
    const allowed = hit ? Math.max(CFG.camMinDistance, hit.dist - 0.3) : len;
    desired.copy(pivot).addScaledVector(toCam, allowed);

    // smooth follow
    this.curPos.x = damp(this.curPos.x, desired.x, CFG.camFollowLambda, dt);
    this.curPos.y = damp(this.curPos.y, desired.y, CFG.camFollowLambda, dt);
    this.curPos.z = damp(this.curPos.z, desired.z, CFG.camFollowLambda, dt);
    this.cam.position.copy(this.curPos);

    // ---- camera tilt (roll) ----
    let targetRoll = 0;
    if (player.wallRunning) targetRoll = -player.wallSide * CFG.wallRunCameraTilt;
    else targetRoll = -player.strafeInput * CFG.strafeTilt + (player.sliding ? 0.05 : 0);
    if (player.dashing) targetRoll *= 1.6;
    this.roll = damp(this.roll, targetRoll, CFG.tiltLambda, dt);

    // build orientation looking at the pivot, then apply roll about forward
    const lookDir = new THREE.Vector3().subVectors(pivot, this.curPos).normalize();
    const r = new THREE.Vector3().crossVectors(lookDir, new THREE.Vector3(0, 1, 0)).normalize();
    const u = new THREE.Vector3().crossVectors(r, lookDir).normalize();
    // apply roll
    const cr = Math.cos(this.roll);
    const sr = Math.sin(this.roll);
    const rr = r.clone().multiplyScalar(cr).addScaledVector(u, sr);
    const uu = u.clone().multiplyScalar(cr).addScaledVector(r, -sr);
    const m = new THREE.Matrix4().makeBasis(rr, uu, lookDir.clone().multiplyScalar(-1));
    this.cam.quaternion.setFromRotationMatrix(m);

    // ---- FOV scaling with speed ----
    const sp = player.swimming ? player.speed : Math.hypot(player.vel.x, player.vel.y * 0.3, player.vel.z);
    let targetFov = CFG.baseFov + (CFG.maxFov - CFG.baseFov) * smoothstep(6, CFG.fovSpeedRef, sp);
    if (player.dashing) targetFov += 8;
    this.fov = damp(this.fov, targetFov, CFG.fovLambda, dt);
    if (Math.abs(this.cam.fov - this.fov) > 0.01) {
      this.cam.fov = this.fov;
      this.cam.updateProjectionMatrix();
    }
  }
}
