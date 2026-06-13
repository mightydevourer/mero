# Mero — Finger-Gun Parkour

A **third-person movement shooter** built around traversal first and combat
second. You point an index finger as a gun and fire magic bullets, but the real
game is the movement: a deep, momentum-driven kit inspired by **Titanfall 2,
Ghostrunner, Mirror's Edge, Warfork/Quake, Sunset Overdrive, Overwatch 2,
Team Fortress 2** and friends.

Built from scratch with **Three.js + TypeScript** and a custom kinematic
character controller — no game engine, no external 3D assets (the hero, the
level and all FX are generated procedurally).

## Play

```bash
npm install
npm run dev        # open the printed localhost URL, click to lock the mouse
```

Build a production bundle with `npm run build` (type-checks, then bundles to
`dist/`) and preview it with `npm run preview`.

## Controls

| Input | Action |
| --- | --- |
| `WASD` | Move (camera-relative) |
| `Mouse` | Aim / look |
| `Space` | Jump → double jump · **hold** to glide / slow-fall |
| `Shift` | Dash (air dash too) |
| `Ctrl` / `C` | Crouch · **slide** when moving · **ground-pound** in the air |
| `LMB` | Shoot magic bullets |
| `RMB` | Grapple **swing** (hold; W/S adjust rope, tap Space to launch off) |
| `F` | Grapple **pull** / reel yourself in |
| `Q` | **Recoil / rocket jump** — explosive blast with self-knockback |
| `Alt` | Walk |
| `R` | Respawn |
| — | Wall-run is automatic on wall contact; jump to **wall-kick** off |

## Movement kit

Every mechanic from the brief is implemented:

- **Ground:** walk, run, crouch, **slide** (with slope acceleration), and
  **bunnyhopping** via buffered jumps that preserve momentum on landing.
- **Air:** **double jump**, **dash**, **air-strafing** (Quake-style clamped air
  acceleration so strafing builds speed), **glide / slow-fall**, and
  **fast-fall / ground-pound** with a landing shockwave.
- **Walls:** **wall-running** (with reduced gravity and camera tilt),
  **wall-kicks / wall-jumps**, **climbing** (stamina-limited), and automatic
  **mantling / vaulting** onto ledges.
- **Grapple:** **swing** (a real pendulum constraint you can pump and whose rope
  you can shorten/lengthen) and **pull** (reel yourself to a surface).
- **Rocket jump:** a finger-gun **recoil blast** that launches you (and damages
  enemies) — aim at your feet to fly.
- **World tech:** **ziplines**, **moving platforms** (you inherit their motion),
  **jump pads**, a **low-gravity zone**, **water** with buoyant 3D swimming, and
  ramps to slide down.

## Game feel

- **Coyote time** and **input buffering** for forgiving, responsive control.
- **FOV scaling** with speed, screen-space **speed lines**, **camera tilt**
  (roll on wall-runs, slides and strafes), and **squash & stretch** on the
  character driven by velocity and landings.
- Fully procedural locomotion: run cycle, air/slide/wall-run poses, lean,
  crouch compression and firing recoil.

## How it's built

```
src/
  main.ts            bootstrap
  style.css          page chrome
  game/
    config.ts        every tunable constant (game feel in one place)
    mathx.ts         clamp / damp / angle helpers
    input.ts         keyboard + mouse, pointer lock, edge + buffered input
    collision.ts     stacked-sphere capsule vs. boxes / ramps / platforms, raycasts
    world.ts         level geometry + ziplines, pads, water, zones, targets
    player.ts        the character controller — the whole movement kit
    playerModel.ts   procedural finger-gun hero + animation + squash/stretch
    cameraRig.ts     third-person follow camera, FOV scaling, tilt
    weapon.ts        pooled magic bullets, sweep collision, hit FX
    fx.ts            impacts, explosions, grapple rope, speed lines
    hud.ts           crosshair, speed, state, ability cooldowns, score
    game.ts          renderer, scene, lighting, fixed-timestep loop
```

The player is a vertical capsule approximated by a stack of spheres that are
depenetrated against axis-aligned boxes, inclined ramps and moving platforms —
a robust, lightweight basis for tight, Quake/Titanfall-style movement
(deliberately *not* a rigid-body physics engine, which would feel mushy).
Simulation runs on a fixed 120 Hz timestep; rendering and camera run per frame.
