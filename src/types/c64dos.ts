/**
 * C64 to MS-DOS Executable Converter Types
 */

export type DosTargetMode = 'real16' | 'pmode32' | 'com_stub';

export type DosAudioSubsystem = 'sb16' | 'adlib' | 'gus' | 'speaker';

export type SidChipModel = '6581' | '8580';

export type PalettePreset = 'pepto' | 'colodore' | 'vice' | 'ntsc';

export type VideoMode = 'mode13h' | 'modex' | 'mcga';

export type ScanlineIntensity = 'none' | 'subtle' | 'authentic' | 'heavy';

export interface RomMetadata {
  id: string;
  name: string;
  filename: string;
  format: 'PRG' | 'CRT' | 'D64' | 'RAW';
  loadAddress: number; // e.g. 0x0801 ($0801 BASIC) or 0xC000
  sizeBytes: number;
  author?: string;
  year?: string;
  genre: string;
  description: string;
  defaultBorderColor: number; // 0-15
  defaultBgColor: number;     // 0-15
}

export interface C64RomData {
  meta: RomMetadata;
  rawBytes: Uint8Array;
  basicTokens?: string[];
  screenChars?: number[][];
  screenColors?: number[][];
  musicTuneId?: string;
}

export interface MzHeaderConfig {
  targetMode: DosTargetMode;
  audioSubsystem: DosAudioSubsystem;
  sidModel: SidChipModel;
  palettePreset: PalettePreset;
  videoMode: VideoMode;
  scanlines: ScanlineIntensity;
  preserveBorder: boolean;
  minAllocParagraphs: number;  // e.g. 0x0040 (1KB extra)
  maxAllocParagraphs: number;  // e.g. 0xFFFF
  stackParagraphOffset: number; // Initial relative SS
  stackPointer: number;        // Initial SP (e.g. 0x0800)
  instructionPointer: number;  // Initial IP (e.g. 0x0000)
  codeSegment: number;         // Initial relative CS
  dosboxCycles: number;        // e.g. 3000
  soundBlasterPort: number;    // e.g. 0x220
  soundBlasterIrq: number;     // e.g. 7
  soundBlasterDma: number;     // e.g. 1
  emulationSamplingRate: number; // 44100 or 22050
}

export interface MzHeaderFields {
  magic: number;          // 0x5A4D ('MZ')
  bytesInLastPage: number;// e_cblp
  pagesInFile: number;    // e_cp (512 bytes each)
  relocationsCount: number; // e_crlc
  headerParagraphs: number; // e_cparhdr (16 bytes each)
  minAlloc: number;       // e_minalloc
  maxAlloc: number;       // e_maxalloc
  ss: number;             // e_ss
  sp: number;             // e_sp
  checksum: number;       // e_csum
  ip: number;             // e_ip
  cs: number;             // e_cs
  relocTableOffset: number; // e_lfarlc
  overlayNumber: number;  // e_ovno
}

export interface ExeInspectionSegment {
  name: string;
  startOffset: number;
  endOffset: number;
  colorClass: string;
  description: string;
}

export interface ConvertedExecutable {
  exeBytes: Uint8Array;
  mzHeader: MzHeaderFields;
  segments: ExeInspectionSegment[];
  headerConfig: MzHeaderConfig;
  romMeta: RomMetadata;
  generatedAt: string;
  totalSize: number;
  disassembly: { address: string; opcodes: string; asm: string; comment?: string }[];
}
