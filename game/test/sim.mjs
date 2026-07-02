// Headless physics sanity checks: node game/test/sim.mjs
// Steps the real Player + World at 120 Hz with scripted inputs and asserts
// the design contracts: dash redirects without boosting, the cap holds,
// speed comes from crouch-bhops, nothing NaNs.

import * as THREE from '../vendor/three.module.js';
import { World } from '../src/world.js';
import { Player, PLAYER_CAP } from '../src/player.js';

const stubScene = { add() {} };
const H = 1 / 120;

function makeInput(over = {}) {
  return {
    move: { x: 0, z: 0 },
    jumpHeld: false, crouchHeld: false, shootHeld: false, grappleHeld: false,
    jump: false, dash: false, crouch: false, pound: false,
    blast: false, grapple: false, grappleUp: false, shoot: false,
    ...over,
  };
}

const aimDown = { origin: new THREE.Vector3(), dir: new THREE.Vector3(0, -1, 0) };

let pass = 0, fail = 0;
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
}

function fresh() {
  const world = new World(stubScene);
  const events = [];
  const player = new Player(world, (n, d) => events.push(n));
  return { world, player, events };
}

function run(player, world, seconds, inputFn) {
  const steps = Math.round(seconds / H);
  for (let i = 0; i < steps; i++) {
    const t = i * H;
    const inp = inputFn(t, i);
    player.update(H, inp, player.__yaw ?? 0, aimDown);
    world.update(t, H);
  }
}

// ---------------------------------------------------------------
console.log('1. running builds speed fast (light & eager)');
{
  const { world, player } = fresh();
  run(player, world, 1.0, () => makeInput({ move: { x: 0, z: 1 } }));
  check('speed >= 9.5 after 1s of running', player.hspeed() >= 9.5, `got ${player.hspeed().toFixed(1)}`);
  check('grounded', player.grounded);
}

console.log('2. dash is a redirect, not a boost');
{
  const { world, player } = fresh();
  // standstill dash: moves you at run speed, no more
  run(player, world, 0.2, () => makeInput());
  run(player, world, 0.1, (t, i) => makeInput({ move: { x: 0, z: 1 }, dash: i === 0 }));
  check('standstill dash ~ run speed', player.hspeed() >= 8.5 && player.hspeed() <= 11.5, `got ${player.hspeed().toFixed(1)}`);

  // at speed: dash sideways keeps the same speed, new direction
  player.reset(new THREE.Vector3(0, 1.5, 14));
  player.vel.set(0, 0, -16);
  player.dashCharges = 1; player.dashCooldown = 0;
  run(player, world, 0.03, (t, i) => makeInput({ move: { x: 1, z: 0 }, dash: i === 0 }));
  const sAfter = player.hspeed();
  check('dash kept speed (±0.5)', Math.abs(sAfter - 16) < 0.5, `got ${sAfter.toFixed(1)}`);
  check('dash changed direction', player.vel.x > 10, `vx=${player.vel.x.toFixed(1)}`);

  // no consecutive dashes: a second dash (no move keys, so an accepted dash
  // would snap velocity to camera-forward) must be refused outright
  const dirBefore = Math.atan2(player.vel.x, -player.vel.z);
  run(player, world, 0.03, (t, i) => makeInput({ dash: i === 0 }));
  const dirAfter = Math.atan2(player.vel.x, -player.vel.z);
  check('second dash refused (cooldown/charge)',
    player.dashCharges === 0 && Math.abs(dirAfter - dirBefore) < 0.05,
    `turned ${(dirAfter - dirBefore).toFixed(2)} charges=${player.dashCharges}`);

  // dash at the cap never exceeds it
  player.vel.set(0, 0, -PLAYER_CAP);
  player.dashCharges = 1; player.dashCooldown = 0;
  run(player, world, 0.03, (t, i) => makeInput({ move: { x: 1, z: 0 }, dash: i === 0 }));
  check('speed <= cap after dash at cap', player.hspeed() <= PLAYER_CAP + 0.01, `got ${player.hspeed().toFixed(1)}`);
}

