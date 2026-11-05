// Web Audio API Synthesizer for 2D Inspection, Road Paving, and Vehicle Launch SFX
// 100% self-contained, zero external asset dependencies, browser-safe.

class InspectionAudioService {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  // Gentle UI blip when clicking wheel
  playTyreClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  // Chime when tyre is inspected
  playInspectionPass() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);

        gain.gain.setValueAtTime(0.09, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.25);
      });
    } catch {}
  }

  // Road segment laser curing / paving pulse
  playRoadPaving() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.18);

      // Low-pass filter for smooth asphalt cure sound
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, ctx.currentTime);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  }

  // Engine ignition & starter crank
  playEngineIgnition() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;

      // Starter cranks
      for (let i = 0; i < 3; i++) {
        const crankOsc = ctx.createOscillator();
        const crankGain = ctx.createGain();
        crankOsc.type = 'triangle';
        crankOsc.frequency.setValueAtTime(90 + i * 15, now + i * 0.12);
        crankGain.gain.setValueAtTime(0.12, now + i * 0.12);
        crankGain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.08);
        crankOsc.connect(crankGain);
        crankGain.connect(ctx.destination);
        crankOsc.start(now + i * 0.12);
        crankOsc.stop(now + i * 0.12 + 0.09);
      }

      // Deep diesel engine rumble idle
      const engineOsc = ctx.createOscillator();
      const engineGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      engineOsc.type = 'sawtooth';
      engineOsc.frequency.setValueAtTime(45, now + 0.4);
      engineOsc.frequency.linearRampToValueAtTime(75, now + 0.8);
      engineOsc.frequency.linearRampToValueAtTime(60, now + 1.6);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, now + 0.4);

      engineGain.gain.setValueAtTime(0.001, now + 0.4);
      engineGain.gain.linearRampToValueAtTime(0.14, now + 0.6);
      engineGain.gain.linearRampToValueAtTime(0.08, now + 1.4);
      engineGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(ctx.destination);

      engineOsc.start(now + 0.4);
      engineOsc.stop(now + 1.8);
    } catch {}
  }

  // Powerful highway launch acceleration with turbo spool & whoosh
  playVehicleLaunch() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;

      // 1. High turbo spool pitch sweep
      const turboOsc = ctx.createOscillator();
      const turboGain = ctx.createGain();
      turboOsc.type = 'sine';
      turboOsc.frequency.setValueAtTime(300, now);
      turboOsc.frequency.exponentialRampToValueAtTime(1800, now + 1.4);

      turboGain.gain.setValueAtTime(0.02, now);
      turboGain.gain.linearRampToValueAtTime(0.12, now + 0.8);
      turboGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

      turboOsc.connect(turboGain);
      turboGain.connect(ctx.destination);
      turboOsc.start(now);
      turboOsc.stop(now + 2.0);

      // 2. Heavy diesel acceleration power roar
      const engineOsc = ctx.createOscillator();
      const engineGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      engineOsc.type = 'sawtooth';
      engineOsc.frequency.setValueAtTime(60, now);
      engineOsc.frequency.exponentialRampToValueAtTime(160, now + 1.2);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, now);
      filter.frequency.exponentialRampToValueAtTime(900, now + 1.2);

      engineGain.gain.setValueAtTime(0.1, now);
      engineGain.gain.linearRampToValueAtTime(0.2, now + 0.6);
      engineGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(ctx.destination);

      engineOsc.start(now);
      engineOsc.stop(now + 2.2);

      // 3. Highway air rush (noise buffer)
      const bufferSize = ctx.sampleRate * 2.2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(400, now);
      noiseFilter.frequency.linearRampToValueAtTime(1200, now + 1.0);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.01, now);
      noiseGain.gain.linearRampToValueAtTime(0.09, now + 0.8);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 2.2);
    } catch {}
  }
}

export const inspectionAudio = new InspectionAudioService();
