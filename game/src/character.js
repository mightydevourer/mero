import * as THREE from '../vendor/three.module.js';
import { PAL, toon, glow, clamp, damp } from './util.js';

// The runner: occult-noir suit + long coat silhouette (Deadlock) painted in
// candy brights (Gigantic). Fully procedural animation — poses are joint
// targets blended per-state, with squash & stretch layered on top.

const BASE_COL = {
  coat: PAL.plum,
  coatTrim: PAL.gold,
  vest: 0x35205e,
  shirt: 0xd6fff1,
  tie: PAL.coral,
  pants: 0x2b1b4d,
  shoe: 0x8a5a2e,
  skin: 0xffcfa8,
  glove: 0xfff6e8,
  hat: 0x4a2478,
};

// coat/hat/vest combos so every player in a room reads instantly
export const ACCENTS = [
  { coat: PAL.plum, hat: 0x4a2478, vest: 0x35205e },
  { coat: 0x1a8f7c, hat: 0x0f6b5c, vest: 0x0d4f44, tie: PAL.gold },
  { coat: 0xc0392b, hat: 0x8f2418, vest: 0x6e1a10, tie: PAL.teal },
  { coat: 0x2e5fb7, hat: 0x1f4287, vest: 0x173263, tie: PAL.gold },
  { coat: 0xd97a1a, hat: 0xa85c0f, vest: 0x7d440b, tie: PAL.teal },
  { coat: 0x2f7d32, hat: 0x1f5c22, vest: 0x164418, tie: PAL.coral },
  { coat: 0xa53fa5, hat: 0x7c2d7c, vest: 0x5c215c, tie: PAL.gold },
  { coat: 0x36454f, hat: 0x24303a, vest: 0x1a242c, tie: PAL.magenta },
];

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color));
  m.position.set(x, y, z);
  return m;
}

export class Character {
  constructor(scene, accent = {}) {
    this.col = { ...BASE_COL, ...accent };
    this.root = new THREE.Group();          // at player feet, yawed
    this.squash = new THREE.Group();        // squash & stretch layer
    this.root.add(this.squash);
    scene.add(this.root);
    this.yaw = 0;
    this.runPhase = 0;
    this.squashY = 1;
    this.coatSwing = 0;
    this.coatFlare = 0;
    this.aimBlend = 0;
    this.build();
    // current joint rotations get eased toward targets
    this.cur = {};
    this.tgt = {};
    for (const k in this.joints) { this.cur[k] = new THREE.Euler(); this.tgt[k] = new THREE.Euler(); }
  }

