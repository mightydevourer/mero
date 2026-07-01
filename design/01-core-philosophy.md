# 01 — Core Philosophy: The Momentum Model

The brief gives us two laws. This document turns them into a single, unified speed
model that every mechanic plugs into, plus the tests that keep future decisions
honest. If you only read one design doc, read this one — [02](02-movement-mechanics.md)
is this model applied twenty times.

---

## 1. The two laws, restated as engineering requirements

**Law 1 — No mechanic ever slows you down.**
For every player-initiated action A and every speed v the player might have:
`exit_speed(A, v) >= v`, always. Below the cap the inequality is strict (you come
out faster). At the cap it becomes an equality with free redirection (you come out
exactly as fast, pointed wherever you wanted). No exceptions, no fine print, no
"except during the recovery frames."

**Law 2 — The skill floor is almost zero.**
Every mechanic must be executable on the first attempt by someone who has never
played a movement game, given one line of instruction. Formally: for each
mechanic, the naive input (press the obvious button at roughly the right moment,
aimed roughly the right way) must succeed. Precision buys *style and efficiency*,
never *access*.

---

## 2. The speed model

### 2.1 One number the player owns: momentum

The player's state includes a velocity vector `v`. Its magnitude `|v|` is the
player's **momentum** — the thing the whole game is about. The model has three
reference speeds:

| Name | Symbol | Starting value | Meaning |
|---|---|---|---|
| Run start | `v_run` | 8 m/s | Speed the instant you push the stick. No wind-up. |
| Run max | `v_runmax` | 12 m/s | What plain running builds to on flat ground. |
| **The cap ("Full Flow")** | `v_cap` | 30 m/s | Top speed. Earned by chaining mechanics. |
| Overspeed ceiling | `v_over` | 36 m/s | Brief, environment-granted excess (jump pads, long downhills). |

Plain running gets you from `v_run` to `v_runmax` in ~2.5 s of holding forward.
Everything above `v_runmax` is **earned speed** — granted by mechanics, protected
by the rules below, and only ever surrendered by the player's own choice to stop.

### 2.2 Two regimes

Every mechanic is specified twice, once per regime:

- **Build regime (`|v| < v_cap`).** The mechanic *adds* speed. Additive gains are
  applied at full strength up to 80% of the cap, then fade linearly to zero at the
  cap so arrival at Full Flow is a smooth glide, not a clip.

  `effective_gain = base_gain × clamp((v_cap − |v|) / (0.2 × v_cap), 0, 1)`

- **Flow regime (`|v| = v_cap`).** The mechanic *redirects*. Any mechanic that
  changes your direction rotates the velocity vector and preserves its magnitude
  exactly. Hitting the cap must feel like "now keep it flying" — the same buttons
  keep working, they just spend their energy on direction instead of magnitude.

**Overspeed:** environmental sources (jump pads, steep downhill slides, moving
platforms) may push `|v|` above `v_cap`, up to `v_over`. Overspeed decays gently
(−2 m/s²) back to the cap. Player mechanics never clip overspeed away — a dash at
34 m/s redirects 34 m/s.

### 2.3 The speed floor: how momentum is protected

Momentum decreases **only** through explicit player choice:

- Releasing all movement input while grounded (gentle decel, ~12 m/s², to a stop).
- Holding directly against your motion while grounded (a deliberate brake).
- Dying / respawning.

Everything else preserves it. Specifically, the classic momentum-killers are each
individually banned:

