// src/services/audioService.ts
// Client-side audio + music engine + speakText (calls /api/tts proxy)
//
// IMPORTANT: keep this file client-only. All TTS provider keys must remain server-side (/api/tts).

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
      // Major arpeggio
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
      // Descending sawtooth
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
      break;

    case "WIN":
      // Victory glissando
      osc.type = "square";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 1.5);
      osc.start(now);
      osc.stop(now + 1.5);
      break;

    case "GAMEOVER":
      // Low thud
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

  // Bass line (C Minor pentatonic-ish)
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
    this.currentBeat = (this.currentBeat + 1) % 32; // 2 bar loop
  }

  private scheduleNote(beatNumber: number, time: number) {
    this.notesInQueue.push({ note: beatNumber, time });
    const ctx = getAudioContext();

    // Create a master gain for music to keep it background level
    const musicGain = ctx.createGain();
    musicGain.gain.value = 0.15; // Volume level
    musicGain.connect(ctx.destination);

    // 1. Kick (Beats 0, 4, 8, 12...)
    if (beatNumber % 4 === 0) {
      this.playKick(ctx, time, musicGain);
    }

    // 2. Snare (Beats 4, 12 in 16th count -> Counts 2 and 4 in 4/4)
    if (beatNumber % 8 === 4) {
      this.playSnare(ctx, time, musicGain);
    }

    // 3. Hi-Hat (Every 2nd 16th note)
    if (beatNumber % 2 === 0) {
      this.playHiHat(ctx, time, musicGain);
    }

    // 4. Bass (Quarter notes)
    if (beatNumber % 4 === 0) {
      const noteIndex = Math.floor(beatNumber / 4) % this.bassLine.length;
      this.playBass(ctx, time, musicGain, this.bassLine[noteIndex]);
    }
  }

  private scheduler() {
    if (!this.isPlaying) return;
    const ctx = getAudioContext();

    // While there are notes that will need to play before the next interval, schedule them
    while (this.nextNoteTime < ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentBeat, this.nextNoteTime);
      this.nextNote();
    }

    this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  // --- Instruments ---

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
    // Noise buffer
    const bufferSize = Math.floor(ctx.sampleRate * 0.1); // 100ms
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

    // Tone
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
    // White noise
    const bufferSize = Math.floor(ctx.sampleRate * 0.05);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Highpass filter
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

// ----- speakText: client -> /api/tts proxy -----
//
// POST { text } to /api/tts
// expects { mime: string, data: base64 } (mime optional if raw PCM)
// supports container formats (wav/mp3/ogg) and raw PCM Int16 (mono or stereo)

const TTS_ENDPOINT = "/api/tts";

export const speakText = async (text: string): Promise<void> => {
  if (!text || !text.trim()) return;

  try {
    const res = await fetch(TTS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("TTS proxy error:", res.status, txt);
      return;
    }

    const payload = await res.json().catch(() => null);
    if (!payload) {
      console.warn("TTS proxy returned empty response");
      return;
    }

    const { mime, data } = payload as { mime?: string; data?: string };
    if (!data) {
      console.warn("TTS proxy returned no audio data", payload);
      return;
    }

    const bytes = base64ToUint8Array(data);
    const ctx = getAudioContext();

    // Try decoding container formats first if mime indicates audio container
    if (mime && mime.startsWith("audio/")) {
      try {
        // decodeAudioData expects an ArrayBuffer
        const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();
        return;
      } catch (err) {
        console.warn("decodeAudioData failed for container; will try raw PCM fallback", err);
      }
    }

    // Fallback: try treat as raw PCM Int16 (common for some TTS providers).
    // Assume 24000Hz mono unless the server provides sampleRate/numChannels metadata.
    try {
      const audioBuffer = decodeRawPcm16(bytes, ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
      return;
    } catch (err) {
      console.error("Failed to play raw PCM", err);
    }
  } catch (err) {
    console.error("speakText error", err);
  }
};

// ----- helpers -----

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

function decodeRawPcm16(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate = 24000,
  numChannels = 1
): AudioBuffer {
  // Create a copy of the array buffer to ensure proper alignment for Int16Array
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const dataInt16 = new Int16Array(arrayBuffer);
  const frameCount = Math.floor(dataInt16.length / numChannels);
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = buffer.getChannelData(ch);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + ch] / 32768.0;
    }
  }

  return buffer;
}
