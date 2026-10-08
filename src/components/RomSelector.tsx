import React, { useRef } from 'react';
import { C64RomData } from '../types/c64dos';
import { SAMPLE_ROMS, parseUploadedRom } from '../utils/sampleRoms';
import { Upload, HardDrive, Disc3, Sparkles } from 'lucide-react';

interface RomSelectorProps {
  selectedRom: C64RomData;
  onSelectRom: (rom: C64RomData) => void;
}

export const RomSelector: React.FC<RomSelectorProps> = ({
  selectedRom,
  onSelectRom,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        const parsed = parseUploadedRom(file, reader.result);
        onSelectRom(parsed);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        const parsed = parseUploadedRom(file, reader.result);
        onSelectRom(parsed);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-100 font-mono flex items-center gap-2">
            <Disc3 className="w-4 h-4 text-amber-400" />
            Source Commodore 64 ROM Payload
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Select an authentic sample ROM or upload custom Commodore binary (.PRG / .CRT / .D64)
          </p>
        </div>

        {/* Upload Trigger */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="flex items-center gap-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".prg,.crt,.d64,.bin,.p00"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-mono font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Upload ROM (.PRG / .CRT)</span>
          </button>
        </div>
      </div>

      {/* Grid of ROM choices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {SAMPLE_ROMS.map((rom) => {
          const isSelected = selectedRom.meta.id === rom.meta.id;
          return (
            <button
              key={rom.meta.id}
              onClick={() => onSelectRom(rom)}
              className={`text-left p-3 rounded border transition-all flex flex-col justify-between h-32 ${
                isSelected
                  ? 'border-amber-500 bg-amber-950/20 shadow-sm ring-1 ring-amber-500/50'
                  : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-700 hover:bg-neutral-850'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-semibold text-neutral-200 truncate">
                    {rom.meta.name}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                  {rom.meta.description}
                </p>
              </div>

              {/* Metadata without pills */}
              <div className="pt-2 border-t border-neutral-800/80 flex items-center gap-1.5 text-[10px] text-neutral-400 font-mono">
                <span>{rom.meta.format}</span>
                <span aria-hidden="true">·</span>
                <span>${rom.meta.loadAddress.toString(16).toUpperCase().padStart(4, '0')}</span>
                <span aria-hidden="true">·</span>
                <span>{rom.meta.sizeBytes} B</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Current Active ROM Banner */}
      <div className="mt-4 p-3 bg-neutral-950 border border-neutral-800/80 rounded flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-emerald-400" />
          <span className="text-neutral-300">Active Payload:</span>
          <span className="text-amber-400 font-semibold">{selectedRom.meta.filename}</span>
          <span className="text-neutral-500">|</span>
          <span className="text-neutral-400">{selectedRom.meta.genre}</span>
        </div>

        <div className="flex items-center gap-3 text-neutral-400">
          <span>
            Load Address: <strong className="text-neutral-200 font-normal">${selectedRom.meta.loadAddress.toString(16).toUpperCase().padStart(4, '0')}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Binary Size: <strong className="text-neutral-200 font-normal tabular-nums">{selectedRom.meta.sizeBytes.toLocaleString()} bytes</strong>
          </span>
          {selectedRom.meta.author && (
            <>
              <span aria-hidden="true">·</span>
              <span>{selectedRom.meta.author} ({selectedRom.meta.year})</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
