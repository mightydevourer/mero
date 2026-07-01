import * as THREE from '../vendor/three.module.js';
import { PAL, clamp } from './util.js';

// Juice: particle bursts, shockwave rings, the grapple line, a blob shadow,
// and screen-edge speed lines that ramp with velocity.

const MAX_P = 1600;
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const DOWN = new THREE.Vector3(0, -1, 0);

export class Effects {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    // ---- particle pool ----
    this.pCount = 0;
    this.pPos = new Float32Array(MAX_P * 3);
    this.pVel = new Float32Array(MAX_P * 3);
    this.pCol = new Float32Array(MAX_P * 3);
    this.pLife = new Float32Array(MAX_P);
    this.pLife0 = new Float32Array(MAX_P);
    this.pSize = new Float32Array(MAX_P);
    this.pGrav = new Float32Array(MAX_P);

    const geo = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(new Float32Array(MAX_P * 3), 3);
    this.aCol = new THREE.BufferAttribute(new Float32Array(MAX_P * 3), 3);
    this.aSA = new THREE.BufferAttribute(new Float32Array(MAX_P), 1); // size*alpha packed
    geo.setAttribute('position', this.aPos);
    geo.setAttribute('color', this.aCol);
    geo.setAttribute('sa', this.aSA);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float sa;
        varying vec3 vCol; varying float vA;
        void main(){
          vCol = color; vA = fract(sa);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = floor(sa) * (34.0 / max(1.0, -mv.z));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vCol; varying float vA;
        void main(){
          vec2 d = gl_PointCoord - 0.5;
          float m = smoothstep(0.5, 0.12, length(d));
          gl_FragColor = vec4(vCol, m * vA);
        }`,
      vertexColors: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);

    // ---- shockwave ring pool ----
    this.rings = [];
    for (let i = 0; i < 6; i++) {
      const r = new THREE.Mesh(
        new THREE.TorusGeometry(1, 0.12, 8, 32),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, toneMapped: false }),
      );
      r.rotation.x = -Math.PI / 2;
      r.visible = false;
      scene.add(r);
      this.rings.push({ mesh: r, t: 1, dur: 1, scale: 1 });
    }

    // ---- grapple line ----
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    this.line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: PAL.magenta, toneMapped: false }));
    this.line.frustumCulled = false;
    this.line.visible = false;
    scene.add(this.line);
    this.lineDot = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8),
      new THREE.MeshBasicMaterial({ color: PAL.magenta, toneMapped: false }));
    this.lineDot.visible = false;
    scene.add(this.lineDot);

    // ---- blob shadow ----
    this.blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.65, 20),
      new THREE.MeshBasicMaterial({ color: 0x1a1035, transparent: true, opacity: 0.3, depthWrite: false }),
    );
    this.blob.rotation.x = -Math.PI / 2;
    scene.add(this.blob);

    // ---- screen-edge speed lines (camera child) ----
    this.speedMat = new THREE.ShaderMaterial({
      transparent: true, depthTest: false, depthWrite: false,
      uniforms: { uT: { value: 0 }, uI: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `
        varying vec2 vUv; uniform float uT; uniform float uI;
        float hash(float n){ return fract(sin(n) * 43758.5453); }
        void main(){
          vec2 c = vUv - 0.5;
          float r = length(c) * 2.0;
          float a = atan(c.y, c.x);
          float seg = floor(a * 14.0);
          float speed = 6.0 + hash(seg) * 8.0;
          float streak = step(0.965, fract(a * 14.0 * 0.15915 + hash(seg * 3.7) + uT * speed * 0.2));
          float wob = hash(seg + floor(uT * 12.0)) ;
          float mask = smoothstep(0.62, 1.15, r);
          gl_FragColor = vec4(0.85, 0.98, 1.0, streak * mask * uI * (0.5 + 0.5 * wob));
        }`,
    });
    this.speedQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.speedMat);
    this.speedQuad.frustumCulled = false;
    this.speedQuad.renderOrder = 999;
    scene.add(this.speedQuad);

    this.trailTimer = 0;
  }

  // ---------- particles ----------
  burst(pos, { color = 0xffffff, count = 12, speed = 6, life = 0.6, size = 6, up = 2, spread = 1, gravity = 12 } = {}) {
    const col = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      if (this.pCount >= MAX_P) break;
      const k = this.pCount++;
      this.pPos[k * 3] = pos.x + (Math.random() - 0.5) * spread;
      this.pPos[k * 3 + 1] = pos.y + (Math.random() - 0.5) * spread;
      this.pPos[k * 3 + 2] = pos.z + (Math.random() - 0.5) * spread;
      const th = Math.random() * Math.PI * 2;
      const m = speed * (0.3 + Math.random() * 0.7);
      this.pVel[k * 3] = Math.cos(th) * m;
      this.pVel[k * 3 + 1] = up + Math.random() * speed * 0.5;
      this.pVel[k * 3 + 2] = Math.sin(th) * m;
      const shade = 0.7 + Math.random() * 0.3;
      this.pCol[k * 3] = col.r * shade;
      this.pCol[k * 3 + 1] = col.g * shade;
      this.pCol[k * 3 + 2] = col.b * shade;
      this.pLife[k] = this.pLife0[k] = life * (0.6 + Math.random() * 0.4);
      this.pSize[k] = size * (0.7 + Math.random() * 0.6);
      this.pGrav[k] = gravity;
    }
  }

  ring(pos, color = 0xffffff, scale = 5, dur = 0.45) {
    const r = this.rings.find((x) => !x.mesh.visible) || this.rings[0];
    r.mesh.visible = true;
    r.mesh.position.copy(pos);
    r.mesh.material.color.setHex(color);
    r.t = 0; r.dur = dur; r.scale = scale;
  }

  grappleLine(from, to, color = PAL.magenta) {
    this.line.visible = true;
    this.lineDot.visible = true;
    const a = this.line.geometry.attributes.position;
    a.setXYZ(0, from.x, from.y, from.z);
    a.setXYZ(1, to.x, to.y, to.z);
    a.needsUpdate = true;
    this.line.material.color.setHex(color);
    this.lineDot.position.copy(to);
    this.lineDot.material.color.setHex(color);
  }

  hideGrapple() { this.line.visible = false; this.lineDot.visible = false; }

  // ---------- per-frame ----------
  update(dt, t, player, world) {
    // particles
    let alive = 0;
    for (let i = 0; i < this.pCount; i++) {
      this.pLife[i] -= dt;
      if (this.pLife[i] <= 0) continue;
      // compact
      if (alive !== i) {
        for (let j = 0; j < 3; j++) {
          this.pPos[alive * 3 + j] = this.pPos[i * 3 + j];
          this.pVel[alive * 3 + j] = this.pVel[i * 3 + j];
          this.pCol[alive * 3 + j] = this.pCol[i * 3 + j];
        }
        this.pLife[alive] = this.pLife[i];
        this.pLife0[alive] = this.pLife0[i];
        this.pSize[alive] = this.pSize[i];
        this.pGrav[alive] = this.pGrav[i];
      }
      const k = alive;
      this.pVel[k * 3 + 1] -= this.pGrav[k] * dt;
      this.pPos[k * 3] += this.pVel[k * 3] * dt;
      this.pPos[k * 3 + 1] += this.pVel[k * 3 + 1] * dt;
      this.pPos[k * 3 + 2] += this.pVel[k * 3 + 2] * dt;
      this.aPos.setXYZ(k, this.pPos[k * 3], this.pPos[k * 3 + 1], this.pPos[k * 3 + 2]);
      this.aCol.setXYZ(k, this.pCol[k * 3], this.pCol[k * 3 + 1], this.pCol[k * 3 + 2]);
      const a = clamp(this.pLife[k] / this.pLife0[k], 0, 0.99);
      this.aSA.setX(k, Math.max(1, Math.floor(this.pSize[k])) + a);
      alive++;
    }
    this.pCount = alive;
    this.points.geometry.setDrawRange(0, alive);
    this.aPos.needsUpdate = true;
    this.aCol.needsUpdate = true;
    this.aSA.needsUpdate = true;

    // rings
    for (const r of this.rings) {
      if (!r.mesh.visible) continue;
      r.t += dt;
      const f = r.t / r.dur;
      if (f >= 1) { r.mesh.visible = false; continue; }
      const s = 0.3 + f * r.scale;
      r.mesh.scale.set(s, s, s);
      r.mesh.material.opacity = 0.75 * (1 - f);
    }

    // blob shadow under the runner
    _v.copy(player.pos); _v.y += 0.3;
    const hit = world.raycast(_v, DOWN, 40);
    if (hit) {
      this.blob.visible = true;
      this.blob.position.copy(hit.point);
      this.blob.position.y += 0.04;
      const h = clamp(hit.dist / 25, 0, 1);
      const s = 1.15 - h * 0.75;
      this.blob.scale.set(s, s, s);
      this.blob.material.opacity = 0.3 * (1 - h * 0.8);
    } else {
      this.blob.visible = false;
    }

    // motion trail sparkles at speed
    const frac = player.speedFrac();
    this.trailTimer -= dt;
    if (frac > 0.42 && this.trailTimer <= 0) {
      this.trailTimer = 0.035;
      _v2.set(player.pos.x, player.pos.y + 0.6, player.pos.z);
      this.burst(_v2, {
        color: frac > 0.95 ? PAL.gold : PAL.teal, count: 2, speed: 0.5,
        life: 0.35, size: 5 + frac * 5, up: 0.3, spread: 0.5, gravity: 0,
      });
    }
    // wall-run sparks
    if (player.wallrun) {
      _v2.copy(player.pos).addScaledVector(player.wallrun.n, -0.4);
      _v2.y += 0.3;
      this.burst(_v2, { color: PAL.gold, count: 1, speed: 3, life: 0.3, size: 4, up: 1, spread: 0.2, gravity: 20 });
    }

    // speed lines
    this.speedMat.uniforms.uT.value = t;
    const target = clamp((frac - 0.35) / 0.65, 0, 1) * 0.85;
    const u = this.speedMat.uniforms.uI;
    u.value += (target - u.value) * Math.min(1, 8 * dt);
  }
}
