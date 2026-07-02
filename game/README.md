# FINGER GUNS

A third-person, momentum-first movement shooter. Your hand is the gun; the
whole point is to move — fast, fluid, and never interrupted.

![genre](https://img.shields.io/badge/genre-movement%20shooter-ff4fd8)
![engine](https://img.shields.io/badge/engine-three.js%20(vendored)-19d3c5)
![deps](https://img.shields.io/badge/runtime%20deps-zero-ffd24a)

## Play

The game is a fully static page — no build step, no install. Serve this
folder over HTTP (ES modules need it) and open it:

```bash
# from the repo root, either:
npm run game            # vite dev server, opens the browser

# or with nothing but python:
cd game && python3 -m http.server 8080
# then open http://localhost:8080
```

## Controls

| Input | Action |
| --- | --- |
| WASD | run |
| Mouse | look (the camera also eases behind your movement on its own) |
| Space | jump / double-jump · **hold in air to glide** |
| Shift | **dash** — instant redirect: same speed, new direction (one charge; refills on landing/walls/rails) |
| C | crouch → slide · tuck in mid-air · hop off ziplines and rails |
| X | ground-pound (jump on landing to fling back out with the speed) |
| LMB | finger-gun magic bullets (generous aim assist) |
| Q | magic blast — at your feet it's a superjump, at a wall a super wall-jump |
| RMB tap | grapple **pull** (reel straight to the point) |
| RMB hold | grapple **pull-swing** — latches to anything you can see |
| R / H | respawn / toggle handbook |

Wall-runs start automatically when you touch a wall with speed; run straight
at a wall to climb it, and near-miss ledges auto-mantle. Land on the gold
rails to grind them. Jump the instant you land to bhop — the window is wide.

## The one rule

**No mechanic ever slows you down.** Movement preserves and redirects your
speed; deliberate technique earns more of it — crouch-bhops, slides,
downhill, wall-runs, blasts, and the toys — up to a firm cap that keeps
everything controllable. Coyote time, input buffering, a post-jump redirect
window, and auto-catches keep the skill floor on the ground; chaining
everything into one continuous motion is where the ceiling lives.

## Structure

```
index.html          HUD + start overlay
vendor/three.module.js   three.js r160, vendored (works offline)
src/
  main.js           bootstrap, loop (120 Hz fixed-step physics), event fan-out
  player.js         the movement controller — every mechanic + forgiveness layer
  world.js          "Prisma Cove": colliders, pads, ziplines, rails, rings, targets, zones
  character.js      procedural runner (suit + long coat) with procedural animation
  cameraRig.js      third-person camera: speed FOV, tilt, kicks, collision
  effects.js        particles, speed lines, grapple line, blob shadow
  combat.js         bullets, aim assist, the blast, target popping
  audio.js          all-synthesized WebAudio (no assets)
  input.js, util.js
test/
  sim.mjs           headless physics checks: node game/test/sim.mjs
```
