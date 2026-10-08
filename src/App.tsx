import React, { useState, useMemo } from 'react';
import { C64RomData, MzHeaderConfig } from './types/c64dos';
import { SAMPLE_ROMS } from './utils/sampleRoms';
import { buildDosExecutable } from './utils/mzBuilder';
import { TopNav } from './components/TopNav';
import { RomSelector } from './components/RomSelector';
import { HeaderConfigurator } from './components/HeaderConfigurator';
import { ScreenPreview } from './components/ScreenPreview';
import { SidAudioPlayer } from './components/SidAudioPlayer';
import { HexInspector } from './components/HexInspector';
import { ExportModal } from './components/ExportModal';
import {
  Cpu,
  Monitor,
  Music,
  Download,
  Terminal,
  FileCode2,
  CheckCircle,
  HelpCircle,
  Disc3,
} from 'lucide-react';

const DEFAULT_CONFIG: MzHeaderConfig = {
  targetMode: 'real16',
  audioSubsystem: 'sb16',
  sidModel: '6581',
  palettePreset: 'pepto',
  videoMode: 'mode13h',
  scanlines: 'authentic',
  preserveBorder: true,
  minAllocParagraphs: 0x0020, // 512 bytes extra
  maxAllocParagraphs: 0xffff,
  stackParagraphOffset: 0x0000,
  stackPointer: 0x0800,
  instructionPointer: 0x0000,
  codeSegment: 0x0000,
  dosboxCycles: 3000,
  soundBlasterPort: 0x220,
  soundBlasterIrq: 7,
  soundBlasterDma: 1,
  emulationSamplingRate: 44100,
};

