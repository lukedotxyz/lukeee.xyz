import { useEffect, useRef, useState } from 'react';

type AudioNodes = {
  context: AudioContext;
  master: GainNode;
  stop: () => void;
};

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function createNoise(context: AudioContext, duration: number) {
  const sampleCount = Math.ceil(context.sampleRate * duration);
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const channel = buffer.getChannelData(0);
  let previous = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const white = Math.random() * 2 - 1;
    previous = previous * 0.84 + white * 0.16;
    channel[index] = previous * 0.74 + white * 0.26;
  }

  return buffer;
}

function createGull(context: AudioContext, destination: AudioNode) {
  const now = context.currentTime + 0.04;
  const panner = context.createStereoPanner();
  const callGain = context.createGain();
  const baseFrequency = 570 + Math.random() * 170;
  const direction = Math.random() * 1.5 - 0.75;

  panner.pan.setValueAtTime(direction, now);
  callGain.gain.setValueAtTime(0.0001, now);
  callGain.connect(panner).connect(destination);

  const makePhrase = (offset: number, scale: number) => {
    const start = now + offset;
    const oscillator = context.createOscillator();
    const vibrato = context.createOscillator();
    const vibratoDepth = context.createGain();
    const phraseGain = context.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(baseFrequency * scale, start);
    oscillator.frequency.exponentialRampToValueAtTime(
      baseFrequency * scale * (1.48 + Math.random() * 0.18),
      start + 0.17,
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      baseFrequency * scale * 0.78,
      start + 0.72,
    );

    vibrato.frequency.setValueAtTime(5.2 + Math.random() * 1.8, start);
    vibratoDepth.gain.setValueAtTime(18 + Math.random() * 14, start);
    vibrato.connect(vibratoDepth).connect(oscillator.frequency);

    phraseGain.gain.setValueAtTime(0.0001, start);
    phraseGain.gain.exponentialRampToValueAtTime(0.008, start + 0.055);
    phraseGain.gain.exponentialRampToValueAtTime(0.0035, start + 0.31);
    phraseGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.76);

    oscillator.connect(phraseGain).connect(callGain);
    oscillator.start(start);
    vibrato.start(start);
    oscillator.stop(start + 0.8);
    vibrato.stop(start + 0.8);
  };

  callGain.gain.exponentialRampToValueAtTime(1, now + 0.06);
  callGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);
  makePhrase(0, 1);
  makePhrase(0.43 + Math.random() * 0.12, 0.91 + Math.random() * 0.15);
}

function createSoundscape(): AudioNodes | null {
  const AudioContextConstructor =
    window.AudioContext ?? (window as AudioWindow).webkitAudioContext;

  if (!AudioContextConstructor) return null;

  const context = new AudioContextConstructor();
  const master = context.createGain();
  const limiter = context.createDynamicsCompressor();
  const wind = context.createBufferSource();
  const windHighpass = context.createBiquadFilter();
  const windLowpass = context.createBiquadFilter();
  const windGain = context.createGain();
  const windPan = context.createStereoPanner();
  const windTone = context.createOscillator();
  const windToneDepth = context.createGain();
  const windGust = context.createOscillator();
  const windGustDepth = context.createGain();
  const surf = context.createBufferSource();
  const surfBand = context.createBiquadFilter();
  const surfLowpass = context.createBiquadFilter();
  const surfGain = context.createGain();
  const surfPan = context.createStereoPanner();
  const surfPulse = context.createOscillator();
  const surfPulseDepth = context.createGain();
  const surfDrift = context.createOscillator();
  const surfDriftDepth = context.createGain();

  master.gain.value = 0.0001;
  limiter.threshold.value = -26;
  limiter.knee.value = 18;
  limiter.ratio.value = 3;
  limiter.attack.value = 0.08;
  limiter.release.value = 0.7;
  master.connect(limiter).connect(context.destination);

  wind.buffer = createNoise(context, 7.3);
  wind.loop = true;
  windHighpass.type = 'highpass';
  windHighpass.frequency.value = 90;
  windLowpass.type = 'lowpass';
  windLowpass.frequency.value = 1050;
  windLowpass.Q.value = 0.45;
  windGain.gain.value = 0.027;
  windPan.pan.value = -0.08;
  wind
    .connect(windHighpass)
    .connect(windLowpass)
    .connect(windGain)
    .connect(windPan)
    .connect(master);

  windTone.type = 'sine';
  windTone.frequency.value = 0.023;
  windToneDepth.gain.value = 310;
  windTone.connect(windToneDepth).connect(windLowpass.frequency);
  windGust.type = 'sine';
  windGust.frequency.value = 0.071;
  windGustDepth.gain.value = 0.011;
  windGust.connect(windGustDepth).connect(windGain.gain);

  surf.buffer = createNoise(context, 9.7);
  surf.loop = true;
  surfBand.type = 'bandpass';
  surfBand.frequency.value = 235;
  surfBand.Q.value = 0.58;
  surfLowpass.type = 'lowpass';
  surfLowpass.frequency.value = 760;
  surfGain.gain.value = 0.019;
  surfPan.pan.value = 0.1;
  surf
    .connect(surfBand)
    .connect(surfLowpass)
    .connect(surfGain)
    .connect(surfPan)
    .connect(master);

  surfPulse.type = 'sine';
  surfPulse.frequency.value = 0.083;
  surfPulseDepth.gain.value = 0.013;
  surfPulse.connect(surfPulseDepth).connect(surfGain.gain);
  surfDrift.type = 'sine';
  surfDrift.frequency.value = 0.031;
  surfDriftDepth.gain.value = 0.005;
  surfDrift.connect(surfDriftDepth).connect(surfGain.gain);

  const sources: AudioScheduledSourceNode[] = [
    wind,
    windTone,
    windGust,
    surf,
    surfPulse,
    surfDrift,
  ];
  sources.forEach((source) => source.start());

  let gullTimer = 0;
  const scheduleGull = () => {
    const delay = 9000 + Math.random() * 19000;
    gullTimer = window.setTimeout(() => {
      if (context.state === 'running') createGull(context, master);
      scheduleGull();
    }, delay);
  };
  scheduleGull();

  return {
    context,
    master,
    stop: () => {
      window.clearTimeout(gullTimer);
      sources.forEach((source) => {
        try {
          source.stop();
        } catch {}
      });
      void context.close();
    },
  };
}

export function Soundscape() {
  const [enabled, setEnabled] = useState(false);
  const nodes = useRef<AudioNodes | null>(null);
  const enabledRef = useRef(false);
  const suspendTimer = useRef(0);

  useEffect(
    () => () => {
      window.clearTimeout(suspendTimer.current);
      nodes.current?.stop();
    },
    [],
  );

  const toggle = () => {
    const nextEnabled = !enabledRef.current;
    enabledRef.current = nextEnabled;
    setEnabled(nextEnabled);
    window.clearTimeout(suspendTimer.current);

    if (!nodes.current) nodes.current = createSoundscape();
    const soundscape = nodes.current;
    if (!soundscape) return;

    const { context, master } = soundscape;
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);

    if (nextEnabled) {
      void context.resume();
      master.gain.exponentialRampToValueAtTime(0.72, now + 1.8);
      return;
    }

    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    suspendTimer.current = window.setTimeout(() => {
      if (!enabledRef.current) void context.suspend();
    }, 900);
  };

  return (
    <button
      type="button"
      className="scene-sound"
      aria-pressed={enabled}
      aria-label={enabled ? 'Mute ambient sound' : 'Play ambient sound'}
      onClick={toggle}
    >
      {enabled ? 'sound on' : 'tap for sound'}
    </button>
  );
}
