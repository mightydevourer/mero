/**
 * DOM-based HUD: crosshair, speed + movement-state readout, ability cooldown
 * pips, score, and a click-to-play / controls panel shown when not pointer
 * locked.
 */
import { Player } from './player';
import { World } from './world';
import { clamp } from './mathx';

const CSS = `
.hud, .hud * { box-sizing: border-box; }
.hud {
  position: fixed; inset: 0; z-index: 10; pointer-events: none;
  font-family: ui-monospace, "SF Mono", Menlo, monospace; color: #eaf2ff;
  text-shadow: 0 1px 3px rgba(0,0,0,.7); user-select: none;
}
.hud .crosshair {
  position: absolute; left: 50%; top: 50%; width: 22px; height: 22px;
  transform: translate(-50%,-50%);
}
.hud .crosshair::before, .hud .crosshair::after {
  content: ""; position: absolute; background: #ff66b2; box-shadow: 0 0 6px #ff3a8c;
}
.hud .crosshair::before { left: 50%; top: 0; width: 2px; height: 100%; transform: translateX(-50%); }
.hud .crosshair::after  { top: 50%; left: 0; height: 2px; width: 100%; transform: translateY(-50%); }
.hud .dot { position:absolute; left:50%; top:50%; width:4px; height:4px; border-radius:50%;
  transform: translate(-50%,-50%); background:#fff; box-shadow:0 0 6px #33e0ff; }
.hud .tl { position: absolute; left: 22px; top: 18px; }
.hud .speed { font-size: 40px; font-weight: 700; letter-spacing: -1px; line-height: 1; }
.hud .speed small { font-size: 15px; opacity: .7; font-weight: 500; }
.hud .state { margin-top: 6px; font-size: 16px; font-weight: 700; color: #33e0ff; letter-spacing: 1px; }
.hud .tr { position: absolute; right: 22px; top: 18px; text-align: right; }
.hud .score { font-size: 30px; font-weight: 700; color: #ffd23a; }
.hud .score small { font-size: 13px; opacity:.7; color:#eaf2ff; }
.hud .abilities { position: absolute; left: 50%; bottom: 26px; transform: translateX(-50%);
  display: flex; gap: 14px; }
.hud .ab { width: 92px; text-align: center; }
.hud .ab .bar { height: 6px; border-radius: 4px; background: rgba(255,255,255,.18); overflow: hidden; margin-top: 4px; }
.hud .ab .fill { height: 100%; width: 0%; background: #33e0ff; transition: width .05s linear; }
.hud .ab.rocket .fill { background:#ff8a4d; } .hud .ab.grapple .fill { background:#ff66b2; }
.hud .ab .k { font-size: 11px; opacity:.7; } .hud .ab .n { font-size: 13px; font-weight:700; }
.hud .ab.ready .n { color: #b6ffb0; }
.hud .pips { position:absolute; left:50%; bottom: 58px; transform: translateX(-50%); display:flex; gap:6px; }
.hud .pip { width:10px; height:10px; border-radius:50%; background:rgba(255,255,255,.2); border:1px solid rgba(255,255,255,.4);}
.hud .pip.on { background:#b6ffb0; box-shadow:0 0 6px #b6ffb0; }
.hud .lock {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: radial-gradient(ellipse at center, rgba(10,14,30,.55), rgba(6,8,18,.86));
  pointer-events: none; text-align: center;
}
.hud .lock .card { max-width: 680px; padding: 28px 36px; }
.hud .lock h1 { font-size: 44px; margin: 0 0 4px; letter-spacing: 2px; color:#ff66b2; }
.hud .lock h1 b { color:#33e0ff; }
.hud .lock p.sub { opacity:.85; margin: 0 0 18px; font-size: 15px; }
.hud .lock .play { font-size: 20px; font-weight: 700; color:#06203a; background:#33e0ff;
  display:inline-block; padding:10px 22px; border-radius:10px; box-shadow:0 0 26px rgba(51,224,255,.6); }
.hud .lock .grid { margin-top: 22px; display:grid; grid-template-columns: 1fr 1fr; gap:6px 28px;
  text-align:left; font-size: 13.5px; }
.hud .lock .grid b { color:#ffd23a; display:inline-block; min-width: 86px; }
.hud .hidden { display: none; }
`;

