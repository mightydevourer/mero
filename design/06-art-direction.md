# 06 — Art Direction & Character

Two references, one recipe: **Gigantic's color in Deadlock's tailoring.**
Stylization is a functional choice before an aesthetic one — it stays readable at
30 m/s, runs fast, and ages better than photorealism.

---

## 1. Color and overall look (Gigantic)

- **Palette:** vibrant, high-saturation, candy-bright. Broad confident color
  fields over noisy texture detail. Disney-and-Miyazaki warmth plus
  bright-plastic-toy pop; painterly gradients, not PBR grit.
- **Rendering:** cel-shaded — stepped lighting, bold rims, clean silhouette
  lines. Chunky, readable shapes; exaggerated proportions welcome.
- **Light:** sunny and theatrical. Strong key light and colored bounce; shadows
  are colored, never muddy. The world should feel like it's cheering.
- **VFX language:** the gun-hand's magic is the signature hue of the game (a
  saturated accent — e.g. radiant coral-gold — reserved *exclusively* for player
  magic: bullets, line, blast, dash trail). One glance separates "me and my
  power" from "world."

## 2. Readability at speed (the functional rules)

Art direction is a gameplay system here; at Full Flow the player has ~0.3 s to
read anything. Hard rules:

- **Reserved colors.** Player magic (accent hue), interactables (anchor glow,
  pads, ziplines — a shared secondary accent), and enemies (high-contrast
  warm-on-dark silhouettes) each own a color family no environment art may use.
- **Affordance coding is consistent forever:** wall-runnable surfaces share a
  material treatment (banded trim + subtle sheen); grapple anchors are the same
  glowing shape everywhere; slide-under gaps get an undercut shadow color. The
  world teaches by palette ([07](07-level-design.md)).
- **Value structure:** routes read in silhouette and value first — squint-test
  every space; the intended lines should survive a blur.
- **Effects never occlude the path** ([04 §3](04-game-feel.md)): juice lives at
  the screen edges and behind the character, not on the route ahead.

## 3. Character and costume (Deadlock)

- **Silhouette:** full suit with a long coat — confident, slightly occult-noir,
  1930s-meets-steampunk. Tailored shapes: strong shoulders, cinched waist, the
  coat as the biggest read. Gloved gun-hand with a distinctive cuff or ring that
  glows with the magic (the eye's anchor for aim and ability feedback).
- **Coloring:** the Deadlock silhouette wearing Gigantic's palette — saturated
  suit tones (teal, plum, mustard, vermilion) with the reserved player-magic
  accent in the lining, trim, and hand.
- **The coat is a gameplay object:** the primary secondary-motion system.
  It trails at speed, snaps on dashes, flares on swings, tucks in slides —
  cloth as the character's built-in speed lines. Budget it like a feature.

## 4. Animation (Ghostrunner / Mirror's Edge / Sunset Overdrive / Deadlock)

Clean, weighty, exuberant, confident — and **never in charge**: animation follows
simulation; it may not delay, dampen, or lock any input (the feel-layer law,
[04](04-game-feel.md)).

- **Clean** (Ghostrunner): crisp poses per mechanic — every move readable in one
  frame; wall-runs, slides, kicks hit strong distinct silhouettes.
- **Embodied** (Mirror's Edge): hands touch the world — walls brushed during
  runs, ledges slapped on mantles, fingers spread in glides. Third-person, so
  the whole body sells contact.
- **Exuberant** (Sunset Overdrive): style flourishes on mastery beats
  ([03 §7](03-forgiveness-and-intent.md)) — frame-tight hops and clean releases
  earn spins, hand-drags, coat tricks. Cosmetic, cancellable, celebratory.
- **Confident** (Deadlock): the gunplay layer — the index finger *is* a weapon
  and the upper body treats it like one: deliberate aim tracking, relaxed
  swagger at rest, no fear in the poses.
- **Squash & stretch** per [04 §5](04-game-feel.md): rig-level, subtle, ≤ 150 ms
  recovery.

## 5. World tone

Environments exist to be moved through joyfully: sun-washed rooftops, floating
gardens, bright machinery — verticality and openness over corridors, in
Gigantic's storybook-fantastical register. Occult-noir lives in the *character
and magic*, not the world: the contrast of a dark-tailored figure streaking
through a candy-bright sky is the game's signature image (and its box art).