| Classic momentum-killer | Our answer |
|---|---|
| Landing friction / landing "sticky feet" | **Landing grace:** first 0.5 s of ground contact applies zero decay to earned speed. Land, keep everything. This grace *is* the bhop window. |
| Hard landing stumble / roll (Mirror's Edge) | Does not exist. No fall damage, no landing recovery state, ever. |
| Turning penalty | Turns are free. Ground turns steer the full vector; post-jump grace and dashes rotate it outright ([03 §3](03-forgiveness-and-intent.md)). |
| Wall bonk (head-on collision zeroes you) | **Glance-off + banking.** Oblique impacts (< 75° incidence) steer along the surface keeping ≥ 90% of speed and usually auto-capture into a wall-run. A truly perpendicular impact *banks* your momentum in the wall for 0.75 s — wall-kick or jump within that window and the full banked speed is returned along your exit direction. You can still choose to drop off and lose it; the wall never takes it from you. |
| Ability self-slows (cast times, ADS, weapon swap) | Do not exist. One weapon (the hand), no ADS, no cast that modifies velocity except the rocket-blast's *push*. |
| Getting hit (hitstun, slows, roots) | Banned from the entire combat design. Damage is the only pressure enemies exert ([05 §4](05-combat.md)). |
| Water / swimming as a bog | Swimming preserves earned speed with high buoyant control ([02 §6](02-movement-mechanics.md)). |
| Crouching / going prone | Crouch at speed *is* a slide, which preserves or gains. |

### 2.4 Ground decay: the one gentle pressure

If you are simply *running* on flat ground with earned speed above `v_runmax`,
that excess decays at −4 m/s² — after the 0.5 s landing grace, and never below
`v_runmax`. This is deliberately the only leak in the system, and it exists to
make the core loop true: the cap is *earned by chaining, kept by chaining*.

- **Bhop** (leave the ground within the grace window — holding jump is enough)
  and you never experience it.
- **Slide** instead of run and the excess is held friction-free for the first
  1.5 s of the slide.
- Even fully ignored, it is a slow fade to a still-fast `v_runmax` — never a
  reset, never a stumble. Dash once and you're climbing again.

### 2.5 Redirection: the universal verb

"Preserve and redirect" is one shared operation, used by dash, wall-kick,
post-jump grace, glide steering, and swing release: rotate `v` toward an intent
direction, keep `|v|`. The knobs per mechanic are only *how fast* it rotates
(instant for dash and wall-kick, over ~0.4 s for post-jump grace, continuous for
glide) and *what supplies the direction* (movement input, aim, wall normal).
Implementations should literally share this code path — it is how we guarantee
Law 1 everywhere at once.

### 2.6 Exit rule for scripted rides

Ziplines, grapple pulls, jump pads, and moving platforms all obey one rule:
**you exit with at least the speed the ride gave you, plus your exit move's
bonus, and never less than you boarded with.** Boarding is also lossless — a
ride's capture never clips your current speed downward (a zipline grabbed at
34 m/s rides at 34 m/s).

---

## 3. Acceptance tests (the first five minutes)

These are the checks that Law 2 is real. They should be run as scripted playtests
(and where possible as automated harness tests) on every movement change:

1. **Reach the cap naively.** A player using only *hold forward + hold jump +
   occasional dash* on flat ground reaches `v_cap` in under 45 seconds of play,
   with no instruction beyond "hold jump, tap dash."
2. **Keep the cap naively.** The same input pattern holds `v_cap` (±5%) for 60
   seconds on the test loop, including corners.
3. **Every mechanic, first try.** Each mechanic in [02](02-movement-mechanics.md)
   succeeds on a first attempt following its one-line hint. Any mechanic that
   needs a second sentence of instruction is redesigned, not re-explained.
4. **Law 1 audit.** Automated: fuzz every mechanic at speeds from 0 to `v_over`;
   assert `exit_speed >= entry_speed` in all cases (equality permitted only at
   the cap). A single violation is a release-blocking bug.
5. **No stuck states.** From any reachable position at zero speed, dash + one
   other mechanic gets the player moving above `v_run` within 2 seconds.
6. **Bad landing test.** Drop the player from any height onto flat ground at
   `v_cap` horizontal speed with no input: post-grace speed must still be
   ≥ `v_runmax`, and with jump held it must still be `v_cap`.

---

## 4. Decision tests for future work

When a proposed feature or tuning change is on the table, ask in order:

1. **Does any path through it reduce `|v|`?** If yes, redesign it. "Only briefly"
   and "only if misused" both count as yes.
2. **Can a first-timer do it with the obvious input?** If it needs timing, widen
   the window until it doesn't; if it needs a combo, let the game infer it.
3. **Does it reward mastery with style or efficiency, not access?** Experts should
   find faster lines and cleaner chains, not exclusive moves.
4. **Does it read at 30 m/s?** Anything the player must notice, aim at, or react
   to must be legible at Full Flow ([06](06-art-direction.md), [07](07-level-design.md)).
5. **When in doubt, prioritize the feel of motion over everything else.** (The
   brief's closing word, and the tiebreaker for all of the above.)
