import React, { useEffect, useRef, useState } from 'react';
import { C64RomData, SidChipModel } from '../types/c64dos';
import { sidSynth } from '../audio/sidSynth';
import { Play, Square, Volume2, Sliders, Music, Activity } from 'lucide-react';

interface SidAudioPlayerProps {
  romData: C64RomData;
  sidModel: SidChipModel;
  onModelChange: (model: SidChipModel) => void;
}

const PIANO_KEYS = [
  { note: 'C4', freq: 261.63, isBlack: false },
  { note: 'C#4', freq: 277.18, isBlack: true },
  { note: 'D4', freq: 293.66, isBlack: false },
  { note: 'D#4', freq: 311.13, isBlack: true },
  { note: 'E4', freq: 329.63, isBlack: false },
  { note: 'F4', freq: 349.23, isBlack: false },
  { note: 'F#4', freq: 369.99, isBlack: true },
  { note: 'G4', freq: 392.00, isBlack: false },
  { note: 'G#4', freq: 415.30, isBlack: true },
  { note: 'A4', freq: 440.00, isBlack: false },
  { note: 'A#4', freq: 466.16, isBlack: true },
  { note: 'B4', freq: 493.88, isBlack: false },
  { note: 'C5', freq: 523.25, isBlack: false },
];

