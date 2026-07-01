# Momentum Shooter — Design Documentation

A third-person, momentum-first movement shooter. You fire magic bullets from your
index finger — your hand is the gun — and the whole point is to move: fast, fluid,
and never interrupted.

This directory turns the original feel-first brief into a concrete, buildable design.
The brief describes how everything should *feel*; these documents decide how it
*works*, with starting numbers for every tunable so a prototype can be built and
playtested immediately.

---

## The two laws (everything serves these)

1. **No mechanic ever slows you down.**
   Below top speed, every mechanic adds speed. At top speed, every mechanic
   preserves and redirects it. There is no move whose cost is your momentum.

2. **The skill floor is almost zero.**
   A complete beginner reaches max speed, keeps it, and uses every mechanic in
   their first few minutes. Mastery buys style and efficiency — never access.

Every design decision in these documents must pass both laws. When a decision is
ambiguous, [01 — Core Philosophy](01-core-philosophy.md) defines the tests to apply.

---

## Reading order

| Doc | Contents |
|---|---|
| [00 — The Brief](00-brief.md) | The original design brief, verbatim. Source of truth for intent. |
| [01 — Core Philosophy](01-core-philosophy.md) | The two laws as testable rules; the unified momentum model; acceptance tests. |
| [02 — Movement Mechanics](02-movement-mechanics.md) | Every mechanic specified: inputs, behavior below/at the cap, chains, tunables. |
| [03 — Forgiveness & Intent](03-forgiveness-and-intent.md) | The beginner layer: grace windows, input buffering, intent reading, auto-catches. |
| [04 — Game Feel](04-game-feel.md) | Camera, FOV scaling, speed lines, tilt, squash & stretch, feedback, comfort options. |
| [05 — Combat & the Gun-Hand](05-combat.md) | Magic bullets, aim forgiveness, the blast, and the never-interrupt rules. |
| [06 — Art Direction](06-art-direction.md) | Gigantic color, Deadlock silhouette, readability at speed. |
| [07 — Level Design](07-level-design.md) | Building worlds that serve flow: no dead ends, redundant routes, teaching geometry. |
| [08 — Inspirations](08-inspirations.md) | Per-reference mapping: what we take, what we deliberately leave. |

---

## Conventions used throughout

- **Units** are meters and seconds (`m/s`, `m/s²`). 1 unit = 1 meter.
- **Every number is a starting value.** Tables marked *Tunables* are the knobs the
  prototype must expose; values are educated first guesses to be tuned in playtest.
- **"Build regime"** = below the speed cap (mechanics add speed).
  **"Flow regime"** = at the cap (mechanics preserve and redirect).
  Defined precisely in [01](01-core-philosophy.md).
- Specs are engine-agnostic. Where a decision depends on engine details, the doc
  says what the result must feel like and leaves the method open.

## Open questions (out of the brief's scope, decided later)

The brief is deliberately silent on these; they are recorded here so nobody
mistakes an invention for a requirement:

- Single-player campaign vs. time-trial arcade vs. multiplayer (or a mix).
- Enemy roster, encounter design, and any progression/economy.
- Narrative framing for the magic gun-hand.
- Platform targets and performance budget.

None of them change the movement design: whatever the mode, the two laws hold.
