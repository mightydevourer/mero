# 02 — Movement Mechanics

Every mechanic in the vocabulary, specified through the momentum model of
[01](01-core-philosophy.md). Each entry follows the same template:

- **Feel** — the one-line experience, straight from the brief's intent.
- **Input** — what the player does (bindings from §1 below).
- **Build regime** — what it does below the cap (adds speed).
- **Flow regime** — what it does at the cap (preserves and redirects).
- **Forgiveness** — how the naive input succeeds ([03](03-forgiveness-and-intent.md) has the shared systems).
- **Chains** — notable entries and exits.
- **Tunables** — starting values for the prototype.

Universal rules that apply to *everything* here: any mechanic may cancel into any
other at any time; exit speed ≥ entry speed always (Law 1); additive gains fade
near the cap per [01 §2.2](01-core-philosophy.md); firing the gun is legal during
every one of these and changes nothing about them.

---

## 1. Default controls

Few buttons, heavily contextual — the game infers the right move from angle and
speed ([03 §4](03-forgiveness-and-intent.md)). One binding per *intent*, not per move.

| Intent | Keyboard/Mouse | Gamepad | Context resolution |
|---|---|---|---|
| Move | WASD | Left stick | — |
| **Jump** | Space | A | Ground → jump · air → double jump · near wall → wall-kick · held → auto-bhop · held after double jump → glide |
| **Crouch** | Ctrl (hold or toggle) | B / RS-click | Moving on ground → slide · air → tuck / fast-fall (hold) · zipline → dismount · slow/still → crouch |
| **Dash** | Shift | LB | Bursts toward movement input; no input → forward |
| Fire | LMB | RT | Magic bullets ([05](05-combat.md)) |
| **Grapple** | RMB | LT | Tap → pull · hold → swing (release to sling) |
| **Blast** (rocket-jump) | Q | RB | Fires the launch blast where you aim |
| Camera / aim | Mouse | Right stick | — |

Hold vs. toggle is a setting for every held input. There is no ADS, no weapon
swap, no reload button.

---

## 2. On the ground

### 2.1 Walking / running

- **Feel:** light and eager — never heavy or sluggish, even at a walk.
- **Input:** movement input. No sprint button; you are always "sprinting."
- **Build:** instant `v_run` (8 m/s) on input — acceleration to it in < 0.2 s, no
  wind-up animation delay. Holding forward builds to `v_runmax` (12 m/s) over
  ~2.5 s. Ground turns steer the full vector without speed loss.
- **Flow:** plain running can't hold the cap by itself — earned speed above
  `v_runmax` fades gently on flat ground ([01 §2.4](01-core-philosophy.md)) unless
  you keep chaining. Downhill running does hold and build it.
- **Forgiveness:** stopping is crisp (decel ~12 m/s²) but only ever on purpose.
- **Chains:** into everything; it is the floor state everything returns to.
- **Tunables:** `v_run` 8, `v_runmax` 12, time-to-runmax 2.5 s, ground turn rate
  uncapped, stop decel 12 m/s².

### 2.2 Crouch

- **Feel:** drop low, tuck small.
- **Input:** crouch while slow or still.
- **Build/Flow:** crouch is a *modifier*, not a move: at speed on ground it is a
  slide (§2.3); in air it is a tuck (lighter, higher launches — rocket-blast §4.3,
  jump apex +10% height while tucked) or, held, a fast-fall (§4.2); on a zipline
  it dismounts (§5.3). Pure crouch-walking exists only below `v_run` and is the
  single state in the game that is slow — by the player's explicit choice.
- **Tunables:** tuck jump-height bonus +10%, crouch-walk speed 3 m/s.

### 2.3 Slide

- **Feel:** carve along the ground; downhill is a rush.
- **Input:** crouch while moving on ground (auto-suggested by geometry: low gaps
  and steep down-slopes convert a run into a slide — [03 §4](03-forgiveness-and-intent.md)).
