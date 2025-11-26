// src/services/audioService.ts
// Client-only audio: SFX + Procedural music engine.
// NO TTS, NO server calls, NO provider keys.

/* eslint-disable @typescript-eslint/no-explicit-any */

let audioCtx: AudioContext | null = null;
const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

// --- SFX ---
export const playSound = (type: "CLICK" | "SUCCESS" | "FAIL" | "GAMEOVER" | "WIN") => {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;

  switch (type) {
    case "CLICK":
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
      break;

    case "SUCCESS":
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
      break;

    case "FAIL":
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
      break;

    case "WIN":
      osc.type = "square";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 1.5);
      osc.start(now);
      osc.stop(now + 1.5);
      break;

    case "GAMEOVER":
      osc.type = "triangle";
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(20, now + 0.5);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
      break;
  }
};

// --- Procedural Background Music ---
class MusicEngine {
  private isPlaying: boolean = false;
  private nextNoteTime: number = 0;
  private currentBeat: number = 0;
  private tempo: number = 110;
  private lookahead: number = 25.0; // ms
  private scheduleAheadTime: number = 0.1; // s
  private timerID: number | null = null;
  private notesInQueue: { note: number; time: number }[] = [];

  private bassLine = [65.41, 65.41, 77.78, 65.41, 58.27, 65.41, 77.78, 87.31];

  public start() {
    if (this.isPlaying) return;
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    this.isPlaying = true;
    this.currentBeat = 0;
    this.nextNoteTime = ctx.currentTime;
    this.scheduler();
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerID) window.clearTimeout(this.timerID);
  }

  private nextNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat; // 16th notes
    this.currentBeat = (this.currentBeat + 1) % 32;
  }

  private scheduleNote(beatNumber: number, time: number) {
    this.notesInQueue.push({ note: beatNumber, time });
    const ctx = getAudioContext();
    const musicGain = ctx.createGain();
    musicGain.gain.value = 0.15;
    musicGain.connect(ctx.destination);

    if (beatNumber % 4 === 0) {
      this.playKick(ctx, time, musicGain);
    }
    if (beatNumber % 8 === 4) {
      this.playSnare(ctx, time, musicGain);
    }
    if (beatNumber % 2 === 0) {
      this.playHiHat(ctx, time, musicGain);
    }
    if (beatNumber % 4 === 0) {
      const noteIndex = Math.floor(beatNumber / 4) % this.bassLine.length;
      this.playBass(ctx, time, musicGain, this.bassLine[noteIndex]);
    }
  }

  private scheduler() {
    if (!this.isPlaying) return;
    const ctx = getAudioContext();
    while (this.nextNoteTime < ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentBeat, this.nextNoteTime);
      this.nextNote();
    }
    this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  private playKick(ctx: AudioContext, time: number, dest: AudioNode) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(dest);
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
    osc.start(time);
    osc.stop(time + 0.5);
  }

  private playSnare(ctx: AudioContext, time: number, dest: AudioNode) {
    const bufferSize = Math.floor(ctx.sampleRate * 0.1);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noise.connect(noiseGain);
    noiseGain.connect(dest);
    noiseGain.gain.setValueAtTime(0.4, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    noise.start(time);

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.frequency.setValueAtTime(200, time);
    oscGain.gain.setValueAtTime(0.2, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  private playHiHat(ctx: AudioContext, time: number, dest: AudioNode) {
    const bufferSize = Math.floor(ctx.sampleRate * 0.05);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 5000;
    const gain = ctx.createGain();
    noise.connect(highpass);
    highpass.connect(gain);
    gain.connect(dest);
    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    noise.start(time);
  }

  private playBass(ctx: AudioContext, time: number, dest: AudioNode, freq: number) {
    const osc = ctx.createOscillator();
    osc.type = "square";
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    const gain = ctx.createGain();
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc.frequency.setValueAtTime(freq, time);
    filter.frequency.setValueAtTime(400, time);
    filter.frequency.exponentialRampToValueAtTime(100, time + 0.3);
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.linearRampToValueAtTime(0, time + 0.3);
    osc.start(time);
    osc.stop(time + 0.4);
  }
}

const musicEngine = new MusicEngine();
export const startMusic = () => musicEngine.start();
export const stopMusic = () => musicEngine.stop();

// --- No TTS functions included ---
// Optional tiny helper to "speak" a headline within app UI (noop).
// If you later decide to add in-browser speech, you can use window.speechSynthesis there,
// but we intentionally do not include TTS/server calls in this file.

export function speakHeadline(text: string) {
  // intentionally no TTS: keep this a noop that returns the input.
  // UI components can use this string for captions or show it via a visual effect.
  return text;
}
