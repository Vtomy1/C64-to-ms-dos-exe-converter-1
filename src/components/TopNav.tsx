import React from 'react';
import { Download, Terminal, Cpu, FileCode2, Volume2, Monitor } from 'lucide-react';

interface TopNavProps {
  activeTab: 'studio' | 'preview' | 'dos' | 'hex' | 'disasm';
  onSelectTab: (tab: 'studio' | 'preview' | 'dos' | 'hex' | 'disasm') => void;
  onOpenExport: () => void;
  romName: string;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenExport,
  romName,
}) => {
  return (
    <header className="border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-mono font-bold text-neutral-950 text-sm shadow-sm">
            MZ
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-neutral-100 tracking-tight text-base font-mono">
              C64→DOS Executable Studio
            </span>
            <span className="hidden sm:inline text-xs text-neutral-400 font-mono">
              VIC-II & MOS SID Bridge
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => onSelectTab('studio')}
            className={`px-3 py-1.5 text-xs font-mono transition-colors rounded ${
              activeTab === 'studio'
                ? 'bg-neutral-800 text-amber-400 font-medium'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              Converter Studio
            </span>
          </button>

          <button
            onClick={() => onSelectTab('preview')}
            className={`px-3 py-1.5 text-xs font-mono transition-colors rounded ${
              activeTab === 'preview'
                ? 'bg-neutral-800 text-amber-400 font-medium'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5" />
              VIC-II & SID Player
            </span>
          </button>

          <button
            onClick={() => onSelectTab('dos')}
            className={`px-3 py-1.5 text-xs font-mono transition-colors rounded ${
              activeTab === 'dos'
                ? 'bg-neutral-800 text-amber-400 font-medium'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              MS-DOS Boot View
            </span>
          </button>

          <button
            onClick={() => onSelectTab('hex')}
            className={`px-3 py-1.5 text-xs font-mono transition-colors rounded ${
              activeTab === 'hex'
                ? 'bg-neutral-800 text-amber-400 font-medium'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <FileCode2 className="w-3.5 h-3.5" />
              MZ Hex Inspector
            </span>
          </button>

          <button
            onClick={() => onSelectTab('disasm')}
            className={`px-3 py-1.5 text-xs font-mono transition-colors rounded ${
              activeTab === 'disasm'
                ? 'bg-neutral-800 text-amber-400 font-medium'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" />
              x86 Assembly Stub
            </span>
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenExport}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium font-mono text-neutral-950 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 rounded transition-colors whitespace-nowrap shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export MS-DOS Package</span>
          </button>
        </div>
      </div>
    </header>
  );
};
