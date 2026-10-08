import React, { useState } from 'react';
import {
  DosAudioSubsystem,
  DosTargetMode,
  MzHeaderConfig,
  PalettePreset,
  ScanlineIntensity,
  SidChipModel,
  VideoMode,
} from '../types/c64dos';
import { Settings2, Volume2, Monitor, Cpu, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { getPaletteColors } from '../utils/c64Palettes';

interface HeaderConfiguratorProps {
  config: MzHeaderConfig;
  onChangeConfig: (newConfig: MzHeaderConfig) => void;
}

export const HeaderConfigurator: React.FC<HeaderConfiguratorProps> = ({
  config,
  onChangeConfig,
}) => {
  const [showAdvancedMz, setShowAdvancedMz] = useState(false);

  const update = <K extends keyof MzHeaderConfig>(key: K, value: MzHeaderConfig[K]) => {
    onChangeConfig({
      ...config,
      [key]: value,
    });
  };

  const activePalette = getPaletteColors(config.palettePreset);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-100 font-mono flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-amber-400" />
            MS-DOS Executable & Hardware Bridge Configuration
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Configure the authentic MZ header fields, VGA Mode 13h DAC palette, and SID-to-SoundBlaster audio driver.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Section 1: Target Executable Architecture */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-neutral-200 font-mono flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            DOS Runtime Target
          </label>
          <div className="space-y-1.5">
            {[
              {
                id: 'real16',
                name: '16-Bit Real Mode MZ',
                desc: 'Universal compatibility: 8086/286/386+, FreeDOS, MS-DOS 6.22, DOSBox',
              },
              {
                id: 'pmode32',
                name: '32-Bit DOS/4GW Extender',
                desc: 'Protected Mode DPMI runner for high-performance 386+ environments',
              },
              {
                id: 'com_stub',
                name: 'Compact COM Binary Stub',
                desc: 'Direct single-segment 64KB loader for tiny demos',
              },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => update('targetMode', mode.id as DosTargetMode)}
                className={`w-full text-left p-2.5 rounded border transition-colors ${
                  config.targetMode === mode.id
                    ? 'border-cyan-500 bg-cyan-950/20 text-neutral-100 ring-1 ring-cyan-500/50'
                    : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="text-xs font-medium font-mono text-neutral-200">
                  {mode.name}
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                  {mode.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Sound Subsystem Bridge */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-neutral-200 font-mono flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            Audio Subsystem & SID Bridge
          </label>

          {/* Audio device select */}
          <div className="space-y-1.5">
            {[
              { id: 'sb16', label: 'Sound Blaster 16 DSP (Port 220h, IRQ 7, DMA 1)' },
              { id: 'adlib', label: 'AdLib / OPL3 FM Synthesizer (Port 388h)' },
              { id: 'gus', label: 'Gravis UltraSound Wavetable (Port 240h, IRQ 5)' },
              { id: 'speaker', label: 'PC Speaker 1-Bit PWM (8253 PIT Timer 2)' },
            ].map((aud) => (
              <button
                key={aud.id}
                onClick={() => update('audioSubsystem', aud.id as DosAudioSubsystem)}
                className={`w-full text-left px-2.5 py-2 rounded border text-xs font-mono transition-colors ${
                  config.audioSubsystem === aud.id
                    ? 'border-amber-500 bg-amber-950/20 text-amber-200'
                    : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                {aud.label}
              </button>
            ))}
          </div>

          {/* SID Chip Model */}
          <div className="pt-2 border-t border-neutral-800 space-y-1.5">
            <div className="text-[11px] font-mono text-neutral-400">
              MOS SID Chip Model & Filter Curve:
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => update('sidModel', '6581')}
                className={`px-2.5 py-1.5 text-xs font-mono rounded border transition-colors text-left ${
                  config.sidModel === '6581'
                    ? 'border-amber-500 bg-amber-950/20 text-neutral-100'
                    : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="font-semibold">MOS 6581</div>
                <div className="text-[10px] text-neutral-400">Warm Analog, Saturated</div>
              </button>

              <button
                onClick={() => update('sidModel', '8580')}
                className={`px-2.5 py-1.5 text-xs font-mono rounded border transition-colors text-left ${
                  config.sidModel === '8580'
                    ? 'border-amber-500 bg-amber-950/20 text-neutral-100'
                    : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="font-semibold">MOS 8580</div>
                <div className="text-[10px] text-neutral-400">Clean Digital, Linear</div>
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Graphical Subsystem & VIC-II Palette */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-neutral-200 font-mono flex items-center gap-2">
            <Monitor className="w-3.5 h-3.5 text-rose-400" />
            VIC-II to VGA Mode 13h Video
          </label>

          {/* Palette Preset */}
          <div className="space-y-1">
            <div className="text-[11px] font-mono text-neutral-400">
              C64 16-Color Palette Mapping:
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'pepto', name: 'Pepto PAL TV' },
                { id: 'colodore', name: 'Colodore CRT' },
                { id: 'vice', name: 'VICE Classic' },
                { id: 'ntsc', name: 'NTSC Warm' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => update('palettePreset', p.id as PalettePreset)}
                  className={`px-2.5 py-1.5 rounded border text-xs font-mono transition-colors text-left ${
                    config.palettePreset === p.id
                      ? 'border-rose-500 bg-rose-950/20 text-rose-200'
                      : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {/* Active Palette Color Swatches Preview */}
            <div className="mt-2 p-2 bg-neutral-950 border border-neutral-800 rounded">
              <div className="text-[10px] font-mono text-neutral-400 mb-1 flex justify-between">
                <span>VGA DAC 6-Bit PEL Registers</span>
                <span>48 Bytes</span>
              </div>
              <div className="grid grid-cols-8 gap-1">
                {activePalette.map((col) => (
                  <div
                    key={col.index}
                    className="h-4 rounded-sm border border-neutral-700/50 relative group cursor-pointer"
                    style={{ backgroundColor: col.hex }}
                    title={`${col.index}: ${col.name} (DAC: ${col.vgaDacR},${col.vgaDacG},${col.vgaDacB})`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* CRT Scanline Filter Intensity */}
          <div className="pt-2 border-t border-neutral-800 space-y-1.5">
            <div className="text-[11px] font-mono text-neutral-400">
              CRT Raster Scanline Emulation:
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'none', label: 'Off' },
                { id: 'subtle', label: 'Subtle' },
                { id: 'authentic', label: 'Native' },
                { id: 'heavy', label: 'Heavy' },
              ].map((scan) => (
                <button
                  key={scan.id}
                  onClick={() => update('scanlines', scan.id as ScanlineIntensity)}
                  className={`py-1 text-center text-xs font-mono rounded border transition-colors ${
                    config.scanlines === scan.id
                      ? 'border-amber-400 bg-amber-400 text-neutral-950 font-medium'
                      : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  {scan.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Advanced MZ Header & I/O Paragraphs Toggle */}
      <div className="pt-3 border-t border-neutral-800">
        <button
          onClick={() => setShowAdvancedMz(!showAdvancedMz)}
          className="text-xs font-mono text-neutral-400 hover:text-neutral-200 flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5 text-neutral-400" />
          <span>Advanced MS-DOS MZ Header Descriptors & Port Addresses</span>
          {showAdvancedMz ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {showAdvancedMz && (
          <div className="mt-4 p-4 bg-neutral-950 border border-neutral-800 rounded grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <label className="text-neutral-400 block mb-1">
                Min Alloc Paragraphs (e_minalloc):
              </label>
              <input
                type="number"
                value={config.minAllocParagraphs}
                onChange={(e) => update('minAllocParagraphs', parseInt(e.target.value) || 0)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1 text-neutral-100 tabular-nums focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-neutral-400 block mt-0.5">
                {(config.minAllocParagraphs * 16).toLocaleString()} bytes minimum
              </span>
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">
                Max Alloc Paragraphs (e_maxalloc):
              </label>
              <input
                type="number"
                value={config.maxAllocParagraphs}
                onChange={(e) => update('maxAllocParagraphs', parseInt(e.target.value) || 0)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1 text-neutral-100 tabular-nums focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-neutral-400 block mt-0.5">
                0xFFFF = Allocate all available RAM
              </span>
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">
                Initial Stack Pointer (e_sp):
              </label>
              <input
                type="text"
                value={'0x' + config.stackPointer.toString(16).toUpperCase()}
                onChange={(e) => {
                  const val = parseInt(e.target.value.replace('0x', ''), 16);
                  if (!isNaN(val)) update('stackPointer', val);
                }}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1 text-neutral-100 tabular-nums focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-neutral-400 block mt-0.5">
                Stack segment top offset
              </span>
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">
                DOSBox Emulated Cycles:
              </label>
              <input
                type="number"
                step="500"
                value={config.dosboxCycles}
                onChange={(e) => update('dosboxCycles', parseInt(e.target.value) || 3000)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1 text-neutral-100 tabular-nums focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-neutral-400 block mt-0.5">
                Target CPU speed in dosbox.conf
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