- **Build:** entering a slide grants a one-time **push** (+3 m/s, once per landing
  or per 1.5 s, so crouch-spam is fun, not exploitable). Downhill adds
  gravity-along-slope × 1.3 — steep hills are speed farms. Flat slides are
  friction-free for 1.5 s, then decay gently (−3 m/s²), never below crouch speed.
  Uphill slides decay like flat ones (no slope penalty — the hill just stops
  feeding you; Law 1 still holds because the push covers the entry).
- **Flow:** at the cap the entry push converts to pure preservation: the slide
  holds `v_cap` friction-free and steers (carving turns, rate ~90°/s) with zero
  loss. Sliding is the ground-level way to hold Full Flow through flats.
- **Forgiveness:** no minimum entry speed; sliding at walking pace still pushes
  you to a respectable clip. Slide never ends in a getting-up recovery — it exits
  directly into run, jump, or dash on the same frame.
- **Chains:** slide → jump is the **slide-hop** (§2.4); slide → dash keeps the
  slide's speed plus the dash boost; landing while holding crouch auto-continues
  the slide (landing grace applies).
- **Tunables:** entry push +3, downhill factor 1.3, friction-free window 1.5 s,
  flat decay 3 m/s², carve rate 90°/s.

### 2.4 Bunnyhopping / slide-hopping

- **Feel:** a rhythm of hops that never lets the ground take your speed — and
  grows it.
- **Input:** jump on landing. **Holding jump auto-hops on every landing** — the
  rhythm is opt-out, not skill-gated (Titanfall-style autobhop; the one-line hint
  is "hold jump").
- **Build:** each hop launches with full horizontal speed (landing grace
  guarantees zero loss) **plus** a small chain bonus (+1 m/s per hop while
  air-strafing or holding forward). Slide-hop = jump out of a slide: the slide's
  push and any downhill gain are folded in, so slide → hop → slide downhill is
  the classic beginner speed-builder.
- **Flow:** hops at the cap preserve exactly and redirect via air strafing and
  post-jump grace — bhop *around corners* without loss.
- **Forgiveness:** the "instant" is generous: landing grace 0.5 s + input buffer
  0.25 s + auto-hop on hold means there is no failable timing at all. Manual
  timing inside the first 0.1 s of contact grants nothing extra but +style
  (audio/VFX flourish) — mastery is style, not access.
- **Chains:** the connective tissue between everything; any air mechanic can
  interleave between hops.
- **Tunables:** chain bonus +1/hop, landing grace 0.5 s (shared), hop height =
  jump height.

### 2.5 Air strafing

- **Feel:** gently steer where you're held toward; curve your path and gain.
- **Input:** hold a movement direction while airborne (aim participates but is
  not required — no Quake mouse-sync skill check).
- **Build:** air acceleration toward held input at 12 m/s², with a gain budget of
  up to +2 m/s per second of airtime. Over-steering never brakes: input opposing
  `v` rotates the vector rather than shrinking it.
- **Flow:** pure rotation of `v` toward input (up to 120°/s) — wide airborne
  carves at full speed.
- **Forgiveness:** no penalty case exists. The naive "hold toward where I want to
  go" is the optimal-enough input.
- **Tunables:** air accel 12 m/s², gain budget +2 m/s per airborne second, flow
  turn rate 120°/s.

### 2.6 Dash — the signature move

- **Feel:** an instant burst any direction; every dash makes you faster than you
  were, and it turns on a dime *through* the turn.
- **Input:** dash + a movement direction (neutral = forward; works grounded,
  airborne, sliding, wall-running, swinging — everywhere).
- **Build:** `v ← rotate(v, dash_dir); |v| ← |v| + 6 m/s` (gain fades near cap
  per the model). Full redirect first, then the boost — so a 180° reversal dash
  exits *faster backward* than you entered forward. It never slams you to the
  cap; it stacks on what you have.