console.log('3. crouch-bhopping builds speed toward the cap; plain hops just keep it');
{
  const { world, player } = fresh();
  let maxSpd = 0;
  run(player, world, 8, (t) => {
    player.__yaw = t * 0.8;
    maxSpd = Math.max(maxSpd, player.hspeed());
    return makeInput({ move: { x: 0, z: 1 }, jump: true, crouchHeld: true });
  });
  check('crouch-bhop chain reached 15+', maxSpd >= 15, `max ${maxSpd.toFixed(1)}`);
  check('never exceeded the cap', maxSpd <= PLAYER_CAP + 0.01, `max ${maxSpd.toFixed(1)}`);

  // plain bhop: speed holds but doesn't grow past run-build range
  const { world: w2, player: p2 } = fresh();
  let max2 = 0;
  run(p2, w2, 6, (t) => {
    p2.__yaw = t * 0.8;
    max2 = Math.max(max2, p2.hspeed());
    return makeInput({ move: { x: 0, z: 1 }, jump: true });
  });
  check('plain bhop stays controlled (< 16)', max2 < 16, `max ${max2.toFixed(1)}`);
}

console.log('4. jump pad launches with zero skill');
{
  const { world, player, events } = fresh();
  player.reset(new THREE.Vector3(0, -25.5, -95));
  run(player, world, 0.3, () => makeInput());
  check('pad fired', events.includes('pad'));
  check('flying upward', player.vel.y > 10, `vy=${player.vel.y.toFixed(1)}`);
}

console.log('5. grapple tap = pull: reels in, never bonks');
{
  const { world, player, events } = fresh();
  const anchor = world.anchors[0].pos;
  const d0 = player.pos.distanceTo(anchor);
  const aim = {
    origin: new THREE.Vector3(0, 1.5, 14),
    dir: anchor.clone().sub(new THREE.Vector3(0, 1.5, 14)).normalize(),
  };
  let minD = d0;
  const steps = Math.round(3.5 / H);
  for (let i = 0; i < steps; i++) {
    const inp = makeInput({ grapple: i === 10, grappleUp: i === 12 });
    player.update(H, inp, 0, aim);
    minD = Math.min(minD, player.center().distanceTo(anchor));
  }
  check('grapple fired', events.includes('grapple_fire'));
  check('pull arrived', events.includes('grapple_pull_arrive'));
  check('reeled in right next to the ring', minD < 6, `minD=${minD.toFixed(1)}`);
  check('still has speed after arriving', player.hspeed() + Math.abs(player.vel.y) > 3);
}

console.log('6. grapple hold = pull-swing toward the point');
{
  const { world, player, events } = fresh();
  const anchor = world.anchors[0].pos; // ring over the runway
  const aim = {
    origin: new THREE.Vector3(0, 1.5, 14),
    dir: anchor.clone().sub(new THREE.Vector3(0, 1.5, 14)).normalize(),
  };
  const d0 = player.center().distanceTo(anchor);
  let minD = d0;
  const steps = Math.round(2.5 / H);
  for (let i = 0; i < steps; i++) {
    const inp = makeInput({ grapple: i === 5, grappleHeld: i >= 5 });
    player.update(H, inp, 0, aim);
    minD = Math.min(minD, player.center().distanceTo(anchor));
  }
  check('swing latched', events.includes('grapple_latch'));
  check('swing carried player to the point', minD < 7, `minD=${minD.toFixed(1)} d0=${d0.toFixed(1)}`);
}

console.log('7. wall-run starts on contact and holds you up');
{
  const { world, player, events } = fresh();
  player.reset(new THREE.Vector3(-6.2, 6, -50));
  player.vel.set(-2, 0, -14);
  run(player, world, 1.0, () => makeInput({ move: { x: 0, z: 1 } }));
  check('wallrun started', events.includes('wallrun_start'));
  check('held altitude (not fallen)', player.pos.y > 2, `y=${player.pos.y.toFixed(1)}`);
  check('kept speed', player.hspeed() >= 12, `got ${player.hspeed().toFixed(1)}`);
}

