// Headless physics sanity checks: node test/sim.mjs (from game/)
// Steps the real Player + World at 120 Hz with scripted inputs and asserts
// the design contracts: speed builds, dashes add, cap holds, nothing NaNs.

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
  check('speed >= 12 after 1s of running', player.hspeed() >= 12, `got ${player.hspeed().toFixed(1)}`);
  check('grounded', player.grounded);
}

console.log('2. dash from standstill = instantly fast');
{
  const { world, player } = fresh();
  run(player, world, 0.2, () => makeInput());
  run(player, world, 0.1, (t, i) => makeInput({ move: { x: 0, z: 1 }, dash: i === 0 }));
  check('speed >= 15 right after dash', player.hspeed() >= 15, `got ${player.hspeed().toFixed(1)}`);
}

console.log('3. dashes always add speed but never break the cap');
{
  const { world, player } = fresh();
  let prev = 0;
  let monotonic = true;
  for (let d = 0; d < 3; d++) { // 3 charges, quick succession over flat ground
    run(player, world, 0.35, (t, i) => makeInput({ move: { x: 0, z: 1 }, dash: i === 0 }));
    const s = player.hspeed();
    if (s < prev - 0.3) monotonic = false;
    prev = s;
  }
  check('each dash added speed', monotonic && prev >= 24, `got ${prev.toFixed(1)}`);
  // at the cap a dash redirects instead of breaking it
  player.vel.set(0, 0, -PLAYER_CAP);
  player.dashCharges = 3;
  run(player, world, 0.05, (t, i) => makeInput({ move: { x: 1, z: 0 }, dash: i === 0 }));
  check('horizontal speed <= cap after dash at cap', player.hspeed() <= PLAYER_CAP + 0.01, `got ${player.hspeed().toFixed(1)}`);
}

console.log('4. bhop chain grows speed all the way to the cap');
{
  const { world, player } = fresh();
  let maxSpd = 0;
  run(player, world, 6, (t) => {
    player.__yaw = t * 0.9;
    maxSpd = Math.max(maxSpd, player.hspeed());
    return makeInput({ move: { x: 0, z: 1 }, jump: true });
  });
  check('bhop chain reached 30+ (cap is 40)', maxSpd >= 30, `max ${maxSpd.toFixed(1)}`);
  check('never exceeded the cap', maxSpd <= PLAYER_CAP + 0.01, `max ${maxSpd.toFixed(1)}`);
}

console.log('5. jump pad launches with zero skill');
{
  const { world, player, events } = fresh();
  player.reset(new THREE.Vector3(0, -25.5, -95)); // safety-net pad under the canyon
  run(player, world, 0.3, () => makeInput());
  check('pad fired', events.includes('pad'));
  check('flying upward', player.vel.y > 10, `vy=${player.vel.y.toFixed(1)}`);
}

console.log('6. grapple pull reels you in and never bonks you to a stop');
{
  const { world, player, events } = fresh();
  // aim at the runway swing ring from spawn
  const anchor = world.anchors[0].pos;
  const start = player.pos.clone();
  const d0 = start.distanceTo(anchor);
  const aim = {
    origin: new THREE.Vector3(0, 1.5, 14),
    dir: anchor.clone().sub(new THREE.Vector3(0, 1.5, 14)).normalize(),
  };
  const steps = Math.round(3 / H);
  let fired = false;
  let minD = d0;
  for (let i = 0; i < steps; i++) {
    const inp = makeInput({ grapple: i === 10, grappleUp: i === 12 }); // tap = pull
    player.update(H, inp, 0, aim);
    if (player.grapple) fired = true;
    minD = Math.min(minD, player.center().distanceTo(anchor));
  }
  check('grapple fired', fired && events.includes('grapple_fire'));
  check('pull arrived', events.includes('grapple_pull_arrive'));
  check('reeled in right next to the ring', minD < 6, `minD=${minD.toFixed(1)}`);
  check('still has speed after arriving', player.hspeed() + Math.abs(player.vel.y) > 3);
}

console.log('7. wall-run starts on contact and feeds speed');
{
  const { world, player, events } = fresh();
  // canyon wall at x=-7.5 spans z -47..-77; run along it airborne
  player.reset(new THREE.Vector3(-6.2, 6, -50));
  player.vel.set(-2, 0, -14); // drifting into the wall while moving along it
  run(player, world, 1.0, () => makeInput({ move: { x: 0, z: 1 } }));
  check('wallrun started', events.includes('wallrun_start'));
  check('held altitude (not fallen)', player.pos.y > 2, `y=${player.pos.y.toFixed(1)}`);
  check('kept speed', player.hspeed() >= 12, `got ${player.hspeed().toFixed(1)}`);
}

console.log('8. rocket-jump: blast under your feet launches you');
{
  const { world, player } = fresh();
  run(player, world, 0.2, () => makeInput());
  const ground = player.pos.clone();
  player.applyBlast(ground, 8.5, 21);
  check('launched upward', player.vel.y > 8, `vy=${player.vel.y.toFixed(1)}`);
}

console.log('9. falling off the world respawns you at safe ground');
{
  const { world, player, events } = fresh();
  run(player, world, 0.5, () => makeInput({ move: { x: 0, z: 1 } }));
  player.pos.set(0, -100, -60); // yeet
  run(player, world, 0.1, () => makeInput());
  check('respawned', events.includes('respawn'));
  check('back on safe ground area', player.pos.y > -5, `y=${player.pos.y.toFixed(1)}`);
}

console.log('10. slide hill accelerates you downhill');
{
  const { world, player } = fresh();
  player.reset(new THREE.Vector3(38, 1.5, 10)); // top of the slide hill
  run(player, world, 0.4, () => makeInput({ move: { x: 1, z: 0 } }));
  const before = player.hspeed();
  run(player, world, 1.4, () => makeInput({ move: { x: 1, z: 0 }, crouchHeld: true }));
  check('sliding gained speed downhill', player.hspeed() > before + 3, `${before.toFixed(1)} -> ${player.hspeed().toFixed(1)}`);
}

console.log('11. zipline attach + ride');
{
  const { world, player, events } = fresh();
  // zipline tower->plaza starts at (-9, 27.5, -178); jump near its lower end (-15, 5, 12)
  player.reset(new THREE.Vector3(-15, 4.2, 11));
  player.vel.set(0, 2, -3);
  player.grounded = false;
  run(player, world, 1.2, () => makeInput());
  check('attached to zipline', events.includes('zip_attach'));
  check('riding fast', player.hspeed() >= 20 || events.includes('zip_dismount'), `got ${player.hspeed().toFixed(1)}`);
}

console.log('12. fuzz: 30s of chaotic input never NaNs or tunnels');
{
  const { world, player } = fresh();
  let ok = true;
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
    return inp;
  });
  check('position & velocity stayed finite', ok);
  check('horizontal speed within cap', player.hspeed() <= PLAYER_CAP + 0.01, `got ${player.hspeed().toFixed(1)}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
