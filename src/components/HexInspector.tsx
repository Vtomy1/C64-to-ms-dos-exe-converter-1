import React, { useState } from 'react';
import { ConvertedExecutable, ExeInspectionSegment } from '../types/c64dos';
import { FileCode2, Binary, Code2, Copy, Check, Info } from 'lucide-react';

interface HexInspectorProps {
  executable: ConvertedExecutable;
}

export const HexInspector: React.FC<HexInspectorProps> = ({ executable }) => {
  const [activeTab, setActiveTab] = useState<'hex' | 'disasm' | 'struct'>('hex');
  const [selectedOffset, setSelectedOffset] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);
  const [page, setPage] = useState(0);

  const bytesPerPage = 256;
  const totalPages = Math.ceil(executable.exeBytes.length / bytesPerPage);

  const pageStart = page * bytesPerPage;
  const pageEnd = Math.min(executable.exeBytes.length, pageStart + bytesPerPage);
  const currentBytes = executable.exeBytes.slice(pageStart, pageEnd);

  // Find which segment the current selected offset belongs to
  const activeSegment = executable.segments.find(
    (seg) => selectedOffset !== null && selectedOffset >= seg.startOffset && selectedOffset <= seg.endOffset
  );

  const handleCopyStruct = () => {
    const code = getCStructCode(executable);
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getByteSegmentColor = (offset: number) => {
    for (const seg of executable.segments) {
      if (offset >= seg.startOffset && offset <= seg.endOffset) {
        if (seg.name.includes('MZ Header')) return 'text-amber-400 font-semibold';
        if (seg.name.includes('Descriptors')) return 'text-emerald-400 font-semibold';
        if (seg.name.includes('Relocation')) return 'text-purple-400';
        if (seg.name.includes('Runtime Stub')) return 'text-cyan-400';
        if (seg.name.includes('Palette')) return 'text-rose-400';
        if (seg.name.includes('Payload')) return 'text-blue-400';
      }
    }
    return 'text-neutral-300';
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-100 font-mono flex items-center gap-2">
            <Binary className="w-4 h-4 text-amber-400" />
            MS-DOS Executable Binary & Relocation Inspector
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Total binary size: <span className="tabular-nums font-mono text-neutral-200">{executable.totalSize.toLocaleString()} bytes</span> · Valid MZ signature (0x5A4D)
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 p-0.5 bg-neutral-950 border border-neutral-800 rounded text-xs font-mono">
          <button
            onClick={() => setActiveTab('hex')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'hex'
                ? 'bg-neutral-800 text-neutral-100 font-medium'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Hex Dump
          </button>
          <button
            onClick={() => setActiveTab('disasm')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'disasm'
                ? 'bg-neutral-800 text-neutral-100 font-medium'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            x86 Disassembly
          </button>
          <button
            onClick={() => setActiveTab('struct')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'struct'
                ? 'bg-neutral-800 text-neutral-100 font-medium'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            C / ASM Header Struct
          </button>
        </div>
      </div>

      {/* Segment Legend Navigator */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
        <span className="text-neutral-400">Jump to Segment:</span>
        {executable.segments.map((seg) => (
          <button
            key={seg.name}
            onClick={() => {
              setSelectedOffset(seg.startOffset);
              setPage(Math.floor(seg.startOffset / bytesPerPage));
            }}
            className={`px-2 py-1 rounded border text-[11px] transition-colors ${
              activeSegment?.name === seg.name
                ? seg.colorClass + ' ring-1 ring-current'
                : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {seg.name}
          </button>
        ))}
      </div>

      {/* Tab 1: Hex Dump */}
      {activeTab === 'hex' && (
        <div className="space-y-3">
          {/* Active Segment Detail Card */}
          {activeSegment && (
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded flex items-start gap-2.5 text-xs font-mono">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-neutral-200">
                  {activeSegment.name} (0x{activeSegment.startOffset.toString(16).padStart(4, '0')} - 0x{activeSegment.endOffset.toString(16).padStart(4, '0')})
                </div>
                <div className="text-neutral-400 mt-0.5">
                  {activeSegment.description}
                </div>
              </div>
            </div>
          )}

          {/* Hex View Grid */}
          <div className="bg-neutral-950 border border-neutral-800 rounded p-4 font-mono text-xs overflow-x-auto">
            {/* Header row */}
            <div className="flex items-center text-neutral-500 pb-2 border-b border-neutral-800/80 mb-2">
              <span className="w-24">OFFSET</span>
              <div className="flex-1 grid grid-cols-16 gap-1 text-center">
                {Array.from({ length: 16 }).map((_, i) => (
                  <span key={i} className="w-5">
                    {i.toString(16).toUpperCase().padStart(2, '0')}
                  </span>
                ))}
              </div>
              <span className="w-36 pl-4">ASCII DECODE</span>
            </div>

            {/* Hex Rows */}
            <div className="space-y-1">
              {Array.from({ length: Math.ceil(currentBytes.length / 16) }).map((_, rowIdx) => {
                const rowOffset = pageStart + rowIdx * 16;
                const rowBytes = currentBytes.slice(rowIdx * 16, rowIdx * 16 + 16);

                let asciiStr = '';
                rowBytes.forEach((b) => {
                  asciiStr += b >= 32 && b <= 126 ? String.fromCharCode(b) : '.';
                });

                return (
                  <div key={rowOffset} className="flex items-center hover:bg-neutral-900/80 rounded px-1 -mx-1">
                    <span className="w-24 text-neutral-500 tabular-nums">
                      {rowOffset.toString(16).padStart(4, '0').toUpperCase()}:
                      {((rowOffset % 16) + 0).toString(16).padStart(4, '0').toUpperCase()}
                    </span>

                    <div className="flex-1 grid grid-cols-16 gap-1 text-center">
                      {Array.from({ length: 16 }).map((_, colIdx) => {
                        const byteVal = rowBytes[colIdx];
                        const absOffset = rowOffset + colIdx;
                        const isSelected = selectedOffset === absOffset;

                        if (byteVal === undefined) {
                          return <span key={colIdx} className="w-5 text-neutral-800">..</span>;
                        }

                        const colorCls = getByteSegmentColor(absOffset);

                        return (
                          <span
                            key={colIdx}
                            onClick={() => setSelectedOffset(absOffset)}
                            className={`w-5 cursor-pointer rounded transition-colors tabular-nums ${colorCls} ${
                              isSelected ? 'bg-amber-400 text-neutral-950 font-bold' : 'hover:bg-neutral-800'
                            }`}
                          >
                            {byteVal.toString(16).padStart(2, '0').toUpperCase()}
                          </span>
                        );
                      })}
                    </div>

                    <span className="w-36 pl-4 text-neutral-400 tracking-wider truncate">
                      {asciiStr}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
            <span>
              Viewing bytes {pageStart.toLocaleString()} - {pageEnd.toLocaleString()} of {executable.exeBytes.length.toLocaleString()}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="px-2.5 py-1 bg-neutral-950 border border-neutral-800 rounded disabled:opacity-40 hover:bg-neutral-800"
              >
                Prev 256B
              </button>
              <span className="px-2 tabular-nums">
                Page {page + 1} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="px-2.5 py-1 bg-neutral-950 border border-neutral-800 rounded disabled:opacity-40 hover:bg-neutral-800"
              >
                Next 256B
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Disassembly */}
      {activeTab === 'disasm' && (
        <div className="bg-neutral-950 border border-neutral-800 rounded p-4 font-mono text-xs overflow-x-auto">
          <div className="text-neutral-400 mb-3 border-b border-neutral-800 pb-2">
            MS-DOS 16-Bit Real Mode Entrypoint Routine (Initial CS:IP = 0x0000:0x0000)
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-neutral-500 border-b border-neutral-800/60 pb-1">
                <th className="py-1 w-28">ADDRESS</th>
                <th className="py-1 w-36">OPCODES</th>
                <th className="py-1 w-64">MNEMONIC</th>
                <th className="py-1">DESCRIPTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {executable.disassembly.map((inst, i) => (
                <tr key={i} className="hover:bg-neutral-900/50">
                  <td className="py-1 text-neutral-500">{inst.address}</td>
                  <td className="py-1 text-amber-400">{inst.opcodes}</td>
                  <td className="py-1 text-neutral-100 font-semibold">{inst.asm}</td>
                  <td className="py-1 text-neutral-400 text-[11px]">{inst.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: C Structure Definition */}
      {activeTab === 'struct' && (
        <div className="relative bg-neutral-950 border border-neutral-800 rounded p-4 font-mono text-xs overflow-x-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-neutral-400">MS-DOS MZ Header C Struct Representation:</span>
            <button
              onClick={handleCopyStruct}
              className="px-2.5 py-1 bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 rounded text-neutral-300 flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Struct'}</span>
            </button>
          </div>
          <pre className="text-amber-200/90 leading-relaxed">
            {getCStructCode(executable)}
          </pre>
        </div>
      )}
    </div>
  );
};

function getCStructCode(executable: ConvertedExecutable): string {
  const mz = executable.mzHeader;
  return `// MS-DOS MZ Executable Header (Generated for ${executable.romMeta.filename})
#pragma pack(push, 1)
typedef struct {
    uint16_t e_magic;         // 0x${mz.magic.toString(16).toUpperCase()} ("MZ")
    uint16_t e_cblp;          // ${mz.bytesInLastPage} bytes on last page
    uint16_t e_cp;            // ${mz.pagesInFile} pages in file (512B each)
    uint16_t e_crlc;          // ${mz.relocationsCount} relocation entries
    uint16_t e_cparhdr;       // ${mz.headerParagraphs} paragraphs in header (64B)
    uint16_t e_minalloc;      // 0x${mz.minAlloc.toString(16).padStart(4, '0').toUpperCase()} min extra paragraphs
    uint16_t e_maxalloc;      // 0x${mz.maxAlloc.toString(16).padStart(4, '0').toUpperCase()} max extra paragraphs
    uint16_t e_ss;            // 0x${mz.ss.toString(16).padStart(4, '0')} initial SS
    uint16_t e_sp;            // 0x${mz.sp.toString(16).padStart(4, '0')} initial SP
    uint16_t e_csum;          // 0x${mz.checksum.toString(16).padStart(4, '0')} checksum
    uint16_t e_ip;            // 0x${mz.ip.toString(16).padStart(4, '0')} initial IP entry
    uint16_t e_cs;            // 0x${mz.cs.toString(16).padStart(4, '0')} initial CS entry
    uint16_t e_lfarlc;        // 0x${mz.relocTableOffset.toString(16).padStart(4, '0')} reloc table offset
    uint16_t e_ovno;          // 0x${mz.overlayNumber.toString(16).padStart(4, '0')} overlay number
} IMAGE_DOS_HEADER;
#pragma pack(pop)

// Hardware Bridge Configuration:
// VIC-II VGA DAC Mode: 320x200 Mode 13h (${executable.headerConfig.palettePreset.toUpperCase()} 16-color palette)
// MOS SID Sound Bridge: Sound Blaster 16 DSP (Port 0x${executable.headerConfig.soundBlasterPort.toString(16)}, IRQ ${executable.headerConfig.soundBlasterIrq}, DMA ${executable.headerConfig.soundBlasterDma})
// C64 Load Address: $${executable.romMeta.loadAddress.toString(16).toUpperCase()} (${executable.romMeta.sizeBytes} bytes)`;
}
