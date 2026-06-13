/**
 * The level: all static geometry plus interactive elements (moving platforms,
 * jump pads, ziplines, water, low-gravity zones, grapple anchors and shootable
 * targets). Builds both the visible meshes and the collision primitives, and
 * answers the spatial queries the player controller needs.
 */
import * as THREE from 'three';
import { CollisionWorld, makeRamp, DynamicBox } from './collision';
import { CFG } from './config';

export interface Zipline {
  a: THREE.Vector3;
  b: THREE.Vector3;
}
export interface JumpPad {
  center: THREE.Vector3;
  radius: number;
  launch: THREE.Vector3;
}
export interface Target {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  base: THREE.Vector3;
  radius: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  respawn: number;
  bob: number;
  drift: number;
}
interface MovingPlatform {
  dyn: DynamicBox;
  mesh: THREE.Mesh;
  base: THREE.Vector3;
  axis: THREE.Vector3;
  amp: number;
  speed: number;
  phase: number;
  size: THREE.Vector3;
  prev: THREE.Vector3;
}
interface GravityZone {
  box: THREE.Box3;
  scale: number;
}
interface WaterVol {
  box: THREE.Box3;
  topY: number;
}

const ACCENT = 0xff3a8c;
const ACCENT2 = 0x33e0ff;

export class World {
  group = new THREE.Group();
  ziplines: { zip: Zipline; mesh: THREE.Line }[] = [];
  jumpPads: JumpPad[] = [];
  targets: Target[] = [];
  grappleAnchors: THREE.Vector3[] = [];
  score = 0;

  private platforms: MovingPlatform[] = [];
  private gravityZones: GravityZone[] = [];
  private waters: WaterVol[] = [];
  private waterMeshes: THREE.Mesh[] = [];
  private time = 0;

