# 03 — Forgiveness & Intent

The systems that make Law 2 true: anyone hits top speed and chains everything in
their first few minutes. These are shared services — every mechanic in
[02](02-movement-mechanics.md) plugs into them rather than implementing its own
timing rules, so generosity is consistent everywhere and tunable in one place.

Design stance: **the game quietly saves imperfect inputs.** Forgiveness must be
invisible — the player should believe they did it themselves. No "assisted!"
popups, no visibly snapping camera, no input the player didn't intend. The
assist fires only when it agrees with what the player was clearly trying to do.

---

## 1. Grace on late inputs (coyote time)

A late press never costs you. After losing a valid surface, the input still
counts as if you were on it:

| Left... | Window | Notes |
|---|---|---|
| Ground (ledge, ramp end) | 0.20 s | Jump executes as a ground jump; does not consume the double jump. |
| Wall (end of wall-run / wall touch) | 0.30 s | Wall-kick still fires with full redirect and bank release. |
| Zipline (line end) | 0.25 s | Dismount bonuses still granted. |
| Grapple anchor (line just released) | 0.20 s | A "release + jump" mash still gets the sling bonus. |

Coyote never stacks with an actual jump (no double-dipping) and never *worsens*
anything: if the late input would have been valid anyway, nothing changes.

## 2. Grace on early inputs (buffering)

Every action input is buffered for **0.25 s** and fires the instant it becomes
legal: jump before landing, dash before a charge refills (≤ 0.25 s early),
grapple before an anchor enters the magnetism cone, crouch before touching
ground to instantly slide. Buffered inputs are re-aimed at execution time (a
buffered wall-kick uses your direction *when it fires*, not when you pressed).

Buffer + landing grace (0.5 s, [01 §2.3](01-core-philosophy.md)) + hold-to-auto-hop
together mean bhop has **no failable timing**: press early, press late, or just
hold the button — all three work.

## 3. Post-jump grace (the redirect beat)

For **0.4 s** after any jump (ground jump, double jump, wall-kick, slide-hop),
movement input rotates the velocity vector at up to **240°/s with magnitude
preserved** — several times normal air-strafe authority. This is the "beat of
grace after every jump": hold the direction you want and a full hairpin at the
cap costs nothing and needs no technique. The window refreshes on every jump, so
a bhop chain has a redirect beat on *every hop* — corners at speed are a rhythm,
not a test.

## 4. Intent reading (the contextual controls)

One button per intent; the game infers the move from **approach angle, speed,
look direction, and geometry** (Mirror's Edge's single contextual control,
generalized). The resolver runs on every relevant contact/input:

**Wall contact, moving:**
- incidence 15°–75° → wall-run (auto, no input)
- incidence > 75° → climb scramble, momentum banked
- incidence < 15° → no capture (you're just running past it)

**Approaching a low obstacle (≤ 1.2 m) at speed:**
- moving fast, obstacle has landing space beyond → vault over (a micro-mantle,
  exit +1 m/s)
- gap *under* the obstacle ≥ crouch height → auto-suggest slide (crouch icon
  ghost); crouch input slides through
- ledge above within reach → mantle

**Jump pressed:** ground → jump · wall/coyote-wall → wall-kick · air with double
jump → double jump · air without → glide (hold) · near zipline → attach.

**Ambiguity resolution priority** (when several are valid in one frame):
`mantle > vault > wall-kick > wall-run > climb > slide-suggest`. Rationale:
prefer the move that continues travel in the player's look direction; mantle
outranks everything because a caught ledge is the strongest read of intent.
When the resolver is genuinely unsure (approach angles within 5° of a
boundary), it picks the option preserving more of the current heading.

The resolver must be *predictable* before it is clever: identical approach →
identical result, always. Tuning reviews watch for "the game did something I
didn't want" reports as the top-priority defect class — an intent misread is
rated as severe as a momentum loss.

## 5. Automatic catches

- **Wall-runs start on contact** — zero input, any legal angle.
- **Near-miss ledges auto-grab** (mantle reach 1.2 m, [02 §3.5](02-movement-mechanics.md))
  and return you *faster* than you arrived.
- **Grapple magnetism**: fires within 15° of an anchor attach; pulls auto-resolve
  arrivals (perch/run-through/release) with no bonk case.
- **Blast assist**: near-miss rocket-jump shots snap to your feet when the aim
  context says you're launching, not shooting.
- **Bank on bonk**: perpendicular wall hits bank your momentum for 0.75 s and
  return it on the kick — the worst collision in the game is a held note, not
  a rest.
- **Ride magnetism**: ziplines attach from 2 m; jump pads trigger on edge clips.

## 6. Always a way back to speed

The floor of the experience: from a dead stop, **dash** (+6 m/s, two charges,
fast recharge) puts you above run speed instantly, and every subsequent link
adds. There is no state in the game — grounded, airborne, submerged, mid-climb —
from which the player cannot begin rebuilding immediately. Acceptance test 5 in
[01 §3](01-core-philosophy.md) enforces this mechanically.

## 7. Difficulty philosophy for the windows

All windows above are the *shipping defaults*, not an "easy mode" — there is no
separate assist tier to opt into (assists you must enable are assists beginners
never find). Accessibility settings may widen them further (and add toggles for
hold inputs), but nothing in options may narrow them below defaults: an expert's
game and a beginner's game are the same game, differing only in the line they
choose through it.

Mastery expression, preserved deliberately:
- **Style flourishes** on frame-tight execution (manual hop inside 0.1 s,
  rising-arc releases, kiss-the-wall dashes) — cosmetic and audible, never
  mechanical.
- **Efficiency**: better lines, tighter chains, less wasted airtime — the expert
  reaches the cap sooner and holds it through harder geometry, but gains no move
  the beginner lacks.
