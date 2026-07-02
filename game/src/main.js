import * as THREE from '../vendor/three.module.js';
import { PAL, clamp } from './util.js';
import { Input } from './input.js';
import { World } from './world.js';
import { Player, PLAYER_CAP } from './player.js';
import { Character, ACCENTS } from './character.js';
import { CameraRig } from './cameraRig.js';
import { Effects } from './effects.js';
import { Combat } from './combat.js';
import { GameAudio } from './audio.js';
import { Net } from './net.js';
import { RemotePlayer, F } from './remote.js';

// ---------------------------------------------------------------------------
// Bootstrap + game loop + multiplayer orchestration.
// Solo: the Prisma Cove playground. Multiplayer: the Prisma Ring arena over
// P2P WebRTC — the host's room code is the only thing friends need.
// ---------------------------------------------------------------------------

// ---------- mode from URL ----------
const qs = new URLSearchParams(location.search);
const MODE = qs.get('mode') === 'arena' ? 'arena' : 'cove';
const AUTO_HOST = qs.has('host');
const JOIN_CODE = (qs.get('join') || '').toUpperCase();
const MY_NAME = (qs.get('name') || localStorage.getItem('fg-name') || 'RUNNER')
  .replace(/[^\w \-!.]/g, '').slice(0, 14) || 'RUNNER';
if (qs.get('name')) localStorage.setItem('fg-name', MY_NAME);

const RESPAWN_T = 3;
const PROTECT_T = 2;
// networking timers use real time: game-time dilates under heavy load and
// every peer's clock must agree on respawn/regen pacing
const rtNow = () => performance.now() / 1000;

// ---------- three.js scaffolding ----------
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
const world = new World(scene, MODE);
const player = new Player(world, onEvent);
let character = new Character(scene);
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
  goBtn: $('goBtn'), mpCard: $('mpCard'), mpStatus: $('mpStatus'),
  nameInput: $('nameInput'), codeInput: $('codeInput'),
  hostBtn: $('hostBtn'), joinBtn: $('joinBtn'),
  hpWrap: $('hpWrap'), hpBar: $('hpBar'),
  killfeed: $('killfeed'), death: $('death'), deathInfo: $('deathInfo'),
};
hud.nameInput.value = MY_NAME === 'RUNNER' ? '' : MY_NAME;

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

// ---------- multiplayer state ----------
let net = null;
let myNetId = null;
let myHp = 100;
let myFrags = 0;
let dead = false;
let deadUntil = 0;
const remotes = new Map();   // id -> RemotePlayer
const names = new Map();     // id -> name (includes self)
const roster = new Map();    // host only: id -> {name, accent, hp, frags, dead, lastDmg, protectUntil, respawnAt}
let nextAccent = 1;
let sendTimer = 0;
let regenTimer = 0;
const killfeedItems = [];

const inArena = MODE === 'arena';
if (inArena) {
  hud.score.innerHTML = `0<small>FRAGS</small>`;
  hud.hpWrap.style.display = 'block';
}

function r2(v) { return Math.round(v * 100) / 100; }

function packState() {
  let f = 0;
  if (player.grounded) f |= F.GROUNDED;
  if (player.sliding) f |= F.SLIDING;
  if (player.glide) f |= F.GLIDE;
  if (player.pound) f |= F.POUND;
  if (player.wallrun) f |= player.wallrun.side < 0 ? F.WALL_L : F.WALL_R;
  if (player.zip) f |= player.zip.type === 'rail' ? F.RAIL : F.ZIP;
  if (dead) f |= F.DEAD;
  const m = {
    t: 's',
    p: [r2(player.pos.x), r2(player.pos.y), r2(player.pos.z)],
    v: [r2(player.vel.x), r2(player.vel.y), r2(player.vel.z)],
    yw: r2(character.yaw), f,
  };
  const g = player.grapple;
  if (g && g.point) m.g = [r2(g.point.x), r2(g.point.y), r2(g.point.z)];
  return m;
}

function addRemote(id, name, accent) {
  if (remotes.has(id) || id === myNetId) return;
  names.set(id, name);
  remotes.set(id, new RemotePlayer(scene, id, name, accent));
}

