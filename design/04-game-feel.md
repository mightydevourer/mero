# 04 — Game Feel & "Juice"

Selling the speed without changing the rules. Nothing in this document affects
`|v|`, hitboxes, or timing — feel is a *reporting layer* on the momentum model,
and it must never add input latency (Law 1 applies to feel too: no animation may
delay or dampen a player action).

Everything here ships with player-facing tuning ([§7](#7-comfort--accessibility)):
speed is thrilling for one player and motion sickness for another, and comfort
settings are a launch requirement, not a patch.

---

## 1. Camera

Third-person, following close enough to read the suit, coat, and animation.

| Property | Starting value | Notes |
|---|---|---|
| Distance | 3.2 m at rest → 4.2 m at cap | Pulls back with speed; the world grows as you fly. |
| Height / offset | Shoulder-ish, character offset ~0.4 m | Keeps the gun-hand and the path both visible. |
| Position smoothing | Critically damped, ~0.12 s | Never rubber-bands on dashes — dash snaps, camera catches up in ≤ 3 frames. |
| Aim | Camera-relative reticle, no ADS | Fire never changes the camera ([05](05-combat.md)). |

The camera **never takes control**: no cinematic pans during mantles, no forced
angles on wall-runs. Auto-moves (mantle, climb, glance-off) read as fast physical
beats under the same free camera.

## 2. FOV scaling

FOV widens with speed so the edges of the world rush.

- Base 80° (horizontal, 16:9) → +18° at `v_cap`, +22° at `v_over`.
- Mapped on a smoothstep of `|v| / v_cap` — imperceptible at a walk, unmistakable
  at Full Flow.
- Response is smoothed (~0.25 s) so dashes read as a *pulse* (fast widen, gentle
  settle), not a strobe.
- Player settings: base FOV slider (70–110°) and scaling intensity 0–150%.

## 3. Speed lines & motion streaks

- Edge-of-screen streaks fade in from 60% of cap, full at cap: the visual
  celebration of Full Flow. Center of the screen stays clean — effects must never
  cost readability at exactly the speeds where readability matters most.
- Per-object motion blur only (no camera blur by default); intensity scales with
  speed and is a 0–100% setting.
- Reaching the cap gets a one-shot flourish: a soft boom of lines + a signature
  audio chime, so "I hit max" is always a legible, celebrated instant.

## 4. Camera tilt

The camera leans into your carve so you feel the momentum you're steering:

| Context | Tilt (roll) | Notes |
|---|---|---|
| Wall-run | up to 12° away from wall | The classic; also pitches with wall curvature. |
| Slide / carve | up to 6° into the turn | Scales with turn rate. |
| Air strafe / post-jump redirect | up to 5° into the curve | Sells the redirect beat. |
| Dash | 3° kick in the dash direction, ~0.2 s | A punctuation mark, not a lean. |

All tilts are smoothed on/off and multiplied by a 0–100% comfort setting.

## 5. Squash & stretch

On the **character rig**, not the camera. Subtle and snappy: felt, not seen.

- Landing: compress to ~92% for ~80 ms, overshoot recover.
- Launches (jump, blast, pad): stretch to ~106% along the velocity vector,
  ~120 ms.
- Dash: directional stretch pulse + coat snap.
- Hard rule: purely cosmetic — colliders, aim point, and camera target never
  squash. Recovery always ≤ 150 ms so it never reads as lag.

## 6. Supporting feedback (the per-action language)

Every action gets a small, consistent triplet — sound, VFX, animation accent —
that echoes speed and flow. The signature moments, in priority order of polish:

1. **Dash** — the loudest single beat: crack + coat snap + FOV pulse + line burst.
2. **Reaching the cap** — the chime + line boom (§3): the game's "goal" feeling.
3. **Rocket-blast** — the distinct flying *whoosh* (the brief names this one);
   magic muzzle bloom from the index finger.
4. **Bhop rhythm** — soft percussive tick per hop; manual frame-tight hops add a
   sparkle flourish (mastery = style, [03 §7](03-forgiveness-and-intent.md)).
5. **Wall-run** — sparks/petal-trail off the feet, rising musical shimmer the
   longer the ride.
6. Landings (dust kick scaled by fall speed — never a stumble animation), slides
   (surface-plume), grapple (line twang + anchor glow pulse), zipline (zip
   whine pitch-scaled to speed), mantle/vault (hand-slap + cloth flick).

Audio design rule: pitch and layer intensity scale with `|v|` across the board,
so the *soundtrack of your own movement* tells you your speed with your eyes
closed. A player at Full Flow should sound like weather.

## 7. Comfort & accessibility

All feel systems individually adjustable; none affect the simulation:

- FOV base + scaling intensity; motion blur 0–100%; speed lines 0–100%;
  camera tilt 0–100%; screen shake 0–100% (shake is scarce by design — reserved
  for blasts and pounds).
- Hold ↔ toggle for every held input (crouch, glide, swing).
- Camera distance and smoothing sliders.
- Optional stable-horizon mode (tilt off, FOV scaling halved) as a one-click
  comfort preset.
- Effects legibility floor: at 0% settings the game remains fully playable and
  fully informative — critical information (anchor glow, pad arrows, cap chime)
  lives outside the reducible layers.
