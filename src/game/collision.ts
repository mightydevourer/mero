/**
 * Kinematic collision against a world of axis-aligned boxes, inclined ramps and
 * moving platforms. The player capsule is approximated by a small stack of
 * spheres which are individually depenetrated — robust against floors, walls,
 * ceilings, edges and slopes, and cheap enough for a single dynamic actor.
 */
import * as THREE from 'three';
import { clamp } from './mathx';

export interface DynamicBox {
  box: THREE.Box3;
  velocity: THREE.Vector3; // world units / second, filled in by the world
}

export interface Ramp {
  min: THREE.Vector3; // footprint + base height (min.y unused for surface)
  max: THREE.Vector3;
  axis: 'x' | 'z';
  loY: number; // surface height at min[axis]
  hiY: number; // surface height at max[axis]
  normal: THREE.Vector3;
}

export interface CollisionResult {
  grounded: boolean;
  groundNormal: THREE.Vector3;
  groundY: number;
  platform: DynamicBox | null;
  wall: boolean;
  wallNormal: THREE.Vector3;
  ceiling: boolean;
}

export interface RayHit {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  dist: number;
}

export function makeRamp(
  min: THREE.Vector3,
  max: THREE.Vector3,
  axis: 'x' | 'z',
  loY: number,
  hiY: number,
): Ramp {
  const ext = axis === 'x' ? max.x - min.x : max.z - min.z;
  const s = (hiY - loY) / ext;
  const normal =
    axis === 'x'
      ? new THREE.Vector3(-s, 1, 0).normalize()
      : new THREE.Vector3(0, 1, -s).normalize();
  return { min, max, axis, loY, hiY, normal };
}

const _closest = new THREE.Vector3();
const _delta = new THREE.Vector3();

/** Depenetrate one sphere from a box. Returns penetration depth (0 = no hit). */
function sphereVsBox(
  center: THREE.Vector3,
  radius: number,
  box: THREE.Box3,
  outNormal: THREE.Vector3,
): number {
  _closest.set(
    clamp(center.x, box.min.x, box.max.x),
    clamp(center.y, box.min.y, box.max.y),
    clamp(center.z, box.min.z, box.max.z),
  );
  _delta.subVectors(center, _closest);
  const d2 = _delta.lengthSq();
  if (d2 > radius * radius) return 0;

  if (d2 > 1e-9) {
    const d = Math.sqrt(d2);
    outNormal.copy(_delta).multiplyScalar(1 / d);
    return radius - d;
  }
  // Center is inside the box: push out along the axis of least penetration.
  const px = Math.min(center.x - box.min.x, box.max.x - center.x);
  const py = Math.min(center.y - box.min.y, box.max.y - center.y);
  const pz = Math.min(center.z - box.min.z, box.max.z - center.z);
  if (px <= py && px <= pz) {
    outNormal.set(center.x - box.min.x < box.max.x - center.x ? -1 : 1, 0, 0);
    return px + radius;
  } else if (py <= pz) {
    outNormal.set(0, center.y - box.min.y < box.max.y - center.y ? -1 : 1, 0);
    return py + radius;
  }
  outNormal.set(0, 0, center.z - box.min.z < box.max.z - center.z ? -1 : 1);
  return pz + radius;
}

function rampSurfaceY(r: Ramp, x: number, z: number): number {
  const t =
    r.axis === 'x'
      ? (x - r.min.x) / (r.max.x - r.min.x)
      : (z - r.min.z) / (r.max.z - r.min.z);
  return r.loY + (r.hiY - r.loY) * clamp(t, 0, 1);
}

function insideFootprint(r: Ramp, x: number, z: number, margin = 0): boolean {
  return (
    x >= r.min.x - margin &&
    x <= r.max.x + margin &&
    z >= r.min.z - margin &&
    z <= r.max.z + margin
  );
}

export class CollisionWorld {
  staticBoxes: THREE.Box3[] = [];
  dynamicBoxes: DynamicBox[] = [];
  ramps: Ramp[] = [];

  addBox(box: THREE.Box3): THREE.Box3 {
    this.staticBoxes.push(box);
    return box;
  }
  addDynamic(box: THREE.Box3): DynamicBox {
    const d: DynamicBox = { box, velocity: new THREE.Vector3() };
    this.dynamicBoxes.push(d);
    return d;
  }
  addRamp(r: Ramp): Ramp {
    this.ramps.push(r);
    return r;
  }