export class HUD {
  private root: HTMLDivElement;
  private elSpeed: HTMLElement;
  private elState: HTMLElement;
  private elScore: HTMLElement;
  private elDash: HTMLElement;
  private elRocket: HTMLElement;
  private elGrapple: HTMLElement;
  private elPips: HTMLElement;
  private elLock: HTMLElement;

  constructor() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.innerHTML = `
      <div class="crosshair"></div><div class="dot"></div>
      <div class="tl">
        <div class="speed"><span id="spd">0</span> <small>m/s</small></div>
        <div class="state" id="state">IDLE</div>
      </div>
      <div class="tr"><div class="score"><span id="score">0</span> <small>SCORE</small></div></div>
      <div class="pips" id="pips"></div>
      <div class="abilities">
        <div class="ab dash"><div class="n">DASH</div><div class="bar"><div class="fill" id="dash"></div></div><div class="k">SHIFT</div></div>
        <div class="ab rocket"><div class="n">RECOIL</div><div class="bar"><div class="fill" id="rocket"></div></div><div class="k">Q</div></div>
        <div class="ab grapple"><div class="n">GRAPPLE</div><div class="bar"><div class="fill" id="grapple"></div></div><div class="k">RMB / F</div></div>
      </div>
      <div class="lock" id="lock"><div class="card">
        <h1>M<b>E</b>RO</h1>
        <p class="sub">third-person finger-gun parkour — click to lock the mouse and play</p>
        <div class="play">▶ CLICK TO PLAY</div>
        <div class="grid">
          <div><b>WASD</b> move</div><div><b>Mouse</b> aim</div>
          <div><b>Space</b> jump / double-jump (hold = glide)</div><div><b>Shift</b> dash</div>
          <div><b>Ctrl / C</b> crouch · slide · ground-pound</div><div><b>LMB</b> shoot magic bullets</div>
          <div><b>RMB</b> grapple swing (hold)</div><div><b>F</b> grapple pull / reel</div>
          <div><b>Q</b> recoil / rocket jump</div><div><b>Alt</b> walk</div>
          <div><b>R</b> respawn</div><div><b>Wall</b> auto wall-run · jump to kick off</div>
        </div>
      </div></div>
    `;
    document.body.appendChild(this.root);

    this.elSpeed = this.q('#spd');
    this.elState = this.q('#state');
    this.elScore = this.q('#score');
    this.elDash = this.q('#dash');
    this.elRocket = this.q('#rocket');
    this.elGrapple = this.q('#grapple');
    this.elPips = this.q('#pips');
    this.elLock = this.q('#lock');
  }

  private q(sel: string): HTMLElement {
    return this.root.querySelector(sel) as HTMLElement;
  }

  update(player: Player, world: World, locked: boolean) {
    this.elSpeed.textContent = player.speed.toFixed(1);
    this.elState.textContent = player.stateLabel();
    this.elScore.textContent = String(world.score);
    this.elDash.style.width = `${clamp(player.dashReady, 0, 1) * 100}%`;
    this.elRocket.style.width = `${clamp(player.rocketReady, 0, 1) * 100}%`;
    this.elGrapple.style.width = player.grappleMode !== 'none' ? '100%' : '100%';

    // jump pips: how many air jumps + dashes remain
    const total = 1 + player.jumpsLeft;
    const dashes = player.airDashesLeft;
    let html = '';
    for (let i = 0; i < total; i++) html += `<div class="pip on"></div>`;
    for (let i = 0; i < dashes; i++) html += `<div class="pip ${player.dashReady >= 1 ? 'on' : ''}"></div>`;
    this.elPips.innerHTML = html;

    this.elLock.classList.toggle('hidden', locked);
  }
}