- **Flow:** the same operation with the gain faded to zero: an instant, free,
  full-speed redirect. At Full Flow the dash is your steering wheel.
- **Forgiveness:** this *is* the forgiveness mechanic of last resort — stuck, slow,
  or mistimed anything: dash and you're building again. Two charges, each
  recharging in 1.5 s (recharge runs in parallel), so it's nearly always
  available but not spammable into a substitute for chaining.
- **Chains:** cancels anything, enters anything. Dash out of slide, into
  wall-run, out of swing release, through a corner mid-bhop.
- **Feedback:** the strongest single juice moment in the game — crack of speed
  lines, coat snap, FOV pulse ([04](04-game-feel.md)).
- **Tunables:** boost +6, charges 2, recharge 1.5 s each, redirect instantaneous,
  no i-frames (dash is traversal, not defense — keeps combat honest).

---

## 3. Up walls and ledges

### 3.1 Double jump

- **Feel:** a second jump in mid-air to extend or redirect a leap.
- **Input:** jump while airborne (one air charge; restored on any surface
  contact — ground, wall, zipline, swing anchor release does *not* restore it).
- **Build:** full jump impulse (vertical 7 m/s, replacing downward velocity, never
  subtracting from upward) plus a redirect of horizontal `v` toward held input
  (up to 90°) and a +1.5 m/s horizontal gain. Opens a fresh post-jump grace
  window ([03 §3](03-forgiveness-and-intent.md)).
- **Flow:** redirect-only, magnitude preserved.
- **Forgiveness:** buffered like all jumps; using it "too early" costs nothing
  because nothing in the air costs speed.
- **Tunables:** air jumps 1, vertical impulse 7, horizontal gain +1.5, redirect
  limit 90°.

### 3.2 Wall-running

- **Feel:** touch a wall while moving and you're running along it; the wall feeds
  you speed. Walls are routes.
- **Input:** none — contact + lateral movement auto-starts it (Law 2). Steer with
  movement input; leave by jumping (wall-kick) or steering away.
- **Build:** the wall *feeds* you: +4 m/s² acceleration along the wall up to
  `min(entry_speed + 6, v_cap)`. Gravity is off for the first 2.5 s, then a
  gentle sag (2 m/s² down) begins — the run doesn't time out, it slowly droops,
  and the sag itself adds along-wall speed like a downhill.
- **Flow:** holds `v_cap` exactly, indefinitely, gravity-free while input is held
  along the wall (Overwatch-style hold-to-ride). Curved walls redirect at full
  speed for free.
- **Forgiveness:** any approach angle from 15°–75° to the wall captures into a
  run (steeper is a climb §3.4, shallower is just running near a wall). Vertical
  position auto-snaps smoothly to a comfortable run height. Coyote time off the
  wall's end is 0.3 s. Re-attaching to the *same* wall after a kick is allowed
  (no Titanfall same-wall lockout — beginners zig-zag up one wall and that's
  fine and fun).
- **Chains:** wall-run → wall-kick → opposite wall is the canonical off-ground
  chain; dash *along* a wall extends the run; grapple, blast, and fire all usable
  while riding (abilities-while-riding per Overwatch).
- **Tunables:** feed accel 4 m/s², feed limit entry+6, gravity-free 2.5 s, sag
  2 m/s², capture angles 15°–75°, wall coyote 0.3 s.

### 3.3 Wall-kick / wall-jump

- **Feel:** kick off a wall into a new direction with no loss — chain wall to
  wall across a space that never touches the floor.
- **Input:** jump while on (or within 0.3 s of leaving) a wall.
- **Build:** redirect `v` to the kick direction — a blend of wall normal and
  camera/input intent (intent-weighted 70/30, so you go where you're looking,
  pushed off by the wall) — preserving magnitude, **plus** +2 m/s and a vertical
  boost of 5 m/s. Restores the double jump.
