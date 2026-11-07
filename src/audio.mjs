// All sounds are original short Web Audio tones; audio failure never blocks play.
export class AudioManager {
  constructor() { this.enabled = true; this.context = null; this.lastStep = 0; }
  unlock() {
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context || !this.enabled) return;
      this.context ??= new Context();
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      const buffer = this.context.createBuffer(1, 1, this.context.sampleRate);
      const source = this.context.createBufferSource(); source.buffer = buffer;
      source.connect(this.context.destination); source.start();
    } catch { /* Continue silently. */ }
  }
  toggle() { this.enabled = !this.enabled; if (this.enabled) this.unlock(); return this.enabled; }
  tone(frequency, delay = 0, duration = 0.4, volume = 0.055, type = 'sine') {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    try {
      const time = this.context.currentTime + delay;
      const oscillator = this.context.createOscillator(), gain = this.context.createGain();
      oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, time);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(volume, time + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      oscillator.connect(gain); gain.connect(this.context.destination);
      oscillator.start(time); oscillator.stop(time + duration + 0.02);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    } catch { /* Sound is optional. */ }
  }
  bell() { [1047, 1568, 2093, 2637].forEach((f, i) => this.tone(f, i * 0.025, 0.65, 0.045 / (i + 1))); }
  awake() { [523, 659, 784].forEach((f, i) => this.tone(f, i * 0.1, 0.35)); }
  gift() { [659, 784, 1047].forEach((f, i) => this.tone(f, i * 0.09, 0.4)); }
  clear() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, i * 0.13, 0.6, 0.05)); }
  step(time) { if (time - this.lastStep > 0.29) { this.lastStep = time; this.tone(150, 0, 0.07, 0.012, 'triangle'); } }
  suspend() { try { this.context?.suspend().catch(() => {}); } catch {} }
}
