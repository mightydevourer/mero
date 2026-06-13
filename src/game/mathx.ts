/** Small math helpers shared across the game. */
import * as THREE from 'three';

export const clamp = (x: number, lo: number, hi: number): number =>
  x < lo ? lo : x > hi ? hi : x;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Frame-rate independent exponential smoothing. `lambda` is the rate; higher =
 * snappier. Equivalent to lerp toward target but stable across variable dt.
 */
export const damp = (current: number, target: number, lambda: number, dt: number): number =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

export const dampVec = (
  current: THREE.Vector3,
  target: THREE.Vector3,
  lambda: number,
  dt: number,
): THREE.Vector3 => {
  const t = 1 - Math.exp(-lambda * dt);
  current.x = lerp(current.x, target.x, t);
  current.y = lerp(current.y, target.y, t);
  current.z = lerp(current.z, target.z, t);
  return current;
};

export const moveTowards = (current: number, target: number, maxDelta: number): number => {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
};

/** Shortest signed angular difference (radians). */
export const angleDelta = (a: number, b: number): number => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

export const dampAngle = (current: number, target: number, lambda: number, dt: number): number =>
  current + angleDelta(current, target) * (1 - Math.exp(-lambda * dt));

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Reusable scratch vectors to avoid per-frame allocations in hot paths. */
export const scratch = {
  v0: new THREE.Vector3(),
  v1: new THREE.Vector3(),
  v2: new THREE.Vector3(),
  v3: new THREE.Vector3(),
};
