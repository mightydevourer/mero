/**
 * Central tuning for Mero — a third-person movement shooter.
 *
 * Everything that defines "game feel" lives here so it can be tweaked in one
 * place. Units are meters and seconds. Gravity and speeds are deliberately
 * exaggerated beyond real-world values for a snappy, momentum-heavy game in the
 * spirit of Titanfall 2, Ghostrunner and Quake-style movement.
 */

export const CFG = {
  // --- World ---
  gravity: 30, // m/s^2 downward
  maxFallSpeed: 60,

  // --- Capsule ---
  radius: 0.4,
  standHeight: 1.85,
  crouchHeight: 1.0,
  stepHeight: 0.45, // auto-step up small ledges
  eyeHeightFactor: 0.9,

  // --- Ground locomotion ---
  runSpeed: 9.5,
  walkSpeed: 4.5,
  crouchSpeed: 4.0,
  groundAccel: 95,
  groundFriction: 9,
  stopSpeed: 2.5, // below this, friction is stronger (crisp stops)

  // --- Air movement (airstrafing / bunnyhop) ---
  airAccel: 70,
  airCap: 1.4, // clamped wishspeed used in air accel -> enables strafe accel
  airControl: 1.0,

  // --- Jumping ---
  jumpSpeed: 11.5,
  doubleJumpSpeed: 10.5,
  maxAirJumps: 1, // double jump = 1 extra
  coyoteTime: 0.12, // grace after leaving ledge
  jumpBuffer: 0.14, // grace before landing
  bhopWindow: 0.12, // land+jump within this -> keep momentum (no friction)

  // --- Dash ---
  dashSpeed: 24,
  dashTime: 0.16,
  dashCooldown: 0.9,
  maxAirDashes: 1,
  dashUpBias: 0.12,

  // --- Crouch / Slide ---
  slideInSpeed: 13.5, // speed slide boosts you to on entry
  slideFriction: 2.2,
  slideMinSpeed: 4.5, // below this slide ends
  slideSteer: 4.0,
  slideJumpBoost: 1.5, // extra forward speed on slide-hop
  slopeSlideAccel: 22, // gravity pull while sliding down ramps

  // --- Glide / slow fall ---
  glideGravityScale: 0.28,
  glideMaxFall: 6,
  glideForwardBoost: 6,

  // --- Fast fall / ground pound ---
  groundPoundSpeed: 38,
  groundPoundShock: 6, // radius of landing shockwave

  // --- Wall running ---
  wallRunMinSpeed: 4.5,
  wallRunGravity: 6.5, // reduced gravity while wallrunning
  wallRunMaxTime: 2.4,
  wallRunStick: 12, // pull toward wall
  wallRunSpeed: 11,
  wallRunUpBoostOnEnter: 2.5,
  wallRunCameraTilt: 0.28, // radians of camera roll

  // --- Wall jump / kick ---
  wallJumpUp: 10.5,
  wallJumpAway: 9.5,
  wallJumpForward: 5.0,
  wallCoyote: 0.18,

  // --- Climb ---
  climbSpeed: 5.5,
  climbMaxTime: 1.4, // stamina
  climbRegen: 1.2,

  // --- Mantle / vault ---
  mantleReach: 1.3, // how far above feet a ledge can be grabbed
  mantleForward: 1.2,
  mantleUpSpeed: 9,
  mantleTime: 0.32,

  // --- Grapple ---
  grappleMaxLength: 55,
  grappleSpeed: 90, // projectile travel speed
  swingPump: 18, // extra accel when holding forward in a swing
  swingRopeAdjust: 9, // rope shorten/lengthen rate
  pullSpeed: 34, // reel-in speed
  grappleCooldown: 0.15,

  // --- Rocket / recoil jump (finger-gun blast) ---
  rocketImpulse: 21,
  rocketRadius: 5.5,
  rocketCooldown: 1.1,
  rocketSelfBoost: 1.0,

  // --- Swimming ---
  swimSpeed: 6.5,
  swimAccel: 30,
  swimDrag: 3.5,
  waterGravity: 6,
  swimUp: 7,
  buoyancy: 9,

  // --- Jump pads / ziplines / platforms ---
  ziplineSpeed: 16,
  ziplineGravityAssist: 8,

  // --- Combat ---
  bulletSpeed: 95,
  bulletLife: 1.4,
  fireRate: 0.09, // seconds between shots
  bulletDamage: 18,

  // --- Camera ---
  camDistance: 5.2,
  camHeight: 1.7,
  camShoulder: 0.9, // lateral offset (over-the-shoulder)
  camMinDistance: 1.2,
  camPitchMin: -1.15,
  camPitchMax: 1.15,
  mouseSensitivity: 0.0024,
  camFollowLambda: 14,
  camRotateLambda: 22,

  // --- FOV scaling ---
  baseFov: 78,
  maxFov: 102,
  fovSpeedRef: 26, // speed at which we approach maxFov
  fovLambda: 6,

  // --- Camera tilt (strafe roll) ---
  strafeTilt: 0.05,
  tiltLambda: 9,

  // --- Squash & stretch ---
  squashLambda: 16,
} as const;

export type Config = typeof CFG;