function dropRemote(id) {
  const r = remotes.get(id);
  if (r) { r.dispose(); remotes.delete(id); }
  names.delete(id);
}

function killfeedAdd(kName, vName) {
  killfeedItems.push({ t: rtNow(), html: `<span class="k">${kName}</span> ⚡ <span class="v">${vName}</span>` });
  if (killfeedItems.length > 5) killfeedItems.shift();
  renderKillfeed();
}

function renderKillfeed() {
  hud.killfeed.innerHTML = killfeedItems.map((k) => `<div>${k.html}</div>`).join('');
}

function setMyHp(hp) {
  const was = myHp;
  myHp = hp;
  hud.hpBar.style.width = `${clamp(hp, 0, 100)}%`;
  hud.hpBar.classList.toggle('low', hp <= 40);
  if (hp < was && hp > 0) audio.play('hurt');
}

function dieLocal(killerId) {
  if (dead) return;
  dead = true;
  deadUntil = rtNow() + RESPAWN_T;
  audio.play('death');
  const c = player.center();
  effects.burst(c, { color: PAL.coral, count: 30, speed: 9, life: 0.7, size: 9, up: 6, spread: 0.6, gravity: 14 });
  effects.ring(c, PAL.coral, 6, 0.5);
  character.root.visible = false;
  player.vel.set(0, 0, 0);
  if (player.grapple) player.endGrapple();
  player.zip = null;
  hud.death.classList.add('on');
  hud.deathInfo.textContent = `splatted by ${names.get(killerId) || 'a friend'}`;
}

function respawnLocal() {
  dead = false;
  const sp = world.randomSpawn();
  player.reset(sp.pos);
  cameraRig.yaw = sp.yaw;
  cameraRig.pitch = -0.12;
  character.root.visible = true;
  hud.death.classList.remove('on');
  audio.play('respawn');
}

// ---------- host authority ----------
function hostHit(fromId, tg, dmg) {
  const r = roster.get(tg);
  if (!r || r.dead || rtNow() < r.protectUntil) return;
  r.hp = Math.max(0, r.hp - dmg);
  r.lastDmg = rtNow();
  if (r.hp <= 0) {
    r.dead = true;
    r.respawnAt = rtNow() + RESPAWN_T;
    const killer = roster.get(fromId);
    if (killer) killer.frags++;
    hostFanout({ t: 'kill', k: fromId, v: tg });
  } else {
    hostFanout({ t: 'hp', id: tg, hp: r.hp });
  }
}

function hostTick() {
  regenTimer -= 1;
  for (const [id, r] of roster) {
    if (r.dead && rtNow() >= r.respawnAt) {
      r.dead = false;
      r.hp = 100;
      r.protectUntil = rtNow() + PROTECT_T;
      hostFanout({ t: 'hp', id, hp: 100 });
    }
    if (regenTimer <= 0 && !r.dead && r.hp < 100 && rtNow() - r.lastDmg > 6) {
      r.hp = Math.min(100, r.hp + 8);
      hostFanout({ t: 'hp', id, hp: r.hp });
    }
  }
  if (regenTimer <= 0) regenTimer = 2; // regen pulse every ~0.5s (called at 4Hz)
}

// host: broadcast to clients AND apply locally
function hostFanout(msg, exceptId = null) {
  net.broadcast(msg, exceptId);
  applyMsg(msg, 'host');
}

