import * as THREE from '../vendor/three.module.js';
import { PAL, toon, glow } from './util.js';

// ---------------------------------------------------------------------------
// World: solid OBB colliders + queries (sphere contacts, raycast), plus all
// interactive furniture: jump pads, ziplines, grapple rings, targets, moving
// platforms, low-gravity bubbles, water volumes. Everything is boxes under
// the hood so physics stays simple and rock-solid.
// ---------------------------------------------------------------------------

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();

export class World {
  constructor(scene, mode = 'cove') {
    this.scene = scene;
    this.mode = mode;
    this.colliders = [];   // {c, h, q, qi, br, mesh, vel, platform, name}
    this.pads = [];        // {pos, dir, power, mesh, lastFire}
    this.ziplines = [];    // {curve, len, points, type:'zip'}
    this.rails = [];       // {curve, len, points, type:'rail'} — grind rails
    this.anchors = [];     // {pos, mesh}  grapple rings
    this.targets = [];     // {base, mesh, alive, respawnAt, r}
    this.platforms = [];   // {col, base, axis, amp, speed, phase}
    this.lowGrav = [];     // {c, r}
    this.water = [];       // {min, max, surfaceY}
    this.clouds = [];
    this.spawn = new THREE.Vector3(0, 1.5, 14);
    this.spawnYaw = 0; // camera forward is (sin yaw, 0, -cos yaw): yaw 0 faces -Z
    this.spawnPoints = [{ pos: this.spawn.clone(), yaw: this.spawnYaw }];
    if (scene) this.build();
  }

  randomSpawn() {
    return this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
  }

  // ---------- construction helpers ----------