- **Flow:** the same redirect with the gain faded: a free full-speed direction
  change off any wall. Also the release valve for **banked momentum** from
  perpendicular impacts ([01 §2.3](01-core-philosophy.md)).
- **Forgiveness:** works from wall-run, wall-touch, or climb; buffered; the
  intent-weighting means "look where you want to go and press jump" always does
  the right thing.
- **Tunables:** gain +2, vertical 5, intent weight 70%, bank window 0.75 s.

### 3.4 Climbing

- **Feel:** scramble up short vertical surfaces like it's nothing.
- **Input:** none — running into a wall too steep to wall-run (> 75° incidence)
  auto-converts horizontal speed into a vertical scramble.
- **Build:** climbs at `min(|v|, 10)` m/s vertically for up to 3 m of height
  (enough for one storey), holding your horizontal magnitude *banked*; topping
  out mantles (§3.5) and returns the banked speed forward. If the wall is taller
  than the scramble, you smoothly transition to a wall-kick prompt with the bank
  still live.
- **Flow:** same; banked speed is returned in full at the top or on the kick.
- **Forgiveness:** it is itself a forgiveness feature — head-on wall contact
  becomes progress, not a bonk.
- **Tunables:** climb speed cap 10, scramble height 3 m.

### 3.5 Mantling

- **Feel:** a near-miss ledge becomes a smooth catch-and-pull-up, not a fall.
- **Input:** none — a ledge within reach (up to 1.2 m above hand height) while
  moving toward it auto-grabs.
- **Build/Flow:** the mantle is fast (≤ 0.35 s), cancellable into jump/dash at
  any frame, and **exits at entry speed + 1 m/s** directed over the ledge — a
  recovery that leaves you *faster*, so a botched jump reads as style, not
  failure. It never plays a slow climb-up animation that locks input.
- **Forgiveness:** the auto-grab is the point. Generous reach box; grabs work
  mid-glide, mid-dash, and at the cap.
- **Tunables:** reach 1.2 m above hands, duration 0.35 s, exit bonus +1.

---

## 4. In the air

### 4.1 Slow-fall / gliding

- **Feel:** drift down slowly with floaty, responsive control, momentum intact.
- **Input:** hold jump after the double jump is spent (or hold glide-as-toggle in
  settings).
- **Build:** caps fall speed at 4 m/s; horizontal control uses air-strafe rules
  at 1.5× authority, so gliding is a place to *steer and gain* (up to the strafe
  budget), not just descend.
- **Flow:** full-speed horizontal preservation with wide steering (150°/s).
  Glide at the cap is scouting at 30 m/s.
- **Forgiveness:** releasing and re-holding is free; glide → fast-fall →
  glide is legal for reading a landing.
- **Tunables:** max fall 4 m/s, strafe authority 1.5×, flow turn 150°/s.

### 4.2 Fast-fall / ground-pound

- **Feel:** slam straight down, then fling back out carrying the speed you bought
  with height.
- **Input:** hold crouch in air.
- **Build:** downward acceleration to a fall cap of 40 m/s. On impact, **the fall
  is a payment, not a punishment**: landing converts up to 60% of vertical speed
  into a banked burst, released by the exit input inside the 0.5 s landing
  grace — jump (a high bounce), direction + jump (a long fling), or crouch-held
  (a slide at the converted speed). No input = normal landing rules (no stumble,
  grace, gentle decay).
- **Flow:** exit magnitude clamps at `v_over` — a max-height pound is the
  fastest single burst in the game, briefly over the cap.
- **Forgiveness:** the exit window is the same generous landing grace as
  everything else; the pound never causes fall damage or a recovery state.
- **Chains:** glide to aim → pound to convert → slide-hop out is the vertical
  play loop.
- **Tunables:** fall cap 40, conversion 60%, exit window 0.5 s.

### 4.3 Rocket-jump (the magic blast)

