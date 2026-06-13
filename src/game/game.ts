/**
 * Top-level orchestrator: renderer, scene, lighting, sky and the fixed-timestep
 * game loop that drives input, physics, the camera, combat and FX.
 */
import * as THREE from 'three';
import { CFG } from './config';
import { Input } from './input';
import { CollisionWorld } from './collision';
import { World } from './world';
import { Player } from './player';
import { PlayerModel } from './playerModel';
import { CameraRig } from './cameraRig';
import { Weapon } from './weapon';
import { FX } from './fx';
import { HUD } from './hud';

const STEP = 1 / 120; // fixed physics timestep

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;

  private input: Input;
  private col = new CollisionWorld();
  private world: World;
  private player: Player;
  private model: PlayerModel;
  private rig: CameraRig;
  private weapon: Weapon;
  private fx: FX;
  private hud: HUD;

  private acc = 0;
  private last = performance.now();
  private aimDir = new THREE.Vector3(0, 0, -1);
  private aimPoint = new THREE.Vector3();
  private muzzle = new THREE.Vector3();

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(CFG.baseFov, window.innerWidth / window.innerHeight, 0.1, 600);

    this.setupEnvironment();

    this.input = new Input(this.renderer.domElement);
    this.world = new World(this.col);
    this.scene.add(this.world.group);

    this.player = new Player(this.input, this.col, this.world);
    this.model = new PlayerModel();
    this.scene.add(this.model.root);

    this.rig = new CameraRig(this.camera, this.col);
    this.fx = new FX(this.scene);
    this.weapon = new Weapon(this.scene, this.col, this.world, this.fx);
    this.hud = new HUD();

    window.addEventListener('resize', this.onResize);
    requestAnimationFrame(this.loop);
  }

  private setupEnvironment() {
    // gradient skydome
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(400, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
          top: { value: new THREE.Color(0x132044) },
          mid: { value: new THREE.Color(0x3a2b66) },
          bot: { value: new THREE.Color(0x10101e) },
        },
        vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} `,
        fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;
          void main(){ float h = normalize(vP).y; vec3 c = h>0.0 ? mix(mid, top, h) : mix(mid, bot, -h); gl_FragColor = vec4(c,1.0);} `,
      }),
    );
    this.scene.add(sky);
    this.scene.fog = new THREE.Fog(0x29274f, 60, 320);

    const hemi = new THREE.HemisphereLight(0x9fc4ff, 0x2a2440, 1.05);
    this.scene.add(hemi);
    this.scene.add(new THREE.AmbientLight(0x404a6e, 0.5));

    const sun = new THREE.DirectionalLight(0xfff0d8, 1.6);
    sun.position.set(40, 80, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = sun.shadow.camera as THREE.OrthographicCamera;
    s.left = -90;
    s.right = 90;
    s.top = 90;
    s.bottom = -90;
    s.near = 1;
    s.far = 260;
    sun.shadow.bias = -0.0004;
    sun.target.position.set(0, 0, -50);
    this.scene.add(sun);
    this.scene.add(sun.target);

    const rim = new THREE.DirectionalLight(0xff5aa0, 0.4);
    rim.position.set(-40, 30, -60);
    this.scene.add(rim);
  }

  private onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private loop = (now: number) => {
    requestAnimationFrame(this.loop);
    let frameDt = (now - this.last) / 1000;
    this.last = now;
    if (frameDt > 0.05) frameDt = 0.05; // clamp after stalls

    // mouse look (once per frame) then derive aim
    this.rig.updateLook(this.input);
    this.rig.getAimDir(this.aimDir);

    // fixed-step simulation
    this.acc += frameDt;
    let steps = 0;
    while (this.acc >= STEP && steps < 6) {
      this.input.update(STEP);
      this.world.update(STEP);
      this.player.update(STEP, this.rig.yaw, this.rig.pitch, this.aimDir);
      this.handlePlayerEvents();
      this.acc -= STEP;
      steps++;
    }

    // per-frame visuals
    this.model.update(this.player, frameDt);

    // shooting (uses the animated fingertip muzzle)
    this.rig.aimPoint(this.player, this.aimPoint);
    if (this.weapon.tryFire(this.input.isDown('fire') && this.input.locked, frameDt, this.model.muzzleWorld, this.aimPoint)) {
      this.model.triggerRecoil();
    }
    this.weapon.update(frameDt);

    // grapple rope visual
    if (this.player.grappleMode !== 'none') {
      this.fx.setRope(true, this.model.muzzleWorld, this.player.grapplePoint);
    } else {
      this.fx.setRope(false);
    }

    this.rig.update(this.player, frameDt);
    this.fx.update(frameDt, this.player.speed);
    this.hud.update(this.player, this.world, this.input.locked);

    this.renderer.render(this.scene, this.camera);
  };

  /** Read-only snapshot of game state (used by automated smoke tests). */
  state() {
    const p = this.player;
    return {
      px: p.pos.x,
      py: p.pos.y,
      pz: p.pos.z,
      vy: p.vel.y,
      speed: p.speed,
      grounded: p.grounded,
      state: p.stateLabel(),
      score: this.world.score,
      locked: this.input.locked,
    };
  }

  private handlePlayerEvents() {
    const e = this.player.events;
    if (e.rocket) {
      this.world.damageInRadius(e.rocket.center, CFG.rocketRadius, 35);
      this.fx.explosion(e.rocket.center.clone(), CFG.rocketRadius * 0.5, 0xff8a4d);
      this.fx.ringShock(e.rocket.center.clone(), CFG.rocketRadius, 0xff8a4d);
    }
    if (e.groundPound) {
      this.fx.ringShock(e.groundPound.clone(), CFG.groundPoundShock, 0x33e0ff);
      this.fx.explosion(e.groundPound.clone(), 1.5, 0xffffff);
    }
    if (e.grappleFired) this.fx.muzzleFlash(this.model.muzzleWorld, this.aimDir);
  }
}
