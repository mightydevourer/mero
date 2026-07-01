# 00 — The Brief (verbatim)

> This is the original design brief, preserved unedited as the source of truth for
> intent. Every other document in this directory derives from it. Where a spec and
> this brief disagree, the brief's *intent* wins and the spec gets fixed.

---

## Game Design Brief

A third-person, momentum-first movement shooter

### The one-line pitch

A stylish third-person movement game where you fire magic bullets from your index
finger — your hand is the gun — and the whole point is to move: fast, fluid, and
never interrupted. Combat exists, but movement is the star.

### The core philosophy (read this first — everything serves it)

This game has one rule above all others: **no mechanic ever slows you down.**

- Below top speed, every mechanic makes you faster. Sliding, dashing, wall-running,
  bhopping, grappling, rocket-jumping — each one adds speed. There is no move in the
  game that bleeds your momentum as a cost.
- At top speed, mechanics preserve and redirect that speed instead of adding more.
  Once you've hit the speed cap, the same moves keep you pinned at full pace and let
  you fling your momentum in new directions — around corners, off walls, into
  reversals — without ever dropping you back down. Hitting max speed should feel
  like "now keep it flying," never like hitting a wall.
- A bad landing, an awkward turn, or a missed beat should never reset your speed.
  Momentum is something the player earns and the game protects. (This is the
  opposite of games like Mirror's Edge, where a clumsy landing zeroes you out — we
  never do that.)

And the second rule, just as important:

**This game is dramatically easier than the games that inspired it.** The
inspirations below (Titanfall 2, Warfork, etc.) are famous for high skill ceilings.
We are keeping the feel of those games but lowering the skill floor to almost
nothing. A complete beginner who has never touched a movement game should be able
to, in their first few minutes:

- reach maximum speed,
- keep that speed without losing it,
- and use every single mechanic — wall-running, dashing, grappling, bhopping, all
  of it.

Mastery still rewards skilled players with style and efficiency, but nobody should
ever feel slow, stuck, or locked out of a mechanic because they aren't good enough.
Timing windows are wide, the game reads what you're trying to do, and small
mistakes get smoothed over automatically.

### Perspective and the "gun"

- Third-person camera, following the character so you can see their suit, coat, and
  animation as they move.
- The weapon is the character's index finger held like a gun, firing magic bullets.
  The same hand also powers the magic line (grapple) and the magic blast used for
  rocket-jumping. Everything traversal and combat flows from the gun-hand.

### The movement vocabulary

Each mechanic below is described by how it feels and what the player does — not how
to build it. Treat every description through the lens of the core philosophy: each
one adds speed below the cap and preserves speed at the cap.

**On the ground**

- **Walking / running.** The baseline. Running builds toward top speed the longer
  you hold it, and the character always feels light and eager — never heavy or
  sluggish, even at a walk.
- **Crouch.** Drop low. Used to start a slide and to tuck in mid-air for a lighter,
  higher launch.
- **Slide.** Crouch while moving to slide along the ground. Sliding downhill
  accelerates you, and you can launch straight out of a slide into a jump to turn
  that slide into a burst of speed.
- **Bunnyhopping / slide-hopping.** Jump the instant you land, over and over, in a
  rhythm, so you never touch the ground long enough to lose speed. Chain hops to
  carry — and grow — your momentum across long stretches and around corners. In our
  game the rhythm window is wide and generous, so anyone can keep a bhop chain
  going without frame-perfect timing.
- **Air strafing.** Gently steer your aim toward the direction you're holding while
  airborne to curve your path and pick up speed. Ours is soft and forgiving: it
  adds speed easily and never punishes you for over-steering.
- **Dash — the signature move.** An instant burst in any direction that adds
  speed — every dash makes you faster than you were. It does not slam you to the
  speed cap; max speed is earned by chaining mechanics continuously, not by a
  single dash. The dash just stacks a boost on top of whatever speed you already
  have. Its real magic is letting you make sharp, unexpected turns — whipping
  around a corner, reversing in mid-air, redirecting completely — while preserving
  your momentum through the turn, and even coming out faster than you went in. A
  beginner who feels slow can dash to pick up speed and keep building from there.