  build() {
    const COL = this.col;
    const S = this.squash;

    // --- legs ---
    this.hipL = new THREE.Group(); this.hipL.position.set(-0.11, 0.92, 0);
    this.hipR = new THREE.Group(); this.hipR.position.set(0.11, 0.92, 0);
    for (const [hip, side] of [[this.hipL, -1], [this.hipR, 1]]) {
      const upper = box(0.15, 0.46, 0.17, COL.pants, 0, -0.23, 0);
      hip.add(upper);
      const knee = new THREE.Group(); knee.position.set(0, -0.46, 0);
      const lower = box(0.13, 0.42, 0.15, COL.pants, 0, -0.21, 0);
      const shoe = box(0.15, 0.1, 0.3, COL.shoe, 0, -0.4, -0.07); // toes forward (-Z)
      knee.add(lower, shoe);
      hip.add(knee);
      if (side < 0) this.kneeL = knee; else this.kneeR = knee;
      S.add(hip);
    }

    // --- torso ---
    this.torso = new THREE.Group(); this.torso.position.set(0, 0.94, 0);
    // model front is -Z (matches movement convention)
    const vest = box(0.4, 0.52, 0.26, COL.vest, 0, 0.28, 0);
    const shirt = box(0.34, 0.14, 0.22, COL.shirt, 0, 0.51, -0.03);
    const tie = box(0.09, 0.3, 0.04, COL.tie, 0, 0.38, -0.135);
    const belt = box(0.42, 0.08, 0.28, COL.coatTrim, 0, 0.02, 0);
    const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), toon(COL.coatTrim));
    b1.position.set(0.1, 0.3, -0.14);
    const b2 = b1.clone(); b2.position.y = 0.18;
    this.torso.add(vest, shirt, tie, belt, b1, b2);
    S.add(this.torso);

    // --- head + hat ---
    this.head = new THREE.Group(); this.head.position.set(0, 0.6, 0);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.145, 14, 12), toon(COL.skin));
    skull.position.y = 0.1;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.035, 16), toon(COL.hat));
    brim.position.y = 0.2;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.17, 14), toon(COL.hat));
    crown.position.y = 0.29;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.05, 14), toon(COL.coatTrim));
    band.position.y = 0.235;
    this.head.add(skull, brim, crown, band);
    this.torso.add(this.head);

    // --- arms (right arm is the gun hand) ---
    this.shL = new THREE.Group(); this.shL.position.set(-0.26, 0.5, 0);
    this.shR = new THREE.Group(); this.shR.position.set(0.26, 0.5, 0);
    for (const [sh, side] of [[this.shL, -1], [this.shR, 1]]) {
      const pad = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), toon(COL.coat));
      const upper = box(0.11, 0.3, 0.12, COL.coat, 0, -0.16, 0);
      sh.add(pad, upper);
      const el = new THREE.Group(); el.position.set(0, -0.31, 0);
      const fore = box(0.09, 0.28, 0.1, COL.coat, 0, -0.14, 0);
      const hand = box(0.09, 0.1, 0.1, COL.glove, 0, -0.31, 0);
      el.add(fore, hand);
      sh.add(el);
      this.torso.add(sh);
      if (side < 0) this.elL = el; else this.elR = el;
    }
    // index finger + magic tip on the right hand
    const finger = box(0.03, 0.03, 0.14, COL.glove, 0, -0.32, -0.09);
    this.tip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), glow(PAL.magenta));
    this.tip.position.set(0, -0.32, -0.18);
    this.elR.add(finger, this.tip);

    // --- the long coat: back panel + two side skirts, hinged at the waist ---
    this.coatRoot = new THREE.Group(); this.coatRoot.position.set(0, 0.96, 0.1);
    const back = box(0.44, 0.8, 0.05, COL.coat, 0, -0.4, 0.02);
    const trimB = box(0.46, 0.07, 0.06, COL.coatTrim, 0, -0.78, 0.02);
    this.coatRoot.add(back, trimB);
    S.add(this.coatRoot);
    this.coatSideL = new THREE.Group(); this.coatSideL.position.set(-0.2, 0.96, 0.02);
    this.coatSideR = new THREE.Group(); this.coatSideR.position.set(0.2, 0.96, 0.02);
    for (const [cs, side] of [[this.coatSideL, -1], [this.coatSideR, 1]]) {
      const panel = box(0.06, 0.74, 0.3, COL.coat, side * 0.02, -0.37, -0.02);
      const trim = box(0.07, 0.07, 0.31, COL.coatTrim, side * 0.02, -0.71, -0.02);
      cs.add(panel, trim);
      S.add(cs);
    }
    // collar
    const collar = box(0.42, 0.12, 0.3, COL.coat, 0, 1.5, -0.02);
    S.add(collar);

    this.joints = {
      hipL: this.hipL, hipR: this.hipR, kneeL: this.kneeL, kneeR: this.kneeR,
      torso: this.torso, head: this.head,
      shL: this.shL, shR: this.shR, elL: this.elL, elR: this.elR,
      coatRoot: this.coatRoot, coatSideL: this.coatSideL, coatSideR: this.coatSideR,
    };
  }

  setT(name, x, y, z) { this.tgt[name].set(x, y, z); }

  dispose() {
    if (this.root.parent) this.root.parent.remove(this.root);
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material && o.material.dispose) o.material.dispose();
    });
  }

  // world position of the finger tip (bullet muzzle)
  muzzle(out) {
    return this.tip.getWorldPosition(out);
  }

  update(dt, player, camYaw, aimDir, aiming) {
    const p = player;
    const speed = p.hspeed();
    const frac = p.speedFrac();

    // --- facing: always where you're going (the gun-arm handles aim) ---
    let wantYaw;
    if (p.wallrun) wantYaw = Math.atan2(p.wallrun.t.x, -p.wallrun.t.z);
    else if (speed > 2) wantYaw = Math.atan2(p.vel.x, -p.vel.z);
    else wantYaw = camYaw;
    let d = wantYaw - this.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += d * Math.min(1, 12 * dt);
    this.root.position.copy(p.pos);
    this.root.rotation.y = this.yaw;

    // lean into turns: bank by how hard the body is still rotating
    this.lean = damp(this.lean ?? 0, clamp(-d * 1.1, -0.38, 0.38), 9, dt);
    this.squash.rotation.z = this.lean;

    // --- squash & stretch: subtle, snappy, recovers fast ---
    let sy = 1;
    sy += clamp(p.vel.y * 0.006, -0.05, 0.1);          // stretch on launch
    sy -= p.landPulse * 0.16;                            // squash on landing
    if (p.pound) sy = 0.8;
    this.squashY = damp(this.squashY, sy, 18, dt);
    const sxz = 1 + (1 - this.squashY) * 0.7;
    this.squash.scale.set(sxz, this.squashY, sxz);

    // --- run cycle phase ---
    this.runPhase += dt * (2.2 + speed * 0.95);
    const ph = this.runPhase;
    const runAmp = clamp(speed / 11, 0, 1) * (p.grounded ? 1 : 0.35);
    const swing = Math.sin(ph) * 1.05 * runAmp;

    // footstep bob keeps the body springy instead of gliding
    const bob = p.grounded && !p.sliding ? Math.abs(Math.sin(ph)) * 0.055 * runAmp : 0;
    this.squash.position.y = (p.sliding ? -0.35 : 0) + bob;

    // --- default target pose ---
    const lean = clamp(frac * 0.5, 0, 0.5) * (p.grounded && !p.sliding ? 1 : 0.4);
    // torso counter-rotates against the stride so the run reads loose
    this.setT('torso', -lean, Math.sin(ph) * 0.14 * runAmp, 0);
    this.setT('head', lean * 0.7, 0, 0);   // head counter-tilts to keep eyes level
    this.setT('hipL', swing, 0, 0);
    this.setT('hipR', -swing, 0, 0);
    this.setT('kneeL', Math.max(0, -Math.sin(ph)) * 1.1 * runAmp + 0.08, 0, 0);
    this.setT('kneeR', Math.max(0, Math.sin(ph)) * 1.1 * runAmp + 0.08, 0, 0);
    this.setT('shL', -swing * 0.8, 0, 0.1);
    this.setT('shR', swing * 0.8, 0, -0.1);
    this.setT('elL', -0.5 * runAmp - 0.1, 0, 0);
    this.setT('elR', -0.5 * runAmp - 0.1, 0, 0);

    // coat: trails behind speed, flares on glide/fall
    const acc = clamp(speed * 0.03, 0, 1);
    this.coatSwing = damp(this.coatSwing, acc * 0.9 + (p.grounded ? 0 : 0.25), 6, dt);
    let flareT = 0;
    if (p.glide) flareT = 1;
    else if (!p.grounded && p.vel.y < -4) flareT = 0.5;
    this.coatFlare = damp(this.coatFlare, flareT, 5, dt);
    const flap = Math.sin(ph * 1.7) * 0.06 * (0.3 + frac);
    this.setT('coatRoot', -this.coatSwing - flap, 0, 0);
    this.setT('coatSideL', -this.coatSwing * 0.7 - flap, 0, -this.coatFlare * 1.1 - 0.05);
    this.setT('coatSideR', -this.coatSwing * 0.7 + flap, 0, this.coatFlare * 1.1 + 0.05);

    // --- state pose overrides ---
    if (p.sliding) {
      this.setT('torso', 0.55, 0, 0); // lean back into the slide
      this.setT('head', -0.4, 0, 0);
      this.setT('hipL', -1.2, 0, 0.12);
      this.setT('hipR', -0.9, 0, -0.12);
      this.setT('kneeL', 0.25, 0, 0);
      this.setT('kneeR', 0.7, 0, 0);
      this.setT('shL', -0.4, 0, 0.9);
      this.setT('elL', -0.4, 0, 0);
    } else if (p.pound) {
      this.setT('torso', -0.6, 0, 0); // curl forward into a ball
      this.setT('hipL', -1.9, 0, 0.1);
      this.setT('hipR', -1.9, 0, -0.1);
      this.setT('kneeL', 2.0, 0, 0);
      this.setT('kneeR', 2.0, 0, 0);
      this.setT('shL', -1.4, 0, 0.4);
      this.setT('shR', -1.4, 0, -0.4);
    } else if (p.wallrun) {
      const s = p.wallrun.side;
      this.setT('torso', 0.25, 0, s * 0.28);
      this.setT('head', 0, -s * 0.4, -s * 0.2);
      this.setT('shL', s > 0 ? -swing * 0.8 : -1.1, 0, 0.15);
      this.setT('shR', s > 0 ? -1.1 : swing * 0.8, 0, -0.15);
    } else if (p.zip && p.zip.type === 'rail') {
      // grind stance: side-on surf, arms out
      this.setT('torso', -0.1, 0.5, 0.12);
      this.setT('head', 0, -0.45, 0);
      this.setT('hipL', -0.55, 0, 0.1);
      this.setT('hipR', 0.3, 0, -0.1);
      this.setT('kneeL', 0.55, 0, 0);
      this.setT('kneeR', 0.5, 0, 0);
      this.setT('shL', 0, 0, 1.0);
      this.setT('shR', 0, 0, -1.0);
    } else if (p.zip) {
      // hanging from the line by the gun hand
      this.setT('torso', 0.12, 0, 0);
      this.setT('shR', 0, 0, -2.85);
      this.setT('elR', 0, 0, 0);
      this.setT('shL', -0.3, 0, 0.35);
      this.setT('hipL', -0.25, 0, 0.06);
      this.setT('hipR', 0.15, 0, -0.06);
      this.setT('kneeL', 0.5, 0, 0);
      this.setT('kneeR', 0.35, 0, 0);
    } else if (p.glide) {
      this.setT('torso', 0.15, 0, 0);
      this.setT('shL', 0, 0, 1.25);
      this.setT('shR', 0, 0, -1.25);
      this.setT('elL', 0, 0, 0.15);
      this.setT('elR', 0, 0, -0.15);
      this.setT('hipL', 0.15, 0, 0.08);
      this.setT('hipR', 0.3, 0, -0.08);
      this.setT('kneeL', 0.5, 0, 0);
      this.setT('kneeR', 0.7, 0, 0);
    } else if (!p.grounded) {
      this.setT('hipL', 0.5, 0, 0.05);
      this.setT('hipR', -0.45, 0, -0.05);
      this.setT('kneeL', 0.9, 0, 0);
      this.setT('kneeR', 0.35, 0, 0);
      this.setT('shL', -0.7, 0, 0.5);
      this.setT('shR', -0.5, 0, -0.4);
    }

    // --- gun-hand aiming overrides the right arm ---
    const grap = p.grapple;
    const aimNow = aiming || !!grap;
    this.aimBlend = damp(this.aimBlend, aimNow ? 1 : 0, 14, dt);
    if (this.aimBlend > 0.03) {
      // aim dir in character-local space
      let dir;
      if (grap && grap.point) {
        dir = grap.point.clone().sub(this.root.position).normalize();
      } else {
        dir = aimDir;
      }
      const lx = dir.x * Math.cos(-this.yaw) - dir.z * Math.sin(-this.yaw);
      const lz = dir.x * Math.sin(-this.yaw) + dir.z * Math.cos(-this.yaw);
      const pitch = Math.asin(clamp(dir.y, -1, 1));
      const yawOff = Math.atan2(lx, -lz);
      const t = this.tgt.shR;
      // arm forward = rotX(-90°); add pitch and yaw offsets, blend in
      const bx = t.x, by = t.y, bz = t.z;
      // arm local dir after rotX(θ) is (0,-cosθ,-sinθ): θ = π/2 + pitch aims it
      const ax = Math.PI / 2 + pitch * 0.9, ay = clamp(yawOff, -1.2, 1.2) * 0.9, az = 0;
      const b = this.aimBlend;
      t.set(bx + (ax - bx) * b, by + (ay - by) * b, bz + (az - bz) * b);
      this.tgt.elR.set(this.tgt.elR.x * (1 - b), 0, 0);
      this.setT('head', this.tgt.head.x, this.tgt.head.y * (1 - b), this.tgt.head.z);
    }
    this.tip.material.color.setHex(aimNow ? PAL.gold : PAL.magenta);

    // --- ease joints toward targets: quick limbs, settled core, lazy coat ---
    for (const name in this.joints) {
      const rate = name.startsWith('coat') ? 8
        : (name === 'torso' || name === 'head') ? 13 : 20;
      const k = Math.min(1, rate * dt);
      const c = this.cur[name], t = this.tgt[name];
      c.x += (t.x - c.x) * k; c.y += (t.y - c.y) * k; c.z += (t.z - c.z) * k;
      this.joints[name].rotation.set(c.x, c.y, c.z);
    }
  }
}