export default function App() {
  const [selectedRom, setSelectedRom] = useState<C64RomData>(SAMPLE_ROMS[1]); // Default: Cyber-SID
  const [config, setConfig] = useState<MzHeaderConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<'studio' | 'preview' | 'dos' | 'hex' | 'disasm'>('studio');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [activeScreenView, setActiveScreenView] = useState<'screen' | 'dos'>('screen');

  // Generate the MS-DOS Executable whenever ROM or config changes
  const convertedExecutable = useMemo(() => {
    return buildDosExecutable(selectedRom.meta, selectedRom.rawBytes, config);
  }, [selectedRom, config]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Top Bar following contract */}
      <TopNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'dos') setActiveScreenView('dos');
          if (tab === 'preview') setActiveScreenView('screen');
        }}
        onOpenExport={() => setIsExportOpen(true)}
        romName={selectedRom.meta.filename}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Editorial Subheader & Architecture Context */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100 font-mono">
              Commodore 64 to MS-DOS Executable Converter
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-3xl leading-relaxed">
              Packages authentic C64 binaries into standalone MS-DOS MZ executables. Bridges VIC-II graphics to VGA Mode 13h DAC registers and MOS 6581/8580 SID audio to Sound Blaster 16 DSP DMA streaming.
            </p>
          </div>

          {/* Quick Specifications Strip */}
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 shrink-0">
            <span className="text-emerald-400">● MZ Magic 0x5A4D</span>
            <span aria-hidden="true">·</span>
            <span>VGA Mode 13h</span>
            <span aria-hidden="true">·</span>
            <span>SB16 44.1 kHz</span>
          </div>
        </div>

        {/* Tab 1: Studio / Converter View */}
        {activeTab === 'studio' && (
          <div className="space-y-6">
            {/* 1. ROM Selection */}
            <RomSelector
              selectedRom={selectedRom}
              onSelectRom={(rom) => setSelectedRom(rom)}
            />

            {/* 2. Hardware Bridge Configuration */}
            <HeaderConfigurator
              config={config}
              onChangeConfig={(newCfg) => setConfig(newCfg)}
            />

            {/* 3. Dual Live Preview Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <ScreenPreview
                romData={selectedRom}
                config={config}
                activeView={activeScreenView}
                onChangeView={setActiveScreenView}
              />

              <div className="space-y-6">
                <SidAudioPlayer
                  romData={selectedRom}
                  sidModel={config.sidModel}
                  onModelChange={(m) => setConfig({ ...config, sidModel: m })}
                />

                {/* Conversion Summary & One-Click Download Box */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-neutral-200 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      MS-DOS Executable Ready to Package
                    </span>
                    <span className="text-xs font-mono text-neutral-400 tabular-nums">
                      {convertedExecutable.totalSize.toLocaleString()} bytes
                    </span>
                  </div>

                  <div className="text-xs text-neutral-400 font-mono space-y-1.5 border-t border-neutral-800 pt-3">
                    <div className="flex justify-between">
                      <span>Target Executable:</span>
                      <span className="text-amber-400 font-semibold">
                        {selectedRom.meta.filename.replace(/\.[^/.]+$/, '').toUpperCase()}.EXE
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Header Segments:</span>
                      <span className="text-neutral-200">
                        {convertedExecutable.mzHeader.headerParagraphs} Paragraphs (64 bytes)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sound Blaster Port:</span>
                      <span className="text-neutral-200">
                        0x{config.soundBlasterPort.toString(16).toUpperCase()} (IRQ {config.soundBlasterIrq}, DMA {config.soundBlasterDma})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>VGA DAC Palette:</span>
                      <span className="text-neutral-200">
                        {config.palettePreset.toUpperCase()} (16 Colors / 48 Bytes)
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsExportOpen(true)}
                    className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-semibold rounded text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download MS-DOS .EXE & DOSBox Bundle</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Full Screen / SID Player View */}
        {activeTab === 'preview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <ScreenPreview
                romData={selectedRom}
                config={config}
                activeView={activeScreenView}
                onChangeView={setActiveScreenView}
              />
              <SidAudioPlayer
                romData={selectedRom}
                sidModel={config.sidModel}
                onModelChange={(m) => setConfig({ ...config, sidModel: m })}
              />
            </div>
          </div>
        )}

        {/* Tab 3: MS-DOS Boot Simulation */}
        {activeTab === 'dos' && (
          <div className="space-y-6">
            <ScreenPreview
              romData={selectedRom}
              config={config}
              activeView="dos"
              onChangeView={setActiveScreenView}
            />

            {/* Technical Explanation */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 font-mono text-xs space-y-3">
              <h3 className="font-semibold text-neutral-200 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                How the MS-DOS Executable Loader Operates
              </h3>
              <p className="text-neutral-400 leading-relaxed">
                When MS-DOS or DOSBox launches the generated <code className="text-neutral-200">.EXE</code>, the CPU enters 16-bit real mode. The DOS program segment prefix (PSP) is created at the segment base, and execution begins at <code className="text-neutral-200">CS:0000</code>.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded">
                  <div className="text-amber-400 font-semibold mb-1">1. Video Initialization</div>
                  <div className="text-neutral-400 text-[11px]">
                    Calls Video BIOS INT 10h (AX=0013h) to switch into 320x200 256-color VGA Mode 13h, then reprograms DAC Ports 3C8h/3C9h with the Commodore 64 16-color palette.
                  </div>
                </div>

                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded">
                  <div className="text-cyan-400 font-semibold mb-1">2. Sound DSP Bridge</div>
                  <div className="text-neutral-400 text-[11px]">
                    Resets the Sound Blaster 16 DSP at base port 220h, sets the sample rate to 44.1 kHz, enables the speaker output, and hooks the timer interrupt for SID emulation playback.
                  </div>
                </div>

                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded">
                  <div className="text-emerald-400 font-semibold mb-1">3. Payload Jump</div>
                  <div className="text-neutral-400 text-[11px]">
                    Unpacks the Commodore 64 PRG payload into memory at ${selectedRom.meta.loadAddress.toString(16).toUpperCase()} and vectors execution into the main routine.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Hex Inspector */}
        {activeTab === 'hex' && (
          <div className="space-y-6">
            <HexInspector executable={convertedExecutable} />
          </div>
        )}

        {/* Tab 5: Assembly Stub / Technical Specification */}
        {activeTab === 'disasm' && (
          <div className="space-y-6">
            <HexInspector executable={convertedExecutable} />
          </div>
        )}
      </main>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        executable={convertedExecutable}
      />

      {/* Clean Editorial Footer */}
      <footer className="border-t border-neutral-800 py-6 mt-12 bg-neutral-950 text-xs font-mono text-neutral-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>C64 to MS-DOS Executable Studio</span>
            <span aria-hidden="true">·</span>
            <span>Commodore 64 MOS 6510 / VIC-II / SID 6581</span>
            <span aria-hidden="true">·</span>
            <span>MS-DOS MZ x86 Architecture</span>
          </div>
          <div>
            Built for modern systems, DOSBox-Staging, and vintage hardware preservation.
          </div>
        </div>
      </footer>
    </div>
  );
}
