# 07 — Level Design for Flow

The movement system is a promise; levels are where it's kept or broken. A space
that forces a stop violates Law 1 as surely as a bad mechanic would. These are
the standing rules for anyone building geometry.

---

## 1. The prime rule: no dead ends

Every surface offers a way to keep moving. Concretely:

- Every wall a player can reach is wall-runnable or climbable unless explicitly
  marked otherwise by the affordance language ([06 §2](06-art-direction.md)) —
  opt-*out* markings, not opt-in.
- Every pit has an exit that *gains* (pad, anchor, wall, updraft) — falling
  somewhere low is a detour, never a trap. No bottomless kill-pits in flow
  space; if a fall must reset, it respawns the player *moving* (spawn at
  `v_run`, facing the route).
- Every room's entrance geometry answers "where next?" within one camera frame:
  a lit anchor, a pad arrow, a zip silhouette, a wall-trim line.

## 2. Route redundancy (the skill-floor rule for spaces)

Every traversal challenge has at least three lines through it:

1. **The floor line** — beginner: runnable/bhoppable, no gap beyond a single
   jump + dash (≈ 8 m at `v_run`), no mandatory timing.
2. **The flow line** — the intended chain (wall lace, swing, zip) that holds or
   builds speed; visibly the *fun* line, not the required one.
3. **The style line** — for experts hunting efficiency: tighter, higher, or
   more inventive; discovered, not signposted; rewards with seconds and
   spectacle, never with access.

Gap sizing table (starting values, at the speeds a beginner realistically has):

| Crossing | Max size on the floor line |
|---|---|
| Plain jump at `v_run` | 5 m |
| Jump + dash | 8 m |
| Jump + double jump + dash | 12 m |
| Anything larger | Must offer an anchor, pad, zip, or wall |

## 3. Design for the cap

Levels must be shaped for 30 m/s, not 8 m/s:

- **Sightlines:** at Full Flow the player covers 9 m in a 0.3 s reaction — every
  turn, gap, and decision point must be visible ≥ 30 m out. Blind corners at
  speed are a designer error, not a player one.
- **Curves over corners:** favor arcs, banked turns, and curved walls that let
  redirection mechanics carry the cap; right angles are for the style line.
- **Downhill bias:** macro layouts trend downhill along the main flow, with
  height re-banked by pads, pulls, and zips — hills are the battery of the whole
  loop ([02 §2.3](02-movement-mechanics.md)).
- **Test in regime pairs:** every space is playtested twice — once at beginner
  speed, once entered at the cap. It must not embarrass either player.

## 4. Interactable placement

- **Grapple anchors:** along any open span, an anchor within 40 m (max line
  length) of every flight path a player can plausibly be on; anchors placed to
  make *swing arcs end somewhere* (a wall, a zip, another anchor) so the chain
  writes itself.
- **Jump pads:** at flow-line junctions and at the bottom of every big drop
  (the "back into the sky" guarantee). Pad launch vectors always point at the
  next affordance.
- **Ziplines:** the long-haul connectors; both directions rideable; every line's
  far end lands in a chainable state (wall, slope, pad — never a flat dead
  stop).
- **Slow zones:** placed as aerial intersections — places to re-aim a fast
  arrival at three possible exits; also mercy volumes over the biggest voids.
- **Water:** shortcut medium, not obstacle — breach bonus and underwater dash
  make swim lines legitimate route choices.

## 5. Teaching by geometry

The tutorial is the playground ([02 §7](02-movement-mechanics.md)'s canonical
chains, built as places):

- First space: a long, gently downhill lawn with low walls — the Beginner
  Engine (hold jump + dash) reaches the cap here inside the first minute
  (acceptance test 1).
- Each mechanic gets a "guaranteed win" intro: geometry where the naive input
  cannot fail (a wall that curves into your path; an anchor directly over a
  gap; a pad you can't miss), followed immediately by a free space to combine
  it with what came before.
- One-line hints only, diegetic where possible (the affordance language *is*
  the manual). If a space needs a second sentence, rebuild the space
  ([01 §3](01-core-philosophy.md), test 3).

## 6. Flow loops

Every major area closes into loops — routes that feed back into themselves at
speed — so players can *lap*, holding Full Flow indefinitely, chaining area to
area. The loop test for any finished space: a developer at the cap can circle
it for 60 s without dropping below 90% speed, using only shipping mechanics;
and a first-week player can complete one lap without stopping at all.
