// All-synthesized WebAudio: no assets, everything generated.
// One master bus + a wind loop whose gain follows player speed.

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.windGain = null;
    this.windFilter = null;
    this.started = false;
  }

  start() {
    if (this.started) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    } catch (_) { return; }
    this.started = true;
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = 0.42;
    this.master.connect(c.destination);

    // wind loop: filtered noise, gain driven by speed
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf; src.loop = true;
    this.windFilter = c.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 700;
    this.windFilter.Q.value = 0.6;
    this.windGain = c.createGain();
    this.windGain.gain.value = 0;
    src.connect(this.windFilter).connect(this.windGain).connect(this.master);
    src.start();
  }

  setWind(frac) { // frac 0..1 of speed cap
    if (!this.started) return;
    const t = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(Math.pow(frac, 1.6) * 0.5, t, 0.08);
    this.windFilter.frequency.setTargetAtTime(400 + frac * 1600, t, 0.1);
  }

  _env(gainNode, t, peak, attack, decay) {
    const g = gainNode.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(Math.max(peak, 0.0011), t + attack);
    g.exponentialRampToValueAtTime(0.001, t + attack + decay);
  }

  tone({ type = 'sine', from = 440, to = 440, dur = 0.15, vol = 0.3, attack = 0.005 }) {
    if (!this.started) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t + dur);
    this._env(g, t, vol, attack, dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + attack + 0.05);
  }

  noise({ dur = 0.2, vol = 0.25, from = 1200, to = 300, q = 1, type = 'lowpass', attack = 0.005 }) {
    if (!this.started) return;
    const c = this.ctx, t = c.currentTime;
    const len = Math.max(1, Math.floor(c.sampleRate * (dur + 0.05)));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(to, 20), t + dur);
    const g = c.createGain();
    this._env(g, t, vol, attack, dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t); src.stop(t + dur + 0.1);
  }

  // ------- named events -------
  play(name, data = {}) {
    if (!this.started) return;
    switch (name) {
      case 'jump': this.tone({ type: 'triangle', from: 300, to: 560, dur: 0.12, vol: 0.22 }); break;
      case 'doublejump': this.tone({ type: 'triangle', from: 420, to: 820, dur: 0.14, vol: 0.24 }); break;
      case 'bhop': this.tone({ type: 'square', from: 500, to: 740, dur: 0.06, vol: 0.10 }); break;
      case 'dash':
        this.noise({ dur: 0.22, vol: 0.4, from: 3600, to: 500, type: 'bandpass', q: 1.4 });
        this.tone({ type: 'sawtooth', from: 220, to: 90, dur: 0.18, vol: 0.10 });
        break;
      case 'land': {
        const i = Math.min(1, (data.impact || 5) / 25);
        this.noise({ dur: 0.1 + i * 0.1, vol: 0.10 + i * 0.28, from: 500, to: 90 });
        break;
      }
      case 'slide_start': this.noise({ dur: 0.3, vol: 0.16, from: 900, to: 350, type: 'bandpass', q: 0.8 }); break;
      case 'slidehop': this.tone({ type: 'triangle', from: 340, to: 700, dur: 0.13, vol: 0.24 }); break;
      case 'wallrun_start': this.noise({ dur: 0.25, vol: 0.2, from: 1800, to: 900, type: 'bandpass', q: 2 }); break;
      case 'wallkick': this.tone({ type: 'triangle', from: 380, to: 760, dur: 0.12, vol: 0.26 }); break;
      case 'mantle': this.tone({ type: 'sine', from: 300, to: 480, dur: 0.1, vol: 0.16 }); break;
      case 'glide_start': this.noise({ dur: 0.4, vol: 0.14, from: 600, to: 1400, type: 'bandpass', q: 1 }); break;
      case 'pound_start': this.noise({ dur: 0.3, vol: 0.3, from: 800, to: 3000, type: 'highpass' }); break;
      case 'pound_land':
        this.noise({ dur: 0.35, vol: 0.5, from: 400, to: 60 });
        this.tone({ type: 'sine', from: 120, to: 40, dur: 0.3, vol: 0.4 });
        break;
      case 'shoot':
        this.tone({ type: 'square', from: 1400 + Math.random() * 300, to: 300, dur: 0.09, vol: 0.12, attack: 0.002 });
        break;
      case 'target_hit':
        this.tone({ type: 'sine', from: 700, to: 1400, dur: 0.16, vol: 0.3 });
        this.tone({ type: 'sine', from: 1050, to: 2100, dur: 0.2, vol: 0.18 });
        break;
      case 'hitmark':
        this.tone({ type: 'square', from: 1800, to: 1400, dur: 0.05, vol: 0.16, attack: 0.001 });
        break;
      case 'hurt':
        this.noise({ dur: 0.12, vol: 0.3, from: 700, to: 200 });
        this.tone({ type: 'sawtooth', from: 220, to: 130, dur: 0.12, vol: 0.14 });
        break;
      case 'death':
        this.tone({ type: 'sawtooth', from: 400, to: 60, dur: 0.6, vol: 0.3 });
        this.noise({ dur: 0.5, vol: 0.3, from: 1200, to: 100 });
        break;
      case 'kill':
        this.tone({ type: 'sine', from: 620, to: 940, dur: 0.12, vol: 0.26 });
        this.tone({ type: 'sine', from: 930, to: 1400, dur: 0.16, vol: 0.2 });
        break;
      case 'blast_fire': this.noise({ dur: 0.15, vol: 0.3, from: 2000, to: 500, type: 'bandpass', q: 1 }); break;
      case 'blast_hit':
        this.noise({ dur: 0.5, vol: 0.55, from: 900, to: 70 });
        this.tone({ type: 'sine', from: 200, to: 45, dur: 0.4, vol: 0.4 });
        break;
      case 'rocketjump': this.noise({ dur: 0.5, vol: 0.35, from: 400, to: 2400, type: 'bandpass', q: 1.2 }); break;
      case 'grapple_fire': this.tone({ type: 'sawtooth', from: 1800, to: 500, dur: 0.14, vol: 0.14 }); break;
      case 'grapple_latch': this.tone({ type: 'triangle', from: 600, to: 900, dur: 0.08, vol: 0.2 }); break;
      case 'grapple_release': this.tone({ type: 'triangle', from: 500, to: 1000, dur: 0.18, vol: 0.24 }); break;
      case 'zip_attach': this.tone({ type: 'sawtooth', from: 300, to: 600, dur: 0.15, vol: 0.16 }); break;
      case 'zip_dismount': this.tone({ type: 'triangle', from: 550, to: 950, dur: 0.15, vol: 0.22 }); break;
      case 'pad':
        this.tone({ type: 'sine', from: 200, to: 640, dur: 0.24, vol: 0.4 });
        this.tone({ type: 'sine', from: 100, to: 320, dur: 0.24, vol: 0.2 });
        break;
      case 'splash': this.noise({ dur: 0.4, vol: 0.3, from: 1400, to: 300 }); break;
      case 'respawn': this.tone({ type: 'sine', from: 220, to: 660, dur: 0.35, vol: 0.25 }); break;
      case 'fizzle': this.noise({ dur: 0.1, vol: 0.1, from: 900, to: 300, type: 'bandpass' }); break;
      case 'flow': {
        const n = Math.min(data.combo || 1, 10);
        this.tone({ type: 'sine', from: 500 + n * 60, to: 700 + n * 90, dur: 0.09, vol: 0.12 });
        break;
      }
    }
  }
}
