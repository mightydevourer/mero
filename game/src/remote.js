import * as THREE from '../vendor/three.module.js';
import { Character, ACCENTS } from './character.js';
import { PAL, clamp } from './util.js';

// A friend in your world: interpolated snapshots drive a full Character,
// with a nameplate + health bar overhead and their grapple line rendered.

// snapshot flag bits (must match main.js packing)
export const F = {
  GROUNDED: 1, SLIDING: 2, GLIDE: 4, POUND: 8,
  WALL_L: 16, WALL_R: 32, ZIP: 64, RAIL: 128, DEAD: 256,
};

const INTERP_DELAY = 0.13; // render this far in the past, lerp between snaps
const _v = new THREE.Vector3();

export class RemotePlayer {
  constructor(scene, id, name, accentIdx) {
    this.scene = scene;
    this.id = id;
    this.name = name;
    this.hp = 100;
    this.frags = 0;
    this.alive = true;
    this.snaps = []; // {t, p, v, yaw, f, g}
    this.character = new Character(scene, ACCENTS[accentIdx % ACCENTS.length]);

    // pose shim: looks enough like a Player for Character.update
    this.shim = {
      pos: new THREE.Vector3(0, -999, 0),
      vel: new THREE.Vector3(),
      grounded: true, sliding: false, glide: false, pound: false,
      wallrun: null, zip: null, grapple: null,
      landPulse: 0, height: 1.7,
      hspeed() { return Math.hypot(this.vel.x, this.vel.z); },
      speedFrac() { return clamp(this.hspeed() / 22, 0, 1); },
    };
    this.pos = this.shim.pos; // external alias (combat aims at this)
    this.wasGrounded = true;
    this.yaw = 0;

    // nameplate + hp bar on one canvas sprite
    this.plateCanvas = document.createElement('canvas');
    this.plateCanvas.width = 256; this.plateCanvas.height = 64;
    this.plateTex = new THREE.CanvasTexture(this.plateCanvas);
    this.plate = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.plateTex, transparent: true, depthTest: false, toneMapped: false,
    }));
    this.plate.scale.set(2.6, 0.65, 1);
    this.plate.renderOrder = 50;
    scene.add(this.plate);
    this.redrawPlate();

    // their grapple line
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    this.line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: PAL.magenta, toneMapped: false }));
    this.line.frustumCulled = false;
    this.line.visible = false;
    scene.add(this.line);
  }

  redrawPlate() {
    const ctx = this.plateCanvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);
    ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(43,27,77,.9)';
    ctx.strokeText(this.name, 128, 28);
    ctx.fillStyle = '#fff6e8';
    ctx.fillText(this.name, 128, 28);
    // hp bar
    const w = 150, h = 9, x = (256 - w) / 2, y = 40;
    ctx.fillStyle = 'rgba(43,27,77,.85)';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    const frac = clamp(this.hp / 100, 0, 1);
    ctx.fillStyle = frac > 0.5 ? '#4be3a4' : frac > 0.25 ? '#ffd24a' : '#ff7e6b';
    ctx.fillRect(x, y, w * frac, h);
    this.plateTex.needsUpdate = true;
  }

  setHp(hp) {
    if (hp !== this.hp) { this.hp = hp; this.redrawPlate(); }
  }

  setDead(dead) {
    this.alive = !dead;
    this.character.root.visible = !dead;
    this.plate.visible = !dead;
    if (dead) this.line.visible = false;
  }

  pushSnapshot(s, now) {
    this.snaps.push({ ...s, t: now });
    if (this.snaps.length > 30) this.snaps.shift();
  }

  center() {
    return _v.set(this.pos.x, this.pos.y + 0.95, this.pos.z);
  }

  update(dt, now, camYaw) {
    const t = now - INTERP_DELAY;
    const sn = this.snaps;
    if (!sn.length) return;
    // find the pair straddling t
    let a = sn[0], b = sn[sn.length - 1];
    for (let i = sn.length - 1; i >= 0; i--) {
      if (sn[i].t <= t) { a = sn[i]; b = sn[Math.min(i + 1, sn.length - 1)]; break; }
    }
    const span = Math.max(b.t - a.t, 1e-4);
    const k = clamp((t - a.t) / span, 0, 1);
    const sh = this.shim;
    sh.pos.set(
      a.p[0] + (b.p[0] - a.p[0]) * k,
      a.p[1] + (b.p[1] - a.p[1]) * k,
      a.p[2] + (b.p[2] - a.p[2]) * k,
    );
    sh.vel.set(
      a.v[0] + (b.v[0] - a.v[0]) * k,
      a.v[1] + (b.v[1] - a.v[1]) * k,
      a.v[2] + (b.v[2] - a.v[2]) * k,
    );
    const f = a.f;
    sh.grounded = !!(f & F.GROUNDED);
    sh.sliding = !!(f & F.SLIDING);
    sh.glide = !!(f & F.GLIDE);
    sh.pound = !!(f & F.POUND);
    if (f & (F.WALL_L | F.WALL_R)) {
      const s = sh.hspeed() || 1;
      sh.wallrun = {
        side: (f & F.WALL_L) ? -1 : 1,
        t: _v.set(sh.vel.x / s, 0, sh.vel.z / s).clone(),
      };
    } else sh.wallrun = null;
    sh.zip = (f & F.RAIL) ? { type: 'rail' } : (f & F.ZIP) ? { type: 'zip' } : null;
    sh.grapple = a.g ? { point: new THREE.Vector3(a.g[0], a.g[1], a.g[2]) } : null;

    // landing squash from grounded transitions
    if (sh.grounded && !this.wasGrounded) sh.landPulse = 0.5;
    this.wasGrounded = sh.grounded;
    sh.landPulse = Math.max(0, sh.landPulse - dt * 4);

    const dead = !!(f & F.DEAD);
    if (dead !== !this.alive) this.setDead(dead);
    if (!this.alive) return;

    this.character.update(dt, sh, a.yw ?? 0, null, false);
    this.plate.position.set(sh.pos.x, sh.pos.y + 2.45, sh.pos.z);

    if (sh.grapple) {
      const attr = this.line.geometry.attributes.position;
      const hand = this.character.muzzle(_v);
      attr.setXYZ(0, hand.x, hand.y, hand.z);
      attr.setXYZ(1, sh.grapple.point.x, sh.grapple.point.y, sh.grapple.point.z);
      attr.needsUpdate = true;
      this.line.visible = true;
    } else {
      this.line.visible = false;
    }
  }

  dispose() {
    this.character.dispose();
    this.scene.remove(this.plate);
    this.plate.material.dispose();
    this.plateTex.dispose();
    this.scene.remove(this.line);
    this.line.geometry.dispose();
    this.line.material.dispose();
  }
}
