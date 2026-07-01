import * as THREE from '../vendor/three.module.js';
import { PAL, clamp } from './util.js';
import { Input } from './input.js';
import { World } from './world.js';
import { Player, PLAYER_CAP } from './player.js';
import { Character } from './character.js';
import { CameraRig } from './cameraRig.js';
import { Effects } from './effects.js';
import { Combat } from './combat.js';
import { GameAudio } from './audio.js';

// ---------------------------------------------------------------------------
// Bootstrap + game loop. Physics runs in fixed 120 Hz substeps; visuals run
// per-frame. All player events fan out from here to audio, effects, camera
// kicks, and the flow combo meter.
// ---------------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xffd9f2, 140, 700);

scene.add(new THREE.HemisphereLight(0xbfefff, 0x7a5fa0, 0.95));
const sunLight = new THREE.DirectionalLight(0xfff2d0, 1.0);
sunLight.position.set(0.6, 1, 0.35);
scene.add(sunLight);

const audio = new GameAudio();
const input = new Input(renderer.domElement);
const world = new World(scene);
const player = new Player(world, onEvent);
const character = new Character(scene);
const cameraRig = new CameraRig(innerWidth / innerHeight);
cameraRig.yaw = world.spawnYaw;
const effects = new Effects(scene, cameraRig.camera);
const combat = new Combat(scene, world, player, effects, onEvent);

// ---------- HUD ----------
const $ = (id) => document.getElementById(id);
const hud = {
  speedNum: $('speedNum'), speedBar: $('speedBar'),
  pips: [...document.querySelectorAll('.pip')],
  flow: $('flow'), flowX: $('flowX'), flowLast: $('flowLast'),
  score: $('score'), toast: $('toast'), help: $('help'),
  crosshair: $('crosshair'), overlay: $('overlay'),
};

let toastTimer = 0;
function toast(msg, dur = 2.2) {
  hud.toast.textContent = msg;
  hud.toast.classList.add('on');
  toastTimer = dur;
}

// ---------- flow combo ----------
const FLOW_EVENTS = {
  dash: 'DASH', bhop: 'B-HOP', slidehop: 'SLIDE HOP', wallrun_start: 'WALL RUN',
  wallkick: 'WALL KICK', doublejump: 'DOUBLE JUMP', grapple_release: 'SWING SLING',
  grapple_pull_arrive: 'ZIP PULL', zip_dismount: 'LINE LAUNCH', pad: 'BOOSTED',
  rocketjump: 'ROCKET JUMP', pound_land: 'SLAM', mantle: 'LEDGE SAVE',
};
let combo = 0, comboTimer = 0;
const milestones = { max: false, flow5: false };

function bumpFlow(label) {
  combo = comboTimer > 0 ? combo + 1 : 1;
  comboTimer = 4;
  hud.flowX.textContent = 'x' + combo;
  hud.flowLast.textContent = label;
  hud.flow.classList.toggle('on', combo >= 2);
  if (combo >= 2) audio.play('flow', { combo });
  if (combo === 5 && !milestones.flow5) {
    milestones.flow5 = true;
    toast('★ FLOW x5 — YOU\'RE A NATURAL ★');
  }
}

// ---------- event fan-out ----------
const _feet = new THREE.Vector3();
function onEvent(name, data = {}) {
  audio.play(name, data);
  if (FLOW_EVENTS[name]) bumpFlow(FLOW_EVENTS[name]);
  _feet.copy(player.pos); _feet.y += 0.15;
  switch (name) {
    case 'jump': case 'doublejump':
      effects.burst(_feet, { color: PAL.cream, count: 6, speed: 3, life: 0.35, size: 6, up: 1, spread: 0.4, gravity: 8 });
      break;
    case 'bhop':
      effects.burst(_feet, { color: PAL.teal, count: 5, speed: 3, life: 0.3, size: 5, up: 1, spread: 0.4, gravity: 8 });
      break;
    case 'dash':
      cameraRig.addKick(6);
      effects.burst(_feet, { color: PAL.magenta, count: 12, speed: 5, life: 0.35, size: 8, up: 1, spread: 0.7, gravity: 0 });
      break;
    case 'land':
      effects.burst(_feet, { color: PAL.cream, count: Math.min(16, 4 + data.impact * 0.5), speed: 4, life: 0.4, size: 7, up: 1.5, spread: 0.6, gravity: 10 });
      break;
    case 'slidehop':
      effects.burst(_feet, { color: PAL.gold, count: 10, speed: 5, life: 0.4, size: 7, up: 2, spread: 0.5, gravity: 8 });
      break;
    case 'wallkick':
      effects.burst(_feet, { color: PAL.gold, count: 8, speed: 4, life: 0.35, size: 6, up: 2, spread: 0.4, gravity: 8 });
      break;
    case 'pound_land':
      effects.ring(_feet, PAL.coral, 7, 0.5);
      effects.burst(_feet, { color: PAL.coral, count: 24, speed: 9, life: 0.5, size: 8, up: 4, spread: 0.6, gravity: 12 });
      cameraRig.addShake(0.55);
      break;
    case 'pad':
      effects.ring(data.pos || _feet, PAL.gold, 6, 0.4);
      cameraRig.addKick(8);
      break;
    case 'rocketjump':
      cameraRig.addKick(9);
      cameraRig.addShake(0.3);
      break;
    case 'grapple_release':
      cameraRig.addKick(5);
      break;
    case 'zip_dismount':
      cameraRig.addKick(4);
      effects.burst(_feet, { color: PAL.teal, count: 8, speed: 4, life: 0.35, size: 6, up: 1, spread: 0.5, gravity: 6 });
      break;
    case 'splash': {
      const s = _feet.clone(); s.y += 0.6;
      effects.burst(s, { color: PAL.water, count: 18, speed: 6, life: 0.5, size: 8, up: 5, spread: 0.8, gravity: 16 });
      break;
    }
    case 'respawn':
      toast('SAVED — dash to rebuild your speed!');
      break;
    case 'target_hit':
      hud.score.innerHTML = `${combat.score}<small>ORBS&nbsp;POPPED</small>`;
      hud.crosshair.classList.add('pop');
      setTimeout(() => hud.crosshair.classList.remove('pop'), 110);
      break;
  }
}