- **Feel:** blast the ground beneath you and ride the whoosh — no self-damage,
  ever, just launch.
- **Input:** Blast button, aimed. Straight down = height; shallow = distance.
  Tuck (crouch) during the blast for +25% launch.
- **Build:** the blast applies a fixed impulse of 14 m/s directed opposite your
  aim, **added** to current velocity (TF2 physics, none of TF2's health tax).
  Blast radius is generous (2.5 m) and self-knockback triggers on any surface
  hit near you — sloppy aim still launches.
- **Flow:** the impulse spends itself on redirection: at the cap the blast
  rotates `v` toward the launch direction (magnitude preserved; vertical
  component may push into brief overspeed ≤ `v_over`).
- **Forgiveness:** 2 charges, 2.5 s recharge each; a soft auto-aim nudges
  near-miss ground shots to your feet when you're clearly rocket-jumping
  (aiming within 30° of straight down while airborne or moving fast).
- **Chains:** slide-hop → blast is the beginner's biggest launch; blast at the
  top of a swing release is the expert's.
- **Tunables:** impulse 14, tuck bonus +25%, radius 2.5 m, charges 2, recharge
  2.5 s, self-damage **0 (hard rule, not a tunable)**.

---

## 5. Across the world

### 5.1 Grapple — swing

- **Feel:** a rope-pendulum arc that builds speed; release at the top of the arc
  and sling out faster than you came in.
- **Input:** hold grapple on an anchor (anchors are explicit, glowing, and
  generous — see [07](07-level-design.md)); release to let go. Air strafe input
  pumps the swing.
- **Build:** the line is a rigid pendulum constraint that preserves entry speed
  and adds pump acceleration (+5 m/s² along the arc while input is held with the
  swing). Release grants a **sling bonus** of +3 m/s along the tangent. Releasing
  anywhere works; releasing in the rising half of the arc converts more of the
  speed upward — the "top of the arc" is a bonus of trajectory, not a timing test.
- **Flow:** the pendulum redirects `v_cap` around the anchor with zero loss; the
  sling bonus fades to zero and the release is a pure, aimed redirect.
- **Forgiveness:** huge target magnetism (a grapple fired within 15° of an anchor
  attaches); line never snaps from speed or length; auto-shortens to avoid
  ground-clipping mid-swing.
- **Tunables:** pump 5 m/s², sling +3, magnetism cone 15°, max line 40 m.

### 5.2 Grapple — pull

- **Feel:** reel straight to a point, quickly, identically every time — arrive
  clean, never bonk to a stop.
- **Input:** tap grapple on an anchor (or on grabbable geometry: ledges, zipline
  posts).
- **Build:** reels at `max(20, |v|)` m/s along the line — consistent and
  predictable for beginners (it's always at least 20), lossless for experts
  (it never reels you *down* to 20). Arrival auto-resolves by context: ledge →
  mantle (perch), open ground → run-through at reel speed, mid-air point →
  release with `v` = reel velocity, ready to chain.
- **Flow:** reel at `|v|`; arrival preserves everything. "Arrive without losing
  momentum" is literal: the arrival resolve never zeroes any component.
- **Forgiveness:** the pull is *designed* as the predictable one (per the brief
  and Overwatch's pull-to-perch): same speed, clean arrivals, no swing physics
  to read. It is the beginner's gap-closer and height tool.
- **Tunables:** reel floor 20, arrival mantle window as §3.5.

### 5.3 Ziplines

- **Feel:** hop on an overhead line, ride fast, drop off faster than you got on.
- **Input:** jump near a line auto-attaches (magnetized, 2 m). Crouch dismounts;
  jump dismounts upward; dash dismounts with the dash.
- **Build:** the line carries you at `max(zipline_speed 22, entry |v|)` and feeds
  +2 m/s² up to +6 over the ride. **Every dismount grants +2 m/s** on top of ride
  speed — you always exit faster than you boarded (the brief's exit-conversion,
  made unconditional).
- **Flow:** rides at `v_cap` (overspeed allowed downhill on the line up to
  `v_over`); dismounts redirect freely.
- **Forgiveness:** auto-attach, no attach timing, no balance mechanic; lines are
  bidirectional (ride toward your look direction on attach).
- **Tunables:** base speed 22, feed +2 m/s² (cap +6), dismount bonus +2,
  magnetize 2 m.

### 5.4 Jump pads

- **Feel:** step on, get launched. Instant, zero skill.
- **Build:** applies the pad's fixed launch vector (typ. 18 m/s at the pad's set
  angle), **added** to your velocity's compatible components — never replacing.
  A sprinting entry exits faster than a standing one.
- **Flow:** may push into overspeed up to `v_over`; excess decays gently.
- **Forgiveness:** the whole mechanic is forgiveness. Generous trigger volume;
  mid-air pad clips (bouncing off a pad's edge) still fire it.
- **Tunables:** per-pad vector; default 18 m/s @ 60°.

### 5.5 Moving platforms

- **Feel:** their motion folds into yours instead of cancelling it.
- **Build/Flow:** platform velocity is inherited additively while riding and
  **kept on departure** — jump off a 10 m/s platform and its 10 m/s comes with
  you (frame-of-reference movement, the Source-engine bug fixed in our favor).
  Riding costs nothing; earned-speed ground decay pauses on movers.
- **Tunables:** inheritance 100%, decay pause on movers = true.

---

## 6. Environmental

### 6.1 Slow zones (low gravity)

- **Feel:** pockets of light gravity — float, hang, steer, keep everything.
- **Rules:** gravity × 0.3 inside the volume; air-strafe authority × 2; glide and
  double jump recharge on entry. `|v|` is untouched at both boundaries — you
  enter at 30 and leave at 30 (or more; strafe gains still apply). The "slow" is
  gravity's, never yours.
- **Tunables:** gravity factor 0.3, strafe factor 2×.

### 6.2 Swimming

- **Feel:** fluid, never a bog.
- **Rules:** water entry preserves `|v|` (a dive carries your speed as an
  underwater glide, decaying only to swim cruise, never below it). Swim cruise
  is fast (10 m/s — faster than `v_run`), fully 3D-steerable, with dash usable
  underwater at full effect. Surfacing with jump launches at exit speed + 2 m/s
  (breach bonus) — water is a route, and leaving it is a gain.
- **Tunables:** cruise 10, underwater decay to cruise −2 m/s², breach +2,
  breath limit none (no drowning pressure in a flow game).

---

## 7. Chains: emergent combinations

Universal chain rules (these are the whole system — named techs below are just
examples, and any technique that emerges from combining mechanics is welcome and
intended):

1. **Everything cancels into everything**, same-frame, no recovery states.
2. **Exit speed ≥ entry speed**, always (Law 1) — so *any* chain is
   monotonically non-losing, and below the cap every link adds.
3. Charges (dash, blast, double jump) restore on surface contact or on their
   timers — a continuous chain naturally re-arms itself.
4. The cap is reached *through* chaining and then preserved by the same chain —
   there is no separate "at cap" input language to learn.

Canonical chains to build the tutorial playground around:

| Name | Chain | What it teaches |
|---|---|---|
| The Beginner Engine | hold jump (auto-bhop) + dash on cooldown | Reaching and keeping the cap with two inputs |
| Slide-hop | slide (downhill) → jump → repeat | Converting hills into speed |
| Wall lace | wall-run → wall-kick → opposite wall-run | Off-ground travel, kick redirection |
| Sling-shot | swing → release rising → blast at apex | Stacked launches |
| Elevator | pull to high anchor → glide → pound → fling out | Height as a speed bank |
| Corner whip | bhop → dash through the corner apex → continue | Flow-regime redirection |
| Zip-snap | zipline → dash-dismount into wall-run | Ride conversions |
