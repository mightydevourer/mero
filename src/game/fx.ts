/**
 * Visual juice: pooled impact/explosion "pops" and rings in 3D, a persistent
 * grapple rope, and a 2D screen-space speed-lines overlay that intensifies with
 * player velocity for a strong sense of speed.
 */
import * as THREE from 'three';
import { clamp } from './mathx';

interface Pop {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  grow: number;
  spin: number;
}

export class FX {
  private pops: Pop[] = [];
  private rope: THREE.Line;
  private ropeActive = false;
  private muzzleSprite: THREE.Sprite;
  private muzzleLife = 0;

  // 2D speed lines overlay
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lineSeeds: { a: number; r: number; len: number; w: number }[] = [];
  private speedAmt = 0;

  constructor(private scene: THREE.Scene) {
    // pop pool (expanding additive rings/shards)
    const geo = new THREE.IcosahedronGeometry(0.3, 0);
    for (let i = 0; i < 48; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.pops.push({ mesh, life: 0, maxLife: 1, grow: 1, spin: 0 });
    }

    // grapple rope
    this.rope = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: 0xff66b2, transparent: true, opacity: 0.9 }),
    );
    this.rope.visible = false;
    this.rope.frustumCulled = false;
    this.scene.add(this.rope);

    // muzzle flash
    this.muzzleSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ color: 0xff8ccb, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.muzzleSprite.scale.setScalar(0.8);
    this.scene.add(this.muzzleSprite);

    // speed lines canvas overlay
    this.canvas = document.createElement('canvas');
    Object.assign(this.canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '5',
    } as CSSStyleDeclaration);
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    for (let i = 0; i < 64; i++) {
      this.lineSeeds.push({
        a: Math.random() * Math.PI * 2,
        r: 0.55 + Math.random() * 0.35,
        len: 0.1 + Math.random() * 0.25,
        w: 1 + Math.random() * 2.5,
      });
    }
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private getPop(): Pop | null {
    return this.pops.find((p) => p.life <= 0) ?? null;
  }

  impact(pos: THREE.Vector3, normal: THREE.Vector3, color: number) {
    const p = this.getPop();
    if (!p) return;
    p.mesh.position.copy(pos).addScaledVector(normal, 0.05);
    p.mesh.scale.setScalar(0.4);
    (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
    p.life = p.maxLife = 0.28;
    p.grow = 6;
    p.spin = 8;
    p.mesh.visible = true;
  }

  explosion(pos: THREE.Vector3, radius: number, color: number) {
    const p = this.getPop();
    if (!p) return;
    p.mesh.position.copy(pos);
    p.mesh.scale.setScalar(0.5);
    (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
    p.life = p.maxLife = 0.5;
    p.grow = radius * 5;
    p.spin = 3;
    p.mesh.visible = true;
  }

  ringShock(pos: THREE.Vector3, radius: number, color: number) {
    const p = this.getPop();
    if (!p) return;
    p.mesh.position.copy(pos);
    p.mesh.scale.set(0.5, 0.1, 0.5);
    (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
    p.life = p.maxLife = 0.45;
    p.grow = radius * 8;
    p.spin = 0;
    p.mesh.visible = true;
  }

  muzzleFlash(pos: THREE.Vector3, _dir: THREE.Vector3) {
    this.muzzleSprite.position.copy(pos);
    this.muzzleLife = 0.06;
    (this.muzzleSprite.material as THREE.SpriteMaterial).opacity = 1;
  }

  setRope(active: boolean, from?: THREE.Vector3, to?: THREE.Vector3) {
    this.ropeActive = active;
    this.rope.visible = active;
    if (active && from && to) {
      const pos = this.rope.geometry.attributes.position as THREE.BufferAttribute;
      pos.setXYZ(0, from.x, from.y, from.z);
      pos.setXYZ(1, to.x, to.y, to.z);
      pos.needsUpdate = true;
    }
  }

  update(dt: number, speed: number) {
    for (const p of this.pops) {
      if (p.life <= 0) continue;
      p.life -= dt;
      const t = clamp(p.life / p.maxLife, 0, 1);
      p.mesh.scale.addScalar(p.grow * dt);
      p.mesh.rotation.y += p.spin * dt;
      p.mesh.rotation.x += p.spin * 0.5 * dt;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = t;
      if (p.life <= 0) p.mesh.visible = false;
    }

    if (this.muzzleLife > 0) {
      this.muzzleLife -= dt;
      const mat = this.muzzleSprite.material as THREE.SpriteMaterial;
      mat.opacity = Math.max(0, this.muzzleLife / 0.06);
      this.muzzleSprite.scale.setScalar(0.6 + (1 - mat.opacity) * 0.6);
    }

    void this.ropeActive;
    this.drawSpeedLines(dt, speed);
  }

  private drawSpeedLines(dt: number, speed: number) {
    const target = clamp((speed - 9) / 22, 0, 1);
    this.speedAmt += (target - this.speedAmt) * clamp(dt * 6, 0, 1);
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (this.speedAmt < 0.02) return;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.hypot(cx, cy);
    ctx.save();
    ctx.lineCap = 'round';
    for (const s of this.lineSeeds) {
      const inner = s.r * maxR;
      const len = s.len * maxR * this.speedAmt;
      const x0 = cx + Math.cos(s.a) * inner;
      const y0 = cy + Math.sin(s.a) * inner;
      const x1 = cx + Math.cos(s.a) * (inner + len);
      const y1 = cy + Math.sin(s.a) * (inner + len);
      const grad = ctx.createLinearGradient(x0, y0, x1, y1);
      grad.addColorStop(0, `rgba(255,255,255,0)`);
      grad.addColorStop(1, `rgba(220,235,255,${0.5 * this.speedAmt})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = s.w * this.speedAmt;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.restore();
  }
}
