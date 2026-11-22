// 100% procedural Web Audio API heist foley and clockwork tension soundscape.

export function createAudioEngine() {
  let ctx = null;
  let muted = false;
  let pulseAcc = 0;

  function ensure() {
    if (muted) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        ctx = new AC();
      } catch {
        return null;
      }
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function tone(freq, duration, type = 'sine', gain = 0.08, endFreq = null, delay = 0) {
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t0 + duration);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  function noiseBurst(duration, cutoff, gain = 0.06) {
    const c = ensure();
    if (!c) return;
    const len = Math.max(1, Math.floor(c.sampleRate * duration));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filt = c.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = cutoff;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    src.connect(filt);
    filt.connect(g);
    g.connect(c.destination);
    src.start();
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    tickTension(alarm, dt) {
      if (muted || !ctx || ctx.state !== 'running') return;
      const interval = Math.max(0.28, 0.92 - (alarm / 100) * 0.62);
      pulseAcc += dt;
      if (pulseAcc >= interval) {
        pulseAcc = 0;
        const base = 72 + alarm * 0.6;
        tone(base, 0.07, 'triangle', 0.025 + (alarm / 100) * 0.03, base * 0.72);
        tone(1180 + alarm * 6, 0.022, 'square', 0.008);
      }
    },
    playFootstep(loud) {
      noiseBurst(loud ? 0.07 : 0.04, loud ? 420 : 280, loud ? 0.05 : 0.022);
    },
    playTumblerClick() {
      tone(980, 0.035, 'triangle', 0.045, 1420);
    },
    playLootSecured() {
      tone(523.25, 0.16, 'triangle', 0.08, null, 0);
      tone(659.25, 0.18, 'triangle', 0.08, null, 0.08);
      tone(783.99, 0.24, 'triangle', 0.09, null, 0.16);
      tone(1046.5, 0.36, 'sine', 0.09, null, 0.24);
    },
    playEmp() {
      tone(180, 0.42, 'sawtooth', 0.11, 36);
      noiseBurst(0.28, 1600, 0.07);
    },
    playDecoy() {
      tone(1320, 0.12, 'sine', 0.06, null, 0);
      tone(1760, 0.14, 'sine', 0.055, null, 0.09);
      tone(1568, 0.16, 'sine', 0.05, null, 0.18);
    },
    playSmoke() {
      noiseBurst(0.45, 780, 0.09);
    },
    playTap() {
      tone(640, 0.08, 'square', 0.045, 960, 0);
      tone(960, 0.12, 'triangle', 0.05, 1280, 0.07);
    },
    playVent() {
      noiseBurst(0.16, 360, 0.06);
      tone(220, 0.12, 'triangle', 0.045, 140);
    },
    playSpotSting() {
      tone(440, 0.18, 'sawtooth', 0.07, 587);
    },
    playAlarmPing() {
      tone(880, 0.14, 'square', 0.065, 660);
    },
    playCaughtFail() {
      tone(311, 0.28, 'sawtooth', 0.09, 196, 0);
      tone(233, 0.42, 'sawtooth', 0.09, 110, 0.18);
    },
    playGetawayFanfare() {
      tone(392.0, 0.22, 'triangle', 0.08, null, 0);
      tone(493.88, 0.22, 'triangle', 0.08, null, 0.1);
      tone(587.33, 0.28, 'triangle', 0.08, null, 0.2);
      tone(783.99, 0.55, 'sine', 0.1, null, 0.3);
    },
  };
}