export const SidAudioPlayer: React.FC<SidAudioPlayerProps> = ({
  romData,
  sidModel,
  onModelChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [v1Muted, setV1Muted] = useState(false);
  const [v2Muted, setV2Muted] = useState(false);
  const [v3Muted, setV3Muted] = useState(false);
  const [v1Wave, setV1Wave] = useState<'pulse' | 'sawtooth' | 'triangle' | 'noise'>('pulse');
  const [cutoff, setCutoff] = useState(2400);
  const [resonance, setResonance] = useState(4.5);
  const [filterMode, setFilterMode] = useState<'lowpass' | 'bandpass' | 'highpass'>('lowpass');
  const [activeNote, setActiveNote] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Sync settings with synth engine
  useEffect(() => {
    sidSynth.sidModel = sidModel;
    sidSynth.filterCutoffHz = cutoff;
    sidSynth.filterResonanceQ = resonance;
    sidSynth.filterType = filterMode;
    sidSynth.updateFilter();
  }, [sidModel, cutoff, resonance, filterMode]);

  // Audio Visualizer loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 400;
    canvas.height = 70;

    const renderOscilloscope = () => {
      const analyser = sidSynth.getAnalyser();
      if (!analyser) {
        // Draw idle baseline
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#262626';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        animationFrameRef.current = requestAnimationFrame(renderOscilloscope);
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#f59e0b'; // Amber 500
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      animationFrameRef.current = requestAnimationFrame(renderOscilloscope);
    };

    renderOscilloscope();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handleTogglePlayback = () => {
    if (isPlaying) {
      sidSynth.stopTune();
      setIsPlaying(false);
    } else {
      sidSynth.playTune(romData.musicTuneId || 'cyber_anthem');
      setIsPlaying(true);
    }
  };

  const handlePlayKey = (freq: number, noteName: string) => {
    setActiveNote(noteName);
    sidSynth.triggerNote(0, freq, 0.45, v1Wave);
    setTimeout(() => {
      setActiveNote(null);
    }, 400);
  };

  const toggleMute = (voiceIdx: number) => {
    if (voiceIdx === 0) {
      const next = !v1Muted;
      setV1Muted(next);
      sidSynth.voices[0].muted = next;
    } else if (voiceIdx === 1) {
      const next = !v2Muted;
      setV2Muted(next);
      sidSynth.voices[1].muted = next;
    } else if (voiceIdx === 2) {
      const next = !v3Muted;
      setV3Muted(next);
      sidSynth.voices[2].muted = next;
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 space-y-5">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-neutral-100 font-mono">
            MOS SID Sound Engine & Sound Blaster 16 DSP Bridge
          </h2>
        </div>

        {/* Master Play / Stop Trigger */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTogglePlayback}
            className={`px-3 py-1.5 rounded text-xs font-mono font-medium flex items-center gap-2 transition-colors ${
              isPlaying
                ? 'bg-rose-500 hover:bg-rose-400 text-neutral-950 font-bold'
                : 'bg-amber-400 hover:bg-amber-300 text-neutral-950'
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop SID Playback</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play Authentic Chiptune</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Visualizer & Oscilloscope */}
      <div>
        <div className="flex items-center justify-between text-xs font-mono text-neutral-400 mb-1.5">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            Live SID Real-Time Voice Waveform Analyser
          </span>
          <span className="tabular-nums">44,100 Hz · 3 Channels</span>
        </div>
        <div className="w-full bg-neutral-950 border border-neutral-800 rounded overflow-hidden">
          <canvas ref={canvasRef} className="w-full block" />
        </div>
      </div>

      {/* 3 Voice Channel Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Voice 1 */}
        <div className="p-3 bg-neutral-950 border border-neutral-800 rounded text-xs font-mono space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neutral-200">Voice 1: Lead Melody</span>
            <button
              onClick={() => toggleMute(0)}
              className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-mono ${
                v1Muted ? 'bg-neutral-800 text-neutral-500' : 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
              }`}
            >
              {v1Muted ? 'Muted' : 'Active'}
            </button>
          </div>

          <div className="flex items-center gap-1">
            {(['pulse', 'sawtooth', 'triangle', 'noise'] as const).map((w) => (
              <button
                key={w}
                onClick={() => {
                  setV1Wave(w);
                  sidSynth.voices[0].waveform = w;
                }}
                className={`flex-1 py-1 text-[10px] rounded border transition-colors capitalize ${
                  v1Wave === w
                    ? 'border-amber-500 bg-amber-950/30 text-amber-300'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-neutral-400">
            PWM variable duty cycle, ADSR envelope generator.
          </div>
        </div>

        {/* Voice 2 */}
        <div className="p-3 bg-neutral-950 border border-neutral-800 rounded text-xs font-mono space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neutral-200">Voice 2: Harmony & Arp</span>
            <button
              onClick={() => toggleMute(1)}
              className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-mono ${
                v2Muted ? 'bg-neutral-800 text-neutral-500' : 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
              }`}
            >
              {v2Muted ? 'Muted' : 'Active'}
            </button>
          </div>

          <div className="text-[11px] text-neutral-300">
            Waveform: <strong className="text-amber-400 font-mono">Sawtooth / Pulse</strong>
          </div>
          <div className="text-[11px] text-neutral-400">
            High-speed 16th-note arpeggiator with resonant filter routing.
          </div>
        </div>

        {/* Voice 3 */}
        <div className="p-3 bg-neutral-950 border border-neutral-800 rounded text-xs font-mono space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neutral-200">Voice 3: LFSR Noise & Bass</span>
            <button
              onClick={() => toggleMute(2)}
              className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-mono ${
                v3Muted ? 'bg-neutral-800 text-neutral-500' : 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
              }`}
            >
              {v3Muted ? 'Muted' : 'Active'}
            </button>
          </div>

          <div className="text-[11px] text-neutral-300">
            Waveform: <strong className="text-amber-400 font-mono">23-bit Galois LFSR Noise</strong>
          </div>
          <div className="text-[11px] text-neutral-400">
            Authentic MOS 6581 polynomial pseudo-random percussion generator.
          </div>
        </div>
      </div>

      {/* Resonant Filter Controls */}
      <div className="p-4 bg-neutral-950 border border-neutral-800 rounded space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            SID Multi-Mode Resonant Filter (Registers $D415-$D418)
          </span>

          <div className="flex items-center gap-1">
            {(['lowpass', 'bandpass', 'highpass'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setFilterMode(m)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors capitalize ${
                  filterMode === m
                    ? 'border-amber-400 bg-amber-400 text-neutral-950 font-medium'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <div className="flex justify-between text-neutral-400 mb-1">
              <span>Cutoff Frequency:</span>
              <span className="text-neutral-200 tabular-nums">{cutoff} Hz</span>
            </div>
            <input
              type="range"
              min="100"
              max="8000"
              step="50"
              value={cutoff}
              onChange={(e) => setCutoff(parseInt(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-neutral-400 mb-1">
              <span>Resonance Q:</span>
              <span className="text-neutral-200 tabular-nums">{resonance.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="12.0"
              step="0.5"
              value={resonance}
              onChange={(e) => setResonance(parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Interactive Virtual SID Piano Keyboard */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
          <span>Interactive MOS SID Keyboard Test (Voice 1 Live Trigger)</span>
          <span>Click any key to audition authentic SID timbre</span>
        </div>

        <div className="relative flex justify-center h-24 bg-neutral-950 p-2 border border-neutral-800 rounded select-none">
          {PIANO_KEYS.map((k) => {
            if (k.isBlack) return null;
            const isPressed = activeNote === k.note;

            return (
              <button
                key={k.note}
                onClick={() => handlePlayKey(k.freq, k.note)}
                className={`relative flex-1 max-w-10 h-full border border-neutral-400 rounded-b flex flex-col justify-end pb-1.5 items-center transition-colors font-mono text-[9px] ${
                  isPressed
                    ? 'bg-amber-300 text-neutral-950 font-bold'
                    : 'bg-white text-neutral-800 hover:bg-neutral-100'
                }`}
              >
                {k.note}
              </button>
            );
          })}

          {/* Black Keys */}
          {PIANO_KEYS.map((k, idx) => {
            if (!k.isBlack) return null;
            const isPressed = activeNote === k.note;
            // Calculate offset based on white keys before it
            const whiteCountBefore = PIANO_KEYS.slice(0, idx).filter((x) => !x.isBlack).length;
            const leftPercent = `calc(${whiteCountBefore * 36 - 12}px)`;

            return (
              <button
                key={k.note}
                onClick={() => handlePlayKey(k.freq, k.note)}
                style={{ left: leftPercent }}
                className={`absolute top-2 w-6 h-14 rounded-b border border-neutral-900 transition-colors z-10 flex flex-col justify-end pb-1 items-center font-mono text-[8px] ${
                  isPressed
                    ? 'bg-amber-500 text-neutral-950 font-bold'
                    : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                {k.note}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