// shared message application (client receives these; host applies its own)
function applyMsg(msg, from) {
  switch (msg.t) {
    case 's': {
      const r = remotes.get(msg.id ?? from);
      if (r) r.pushSnapshot(msg, rtNow());
      break;
    }
    case 'shot': {
      const id = msg.id ?? from;
      if (id !== myNetId) {
        combat.spawnTracer(
          new THREE.Vector3(...msg.o), new THREE.Vector3(...msg.d),
        );
      }
      break;
    }
    case 'boom': {
      const id = msg.id ?? from;
      if (id !== myNetId) combat.remoteBoom(new THREE.Vector3(...msg.p));
      break;
    }
    case 'hp': {
      if (msg.id === myNetId) {
        setMyHp(msg.hp);
        if (dead && msg.hp > 0) respawnLocal(); // host says you're back
      } else {
        const r = remotes.get(msg.id);
        if (r) { r.setHp(msg.hp); if (msg.hp > 0 && !r.alive) r.setDead(false); }
      }
      break;
    }
    case 'kill': {
      killfeedAdd(names.get(msg.k) || '???', names.get(msg.v) || '???');
      if (msg.v === myNetId) {
        setMyHp(0);
        dieLocal(msg.k);
      } else {
        const r = remotes.get(msg.v);
        if (r) {
          const c = r.center().clone();
          effects.burst(c, { color: PAL.coral, count: 24, speed: 8, life: 0.6, size: 8, up: 5, spread: 0.5, gravity: 12 });
          r.setDead(true);
          r.setHp(0);
        }
      }
      if (msg.k === myNetId && msg.v !== myNetId) {
        myFrags++;
        hud.score.innerHTML = `${myFrags}<small>FRAGS</small>`;
        audio.play('kill');
        toast(`⚡ splatted ${names.get(msg.v) || 'a friend'}!`, 1.6);
      }
      break;
    }
    case 'join': {
      addRemote(msg.id, msg.name, msg.accent);
      toast(`${msg.name} joined the arena!`);
      break;
    }
    case 'leave': {
      const nm = names.get(msg.id);
      dropRemote(msg.id);
      if (nm) toast(`${nm} left`);
      break;
    }
  }
}

function setupNet() {
  net = new Net();
  combat.remotes = () => remotes.values();
  combat.onHit = (tg, dmg) => {
    if (dead) return;
    if (net.isHost) hostHit('host', tg, dmg);
    else net.send({ t: 'hit', tg, dmg });
  };
  combat.onBoom = (pos) => {
    net.send({ t: 'boom', p: [r2(pos.x), r2(pos.y), r2(pos.z)] });
  };
  net.on('error', (e) => {
    if (e.type === 'peer-unavailable') hud.mpStatus.innerHTML = '<span class="err">room not found — check the code</span>';
    else if (!net.connected) hud.mpStatus.innerHTML = `<span class="err">connection trouble (${e.type || e})</span>`;
  });
}

function startHosting() {
  setupNet();
  myNetId = 'host';
  names.set('host', MY_NAME);
  roster.set('host', { name: MY_NAME, accent: 0, hp: 100, frags: 0, dead: false, lastDmg: -99, protectUntil: 0, respawnAt: 0 });
  hud.mpStatus.textContent = 'opening a room…';
  net.host().then((code) => {
    const link = `${location.origin}${location.pathname}?mode=arena&join=${code}${qs.get('ps') ? '&ps=' + qs.get('ps') : ''}`;
    hud.mpStatus.innerHTML = `room code: <b>${code}</b><br><span style="font-size:11px;opacity:.75">friends: enter the code, or open<br>${link}</span>`;
    hud.goBtn.classList.remove('hidden');
  }).catch(() => {
    hud.mpStatus.innerHTML = '<span class="err">could not reach the signaling service</span>';
  });

  net.on('data', (msg, fromId) => {
    switch (msg.t) {
      case 'hello': {
        const accent = nextAccent++ % ACCENTS.length;
        roster.set(fromId, { name: msg.name, accent, hp: 100, frags: 0, dead: false, lastDmg: -99, protectUntil: rtNow() + PROTECT_T, respawnAt: 0 });
        names.set(fromId, msg.name);
        addRemote(fromId, msg.name, accent);
        toast(`${msg.name} joined the arena!`);
        net.sendTo(fromId, {
          t: 'welcome', you: fromId, accent,
          roster: [...roster.entries()].map(([id, r]) => [id, r.name, r.accent, r.hp, r.frags]),
        });
        net.broadcast({ t: 'join', id: fromId, name: msg.name, accent }, fromId);
        break;
      }
      case 's': case 'shot': case 'boom':
        applyMsg({ ...msg, id: fromId }, fromId);
        net.broadcast({ ...msg, id: fromId }, fromId);
        break;
      case 'hit':
        hostHit(fromId, msg.tg, Math.min(50, Math.max(1, msg.dmg | 0)));
        break;
    }
  });
  net.on('peerleave', (id) => {
    const nm = names.get(id);
    roster.delete(id);
    dropRemote(id);
    net.broadcast({ t: 'leave', id });
    if (nm) toast(`${nm} left`);
  });
}