  private mat = {
    ground: new THREE.MeshStandardMaterial({ color: 0x2a2f4a, roughness: 0.95, metalness: 0.0 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x6b7088, roughness: 0.85 }),
    concrete2: new THREE.MeshStandardMaterial({ color: 0x868ca6, roughness: 0.8 }),
    accent: new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.35, roughness: 0.5 }),
    accent2: new THREE.MeshStandardMaterial({ color: ACCENT2, emissive: ACCENT2, emissiveIntensity: 0.4, roughness: 0.5 }),
    pad: new THREE.MeshStandardMaterial({ color: 0xffc04d, emissive: 0xffa31a, emissiveIntensity: 1.1, roughness: 0.4 }),
    target: new THREE.MeshStandardMaterial({ color: 0xfff1a8, emissive: 0xffd23a, emissiveIntensity: 1.3, roughness: 0.3 }),
  };

  constructor(private col: CollisionWorld) {
    this.mat.ground.map = makeGridTexture();
    this.build();
  }

  // ----------------------------------------------------------- builders
  private addSolid(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, mat: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    mesh.position.set(cx, cy, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    const box = new THREE.Box3(
      new THREE.Vector3(cx - sx / 2, cy - sy / 2, cz - sz / 2),
      new THREE.Vector3(cx + sx / 2, cy + sy / 2, cz + sz / 2),
    );
    this.col.addBox(box);
    return mesh;
  }

  /** A walkable platform defined by its top surface height. */
  private platform(cx: number, topY: number, cz: number, sx: number, sz: number, mat = this.mat.concrete, thick = 1) {
    return this.addSolid(cx, topY - thick / 2, cz, sx, thick, sz, mat);
  }

  private ramp(cx: number, cz: number, sx: number, sz: number, axis: 'x' | 'z', loY: number, hiY: number) {
    const min = new THREE.Vector3(cx - sx / 2, Math.min(loY, hiY) - 4, cz - sz / 2);
    const max = new THREE.Vector3(cx + sx / 2, Math.max(loY, hiY), cz + sz / 2);
    this.col.addRamp(makeRamp(min.clone(), max.clone(), axis, loY, hiY));
    // visual: a thin slab rotated to match the slope
    const len = axis === 'z' ? sz : sx;
    const dy = hiY - loY;
    const angle = Math.atan2(dy, len);
    const geo = new THREE.BoxGeometry(axis === 'z' ? sx : Math.hypot(len, dy), 0.4, axis === 'z' ? Math.hypot(len, dy) : sz);
    const mesh = new THREE.Mesh(geo, this.mat.concrete2);
    mesh.position.set(cx, (loY + hiY) / 2 - 0.2, cz);
    if (axis === 'z') mesh.rotation.x = -angle;
    else mesh.rotation.z = angle;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.group.add(mesh);
  }

  private addTarget(x: number, y: number, z: number, drift = 0) {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), this.mat.target.clone());
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    this.group.add(mesh);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.85, 0.05, 8, 24),
      new THREE.MeshStandardMaterial({ color: ACCENT2, emissive: ACCENT2, emissiveIntensity: 1 }),
    );
    mesh.add(ring);
    this.targets.push({
      mesh,
      pos: new THREE.Vector3(x, y, z),
      base: new THREE.Vector3(x, y, z),
      radius: 0.9,
      hp: 40,
      maxHp: 40,
      alive: true,
      respawn: 0,
      bob: Math.random() * Math.PI * 2,
      drift,
    });
  }

  private addJumpPad(x: number, topY: number, z: number, launch: THREE.Vector3, r = 1.6) {
    this.platform(x, topY, z, r * 2, r * 2, this.mat.pad, 0.4);
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(r * 0.8, 1.2, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xffd24d, emissive: 0xffae1a, emissiveIntensity: 1.3, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
    );
    cone.position.set(x, topY + 0.6, z);
    this.group.add(cone);
    this.jumpPads.push({ center: new THREE.Vector3(x, topY, z), radius: r, launch });
  }

  private addZipline(a: THREE.Vector3, b: THREE.Vector3) {
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: ACCENT2 }));
    this.group.add(line);
    // posts
    for (const p of [a, b]) this.addSolid(p.x, p.y / 2, p.z, 0.4, p.y, 0.4, this.mat.concrete);
    this.ziplines.push({ zip: { a: a.clone(), b: b.clone() }, mesh: line });
  }

  private addMovingPlatform(x: number, y: number, z: number, sx: number, sz: number, axis: THREE.Vector3, amp: number, speed: number, phase = 0) {
    const size = new THREE.Vector3(sx, 0.8, sz);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.8, sz), this.mat.accent2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    const box = new THREE.Box3();
    const dyn = this.col.addDynamic(box);
    this.platforms.push({
      dyn,
      mesh,
      base: new THREE.Vector3(x, y, z),
      axis: axis.clone().normalize(),
      amp,
      speed,
      phase,
      size,
      prev: new THREE.Vector3(x, y, z),
    });
  }

  private addGravityZone(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, scale: number) {
    const box = new THREE.Box3(
      new THREE.Vector3(cx - sx / 2, cy - sy / 2, cz - sz / 2),
      new THREE.Vector3(cx + sx / 2, cy + sy / 2, cz + sz / 2),
    );
    this.gravityZones.push({ box, scale });
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(sx, sy, sz),
      new THREE.MeshStandardMaterial({ color: 0x9a5cff, emissive: 0x6a2cff, emissiveIntensity: 0.5, transparent: true, opacity: 0.12, side: THREE.DoubleSide }),
    );
    mesh.position.set(cx, cy, cz);
    this.group.add(mesh);
  }

  private addWater(cx: number, topY: number, cz: number, sx: number, depth: number, sz: number) {
    const box = new THREE.Box3(
      new THREE.Vector3(cx - sx / 2, topY - depth, cz - sz / 2),
      new THREE.Vector3(cx + sx / 2, topY, cz + sz / 2),
    );
    this.waters.push({ box, topY });
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(sx, depth, sz),
      new THREE.MeshStandardMaterial({ color: 0x2aa7ff, emissive: 0x0a4a8c, emissiveIntensity: 0.3, transparent: true, opacity: 0.55, roughness: 0.2, metalness: 0.1 }),
    );
    mesh.position.set(cx, topY - depth / 2, cz);
    this.group.add(mesh);
    this.waterMeshes.push(mesh);
  }

  private addGrappleAnchor(x: number, y: number, z: number) {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.12, 10, 24),
      new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 1.1 }),
    );
    m.position.set(x, y, z);
    m.rotation.x = Math.PI / 2;
    this.group.add(m);
    // small solid so the grapple raycast attaches reliably
    this.addSolid(x, y, z, 0.6, 0.6, 0.6, this.mat.accent);
    this.grappleAnchors.push(new THREE.Vector3(x, y, z));
  }

  private label(text: string, x: number, y: number, z: number, color = '#ffffff') {
    const tex = makeLabelTexture(text, color);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const sp = new THREE.Sprite(mat);
    sp.position.set(x, y, z);
    sp.scale.set(7, 1.75, 1);
    this.group.add(sp);
  }

  // ----------------------------------------------------------- the level
  private build() {
    // Big ground / spawn plaza
    this.platform(0, 0, 14, 60, 44, this.mat.ground, 2);
    this.label('MERO — finger-gun parkour', 0, 7, 28, '#ffd23a');
    this.label('WASD move · Space jump (x2) · Shift dash · Ctrl slide/pound', 0, 5.5, 28, '#cfe');
    this.label('LMB shoot · RMB swing · F pull · Q recoil-jump', 0, 4.2, 28, '#fbc');

    // spawn targets
    this.addTarget(-6, 2.4, 6);
    this.addTarget(6, 2.4, 4);
    this.addTarget(0, 3.2, -2);

    // --- BUNNYHOP / SLIDE straight: a long flat strip + a slide ramp ---
    this.label('BUNNYHOP + SLIDE', -22, 4, 6, '#9ff');
    this.platform(-22, 0, -2, 12, 36, this.mat.concrete);
    this.ramp(-22, -22, 10, 10, 'z', 0, 4); // ramp up to launch
    this.platform(-22, 4, -30, 12, 8, this.mat.concrete);
    this.addTarget(-22, 6, -34);

    // --- WALLRUN corridor: parallel walls over a pit ---
    this.label('WALLRUN + WALLJUMP', 0, 9, -16, '#f9c');
    this.platform(0, 0, -16, 10, 6, this.mat.concrete); // entry lip
    this.addSolid(-5.5, 6, -34, 1, 12, 32, this.mat.accent); // left wall
    this.addSolid(5.5, 6, -42, 1, 12, 32, this.mat.accent2); // right wall (offset)
    // floor gap between z=-19 and z=-50 (no floor) -> must wallrun/jump
    this.platform(0, 0, -52, 12, 8, this.mat.concrete); // landing
    this.addTarget(0, 4, -52);

    // --- MANTLE / CLIMB tower: rising ledges + a tall climb wall ---
    this.label('MANTLE + CLIMB', 18, 9, -10, '#fc9');
    this.platform(18, 1.0, -6, 6, 4, this.mat.concrete);
    this.platform(18, 2.2, -10, 6, 4, this.mat.concrete);
    this.platform(18, 3.6, -14, 6, 4, this.mat.concrete);
    this.platform(18, 5.2, -18, 6, 4, this.mat.concrete);
    this.addSolid(18, 9, -22, 6, 8, 1, this.mat.accent); // tall climb wall
    this.platform(18, 13, -25, 6, 6, this.mat.concrete2); // top after climb+mantle
    this.addTarget(18, 15, -26);

    // --- GRAPPLE canyon: anchors to swing across a wide gap, pull target ---
    this.label('GRAPPLE: swing (RMB) + pull (F)', 0, 18, -60, '#fbf');
    this.platform(0, 0, -64, 14, 8, this.mat.concrete); // near edge
    this.addGrappleAnchor(-6, 16, -74);
    this.addGrappleAnchor(6, 18, -86);
    this.addGrappleAnchor(0, 20, -98);
    this.platform(0, 6, -112, 16, 12, this.mat.concrete2); // far landing
    this.addTarget(0, 22, -100);
    this.addTarget(0, 9, -112);

    // --- ZIPLINE down from a tower ---
    this.label('ZIPLINE', 30, 16, -40, '#9ff');
    this.platform(34, 14, -34, 8, 8, this.mat.concrete2);
    this.addZipline(new THREE.Vector3(34, 15.5, -34), new THREE.Vector3(14, 5, -52));
    this.platform(14, 4, -56, 8, 8, this.mat.concrete);

    // --- MOVING PLATFORMS over a pit ---
    this.label('MOVING PLATFORMS', -30, 9, -30, '#9fc');
    this.platform(-34, 4, -24, 8, 8, this.mat.concrete);
    this.addMovingPlatform(-34, 4, -34, 4, 4, new THREE.Vector3(0, 0, 1), 6, 1.0);
    this.addMovingPlatform(-34, 4, -48, 4, 4, new THREE.Vector3(0, 1, 0), 3.5, 0.8, 1.5);
    this.platform(-34, 4, -58, 8, 8, this.mat.concrete);
    this.addTarget(-34, 7, -58);

    // --- JUMP PAD up to a high perch + LOW-GRAV zone with floating targets ---
    this.label('JUMP PAD', -10, 4, -64, '#fe9');
    this.platform(-10, 0, -64, 8, 8, this.mat.concrete);
    this.addJumpPad(-10, 0.4, -64, new THREE.Vector3(0, 22, -8));
    this.label('LOW-GRAVITY ZONE', -14, 22, -78, '#c9f');
    this.addGravityZone(-14, 18, -78, 16, 16, 16, 0.28);
    this.platform(-14, 11, -78, 10, 10, this.mat.concrete2);
    this.addTarget(-16, 17, -78);
    this.addTarget(-12, 20, -80);
    this.addTarget(-14, 22, -76);

    // --- WATER pool to swim ---
    this.label('SWIM', 22, 2, 8, '#7df');
    this.platform(22, -3, 10, 12, 12, this.mat.concrete); // pool floor lower
    this.addSolid(28.5, -1.5, 10, 1, 3, 12, this.mat.concrete); // pool walls
    this.addSolid(15.5, -1.5, 10, 1, 3, 12, this.mat.concrete);
    this.addSolid(22, -1.5, 16.5, 12, 3, 1, this.mat.concrete);
    this.addSolid(22, -1.5, 3.5, 12, 3, 1, this.mat.concrete);
    this.addWater(22, 0, 10, 12, 3, 12);
    this.addTarget(22, 1, 10);

    // --- ROCKET-JUMP perch: an isolated pillar you reach with Q at your feet ---
    this.label('ROCKET / RECOIL JUMP (Q)', 10, 12, -10, '#f88');
    this.platform(10, 10, -2, 5, 5, this.mat.accent);
    this.addTarget(10, 13, -2);

    // boundary targets high up for grapple/air practice
    this.addTarget(0, 12, 18);
  }

  // ----------------------------------------------------------- update
  update(dt: number) {
    this.time += dt;

    for (const p of this.platforms) {
      p.prev.set(p.dyn.box.min.x + p.size.x / 2, p.dyn.box.min.y + p.size.y / 2, p.dyn.box.min.z + p.size.z / 2);
      const off = Math.sin(this.time * p.speed + p.phase) * p.amp;
      const cx = p.base.x + p.axis.x * off;
      const cy = p.base.y + p.axis.y * off;
      const cz = p.base.z + p.axis.z * off;
      p.dyn.box.min.set(cx - p.size.x / 2, cy - p.size.y / 2, cz - p.size.z / 2);
      p.dyn.box.max.set(cx + p.size.x / 2, cy + p.size.y / 2, cz + p.size.z / 2);
      p.mesh.position.set(cx, cy, cz);
      p.dyn.velocity.set((cx - p.prev.x) / dt, (cy - p.prev.y) / dt, (cz - p.prev.z) / dt);
    }

    for (const t of this.targets) {
      if (t.alive) {
        t.bob += dt;
        t.pos.x = t.base.x + Math.sin(t.bob * 0.8) * t.drift;
        t.pos.y = t.base.y + Math.sin(t.bob * 1.6) * 0.25;
        t.mesh.position.copy(t.pos);
        t.mesh.rotation.y += dt * 1.5;
        t.mesh.rotation.x += dt * 0.7;
      } else {
        t.respawn -= dt;
        if (t.respawn <= 0) {
          t.alive = true;
          t.hp = t.maxHp;
          t.mesh.visible = true;
          (t.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.3;
          t.mesh.scale.setScalar(1);
        }
      }
    }

    // animate water surface shimmer
    for (const m of this.waterMeshes) {
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.5 + Math.sin(this.time * 2) * 0.05;
    }
  }

  // ----------------------------------------------------------- queries
  gravityScaleAt(pos: THREE.Vector3): number {
    for (const z of this.gravityZones) if (z.box.containsPoint(pos)) return z.scale;
    return 1;
  }

  waterTopAt(pos: THREE.Vector3, height: number): number | null {
    const mid = new THREE.Vector3(pos.x, pos.y + height * 0.5, pos.z);
    for (const w of this.waters) {
      if (pos.x >= w.box.min.x && pos.x <= w.box.max.x && pos.z >= w.box.min.z && pos.z <= w.box.max.z) {
        if (mid.y < w.topY) return w.topY;
      }
    }
    return null;
  }

  nearestZipline(pos: THREE.Vector3, radius: number): { zip: Zipline; t: number } | null {
    let best: { zip: Zipline; t: number } | null = null;
    let bestD = radius;
    const head = new THREE.Vector3(pos.x, pos.y + CFG.standHeight, pos.z);
    for (const { zip } of this.ziplines) {
      const ab = new THREE.Vector3().subVectors(zip.b, zip.a);
      const t = Math.max(0, Math.min(1, head.clone().sub(zip.a).dot(ab) / ab.lengthSq()));
      const closest = zip.a.clone().addScaledVector(ab, t);
      const d = closest.distanceTo(head);
      if (d < bestD) {
        bestD = d;
        best = { zip, t };
      }
    }
    return best;
  }

  checkJumpPad(pos: THREE.Vector3, radius: number): JumpPad | null {
    for (const p of this.jumpPads) {
      const dx = pos.x - p.center.x;
      const dz = pos.z - p.center.z;
      if (dx * dx + dz * dz <= (p.radius + radius) * (p.radius + radius) && Math.abs(pos.y - p.center.y) < 1.2) {
        return p;
      }
    }
    return null;
  }

  damageInRadius(center: THREE.Vector3, radius: number, dmg: number) {
    for (const t of this.targets) {
      if (!t.alive) continue;
      if (t.pos.distanceTo(center) <= radius + t.radius) this.hitTarget(t, dmg);
    }
  }

  /** Ray vs targets; returns nearest alive target hit within maxDist. */
  raycastTargets(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number): Target | null {
    let best: Target | null = null;
    let bestT = maxDist;
    const oc = new THREE.Vector3();
    for (const t of this.targets) {
      if (!t.alive) continue;
      oc.subVectors(origin, t.pos);
      const b = oc.dot(dir);
      const c = oc.lengthSq() - t.radius * t.radius;
      const disc = b * b - c;
      if (disc < 0) continue;
      const tHit = -b - Math.sqrt(disc);
      if (tHit >= 0 && tHit < bestT) {
        bestT = tHit;
        best = t;
      }
    }
    return best;
  }

  hitTarget(t: Target, dmg: number): boolean {
    if (!t.alive) return false;
    t.hp -= dmg;
    const mat = t.mesh.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 2.5;
    t.mesh.scale.setScalar(1.25);
    if (t.hp <= 0) {
      t.alive = false;
      t.mesh.visible = false;
      t.respawn = 4;
      this.score += 100;
      return true; // destroyed
    }
    return false;
  }
}

// ----------------------------------------------------------- textures
function makeGridTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#262b45';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#3a4170';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 256; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(20, 16);
  return tex;
}

function makeLabelTexture(text: string, color: string): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.font = 'bold 88px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 12;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(text, c.width / 2, c.height / 2);
  ctx.fillStyle = color;
  ctx.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}