  /**
   * Resolve a capsule (vertical, `radius`, total `height`) at `pos` (feet
   * position). Mutates `pos` to a non-penetrating spot and reports contacts.
   */
  resolve(pos: THREE.Vector3, radius: number, height: number): CollisionResult {
    const res: CollisionResult = {
      grounded: false,
      groundNormal: new THREE.Vector3(0, 1, 0),
      groundY: -Infinity,
      platform: null,
      wall: false,
      wallNormal: new THREE.Vector3(),
      ceiling: false,
    };
    const n = new THREE.Vector3();
    const center = new THREE.Vector3();
    // Sphere centers along the capsule axis (feet..head, inset by radius).
    const lo = radius;
    const hi = height - radius;
    const count = Math.max(2, Math.ceil((hi - lo) / (radius * 1.2)) + 1);

    for (let iter = 0; iter < 4; iter++) {
      let moved = false;
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0 : i / (count - 1);
        const sy = lo + (hi - lo) * t;
        center.set(pos.x, pos.y + sy, pos.z);

        const handle = (pen: number) => {
          if (pen <= 0) return;
          pos.addScaledVector(n, pen);
          center.set(pos.x, pos.y + sy, pos.z);
          moved = true;
          if (n.y > 0.55) {
            res.grounded = true;
            if (n.y >= res.groundNormal.y) res.groundNormal.copy(n);
            res.groundY = Math.max(res.groundY, pos.y);
          } else if (n.y < -0.55) {
            res.ceiling = true;
          } else {
            res.wall = true;
            res.wallNormal.copy(n);
          }
        };

        for (const b of this.staticBoxes) handle(sphereVsBox(center, radius, b, n));
        for (const d of this.dynamicBoxes) {
          const before = pos.y;
          const pen = sphereVsBox(center, radius, d.box, n);
          handle(pen);
          if (pen > 0 && n.y > 0.55 && pos.y >= before) res.platform = d;
        }
        for (const r of this.ramps) {
          if (!insideFootprint(r, center.x, center.z, radius)) continue;
          const surfY = rampSurfaceY(r, center.x, center.z);
          const dy = center.y - surfY;
          const dist = dy * r.normal.y;
          if (dist < radius && dy > -radius - 1.5) {
            n.copy(r.normal);
            handle(radius - dist);
          }
        }
      }
      if (!moved) break;
    }
    return res;
  }

  /** Probe straight down for ground within `maxDist` of the feet. */
  groundProbe(
    pos: THREE.Vector3,
    radius: number,
    maxDist: number,
  ): { hit: boolean; y: number; normal: THREE.Vector3; platform: DynamicBox | null } {
    let bestY = -Infinity;
    let normal = new THREE.Vector3(0, 1, 0);
    let platform: DynamicBox | null = null;
    const footTop = pos.y + radius;
    const x = pos.x;
    const z = pos.z;

    const consider = (topY: number, nrm: THREE.Vector3, plat: DynamicBox | null) => {
      if (topY <= footTop + 0.01 && topY >= pos.y - maxDist && topY > bestY) {
        bestY = topY;
        normal = nrm;
        platform = plat;
      }
    };

    for (const b of this.staticBoxes) {
      if (x >= b.min.x - radius && x <= b.max.x + radius && z >= b.min.z - radius && z <= b.max.z + radius) {
        consider(b.max.y, new THREE.Vector3(0, 1, 0), null);
      }
    }
    for (const d of this.dynamicBoxes) {
      const b = d.box;
      if (x >= b.min.x - radius && x <= b.max.x + radius && z >= b.min.z - radius && z <= b.max.z + radius) {
        consider(b.max.y, new THREE.Vector3(0, 1, 0), d);
      }
    }
    for (const r of this.ramps) {
      if (insideFootprint(r, x, z, radius * 0.5)) {
        consider(rampSurfaceY(r, x, z), r.normal.clone(), null);
      }
    }
    return { hit: bestY > -Infinity, y: bestY, normal, platform };
  }

  /** Is there headroom to stand at `pos` with the given height? */
  hasHeadroom(pos: THREE.Vector3, radius: number, height: number): boolean {
    const center = new THREE.Vector3(pos.x, pos.y + height - radius, pos.z);
    const n = new THREE.Vector3();
    for (const b of this.staticBoxes) if (sphereVsBox(center, radius * 0.9, b, n) > 0) return false;
    for (const d of this.dynamicBoxes) if (sphereVsBox(center, radius * 0.9, d.box, n) > 0) return false;
    return true;
  }

  /** Ray vs world (boxes + ramps). Returns nearest hit within maxDist. */
  raycast(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number): RayHit | null {
    let best: RayHit | null = null;
    const consider = (h: RayHit | null) => {
      if (h && (!best || h.dist < best.dist)) best = h;
    };
    for (const b of this.staticBoxes) consider(rayBox(origin, dir, b, maxDist));
    for (const d of this.dynamicBoxes) consider(rayBox(origin, dir, d.box, maxDist));
    for (const r of this.ramps) consider(rayRamp(origin, dir, r, maxDist));
    return best;
  }
}

function rayBox(o: THREE.Vector3, d: THREE.Vector3, b: THREE.Box3, maxDist: number): RayHit | null {
  let tmin = 0;
  let tmax = maxDist;
  let nx = 0;
  let ny = 0;
  let nz = 0;
  const axes: [number, number, number, number][] = [
    [o.x, d.x, b.min.x, b.max.x],
    [o.y, d.y, b.min.y, b.max.y],
    [o.z, d.z, b.min.z, b.max.z],
  ];
  for (let a = 0; a < 3; a++) {
    const [oa, da, mn, mx] = axes[a];
    if (Math.abs(da) < 1e-8) {
      if (oa < mn || oa > mx) return null;
      continue;
    }
    let t1 = (mn - oa) / da;
    let t2 = (mx - oa) / da;
    let sign = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      sign = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      nx = a === 0 ? sign : 0;
      ny = a === 1 ? sign : 0;
      nz = a === 2 ? sign : 0;
    }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }
  return {
    point: new THREE.Vector3(o.x + d.x * tmin, o.y + d.y * tmin, o.z + d.z * tmin),
    normal: new THREE.Vector3(nx, ny, nz),
    dist: tmin,
  };
}

function rayRamp(o: THREE.Vector3, d: THREE.Vector3, r: Ramp, maxDist: number): RayHit | null {
  // Intersect the inclined top plane, accept if hit lands within the footprint.
  const denom = d.dot(r.normal);
  if (Math.abs(denom) < 1e-8) return null;
  const p0y = rampSurfaceY(r, r.min.x, r.min.z);
  const planePt = new THREE.Vector3(r.min.x, p0y, r.min.z);
  const t = planePt.sub(o).dot(r.normal) / denom;
  if (t < 0 || t > maxDist) return null;
  const point = new THREE.Vector3(o.x + d.x * t, o.y + d.y * t, o.z + d.z * t);
  if (!insideFootprint(r, point.x, point.z)) return null;
  return { point, normal: r.normal.clone(), dist: t };
}