// ---------- overlay / pointer lock ----------
function startGame() {
  audio.start();
  if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
  input.requestLock();
  hud.overlay.classList.add('hidden');
}
hud.overlay.addEventListener('click', startGame);
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== renderer.domElement) hud.overlay.classList.remove('hidden');
  else hud.overlay.classList.add('hidden');
});

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  cameraRig.camera.aspect = innerWidth / innerHeight;
  cameraRig.camera.updateProjectionMatrix();
});

// ---------- loop ----------
const PH = 1 / 120;
const _muzzle = new THREE.Vector3();
let last = performance.now();
let elapsed = 0;

function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (dt <= 0) return;
  elapsed += dt;

  const snap = input.snapshot();
  const md = input.consumeMouseDelta();
  cameraRig.applyMouse(md.x, md.y);

  if (snap.respawn) {
    player.reset(world.spawn);
    cameraRig.yaw = world.spawnYaw;
    cameraRig.pitch = -0.12;
    combat.score = combat.score; // score persists
    onEvent('respawn');
  }
  if (snap.help) hud.help.classList.toggle('hidden');

  const aim = cameraRig.aim();

  // fixed-step physics; edge inputs only fire on the first substep
  const n = Math.max(1, Math.ceil(dt / PH));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const sub = i === 0 ? snap : {
      ...snap, jump: false, dash: false, crouch: false, pound: false,
      blast: false, grapple: false, grappleUp: false, shoot: false,
    };
    player.update(h, sub, cameraRig.yaw, aim);
  }

  world.update(elapsed, dt);
  character.update(dt, player, cameraRig.yaw, aim.dir, snap.shootHeld || snap.blast);
  character.muzzle(_muzzle);
  combat.update(dt, snap, _muzzle, aim);
  cameraRig.update(dt, player, world, snap.move.x);
  effects.update(dt, elapsed, player, world);

  // grapple line visual
  if (player.grapple && player.grapple.point) {
    effects.grappleLine(_muzzle, player.grapple.point, player.grapple.mode === 'pull' ? PAL.gold : PAL.magenta);
  } else {
    effects.hideGrapple();
  }

  // HUD
  const spd = player.hspeed();
  hud.speedNum.textContent = Math.round(spd);
  hud.speedBar.style.width = `${Math.min(100, (spd / PLAYER_CAP) * 100)}%`;
  const atMax = spd >= PLAYER_CAP - 0.6;
  hud.speedNum.classList.toggle('max', atMax);
  if (atMax && !milestones.max) {
    milestones.max = true;
    toast('★ MAX SPEED — NOW KEEP IT FLYING ★');
  }
  for (let i = 0; i < 3; i++) {
    const pip = hud.pips[i];
    const fill = pip.firstElementChild;
    if (i < player.dashCharges) { pip.classList.add('full'); fill.style.width = '100%'; }
    else if (i === player.dashCharges) { pip.classList.remove('full'); fill.style.width = `${(player.dashRecharge / 1.6) * 100}%`; }
    else { pip.classList.remove('full'); fill.style.width = '0%'; }
  }
  comboTimer -= dt;
  if (comboTimer <= 0 && combo > 0) { combo = 0; hud.flow.classList.remove('on'); }
  toastTimer -= dt;
  if (toastTimer <= 0) hud.toast.classList.remove('on');

  audio.setWind(player.speedFrac());
  renderer.render(scene, cameraRig.camera);
}
requestAnimationFrame(frame);

// exposed for headless testing / tinkering
window.__game = { player, world, cameraRig, input, combat, character, startGame, THREE };
