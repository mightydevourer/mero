/**
 * Procedural third-person character built entirely from primitives — no external
 * assets. The hero aims an extended index finger as a magic gun. Animation is
 * fully procedural: a run cycle, air/slide/wallrun poses, lean, crouch
 * compression, firing recoil and squash & stretch driven by velocity.
 */
import * as THREE from 'three';
import { CFG } from './config';
import { Player } from './player';
import { damp, dampAngle, clamp } from './mathx';

interface Segment {
  joint: THREE.Group;
  tip: THREE.Group;
}

function makeSegment(length: number, rTop: number, rBot: number, mat: THREE.Material): Segment {
  const joint = new THREE.Group();
  const geo = new THREE.CylinderGeometry(rTop, rBot, length, 10);
  geo.translate(0, -length / 2, 0); // pivot at the top of the segment
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  joint.add(mesh);
  const tip = new THREE.Group();
  tip.position.y = -length;
  joint.add(tip);
  return { joint, tip };
}

export class PlayerModel {
  root = new THREE.Group();
  muzzleWorld = new THREE.Vector3();
  recoil = 0;

  private body = new THREE.Group(); // lower body, faces movement
  private upper = new THREE.Group(); // torso/head/arms, faces aim
  private aimArm = new THREE.Group(); // the finger-gun arm
  private legL: Segment;
  private legR: Segment;
  private shinL: Segment;
  private shinR: Segment;
  private armL: Segment;
  private foreL: Segment;
  private muzzle = new THREE.Object3D();
  private fingerGlow: THREE.PointLight;

  private phase = 0;
  private stretch = 1;
  private leanZ = 0;
  private leanX = 0;
  private hipY = 0.92;

