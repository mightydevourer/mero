import * as THREE from '../vendor/three.module.js';

// Candy-bright palette (Gigantic-inspired)
export const PAL = {
  sky: 0x7ee7ff,
  horizon: 0xffd9f2,
  grass: 0x7ce8a2,
  grassDark: 0x4bc97e,
  cliff: 0xfff1d6,
  cliffShade: 0xffd9a8,
  path: 0xff8d7a,
  coral: 0xff7e6b,
  gold: 0xffd24a,
  magenta: 0xff4fd8,
  teal: 0x19d3c5,
  purple: 0x8f6bff,
  plum: 0x5c2e91,
  ink: 0x2b1b4d,
  cream: 0xfff6e8,
  water: 0x35c5f0,
};

// Shared 4-step toon gradient
let _grad = null;
export function toonGradient() {
  if (_grad) return _grad;
  const data = new Uint8Array([90, 150, 210, 255]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  _grad = tex;
  return tex;
}

export function toon(color, opts = {}) {
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: toonGradient(),
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
  });
}

export function glow(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    color, transparent: opacity < 1, opacity,
    toneMapped: false,
  });
}

// Frame-rate independent exponential smoothing
export function damp(cur, target, lambda, dt) {
  return THREE.MathUtils.damp(cur, target, lambda, dt);
}

export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
