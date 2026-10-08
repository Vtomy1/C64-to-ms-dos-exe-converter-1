import React, { useState } from 'react';
import { ConvertedExecutable } from '../types/c64dos';
import { generateDosboxConf, generateRunBat, generateReadme } from '../utils/mzBuilder';
import JSZip from 'jszip';
import { X, Download, Archive, FileText, CheckCircle2 } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  executable: ConvertedExecutable;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  executable,
}) => {
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const baseName = executable.romMeta.filename.replace(/\.[^/.]+$/, '').toUpperCase();
  const exeFileName = `${baseName}.EXE`;
  const zipFileName = `${baseName}_DOSBOX_BUNDLE.ZIP`;
  const prgFileName = `${baseName}.PRG`;

  // Download raw standalone .EXE
  const handleDownloadExe = () => {
    const blob = new Blob([executable.exeBytes as unknown as BlobPart], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exeFileName;
    a.click();
    URL.revokeObjectURL(url);
    showNotice(`Downloaded ${exeFileName}`);
  };

  // Download complete .ZIP bundle (EXE + DOSBOX.CONF + RUN.BAT + README.TXT)
  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    try {
      const zip = new JSZip();

      // 1. Standalone .EXE
      zip.file(exeFileName, executable.exeBytes);

      // 2. DOSBox Configuration
      const dosboxConf = generateDosboxConf(executable.romMeta, executable.headerConfig);
      zip.file('dosbox.conf', dosboxConf);

      // 3. Batch file
      const runBat = generateRunBat(executable.romMeta);
      zip.file('RUN.BAT', runBat);

      // 4. Readme manual
      const readme = generateReadme(executable.romMeta, executable.headerConfig, executable.mzHeader);
      zip.file('README.TXT', readme);

      // Generate zip
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = zipFileName;
      a.click();
      URL.revokeObjectURL(url);
      showNotice(`Downloaded ${zipFileName}`);
    } catch (err) {
      console.error('Failed to create zip bundle:', err);
    } finally {
      setDownloadingZip(false);
    }
  };

  // Download original .PRG
  const handleDownloadPrg = () => {
    const prgBytes = executable.exeBytes.slice(
      executable.segments.find((s) => s.name.includes('Payload'))?.startOffset || 0
    );
    const blob = new Blob([prgBytes as unknown as BlobPart], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = prgFileName;
    a.click();
    URL.revokeObjectURL(url);
    showNotice(`Downloaded ${prgFileName}`);
  };

  const showNotice = (msg: string) => {
    setDownloadSuccess(msg);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-xl w-full p-6 space-y-6 shadow-2xl">
        {/* Title */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-neutral-100 font-mono text-base">
              Export MS-DOS Package
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-100 p-1 rounded hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {downloadSuccess && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded flex items-center gap-2 text-xs font-mono text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Options */}
        <div className="space-y-3 font-mono">
          {/* Primary Option: Complete DOSBox Ready-to-Run Bundle */}
          <div className="p-4 bg-amber-950/20 border border-amber-600/60 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-100 text-sm">
                Complete DOSBox Ready-to-Run Bundle (.ZIP)
              </span>
              <span className="text-[11px] text-amber-400 uppercase font-semibold">
                Recommended
              </span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Includes <strong className="text-white font-mono">{exeFileName}</strong>, tuned <strong className="text-white font-mono">dosbox.conf</strong> (SB16 44.1kHz, VGA Mode 13h, 3000 cycles), <strong className="text-white font-mono">RUN.BAT</strong> launcher, and technical <strong className="text-white font-mono">README.TXT</strong>.
            </p>
            <button
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              className="mt-2 w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-neutral-950 font-semibold rounded text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Archive className="w-4 h-4" />
              <span>{downloadingZip ? 'Packaging ZIP Archive...' : `Download ${zipFileName}`}</span>
            </button>
          </div>

          {/* Option 2: Standalone .EXE */}
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-neutral-200">
                Standalone Executable ({exeFileName})
              </div>
              <div className="text-[11px] text-neutral-400">
                Valid MS-DOS MZ binary ({executable.totalSize.toLocaleString()} bytes). Run directly in FreeDOS or DOSBox.
              </div>
            </div>
            <button
              onClick={handleDownloadExe}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Save .EXE</span>
            </button>
          </div>

          {/* Option 3: Original .PRG */}
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-neutral-200">
                Extracted Commodore 64 Payload ({prgFileName})
              </div>
              <div className="text-[11px] text-neutral-400">
                Original 6510 binary payload ($0801 load address). Compatible with VICE, THEC64, and real hardware.
              </div>
            </div>
            <button
              onClick={handleDownloadPrg}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Save .PRG</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-mono text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