**Up walls and ledges**

- **Double jump.** A second jump in mid-air to extend a leap or redirect it.
- **Wall-running.** Touch a wall while moving and you automatically start running
  along it, the wall feeding you speed. Walls, windows, and façades become routes
  instead of dead ends.
- **Wall-kick / wall-jump.** Kick off a wall to launch in a new direction with no
  loss of speed. Chain kicks from wall to wall to cross a space entirely off the
  ground.
- **Climbing.** Scramble up short vertical surfaces.
- **Mantling.** When you reach for a ledge that's only barely in range, you
  automatically grab it and pull up — so a near-miss becomes a smooth recovery
  instead of a fall.

**In the air**

- **Slow-fall / gliding.** Hold to drift downward slowly, with floaty, responsive
  air control. You keep and redirect your momentum the whole time you're gliding.
- **Fast-fall / ground-pound.** Slam straight down, fast, converting height into a
  hard quick descent — and you can fling back out of it carrying speed.
- **Rocket-jump (themed on the gun-hand).** Fire a magic blast at the ground
  beneath you and ride its knockback to launch yourself up or across a gap. It only
  ever launches you — there is no self-damage, just a satisfying whoosh and a burst
  of speed. Tuck (crouch) into the blast for extra height. Aim it straight down for
  height, shallow for distance.

**Across the world**

- **Grapple — swing.** Fire the magic line to an anchor point and arc around it
  like a rope on a pendulum. The swing builds and carries momentum; release at the
  top of the arc to sling yourself forward, faster than you came in.
- **Grapple — pull.** Fire at a point and reel yourself straight to it, quickly.
  This one is consistent and predictable no matter how fast you're going — ideal
  for closing a gap or gaining height — and you arrive without losing momentum,
  never bonking to a stop.
- **Ziplines.** Hop onto an overhead line and ride it at speed. Drop off (crouch to
  dismount) and convert the ride into a dash or launch, so you exit the zipline
  faster than you got on.
- **Jump pads.** Step on one and get launched in a set direction with a big burst
  of speed. Instant, no skill required.
- **Moving platforms.** They carry you, and their motion adds to yours rather than
  cancelling it — so you can ride one and launch off it with the platform's speed
  folded into your own.

**Environmental**

- **Slow zones (low gravity).** Pockets where gravity is light. You float, get long
  hang-time and extra air control, and keep and redirect your speed while you drift
  through.
- **Swimming.** Move through water. It should still feel fluid and keep you
  moving — never a bog that kills your pace.

### Emergent combinations

Players should be able to stack mechanics into one continuous motion — dash out of
a slide into a wall-run into a grapple-swing into a rocket-jump — and the game
should reward that creativity. Any natural technique that emerges from combining
these mechanics at once is welcome and intended. Speed cap is reached through the
continuous motion and the continuous use of mechanics that each make you faster
until you hit the cap and now preserve it.

### What makes it forgiving (the beginner-friendly layer)

These are the systems that let anyone hit top speed and chain everything. Described
by feel, not implementation:

- **Grace on late jumps ("coyote time").** If you run off the edge of a ledge or
  wall and press jump a hair too late, you still jump. A late press never costs you.
- **Grace on early presses (input buffering).** If you press a move slightly before
  it's possible — say, jump just before you land — the game remembers it and fires
  the instant it can. Rhythmic chains like bhopping feel responsive instead of
  finicky.
- **A beat of grace after every jump.** Just after a jump, the game gives you a
  short window to redirect your momentum hard, so snapping around a sharp turn at
  speed is easy rather than precise.
- **The game reads your intent.** Run at a wall and you wall-run; approach a low
  obstacle and you slide or vault; reach a ledge and you mantle. The player
  shouldn't have to memorize a separate button for every situation — the game
  infers the right move from your angle and speed.