function startJoining(code) {
  setupNet();
  hud.mpStatus.textContent = `joining room ${code}…`;
  net.join(code).then(() => {
    myNetId = net.myId;
    names.set(myNetId, MY_NAME);
    net.send({ t: 'hello', name: MY_NAME });
    hud.mpStatus.textContent = 'connected! waiting for the roster…';
  }).catch(() => { /* error handler shows the message */ });

  net.on('data', (msg) => {
    if (msg.t === 'welcome') {
      for (const [id, name, accent, hp] of msg.roster) {
        names.set(id, name);
        if (id !== myNetId) {
          addRemote(id, name, accent);
          remotes.get(id)?.setHp(hp);
        }
      }
      // wear your assigned colors
      character.dispose();
      character = new Character(scene, ACCENTS[msg.accent % ACCENTS.length]);
      hud.mpStatus.innerHTML = `in room <b>${code}</b> — ${msg.roster.length - 1} friend(s) here`;
      hud.goBtn.classList.remove('hidden');
      return;
    }
    applyMsg(msg, 'host');
  });
  net.on('peerleave', () => {
    toast('the host closed the room');
    setTimeout(() => { location.href = location.pathname; }, 1800);
  });
}

// ---------- event fan-out (audio + fx + flow + net) ----------
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
    case 'shoot':
      if (net && net.connected && data.o) net.send({ t: 'shot', o: data.o, d: data.d });
      break;
    case 'hitmark':
      hud.crosshair.classList.add('pop');
      setTimeout(() => hud.crosshair.classList.remove('pop'), 110);
      break;
    case 'target_hit':
      hud.score.innerHTML = inArena ? `${myFrags}<small>FRAGS</small>` : `${combat.score}<small>ORBS&nbsp;POPPED</small>`;
      hud.crosshair.classList.add('pop');
      setTimeout(() => hud.crosshair.classList.remove('pop'), 110);
      break;
  }
}

// ---------- overlay / menu ----------
function startGame() {
  audio.start();
  if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
  input.requestLock();
  hud.overlay.classList.add('hidden');
}

function currentName() {
  return (hud.nameInput.value || 'RUNNER').replace(/[^\w \-!.]/g, '').slice(0, 14) || 'RUNNER';
}

function nav(params) {
  localStorage.setItem('fg-name', currentName());
  const ps = qs.get('ps') ? `&ps=${qs.get('ps')}` : '';
  location.href = `${location.pathname}?${params}&name=${encodeURIComponent(currentName())}${ps}`;
}

hud.goBtn.addEventListener('click', (e) => { e.stopPropagation(); startGame(); });
hud.hostBtn.addEventListener('click', (e) => { e.stopPropagation(); nav('mode=arena&host=1'); });
hud.joinBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const code = hud.codeInput.value.trim().toUpperCase();
  if (code.length >= 4) nav(`mode=arena&join=${code}`);
  else hud.mpStatus.innerHTML = '<span class="err">enter the 5-letter room code</span>';
});
[hud.nameInput, hud.codeInput].forEach((el) => {
  el.addEventListener('click', (e) => e.stopPropagation());
  el.addEventListener('keydown', (e) => e.stopPropagation());
});
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== renderer.domElement) {
    hud.overlay.classList.remove('hidden');
    if (net) hud.goBtn.textContent = 'CLICK TO RESUME';
  } else {
    hud.overlay.classList.add('hidden');
  }
});