  constructor() {
    const suit = new THREE.MeshStandardMaterial({ color: 0x232a52, roughness: 0.55, metalness: 0.2 });
    const suit2 = new THREE.MeshStandardMaterial({ color: 0x3b49b0, roughness: 0.5, metalness: 0.25 });
    const glow = new THREE.MeshStandardMaterial({ color: 0xff3a8c, emissive: 0xff3a8c, emissiveIntensity: 1.2, roughness: 0.4 });
    const visor = new THREE.MeshStandardMaterial({ color: 0x33e0ff, emissive: 0x33e0ff, emissiveIntensity: 1.4, roughness: 0.2 });

    this.root.add(this.body);
    this.root.add(this.upper);

    // ---- lower body ----
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.32), suit2);
    pelvis.position.y = this.hipY;
    pelvis.castShadow = true;
    this.body.add(pelvis);

    this.legL = makeSegment(0.5, 0.13, 0.1, suit);
    this.legR = makeSegment(0.5, 0.13, 0.1, suit);
    this.legL.joint.position.set(-0.16, this.hipY - 0.1, 0);
    this.legR.joint.position.set(0.16, this.hipY - 0.1, 0);
    this.shinL = makeSegment(0.45, 0.09, 0.07, suit2);
    this.shinR = makeSegment(0.45, 0.09, 0.07, suit2);
    this.legL.tip.add(this.shinL.joint);
    this.legR.tip.add(this.shinR.joint);
    for (const s of [this.shinL, this.shinR]) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.32), glow);
      foot.position.set(0, -0.02, 0.06);
      s.tip.add(foot);
    }
    this.body.add(this.legL.joint, this.legR.joint);

    // ---- upper body ----
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.6, 12), suit);
    torso.position.y = this.hipY + 0.42;
    torso.castShadow = true;
    this.upper.add(torso);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3), suit2);
    chest.position.y = this.hipY + 0.55;
    this.upper.add(chest);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), suit);
    head.position.y = this.hipY + 0.92;
    head.castShadow = true;
    this.upper.add(head);
    const visorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.12), visor);
    visorMesh.position.set(0, this.hipY + 0.93, -0.12);
    this.upper.add(visorMesh);

    // left arm (swings with the run)
    this.armL = makeSegment(0.4, 0.09, 0.08, suit);
    this.armL.joint.position.set(-0.3, this.hipY + 0.62, 0);
    this.foreL = makeSegment(0.36, 0.08, 0.06, suit2);
    this.armL.tip.add(this.foreL.joint);
    this.upper.add(this.armL.joint);

    // ---- the finger-gun (right) arm: extended forward ----
    this.aimArm.position.set(0.28, this.hipY + 0.62, 0);
    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.4, 10), suit);
    upperArm.geometry.translate(0, 0, -0.2);
    upperArm.rotation.x = Math.PI / 2;
    this.aimArm.add(upperArm);
    const foreArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.42, 10), glow);
    foreArm.geometry.translate(0, 0, -0.62);
    foreArm.rotation.x = Math.PI / 2;
    this.aimArm.add(foreArm);
    // fist + extended index finger
    const fist = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), suit2);
    fist.position.z = -0.84;
    this.aimArm.add(fist);
    const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.22, 8), glow);
    finger.geometry.translate(0, 0, -0.11);
    finger.rotation.x = Math.PI / 2;
    finger.position.z = -0.9;
    this.aimArm.add(finger);
    // muzzle at the fingertip
    this.muzzle.position.set(0, 0, -1.04);
    this.aimArm.add(this.muzzle);
    const tipGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff66b2, emissiveIntensity: 2.5 }),
    );
    this.muzzle.add(tipGlow);
    this.fingerGlow = new THREE.PointLight(0xff3a8c, 3, 5);
    this.muzzle.add(this.fingerGlow);

    this.upper.add(this.aimArm);
  }

  triggerRecoil() {
    this.recoil = 1;
  }

  update(player: Player, dt: number) {
    this.root.position.copy(player.pos);

    // ---- squash & stretch from vertical velocity + landing ----
    let stretchTarget = clamp(1 + player.vel.y * 0.012, 0.82, 1.22);
    if (player.events.landed > 6) this.stretch = clamp(1 - player.events.landed * 0.018, 0.55, 0.95);
    if (player.events.groundPound) this.stretch = 0.5;
    this.stretch = damp(this.stretch, stretchTarget, CFG.squashLambda, dt);
    const heightRatio = player.height / CFG.standHeight;
    const sxz = 1 / Math.sqrt(this.stretch);
    this.root.scale.set(sxz, this.stretch * heightRatio, sxz);

    // ---- facing ----
    this.body.rotation.y = player.moveYaw;
    this.upper.rotation.y = dampAngle(this.upper.rotation.y, player.yaw, 18, dt);

    // ---- lean: into strafe and acceleration ----
    const targetLeanZ = -player.strafeInput * 0.18 + (player.wallRunning ? -player.wallSide * 0.5 : 0);
    const fwdSpeed = Math.hypot(player.vel.x, player.vel.z) / CFG.runSpeed;
    const targetLeanX = clamp(fwdSpeed * 0.12, 0, 0.2) + (player.sliding ? 0.5 : 0);
    this.leanZ = damp(this.leanZ, targetLeanZ, 8, dt);
    this.leanX = damp(this.leanX, targetLeanX, 8, dt);
    this.upper.rotation.z = this.leanZ;
    this.upper.rotation.x = this.leanX;
    this.body.rotation.z = this.leanZ * 0.5;

    // ---- aim pitch on the finger-gun arm ----
    this.aimArm.rotation.x = clamp(-player.pitch, -1.2, 1.2);
    // firing recoil kicks the arm back
    this.recoil = damp(this.recoil, 0, 14, dt);
    this.aimArm.position.z = this.recoil * 0.12;
    this.aimArm.rotation.x += this.recoil * 0.3;
    this.fingerGlow.intensity = 2 + this.recoil * 6;
    (this.muzzle.children[0] as THREE.Mesh).scale.setScalar(1 + this.recoil * 1.5);

    // ---- legs / run cycle ----
    const speed = Math.hypot(player.vel.x, player.vel.z);
    const moving = speed > 0.6 && player.grounded;
    this.phase += dt * (4 + speed * 1.1);
    const amp = clamp(speed / CFG.runSpeed, 0, 1.3);

    if (player.sliding) {
      // slide: trailing leg back, lead leg tucked forward
      this.setLeg(this.legL, this.shinL, -0.9, 1.4);
      this.setLeg(this.legR, this.shinR, 0.5, 0.3);
      this.armL.joint.rotation.x = -0.6;
    } else if (!player.grounded) {
      // airborne: tuck, with a little flutter
      const t = Math.sin(this.phase * 1.5) * 0.2;
      const tuck = player.gliding ? 0.2 : 0.7;
      this.setLeg(this.legL, this.shinL, tuck + t, tuck + 0.4);
      this.setLeg(this.legR, this.shinR, tuck - t, tuck + 0.4);
      this.armL.joint.rotation.x = damp(this.armL.joint.rotation.x, player.gliding ? -1.6 : -0.5, 10, dt);
      if (player.wallRunning) {
        // outside leg kicks toward the wall
        this.setLeg(this.legR, this.shinR, 0.4 + Math.sin(this.phase * 2) * 0.5, 0.5);
      }
    } else if (moving) {
      const sw = Math.sin(this.phase) * amp;
      const sw2 = Math.sin(this.phase + Math.PI) * amp;
      this.setLeg(this.legL, this.shinL, sw, Math.max(0, -sw) * 1.2 + 0.1);
      this.setLeg(this.legR, this.shinR, sw2, Math.max(0, -sw2) * 1.2 + 0.1);
      this.armL.joint.rotation.x = damp(this.armL.joint.rotation.x, sw2 * 0.8, 14, dt);
      this.foreL.joint.rotation.x = 0.3;
    } else {
      // idle
      this.setLeg(this.legL, this.shinL, damp(this.legL.joint.rotation.x, 0, 8, dt), 0.05);
      this.setLeg(this.legR, this.shinR, damp(this.legR.joint.rotation.x, 0, 8, dt), 0.05);
      this.armL.joint.rotation.x = damp(this.armL.joint.rotation.x, 0, 8, dt);
    }

    // bob the torso slightly with the run cycle
    const bob = moving ? Math.abs(Math.sin(this.phase)) * 0.05 * amp : 0;
    this.upper.position.y = damp(this.upper.position.y, bob, 12, dt);

    // expose the fingertip muzzle world position for the weapon
    this.muzzle.getWorldPosition(this.muzzleWorld);
  }

  private setLeg(thigh: Segment, shin: Segment, hipRot: number, kneeRot: number) {
    thigh.joint.rotation.x = hipRot;
    shin.joint.rotation.x = kneeRot;
  }
}