- **Automatic catches.** Wall-runs start on contact, near-miss ledges auto-grab,
  grapple pulls land you cleanly. The game quietly saves imperfect inputs.
- **A way to always build speed back.** Because every dash adds speed, a player can
  never get stuck slow and helpless — dash and you're moving faster, ready to chain
  into everything else and climb back toward top speed.

The goal: a brand-new player feels fast and capable immediately, and a skilled
player still has room to be elegant and efficient.

### Game feel and "juice" (selling the speed)

These make speed feel incredible without changing the underlying rules. All should
be tunable for player comfort.

- **FOV scaling.** As you accelerate, the field of view widens so more of the world
  rushes past your edges — the screen feels faster the faster you go.
- **Speed lines.** Streaks and motion blur at the screen's edges that ramp up with
  your speed, visually celebrating hitting top pace.
- **Camera tilt.** The camera leans into turns, wall-runs, slides, and strafes, so
  you feel yourself carving into your own momentum.
- **Squash and stretch.** The character compresses on landings and impacts and
  stretches during fast motion and launches — adding weight, energy, and bounce.
  Keep it subtle and snappy: felt more than seen, recovering quickly so it never
  adds input lag.
- **Supporting feedback.** Dust kicks on landings, sparks off wall-runs, a distinct
  flying whoosh on the rocket-jump, satisfying sounds and small effects on every
  action — all echoing the sense of speed and flow.

### Inspiration mapping

Each reference is cited for a specific reason. Use them for feel and look, and
remember the skill floor must be far lower than any of them.

- **Titanfall 2** — overall movement feel, wall-running, grappling, bunnyhopping,
  double jump, and the "everything chains together" philosophy.
- **Warfork (and Warsow)** — the momentum-preserving dash specifically: a burst
  that adds speed and lets you redirect sharply in any direction with zero penalty,
  preserving — or even building — momentum straight through the turn. Echo Point
  Nova as inspo too.
- **Ghostrunner** — clean, flowing parkour and the dash as a course-correction
  tool; wall-run-to-slide-to-grapple chaining; animation.
- **Mirror's Edge / Mirror's Edge Catalyst** — traversal flow, the single
  contextual control that reads your intent, and embodied animation. (But never
  copy its hard momentum-reset on bad landings.)
- **Sunset Overdrive** — traversal energy and style: grinding with instant
  direction changes, bounce-everywhere verticality, rewarding stylish continuous
  movement; animation.
- **Ghostrunner / Mirror's Edge / Sunset Overdrive / Deadlock** — animation
  reference overall (clean, weighty, exuberant, confident).
- **Team Fortress 2** — rocket-jumping, reimagined as the gun-hand's magic blast,
  using TF2's no-self-damage practice model so it only ever launches you.
- **Overwatch 2** — wall-running and grappling variations (hold-to-ride wall
  movement, abilities usable while riding, pull-to-perch vs. swing-for-speed
  grapples).
- **Gigantic** — art direction and color (see below).

### Art direction and character

- **Color and overall look — Gigantic.** Vibrant, high-saturation, cel-shaded,
  candy-bright and stylized rather than realistic — drawing on a
  Disney-and-Miyazaki-plus-bright-plastic-toy sensibility. Stylization isn't just
  an aesthetic choice: it stays readable at high speed, runs well, and ages far
  better than photorealism.
- **Character and costume — Deadlock.** The player character wears a full suit with
  a long coat, in the confident, slightly occult-noir / 1930s-meets-steampunk
  silhouette of Deadlock's cast. Costume shape and character animation take after
  Deadlock; the coloring sits in Gigantic's bright palette.

### Scope note

Movement is the primary experience. Combat (the magic bullets) is secondary and
should never get in the way of moving — generous, forgiving aiming so that shooting
never breaks your flow. When in doubt, prioritize the feel of motion over
everything else.
