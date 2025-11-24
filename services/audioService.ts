import { GoogleGenAI, Modality } from "@google/genai";

// Web Audio API Context
let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

// --- Synthesized SFX (No external assets) ---

export const playSound = (type: 'CLICK' | 'SUCCESS' | 'FAIL' | 'GAMEOVER' | 'WIN') => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;

  switch (type) {
    case 'CLICK':
      // Short high blip
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
      break;

    case 'SUCCESS':
      // Major Arpeggio
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
      break;

    case 'FAIL':
      // Descending Sawtooth
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
      break;

    case 'WIN':
      // Victory glissando
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 1.5);
      osc.start(now);
      osc.stop(now + 1.5);
      break;
      
    case 'GAMEOVER':
      // Low thud
      osc.type = 'triangle';
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
    if (ctx.state === 'suspended') ctx.resume();
    
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
    this.notesInQueue.push({ note: beatNumber, time: time });
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
    const bufferSize = ctx.sampleRate * 0.1; // 100ms
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
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    // Highpass filter
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "highpass";
    bandpass.frequency.value = 5000;

    const gain = ctx.createGain();
    
    noise.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(dest);

    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    
    noise.start(time);
  }

  private playBass(ctx: AudioContext, time: number, dest: AudioNode, freq: number) {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
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

// --- Gemini TTS ---

const apiKey = process.env.API_KEY || '';

export const speakText = async (text: string) => {
  if (!apiKey) return;
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const ctx = getAudioContext();
      // Using 24000Hz which is the standard sample rate for Gemini TTS
      const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    }
  } catch (error) {
    console.error("TTS Error:", error);
  }
};

// --- Audio Helpers ---

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM audio data from Gemini.
 * Gemini returns raw PCM (Int16), not a WAV/MP3 file, so we cannot use ctx.decodeAudioData directly.
 */
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  // Create a copy of the array buffer to ensure proper alignment for Int16Array
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const dataInt16 = new Int16Array(arrayBuffer);
  
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert Int16 (-32768 to 32767) to Float32 (-1.0 to 1.0)
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
