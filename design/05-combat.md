# 05 — Combat & the Gun-Hand

Combat is secondary and must never get in the way of moving. The design target:
shooting is something you do *while* moving, never *instead of* moving. When any
combat decision trades against flow, flow wins (the brief's scope note is the
tiebreaker of record).

---

## 1. The gun-hand

The weapon is the character's index finger held like a gun. One hand powers
everything:

| Output | Input | Role |
|---|---|---|
| **Magic bullets** | Fire (LMB / RT) | The gun. Primary damage. |
| **Magic line** | Grapple (RMB / LT) | Traversal ([02 §5.1–5.2](02-movement-mechanics.md)). |
| **Magic blast** | Blast (Q / RB) | Rocket-jump ([02 §4.3](02-movement-mechanics.md)) and knockback tool. |

One weapon, so there is no swap, no holster, no reload stance — the hand is
always ready, mid-slide, mid-swing, mid-wall-run. Animation must sell this: the
gun-hand tracks aim expressively while the body does parkour (Deadlock-style
confident gunplay layered over Ghostrunner-style traversal, [06](06-art-direction.md)).

## 2. Magic bullets

- **Ballistics:** very fast projectiles (150 m/s) with a generous projectile
  radius (0.25 m) — reads as hitscan at typical ranges but leaves tracers that
  sell speed and style.
- **Rate & ammo:** ~5 shots/s held. No reload. An energy meter (12 shots)
  recharges continuously and quickly (full in 2 s from empty) — running dry is a
  brief rhythm break in *shooting*, never in *moving*.
- **Damage:** flat, no falloff inside 60 m, no headshot multiplier in the base
  design (precision pressure fights flow; revisit only if combat needs depth
  later).
- **While moving:** zero spread/accuracy penalty from any movement state. The
  game's best shooting platform is Full Flow, on principle.

## 3. Generous aiming (the forgiveness layer, combat edition)

Aim forgiveness follows the same stance as [03](03-forgiveness-and-intent.md):
invisible, intent-agreeing, on by default.

- **Magnetism:** shots within a 4° cone of a target bend to hit (6° on gamepad);
  scales up mildly with player speed — the faster you move, the more the game
  meets your aim halfway. Never bends to a target you can't see.
- **Soft reticle friction** (gamepad): reticle drag over targets, gentle bullet
  magnetism instead of snap-lock; nothing moves the camera for you.
- **Target sizing:** enemies have generous hit volumes and high-contrast
  silhouettes ([06](06-art-direction.md)) so snap judgments at 30 m/s land.

## 4. The player is never slowed — combat edition

Law 1 governs combat absolutely, in both directions:

- **Firing** never changes your velocity, aim-time, or move set. No ADS, no
  recoil push, no slow-while-shooting.
- **Being hit** never slows, staggers, roots, knocks down, or stuns the player.
  Damage and area denial are the *only* pressure enemies may exert. No enemy,
  hazard, or system may apply a movement debuff — this is a hard content rule
  for every future enemy design, on par with "no self-damage."
- **Knockback on the player** exists only from the player's own blast, and
  knockback is *always a launch* (additive impulse) — even enemy explosions, if
  designed, push the player in ways that obey `exit_speed ≥ entry_speed`.
  Getting hit by a bomb makes you *faster*, never stopped. (Skilled players
  will weaponize this for traversal. Intended.)

## 5. The blast in combat

The rocket-jump blast doubles as the crowd tool: damage + strong knockback to
enemies in its radius, no self-damage ever. Point-blank enemy hits while
rocket-jumping are the natural emergent play (launch off the same blast that
scatters them) and should be tuned to feel great rather than balanced away.

## 6. Encounter design principles

(Enemy roster is an open question — [README](README.md) — but any roster obeys:)

- **Fights are traversal problems.** Encounters are laid out along movement
  routes — targets on wall-run lines, around swing arcs, under zip paths — so
  the shooting happens *through* the level's flow, not in arenas that stop it.
- **Speed is defense.** Enemy accuracy degrades sharply against a fast-moving
  player (an explicit dodge-by-momentum model, tuned so Full Flow ≈ safety).
  Standing still is the exposed state; the game never rewards stopping to shoot.
- **Short time-to-kill on enemies.** One-to-three hits for standard targets:
  combat resolves inside the flow, no bullet-sponge full stops.
- **No forced engagements.** Any fight in the movement path can be *moved past*.
  Combat is a verb the player chooses, not a gate (mode-specific exceptions get
  designed against this rule, knowingly and rarely).