// arena boot: auto host/join, hide the manual card, gate the go button
if (inArena && (AUTO_HOST || JOIN_CODE)) {
  hud.goBtn.classList.add('hidden');
  hud.mpCard.querySelectorAll('.row').forEach((r) => { r.style.display = 'none'; });
  if (AUTO_HOST) startHosting();
  else startJoining(JOIN_CODE);
} else if (inArena) {
  // arena without params: bounce back to the menu
  location.href = location.pathname;
}

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  cameraRig.camera.aspect = innerWidth / innerHeight;
  cameraRig.camera.updateProjectionMatrix();
});

// ---------- loop ----------
const PH = 1 / 120;
const _muzzle = new THREE.Vector3();
const NEUTRAL = {
  move: { x: 0, z: 0 }, jumpHeld: false, crouchHeld: false, shootHeld: false,
  grappleHeld: false, jump: false, dash: false, crouch: false, pound: false,
  blast: false, grapple: false, grappleUp: false, shoot: false,
};
let last = performance.now();
let elapsed = 0;
let hostTickTimer = 0;

function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (dt <= 0) return;
  elapsed += dt;

  const snap = input.snapshot();
  const md = input.consumeMouseDelta();
  cameraRig.applyMouse(md.x, md.y);

  if (snap.respawn && !dead) {
    const sp = world.randomSpawn();
    player.reset(sp.pos);
    cameraRig.yaw = sp.yaw;
    cameraRig.pitch = -0.12;
    onEvent('respawn');
  }
  if (snap.help) hud.help.classList.toggle('hidden');

  const aim = cameraRig.aim();
  const liveInp = dead ? NEUTRAL : snap;

  // fixed-step physics; edge inputs only fire on the first substep
  if (!dead) {
    const n = Math.max(1, Math.ceil(dt / PH));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const sub = i === 0 ? snap : {
        ...snap, jump: false, dash: false, crouch: false, pound: false,
        blast: false, grapple: false, grappleUp: false, shoot: false,
      };
      player.update(h, sub, cameraRig.yaw, aim);
    }
  } else if (rtNow() >= deadUntil + 0.5) {
    respawnLocal(); // fallback if the host's respawn signal got lost
  } else {
    hud.deathInfo.textContent = `${hud.deathInfo.textContent.split(' — ')[0]} — back in ${Math.max(0, deadUntil - rtNow()).toFixed(1)}s`;
  }

  world.update(elapsed, dt);
  character.update(dt, player, cameraRig.yaw, aim.dir, liveInp.shootHeld || liveInp.blast);
  character.muzzle(_muzzle);
  combat.update(dt, liveInp, _muzzle, aim);
  cameraRig.update(dt, player, world, liveInp.move.x);
  effects.update(dt, elapsed, player, world);

  // remotes
  if (net) {
    for (const r of remotes.values()) r.update(dt, rtNow(), cameraRig.yaw);
    sendTimer -= dt;
    if (net.connected && sendTimer <= 0) {
      sendTimer = 1 / 15;
      const st = packState();
      if (net.isHost) net.broadcast({ ...st, id: 'host' });
      else net.send(st);
    }
    if (net.isHost) {
      hostTickTimer -= dt;
      if (hostTickTimer <= 0) { hostTickTimer = 0.25; hostTick(); }
    }
    // killfeed aging
    while (killfeedItems.length && rtNow() - killfeedItems[0].t > 6) {
      killfeedItems.shift();
      renderKillfeed();
    }
  }

  // grapple line visual
  if (player.grapple && player.grapple.point && !dead) {
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
  {
    const pip = hud.pips[0];
    const fill = pip.firstElementChild;
    if (player.dashCharges > 0 && player.dashCooldown <= 0) {
      pip.classList.add('full'); fill.style.width = '100%';
    } else {
      pip.classList.remove('full');
      const cd = 1 - player.dashCooldown / 0.9;
      fill.style.width = `${Math.round((player.dashCharges > 0 ? cd : Math.min(cd, 0.65)) * 100)}%`;
    }
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
window.__game = {
  player, world, cameraRig, input, combat, character: () => character,
  startGame, THREE, net: () => net, remotes, get myHp() { return myHp; },
  get dead() { return dead; },
};