  addBox(x, y, z, sx, sy, sz, { mat = null, rotX = 0, rotY = 0, rotZ = 0, solid = true, platform = false, name = '' } = {}) {
    const col = {
      c: new THREE.Vector3(x, y, z),
      h: new THREE.Vector3(sx / 2, sy / 2, sz / 2),
      q: null, qi: null,
      br: Math.hypot(sx, sy, sz) / 2 + 0.1,
      mesh: null, vel: new THREE.Vector3(),
      platform, name,
    };
    if (rotX || rotY || rotZ) {
      col.q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, rotY, rotZ));
      col.qi = col.q.clone().invert();
    }
    if (this.scene) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat || toon(PAL.cliff));
      m.position.set(x, y, z);
      if (col.q) m.quaternion.copy(col.q);
      this.scene.add(m);
      col.mesh = m;
    }
    if (solid) this.colliders.push(col);
    return col;
  }

  decor(mesh, x, y, z) {
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    return mesh;
  }

  // Island: grass top slab + cream cliff skirt below (skirt is visual only)
  island(x, topY, z, sx, sz, { grass = PAL.grass, depth = 7 } = {}) {
    const top = this.addBox(x, topY - 1, z, sx, 2, sz, { mat: toon(grass), name: 'island' });
    if (this.scene) {
      const skirt = new THREE.Mesh(
        new THREE.BoxGeometry(sx * 0.92, depth, sz * 0.92),
        toon(PAL.cliff),
      );
      skirt.position.set(x, topY - 2 - depth / 2, z);
      this.scene.add(skirt);
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(Math.min(sx, sz) * 0.45, depth * 1.2, 4),
        toon(PAL.cliffShade),
      );
      tip.rotation.x = Math.PI;
      tip.rotation.y = Math.PI / 4;
      tip.position.set(x, topY - 2 - depth - depth * 0.55, z);
      this.scene.add(tip);
    }
    return top;
  }

  addPad(x, y, z, dir, power) {
    const d = new THREE.Vector3(...dir).normalize();
    const pad = { pos: new THREE.Vector3(x, y, z), dir: d, power, mesh: null, lastFire: -9 };
    if (this.scene) {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.4, 0.5, 20), toon(PAL.ink));
      const top = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.9, 0.35, 20), glow(PAL.coral));
      top.position.y = 0.32;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.09, 8, 28), glow(PAL.gold));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.55;
      g.add(base, top, ring);
      g.position.set(x, y, z);
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
      this.scene.add(g);
      pad.mesh = g; pad.ring = ring;
    }
    this.pads.push(pad);
    return pad;
  }

  addZipline(ax, ay, az, bx, by, bz) {
    const a = new THREE.Vector3(ax, ay, az), b = new THREE.Vector3(bx, by, bz);
    const mid = a.clone().lerp(b, 0.5); mid.y -= a.distanceTo(b) * 0.05; // sag
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const zl = { curve, len: curve.getLength(), points: curve.getPoints(32), a, b };
    if (this.scene) {
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.08, 6), glow(PAL.ink));
      this.scene.add(tube);
      for (const p of [a, b]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 2.4, 8), toon(PAL.ink));
        post.position.set(p.x, p.y - 1.2, p.z);
        this.scene.add(post);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), glow(PAL.gold));
        cap.position.copy(p);
        this.scene.add(cap);
      }
    }
    this.ziplines.push(zl);
    return zl;
  }

  // grind rail on the ground: land on it (or run onto it) to grind
  addRail(pts) {
    const points = pts.map((p) => new THREE.Vector3(...p));
    const curve = new THREE.CatmullRomCurve3(points);
    const rl = {
      curve, len: curve.getLength(), points: curve.getPoints(64),
      a: points[0], b: points[points.length - 1], type: 'rail',
    };
    if (this.scene) {
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.1, 8), glow(PAL.gold));
      this.scene.add(tube);
      const rim = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.16, 6), glow(PAL.ink, 0.55));
      this.scene.add(rim);
      // support posts
      for (let i = 1; i < 8; i++) {
        const p = curve.getPointAt(i / 8);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.8, 6), toon(PAL.ink));
        post.position.set(p.x, p.y - 0.4, p.z);
        this.scene.add(post);
      }
    }
    this.rails.push(rl);
    return rl;
  }

  addAnchor(x, y, z) {
    const anc = { pos: new THREE.Vector3(x, y, z), mesh: null };
    if (this.scene) {
      const g = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.28, 10, 30), glow(PAL.gold));
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), glow(PAL.magenta));
      g.add(ring, core);
      g.position.set(x, y, z);
      this.scene.add(g);
      anc.mesh = g;
    }
    this.anchors.push(anc);
    return anc;
  }

  addTarget(x, y, z) {
    const t = { base: new THREE.Vector3(x, y, z), mesh: null, alive: true, respawnAt: 0, r: 1.35, phase: Math.random() * 7 };
    if (this.scene) {
      const g = new THREE.Group();
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 12), glow(PAL.teal));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.13, 8, 26), glow(PAL.cream, 0.9));
      g.add(core, ring);
      g.position.set(x, y, z);
      this.scene.add(g);
      t.mesh = g; t.ring = ring; t.core = core;
    }
    this.targets.push(t);
    return t;
  }

  addPlatform(baseX, baseY, baseZ, sx, sy, sz, axis, amp, speed, phase = 0) {
    const col = this.addBox(baseX, baseY, baseZ, sx, sy, sz, { mat: toon(PAL.purple), platform: true, name: 'platform' });
    if (col.mesh) {
      const trim = new THREE.Mesh(new THREE.BoxGeometry(sx + 0.3, 0.25, sz + 0.3), glow(PAL.gold));
      trim.position.y = sy / 2;
      col.mesh.add(trim);
    }
    this.platforms.push({
      col, base: new THREE.Vector3(baseX, baseY, baseZ),
      axis: new THREE.Vector3(...axis).normalize(), amp, speed, phase,
    });
    return col;
  }

  addLowGrav(x, y, z, r) {
    this.lowGrav.push({ c: new THREE.Vector3(x, y, z), r });
    if (this.scene) {
      const bubble = new THREE.Mesh(
        new THREE.SphereGeometry(r, 28, 20),
        new THREE.MeshBasicMaterial({ color: PAL.teal, transparent: true, opacity: 0.10, side: THREE.BackSide, depthWrite: false }),
      );
      bubble.position.set(x, y, z);
      this.scene.add(bubble);
      const shell = new THREE.Mesh(
        new THREE.SphereGeometry(r, 28, 20),
        new THREE.MeshBasicMaterial({ color: PAL.cream, transparent: true, opacity: 0.06, depthWrite: false }),
      );
      shell.position.set(x, y, z);
      this.scene.add(shell);
    }
  }

  addWater(minX, minY, minZ, maxX, maxY, maxZ) {
    const w = { min: new THREE.Vector3(minX, minY, minZ), max: new THREE.Vector3(maxX, maxY, maxZ), surfaceY: maxY };
    this.water.push(w);
    if (this.scene) {
      const surf = new THREE.Mesh(
        new THREE.BoxGeometry(maxX - minX, 0.25, maxZ - minZ),
        new THREE.MeshBasicMaterial({ color: PAL.water, transparent: true, opacity: 0.72 }),
      );
      surf.position.set((minX + maxX) / 2, maxY - 0.12, (minZ + maxZ) / 2);
      this.scene.add(surf);
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(maxX - minX, maxY - minY, maxZ - minZ),
        new THREE.MeshBasicMaterial({ color: 0x1e8fd0, transparent: true, opacity: 0.4 }),
      );
      body.position.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
      this.scene.add(body);
    }
    return w;
  }

  tree(x, y, z, s = 1) {
    if (!this.scene) return;
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * s, 0.42 * s, 2.6 * s, 8), toon(0xa96a3d));
    trunk.position.y = 1.3 * s;
    const puff1 = new THREE.Mesh(new THREE.SphereGeometry(1.7 * s, 12, 10), toon(PAL.teal));
    puff1.position.y = 3.4 * s; puff1.scale.y = 0.85;
    const puff2 = new THREE.Mesh(new THREE.SphereGeometry(1.1 * s, 12, 10), toon(PAL.magenta));
    puff2.position.set(0.9 * s, 4.1 * s, 0.3 * s);
    g.add(trunk, puff1, puff2);
    g.position.set(x, y, z);
    g.rotation.y = Math.random() * 7;
    this.scene.add(g);
  }

  crystal(x, y, z, s = 1, color = PAL.magenta) {
    if (!this.scene) return;
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.7 * s, 2.6 * s, 5), toon(color, { emissive: color, emissiveIntensity: 0.25 }));
    c.position.set(x, y + 1.3 * s, z);
    c.rotation.y = Math.random() * 7;
    this.scene.add(c);
  }

  archGate(x, y, z, r = 4.5) {
    if (!this.scene) return;
    const arch = new THREE.Mesh(new THREE.TorusGeometry(r, 0.4, 10, 30, Math.PI), toon(PAL.gold));
    arch.position.set(x, y, z);
    this.scene.add(arch);
  }

  // ---------- levels ----------

  build() {
    this.buildSky();
    if (this.mode === 'arena') this.buildArena();
    else this.buildCove();
  }

  buildSky() {
    const S = this.scene;

    // Sky dome + sun
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        top: { value: new THREE.Color(0x5fd4ff) },
        mid: { value: new THREE.Color(0xa9e8ff) },
        bot: { value: new THREE.Color(0xffd9f2) },
      },
      vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;
        void main(){
          float h = vP.y;
          vec3 c = mix(bot, mid, smoothstep(-0.08, 0.15, h));
          c = mix(c, top, smoothstep(0.15, 0.65, h));
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    S.add(new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), skyMat));
    const sun = new THREE.Mesh(new THREE.SphereGeometry(28, 20, 14), glow(PAL.gold));
    sun.position.set(320, 380, -520);
    S.add(sun);

    // Clouds
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      const n = 3 + (i % 3);
      for (let j = 0; j < n; j++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(4 + Math.random() * 5, 10, 8), toon(PAL.cream));
        puff.position.set(j * 6 - n * 3 + Math.random() * 3, Math.random() * 2, Math.random() * 4);
        puff.scale.y = 0.55;
        g.add(puff);
      }
      g.position.set((Math.random() - 0.5) * 500, 45 + Math.random() * 70, (Math.random() - 0.5) * 500 - 60);
      S.add(g);
      this.clouds.push({ g, speed: 0.4 + Math.random() * 0.8 });
    }
  }

  // "Prisma Cove": the solo free-roam sky park
  buildCove() {
    // === ISLAND A: spawn plaza + bhop runway (0,0,0), 74 x 84 ===
    this.island(0, 0, -5, 74, 84);
    // plaza disc
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 0.3, 36), toon(PAL.path));
    this.decor(plaza, 0, 0.12, 8);
    // runway stripe toward the canyon
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(7, 0.22, 46), toon(PAL.cliffShade));
    this.decor(stripe, 0, 0.12, -23);
    this.archGate(0, 0.4, -16, 4.6);
    this.archGate(0, 0.4, -32, 4.6);
    this.tree(-16, 0, 20, 1.3); this.tree(18, 0, 14, 1.1); this.tree(-22, 0, -12, 1.0);
    this.tree(24, 0, -20, 1.2); this.tree(-13, 0, -30, 0.9);
    this.crystal(9, 0, 22, 1.2, PAL.teal); this.crystal(-8, 0, 26, 0.9);
    // swing ring over the runway
    this.addAnchor(0, 15, -26);
    // plaza targets
    this.addTarget(-7, 3, -2); this.addTarget(7, 3, -2); this.addTarget(0, 4.5, -9);

    // === WALL-RUN CANYON: staggered walls across the gap (z -47 .. -140) ===
    const wallMat = toon(PAL.cliffShade);
    const face = toon(PAL.coral);
    this.addBox(-7.5, 5, -62, 2, 13, 30, { mat: wallMat, name: 'wall' });
    this.addBox(7.5, 5, -86, 2, 13, 30, { mat: wallMat, name: 'wall' });
    this.addBox(-7.5, 5, -110, 2, 13, 30, { mat: face, name: 'wall' });
    this.addBox(7.5, 5, -131, 2, 13, 22, { mat: wallMat, name: 'wall' });
    // high grapple line over the canyon
    this.addAnchor(0, 17, -75); this.addAnchor(0, 17, -105);
    this.addTarget(0, 7, -86); this.addTarget(0, 8, -120);

    // safety net island under the canyon with recovery pads
    this.island(0, -26, -95, 40, 110, { grass: PAL.gold, depth: 5 });
    this.addPad(0, -25.7, -60, [0, 1, 0], 34);
    this.addPad(0, -25.7, -95, [0, 1, 0], 34);
    this.addPad(0, -25.7, -128, [0, 1, 0], 34);

    // === ISLAND C: tower island (0,0,-172), 56 x 56 ===
    this.island(0, 0, -172, 56, 56);
    this.tree(18, 0, -186, 1.3); this.tree(-20, 0, -158, 1.1);
    this.crystal(14, 0, -160, 1.4); this.crystal(-16, 0, -186, 1.1, PAL.teal);
    // tower: shaft + wallrun fin + top platform
    this.addBox(-12, 13, -184, 9, 26, 9, { mat: toon(PAL.cliff), name: 'tower' });
    this.addBox(-5.5, 14, -184, 4, 20, 1.6, { mat: toon(PAL.coral), name: 'towerfin' });
    this.addBox(-12, 26.8, -184, 14, 1.6, 14, { mat: toon(PAL.grass), name: 'towertop' });
    this.addPad(-2, 0.3, -176, [-0.25, 1, -0.12], 26); // pad up toward tower
    this.addTarget(-12, 30, -184);
    // long zipline: tower top -> spawn plaza (offset from the runway sight-line)
    this.addZipline(-9, 27.5, -178, -15, 5, 12);

    // === SLIDE HILL: island A -> island B (down to the lagoon) ===
    // ramp from (36,0) down to (64,-12)
    this.addBox(50, -6.4, 10, 32, 2, 14, { mat: toon(PAL.grassDark), rotZ: -0.40, name: 'slidehill' });
    this.archGate(38, 1.2, 10, 5);

    // === ISLAND B: lagoon + pad staircase (95,-12,10), 64 x 64 ===
    this.island(95, -12, 10, 64, 64);
    this.tree(112, -12, -8, 1.2); this.tree(76, -12, 30, 1.4); this.tree(116, -12, 28, 1.0);
    this.crystal(80, -12, -10, 1.2);
    this.addTarget(95, -8, 10); this.addTarget(78, -7.5, 0);
    // lagoon: sunken basin with water
    this.addBox(95, -14.4, 39, 26, 3, 4, { mat: toon(PAL.cliff), name: 'poolwall' });
    this.addBox(95, -14.4, 17, 26, 3, 4, { mat: toon(PAL.cliff), name: 'poolwall' });
    this.addBox(83, -14.4, 28, 4, 3, 18, { mat: toon(PAL.cliff), name: 'poolwall' });
    this.addBox(107, -14.4, 28, 4, 3, 18, { mat: toon(PAL.cliff), name: 'poolwall' });
    this.addBox(95, -18.9, 28, 26, 2, 26, { mat: toon(0x1e8fd0), name: 'poolfloor' });
    this.addWater(85.5, -18, 19.5, 104.5, -13.6, 36.5);
    this.addPad(95, -17.6, 28.5, [0, 1, 0], 28); // on the pool floor: pops you out of the water
    this.addTarget(95, -10, 28);
    // pad staircase toward the sky floats
    this.addPad(86, -11.6, -12, [-0.2, 1, -0.35], 24);

    // === SKY FLOATS: between B and the low-grav cluster ===
    this.island(72, 4, -34, 16, 16, { depth: 4 });
    this.island(56, 11, -58, 14, 14, { depth: 4 });
    this.addTarget(72, 8, -34); this.addTarget(56, 15, -58);
    // moving platforms: float1 <-> float2, and A <-> B shortcut
    this.addPlatform(64, 8, -46, 6, 1, 6, [-0.55, 0.28, -0.79], 9, 0.55);
    this.addPlatform(48, -4, 26, 7, 1, 7, [1, -0.3, 0.25], 12, 0.45, 2.0);
    // zipline: float2 -> island B
    this.addZipline(58, 13.5, -52, 92, -9.5, 2);

    // === LOW-GRAV CLUSTER: floating islets in a bubble (62, 24, -92) ===
    this.addLowGrav(62, 26, -92, 24);
    this.island(62, 20, -92, 10, 10, { depth: 3 });
    this.island(52, 27, -102, 8, 8, { depth: 3 });
    this.island(72, 31, -84, 8, 8, { depth: 3 });
    this.addTarget(62, 26, -92); this.addTarget(52, 32, -102); this.addTarget(72, 36, -84);
    this.addPad(56, 11.9, -58, [0.15, 1, -0.6], 26); // float2 pad up into the bubble

    // === GRAPPLE RING ROAD: low-grav cluster -> tower top ===
    this.addAnchor(44, 28, -118);
    this.addAnchor(24, 26, -138);
    this.addAnchor(2, 30, -158);
    this.addTarget(24, 20, -138);

    // wind back: zipline from B's far edge up is covered; add ring from B to floats
    this.addAnchor(74, 6, -14);

    // === GRIND RAILS ===
    // plaza sweep: curls around the plaza and launches you at the canyon
    this.addRail([
      [-16, 0.55, 20], [-21, 0.55, 4], [-15, 0.55, -14],
      [-6, 0.55, -30], [-1, 1.4, -44],
    ]);
    // hillside line: rides the gap beside the slide hill down to island B
    this.addRail([
      [37, 1.0, 1], [50, -5.2, -2], [64, -11.0, -6], [78, -11.0, -13],
    ]);
    // lagoon loop: island B's east rim toward the pad staircase
    this.addRail([
      [110, -11.45, 26], [114, -11.45, 6], [106, -11.45, -12], [92, -11.45, -20],
    ]);
  }

  // "Prisma Ring": the multiplayer arena — symmetric, fast, vertical
  buildArena() {
    // main floor
    this.island(0, 0, 0, 64, 64, { depth: 9 });
    // center pillar with a ring on top and a launch pad at its base
    this.addBox(0, 4.5, 0, 9, 9, 9, { mat: toon(PAL.cliff), name: 'pillar' });
    this.addBox(0, 9.4, 0, 12, 1, 12, { mat: toon(PAL.grass), name: 'pillartop' });
    this.addAnchor(0, 22, 0);
    this.addPad(7.5, 0.3, 0, [0.35, 1, 0], 22);
    this.addPad(-7.5, 0.3, 0, [-0.35, 1, 0], 22);
    this.addLowGrav(0, 16, 0, 13); // aerial-duel bubble over the pillar

    // four corner plates at height, reached by ramps
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      this.addBox(sx * 26, 5.5, sz * 26, 16, 1.4, 16, { mat: toon(PAL.grassDark), name: 'plate' });
      this.addBox(sx * 17, 2.6, sz * 17, 14, 1.2, 6, {
        mat: toon(PAL.cliffShade), rotZ: sx * -0.42, rotY: sz * sx * Math.PI / 4, name: 'ramp',
      });
      this.addPad(sx * 30, 6.4, sz * 30, [-sx * 0.3, 1, -sz * 0.3], 20);
      this.addAnchor(sx * 18, 14, sz * 18);
      this.crystal(sx * 30, 6.2, sz * 21, 1.1, sx * sz > 0 ? PAL.magenta : PAL.teal);
    }

    // wall-run walls on the mid-edges (fight around them, run along them)
    this.addBox(0, 5, 30, 26, 11, 2, { mat: toon(PAL.coral), name: 'wall' });
    this.addBox(0, 5, -30, 26, 11, 2, { mat: toon(PAL.coral), name: 'wall' });
    this.addBox(30, 5, 0, 2, 11, 26, { mat: toon(PAL.cliffShade), name: 'wall' });
    this.addBox(-30, 5, 0, 2, 11, 26, { mat: toon(PAL.cliffShade), name: 'wall' });

    // grind rails arcing around the outside of the walls
    this.addRail([
      [24, 6.2, 26], [34, 6.2, 12], [37, 6.2, 0], [34, 6.2, -12], [24, 6.2, -26],
    ]);
    this.addRail([
      [-24, 6.2, -26], [-34, 6.2, -12], [-37, 6.2, 0], [-34, 6.2, 12], [-24, 6.2, 26],
    ]);

    // satellite islands with pads back into the fray
    for (const [x, z] of [[0, 48], [0, -48], [48, 0], [-48, 0]]) {
      this.island(x, 8, z, 12, 12, { depth: 4 });
      this.addPad(x, 8.4, z, [-Math.sign(x) * 0.45, 1, -Math.sign(z) * 0.45], 21);
      this.addAnchor(x * 0.6, 18, z * 0.6);
    }

    this.tree(12, 0, 12, 1.0); this.tree(-12, 0, -12, 1.1);
    this.archGate(0, 0.4, 18, 4.2);

    // spawn points around the ring, facing the center
    this.spawnPoints = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const r = i % 2 === 0 ? 24 : 27;
      const x = Math.sin(a) * r, z = Math.cos(a) * r;
      // face the center: forward is (sin yaw, -cos yaw)
      const yaw = Math.atan2(-x, z);
      this.spawnPoints.push({ pos: new THREE.Vector3(x, i % 2 === 0 ? 7.5 : 1.5, z), yaw });
    }
    this.spawn = this.spawnPoints[0].pos.clone();
    this.spawnYaw = this.spawnPoints[0].yaw;
  }

  // ---------- queries ----------

  // Gather contacts for a sphere at p with radius r. Returns array of
  // {n: worldNormal, depth, col}. Used by the player capsule (3 spheres).
  sphereContacts(p, r, out = []) {
    out.length = 0;
    for (const col of this.colliders) {
      const dx = p.x - col.c.x, dy = p.y - col.c.y, dz = p.z - col.c.z;
      const rr = col.br + r;
      if (dx * dx + dy * dy + dz * dz > rr * rr) continue;
      _v1.set(dx, dy, dz);
      if (col.qi) _v1.applyQuaternion(col.qi);
      _v2.set(
        Math.max(-col.h.x, Math.min(col.h.x, _v1.x)),
        Math.max(-col.h.y, Math.min(col.h.y, _v1.y)),
        Math.max(-col.h.z, Math.min(col.h.z, _v1.z)),
      );
      _v3.subVectors(_v1, _v2);
      const d2 = _v3.lengthSq();
      if (d2 > r * r) continue;
      let n, depth;
      if (d2 > 1e-10) {
        const d = Math.sqrt(d2);
        n = _v3.clone().divideScalar(d);
        depth = r - d;
      } else {
        // center inside the box: push out along the axis of least penetration
        const px = col.h.x - Math.abs(_v1.x), py = col.h.y - Math.abs(_v1.y), pz = col.h.z - Math.abs(_v1.z);
        if (px < py && px < pz) { n = new THREE.Vector3(Math.sign(_v1.x) || 1, 0, 0); depth = px + r; }
        else if (py < pz) { n = new THREE.Vector3(0, Math.sign(_v1.y) || 1, 0); depth = py + r; }
        else { n = new THREE.Vector3(0, 0, Math.sign(_v1.z) || 1); depth = pz + r; }
      }
      if (col.q) n.applyQuaternion(col.q);
      out.push({ n, depth, col });
    }
    return out;
  }

  // Ray vs all OBBs; returns closest {point, normal, dist, col} or null.
  raycast(origin, dir, maxDist) {
    let best = null;
    for (const col of this.colliders) {
      // local space
      _v1.copy(origin).sub(col.c);
      _v2.copy(dir);
      if (col.qi) { _v1.applyQuaternion(col.qi); _v2.applyQuaternion(col.qi); }
      let tmin = 0, tmax = maxDist, axis = -1, sign = 1;
      let ok = true;
      for (let i = 0; i < 3; i++) {
        const o = _v1.getComponent(i), d = _v2.getComponent(i), h = col.h.getComponent(i);
        if (Math.abs(d) < 1e-9) {
          if (Math.abs(o) > h) { ok = false; break; }
          continue;
        }
        let t1 = (-h - o) / d, t2 = (h - o) / d;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        // entry-face normal opposes the ray along this axis
        if (t1 > tmin) { tmin = t1; axis = i; sign = d > 0 ? -1 : 1; }
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) { ok = false; break; }
      }
      if (!ok || axis === -1) continue;
      if (tmin <= 0 || tmin >= maxDist) continue;
      if (!best || tmin < best.dist) {
        const n = new THREE.Vector3();
        n.setComponent(axis, sign);
        if (col.q) n.applyQuaternion(col.q);
        best = {
          dist: tmin,
          point: origin.clone().addScaledVector(dir, tmin),
          normal: n,
          col,
        };
      }
    }
    return best;
  }

  gravityScaleAt(p) {
    for (const z of this.lowGrav) {
      if (p.distanceToSquared(z.c) < z.r * z.r) return 0.3;
    }
    return 1;
  }

  waterAt(p) {
    for (const w of this.water) {
      if (p.x > w.min.x && p.x < w.max.x && p.y > w.min.y && p.y < w.max.y && p.z > w.min.z && p.z < w.max.z) return w;
    }
    return null;
  }

  popTarget(t, now) {
    t.alive = false;
    t.respawnAt = now + 5;
    if (t.mesh) t.mesh.visible = false;
  }

  update(t, dt) {
    // moving platforms
    for (const p of this.platforms) {
      const off = Math.sin(t * p.speed + p.phase) * p.amp;
      _v1.copy(p.base).addScaledVector(p.axis, off);
      p.col.vel.copy(_v1).sub(p.col.c).divideScalar(Math.max(dt, 1e-5));
      p.col.c.copy(_v1);
      if (p.col.mesh) p.col.mesh.position.copy(_v1);
    }
    // targets: bob, spin, respawn
    for (const tg of this.targets) {
      if (!tg.alive && t > tg.respawnAt) {
        tg.alive = true;
        if (tg.mesh) { tg.mesh.visible = true; tg.mesh.scale.setScalar(0.01); }
      }
      if (tg.alive && tg.mesh) {
        const s = tg.mesh.scale.x;
        if (s < 1) tg.mesh.scale.setScalar(Math.min(1, s + dt * 3));
        tg.mesh.position.y = tg.base.y + Math.sin(t * 1.7 + tg.phase) * 0.4;
        tg.ring.rotation.y = t * 1.2 + tg.phase;
        tg.ring.rotation.x = Math.sin(t * 0.8 + tg.phase) * 0.5;
      }
    }
    // anchors spin
    for (const a of this.anchors) {
      if (a.mesh) { a.mesh.rotation.y = t * 0.8; }
    }
    // pad rings pulse
    for (const p of this.pads) {
      if (p.ring) {
        const k = 1 + 0.12 * Math.sin(t * 4);
        p.ring.scale.setScalar(k);
      }
    }
    // clouds drift
    for (const c of this.clouds) {
      c.g.position.x += c.speed * dt;
      if (c.g.position.x > 320) c.g.position.x = -320;
    }
  }
}
