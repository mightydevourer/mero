/**
 * The finger gun: rapid-fire magic bullets launched from the fingertip muzzle
 * toward the crosshair. Bullets are pooled, sweep-tested against world geometry
 * and targets each frame, and spawn impact FX on hit.
 */
import * as THREE from 'three';
import { CFG } from './config';
import { CollisionWorld } from './collision';
import { World } from './world';
import { FX } from './fx';

interface Bullet {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  active: boolean;
}

export class Weapon {
  private bullets: Bullet[] = [];
  private cooldown = 0;

  constructor(
    private scene: THREE.Scene,
    private col: CollisionWorld,
    private world: World,
    private fx: FX,
  ) {
    const geo = new THREE.SphereGeometry(0.12, 8, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xff4d9e,
      emissiveIntensity: 3,
    });
    for (let i = 0; i < 64; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({ color: 0xff66b2, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      halo.scale.setScalar(0.6);
      mesh.add(halo);
      this.scene.add(mesh);
      this.bullets.push({ mesh, vel: new THREE.Vector3(), life: 0, active: false });
    }
  }

  /** Fire if the trigger is held and the fire-rate cooldown has elapsed. */
  tryFire(held: boolean, dt: number, muzzle: THREE.Vector3, aimPoint: THREE.Vector3): boolean {
    this.cooldown -= dt;
    if (!held || this.cooldown > 0) return false;
    this.cooldown = CFG.fireRate;
    const dir = new THREE.Vector3().subVectors(aimPoint, muzzle).normalize();
    this.spawn(muzzle, dir);
    this.fx.muzzleFlash(muzzle, dir);
    return true;
  }

  private spawn(origin: THREE.Vector3, dir: THREE.Vector3) {
    const b = this.bullets.find((x) => !x.active);
    if (!b) return;
    b.active = true;
    b.life = CFG.bulletLife;
    b.mesh.visible = true;
    b.mesh.position.copy(origin);
    b.vel.copy(dir).multiplyScalar(CFG.bulletSpeed);
  }

  update(dt: number) {
    for (const b of this.bullets) {
      if (!b.active) continue;
      b.life -= dt;
      if (b.life <= 0) {
        this.kill(b);
        continue;
      }
      const step = b.vel.clone().multiplyScalar(dt);
      const dist = step.length();
      const dir = step.clone().multiplyScalar(1 / dist);

      // sweep against world + targets, take the nearest hit
      const worldHit = this.col.raycast(b.mesh.position, dir, dist + 0.12);
      const target = this.world.raycastTargets(b.mesh.position, dir, dist + 0.12);
      if (target) {
        const destroyed = this.world.hitTarget(target, CFG.bulletDamage);
        this.fx.impact(target.pos, dir.clone().multiplyScalar(-1), 0x33e0ff);
        if (destroyed) this.fx.explosion(target.pos.clone(), 1.6, 0xffd23a);
        this.kill(b);
        continue;
      }
      if (worldHit) {
        this.fx.impact(worldHit.point, worldHit.normal, 0xff66b2);
        this.kill(b);
        continue;
      }
      b.mesh.position.add(step);
    }
  }

  private kill(b: Bullet) {
    b.active = false;
    b.mesh.visible = false;
  }
}