console.log('8. rocket-blast is a superjump');
{
  const { world, player } = fresh();
  run(player, world, 0.2, () => makeInput());
  player.applyBlast(player.pos.clone(), 9, 27);
  check('launched hard upward', player.vel.y > 14, `vy=${player.vel.y.toFixed(1)}`);
}

console.log('9. falling off the world respawns you at safe ground');
{
  const { world, player, events } = fresh();
  run(player, world, 0.5, () => makeInput({ move: { x: 0, z: 1 } }));
  player.pos.set(0, -100, -60);
  run(player, world, 0.1, () => makeInput());
  check('respawned', events.includes('respawn'));
  check('back on safe ground area', player.pos.y > -5, `y=${player.pos.y.toFixed(1)}`);
}

console.log('10. slide hill accelerates you downhill');
{
  const { world, player } = fresh();
  player.reset(new THREE.Vector3(38, 1.5, 10));
  run(player, world, 0.4, () => makeInput({ move: { x: 1, z: 0 } }));
  const before = player.hspeed();
  run(player, world, 1.4, () => makeInput({ move: { x: 1, z: 0 }, crouchHeld: true }));
  check('sliding gained speed downhill', player.hspeed() > before + 3, `${before.toFixed(1)} -> ${player.hspeed().toFixed(1)}`);
}

console.log('11. zipline attach + moderate ride speed');
{
  const { world, player, events } = fresh();
  player.reset(new THREE.Vector3(-15, 4.2, 11));
  player.vel.set(0, 2, -3);
  player.grounded = false;
  run(player, world, 1.2, () => makeInput());
  check('attached to zipline', events.includes('zip_attach'));
  const s = player.hspeed();
  check('riding at a controlled speed', (s >= 13 && s <= 20.5) || events.includes('zip_dismount'), `got ${s.toFixed(1)}`);
}

console.log('12. grind rails: land on one, grind, jump off');
{
  const { world, player, events } = fresh();
  player.reset(new THREE.Vector3(-16, 0.9, 20));
  player.vel.set(-2.4, 0, -7.7); // along the plaza rail
  run(player, world, 1.0, () => makeInput());
  check('attached to rail', events.includes('zip_attach') && player.zip && player.zip.type === 'rail',
    player.zip ? player.zip.type : 'not riding');
  const s = player.hspeed();
  check('grinding at speed', s >= 11, `got ${s.toFixed(1)}`);
  run(player, world, 0.2, (t, i) => makeInput({ jump: i === 0 }));
  check('jumped off the rail', !player.zip && events.includes('zip_dismount'));
}

console.log('13. fuzz: 30s of chaotic input never NaNs or breaks the cap');
{
  const { world, player } = fresh();
  let ok = true;
  let capOk = true;
  let rngState = 12345;
  const rng = () => (rngState = (rngState * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  run(player, world, 30, (t, i) => {
    if (i % 7 === 0) player.__yaw = rng() * Math.PI * 2;
    const inp = makeInput({
      move: { x: Math.round(rng() * 2 - 1), z: Math.round(rng() * 2 - 1) },
      jump: rng() < 0.08, jumpHeld: rng() < 0.3, dash: rng() < 0.05,
      crouch: rng() < 0.04, crouchHeld: rng() < 0.2, pound: rng() < 0.03,
      grapple: rng() < 0.04, grappleUp: rng() < 0.04, grappleHeld: rng() < 0.3,
    });
    if (!Number.isFinite(player.pos.x + player.pos.y + player.pos.z) ||
        !Number.isFinite(player.vel.x + player.vel.y + player.vel.z)) ok = false;
    if (player.hspeed() > PLAYER_CAP + 0.01) capOk = false;
    return inp;
  });
  check('position & velocity stayed finite', ok);
  check('horizontal speed never broke the cap', capOk, `got ${player.hspeed().toFixed(1)}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
