import * as THREE from '../vendor/three.module.js';
import { PAL } from './util.js';

// Combat is secondary and must never interrupt motion: hold to fire, big
// aim-assist cone, no reloads, no self-damage. The blast doubles as the
// rocket-jump.

const BULLET_SPEED = 130;
const BLAST_SPEED = 130; // rocket-fast: fire at your feet and you're airborne NOW
const AIM_CONE = 0.994;   // ~6 degrees
const _v = new THREE.Vector3();
const _m = new THREE.Vector3();

export class Combat {
  constructor(scene, world, player, effects, emit) {
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.fx = effects;
    this.emit = emit;
    this.bullets = [];
    this.pool = [];
    this.fireTimer = 0;
    this.blastCooldown = 0;
    this.score = 0;
    // multiplayer hooks (set by main when in a room)
    this.remotes = null;     // () => iterable of RemotePlayers
    this.onHit = null;       // (targetId, dmg, kind) => void
    this.onBoom = null;      // (pos) => void — broadcast my explosions
  }

  _remoteList() {
    return this.remotes ? [...this.remotes()].filter((r) => r.alive) : [];
  }

  _getBullet(big) {
    let b = this.pool.pop();
    if (!b) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 10, 8),
        new THREE.MeshBasicMaterial({ color: PAL.magenta, toneMapped: false }),
      );
      this.scene.add(mesh);
      b = { mesh, pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, blast: false };
    }
    b.mesh.visible = true;
    b.mesh.scale.setScalar(big ? 0.42 : 0.14);
    b.mesh.material.color.setHex(big ? PAL.gold : PAL.magenta);
    return b;
  }

  // steer the shot toward the nearest target/player within the assist cone
  assist(origin, dir) {
    let best = null, bestDot = AIM_CONE;
    for (const t of this.world.targets) {
      if (!t.alive) continue;
      _v.copy(t.mesh ? t.mesh.position : t.base).sub(origin);
      const d = _v.length();
      if (d < 2 || d > 130) continue;
      _v.divideScalar(d);
      const dot = _v.dot(dir);
      if (dot > bestDot) { bestDot = dot; best = t.mesh ? t.mesh.position : t.base; }
    }
    for (const r of this._remoteList()) {
      _v.copy(r.center()).sub(origin);
      const d = _v.length();
      if (d < 3 || d > 130) continue;
      _v.divideScalar(d);
      const dot = _v.dot(dir);
      if (dot > bestDot) { bestDot = dot; best = r.center().clone(); }
    }
    if (best) {
      _v.copy(best).sub(origin).normalize();
      return _v.clone();
    }
    return dir.clone();
  }

  fire(muzzle, aim) {
    const dir = this.assist(aim.origin, aim.dir);
    const b = this._getBullet(false);
    b.pos.copy(muzzle);
    b.vel.copy(dir).multiplyScalar(BULLET_SPEED);
    b.life = 1.2;
    b.blast = false;
    b.visualOnly = false;
    b.mesh.position.copy(b.pos);
    this.bullets.push(b);
    this.fx.burst(muzzle, { color: PAL.magenta, count: 3, speed: 2, life: 0.15, size: 6, up: 0, spread: 0.1, gravity: 0 });
    this.emit('shoot', {
      o: [+muzzle.x.toFixed(2), +muzzle.y.toFixed(2), +muzzle.z.toFixed(2)],
      d: [+dir.x.toFixed(3), +dir.y.toFixed(3), +dir.z.toFixed(3)],
    });
  }

  fireBlast(muzzle, aim) {
    const b = this._getBullet(true);
    b.pos.copy(muzzle);
    b.vel.copy(aim.dir).multiplyScalar(BLAST_SPEED);
    b.life = 1.4;
    b.blast = true;
    b.visualOnly = false;
    b.mesh.position.copy(b.pos);
    this.bullets.push(b);
    this.emit('blast_fire', {});
  }

  boomVisual(pos) {
    this.fx.ring(pos, PAL.gold, 9, 0.5);
    this.fx.burst(pos, { color: PAL.gold, count: 26, speed: 10, life: 0.55, size: 9, up: 5, spread: 0.6, gravity: 14 });
    this.fx.burst(pos, { color: PAL.coral, count: 14, speed: 7, life: 0.4, size: 7, up: 3, spread: 0.4, gravity: 10 });
    this.emit('blast_hit', { pos: pos.clone() });
  }

  explode(pos) {
    this.boomVisual(pos);
    if (this.onBoom) this.onBoom(pos);
    // knockback launches, never hurts you (and pops targets caught in it) —
    // a blast at your feet is a superjump; at a wall, a super wall-jump
    this.player.applyBlast(pos, 9, 30);
    for (const t of this.world.targets) {
      if (t.alive && t.mesh && t.mesh.position.distanceTo(pos) < 7) this.popTarget(t);
    }
    // friends caught in the blast take falloff damage (knockback arrives
    // via the boom broadcast so bystanders get flung too)
    if (this.onHit) {
      for (const r of this._remoteList()) {
        const d = r.center().distanceTo(pos);
        if (d < 9) this.onHit(r.id, Math.round(40 - (d / 9) * 28), 'blast');
      }
    }
  }

  // a friend's explosion: visuals + knockback for us if we're close
  remoteBoom(pos) {
    this.boomVisual(pos);
    this.player.applyBlast(pos, 9, 24);
  }

  // a friend's bullet: visual-only tracer (their client scores the hit)
  spawnTracer(from, dir) {
    const b = this._getBullet(false);
    b.pos.copy(from);
    b.vel.copy(dir).multiplyScalar(BULLET_SPEED);
    b.life = 1.2;
    b.blast = false;
    b.visualOnly = true;
    b.mesh.position.copy(b.pos);
    this.bullets.push(b);
    this.emit('shoot', {});
  }

  popTarget(t) {
    this.world.popTarget(t, this.player.t);
    const p = t.mesh ? t.mesh.position : t.base;
    this.fx.ring(p, PAL.teal, 4, 0.35);
    this.fx.burst(p, { color: PAL.teal, count: 18, speed: 8, life: 0.5, size: 8, up: 4, spread: 0.3, gravity: 8 });
    this.fx.burst(p, { color: PAL.cream, count: 8, speed: 5, life: 0.4, size: 6, up: 3, spread: 0.3, gravity: 6 });
    this.score++;
    this.emit('target_hit', { pos: p.clone ? p.clone() : p, score: this.score });
  }

  update(dt, inp, muzzle, aim) {
    this.fireTimer -= dt;
    this.blastCooldown -= dt;
    if (inp.shootHeld && this.fireTimer <= 0) {
      this.fireTimer = 0.16;
      this.fire(muzzle, aim);
    }
    if (inp.blast && this.blastCooldown <= 0) {
      this.blastCooldown = 0.7;
      this.fireBlast(muzzle, aim);
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      const step = Math.min(dt, b.life);
      b.life -= dt;
      _v.copy(b.vel).multiplyScalar(step);
      const stepLen = _v.length();
      _m.copy(_v).normalize();

      let hitAt = null;
      // world hit
      const wHit = this.world.raycast(b.pos, _m, stepLen);
      if (wHit) hitAt = wHit.point;
      // target hit (segment vs sphere, generous radius)
      let hitTarget = null;
      let hitRemote = null;
      if (!b.visualOnly) {
        for (const t of this.world.targets) {
          if (!t.alive || !t.mesh) continue;
          const tp = t.mesh.position;
          const toT = _v.set(tp.x - b.pos.x, tp.y - b.pos.y, tp.z - b.pos.z);
          const along = toT.dot(_m);
          if (along < -t.r || along > stepLen + t.r) continue;
          const closest2 = toT.lengthSq() - along * along;
          if (closest2 < t.r * t.r) { hitTarget = t; hitAt = tp.clone(); break; }
        }
        // friends: generous capsule-ish sphere at their center
        if (!hitTarget && !b.blast && this.onHit) {
          for (const r of this._remoteList()) {
            const rc = r.center();
            const toR = _v.set(rc.x - b.pos.x, rc.y - b.pos.y, rc.z - b.pos.z);
            const along = toR.dot(_m);
            const rr = 1.05;
            if (along < -rr || along > stepLen + rr) continue;
            const closest2 = toR.lengthSq() - along * along;
            if (closest2 < rr * rr) { hitRemote = r; hitAt = rc.clone(); break; }
          }
        }
      }

      if (hitRemote) {
        this.onHit(hitRemote.id, 10, 'bullet');
        this.fx.burst(hitAt, { color: PAL.coral, count: 8, speed: 5, life: 0.3, size: 6, up: 2, spread: 0.3, gravity: 8 });
        this.emit('hitmark', {});
      }
      if (hitTarget && !b.blast) this.popTarget(hitTarget);
      if (hitAt || b.life <= 0) {
        if (b.blast) this.explode(hitAt || b.pos);
        else if (hitAt && !hitTarget && !hitRemote) {
          this.fx.burst(hitAt, { color: PAL.magenta, count: 5, speed: 3, life: 0.25, size: 5, up: 1, spread: 0.1, gravity: 6 });
        }
        b.mesh.visible = false;
        this.pool.push(b);
        this.bullets.splice(i, 1);
        continue;
      }
      b.pos.addScaledVector(b.vel, step);
      b.mesh.position.copy(b.pos);
    }
  }
}
