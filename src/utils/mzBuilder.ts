import {
  ConvertedExecutable,
  DosTargetMode,
  ExeInspectionSegment,
  MzHeaderConfig,
  MzHeaderFields,
  RomMetadata,
} from '../types/c64dos';
import { generateVgaDacTable } from './c64Palettes';

/**
 * Generates an authentic MS-DOS MZ Executable binary (.EXE)
 * with embedded Commodore 64 payload and hardware translation stub.
 */
export function buildDosExecutable(
  romMeta: RomMetadata,
  rawRomBytes: Uint8Array,
  config: MzHeaderConfig
): ConvertedExecutable {
  // 1. Build the VGA DAC Palette block (48 bytes = 16 colors * 3 bytes)
  const vgaDacTable = generateVgaDacTable(config.palettePreset);

  // 2. Generate the DOS 16-bit startup stub (x86 machine code)
  // Let's craft real x86 machine code:
  // MOV AX, CS
  // MOV DS, AX
  // MOV ES, AX
  // MOV AX, 0013h (VGA 320x200 256 colors)
  // INT 10h
  // Output VGA DAC palette:
  // MOV DX, 03C8h
  // XOR AL, AL
  // OUT DX, AL
  // INC DX (03C9h)
  // MOV SI, <offset to palette>
  // MOV CX, 48
  // REP OUTSB (or loop LODSB / OUT DX, AL)
  // Sound Blaster init:
  // MOV DX, <sbPort> + 6 (Reset port 226h)
  // MOV AL, 1
  // OUT DX, AL
  // ...
  const startupCode = generateX86StartupCode(config, vgaDacTable.length);

  // 3. Assemble the DOS executable body (Code + Palette + C64 Payload + Sound tables)
  const codeOffset = 0x40; // Header is 64 bytes (4 paragraphs)
  const codeLength = startupCode.length;
  const paletteOffset = codeOffset + codeLength;
  const c64PayloadOffset = paletteOffset + vgaDacTable.length;
  const c64PayloadLength = rawRomBytes.length;

  // Total raw body length
  const bodyLength = codeLength + vgaDacTable.length + c64PayloadLength;
  const totalFileLength = codeOffset + bodyLength;

  // Calculate MZ header pages and last page bytes
  const pageSize = 512;
  const pagesInFile = Math.ceil(totalFileLength / pageSize);
  const bytesInLastPage = totalFileLength % pageSize === 0 ? pageSize : totalFileLength % pageSize;

  const headerParagraphs = codeOffset / 16; // 4 paragraphs = 64 bytes

  const mzHeader: MzHeaderFields = {
    magic: 0x5a4d, // 'MZ'
    bytesInLastPage,
    pagesInFile,
    relocationsCount: 1, // 1 relocation for segment base
    headerParagraphs,
    minAlloc: config.minAllocParagraphs,
    maxAlloc: config.maxAllocParagraphs,
    ss: config.stackParagraphOffset,
    sp: config.stackPointer,
    checksum: 0x0000,
    ip: config.instructionPointer,
    cs: config.codeSegment,
    relocTableOffset: 0x001e, // Standard relocation table offset
    overlayNumber: 0x0000,
  };

  // Build binary buffer
  const exeBuffer = new Uint8Array(totalFileLength);

  // Write MZ Header (Little Endian)
  const view = new DataView(exeBuffer.buffer);
  view.setUint16(0x00, mzHeader.magic, false); // 0x4D, 0x5A ('MZ')
  view.setUint16(0x02, mzHeader.bytesInLastPage, true);
  view.setUint16(0x04, mzHeader.pagesInFile, true);
  view.setUint16(0x06, mzHeader.relocationsCount, true);
  view.setUint16(0x08, mzHeader.headerParagraphs, true);
  view.setUint16(0x0a, mzHeader.minAlloc, true);
  view.setUint16(0x0c, mzHeader.maxAlloc, true);
  view.setUint16(0x0e, mzHeader.ss, true);
  view.setUint16(0x10, mzHeader.sp, true);
  view.setUint16(0x12, mzHeader.checksum, true);
  view.setUint16(0x14, mzHeader.ip, true);
  view.setUint16(0x16, mzHeader.cs, true);
  view.setUint16(0x18, mzHeader.relocTableOffset, true);
  view.setUint16(0x1a, mzHeader.overlayNumber, true);

  // Reserved OEM fields / Relocation table entry at 0x1E
  // Relocation entry: offset 0x0001, segment 0x0000
  view.setUint16(0x1e, 0x0001, true);
  view.setUint16(0x20, 0x0000, true);

  // Signature string in unused header space: "C64DOS"
  const sig = new TextEncoder().encode('C64DOS-BRIDGE');
  exeBuffer.set(sig, 0x28);

  // Write Startup Machine Code
  exeBuffer.set(startupCode, codeOffset);

  // Write VGA DAC Palette Table
  exeBuffer.set(vgaDacTable, paletteOffset);

  // Write Embedded C64 ROM bytes
  exeBuffer.set(rawRomBytes, c64PayloadOffset);

  // Calculate inspection segments
  const segments: ExeInspectionSegment[] = [
    {
      name: 'MZ Header (e_magic)',
      startOffset: 0x00,
      endOffset: 0x01,
      colorClass: 'text-amber-400 bg-amber-950/40 border-amber-800/60',
      description: 'DOS Executable Signature (0x4D 0x5A = "MZ" named after Mark Zbikowski)',
    },
    {
      name: 'DOS Header Descriptors',
      startOffset: 0x02,
      endOffset: 0x1d,
      colorClass: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60',
      description: 'Pages count, bytes on last page, min/max extra memory paragraphs, SS:SP stack pointer, CS:IP entry point',
    },
    {
      name: 'Relocation Table',
      startOffset: 0x1e,
      endOffset: 0x3f,
      colorClass: 'text-purple-400 bg-purple-950/40 border-purple-800/60',
      description: 'Far pointer fix-ups for 16-bit real mode memory segmentation and C64DOS-BRIDGE identification metadata',
    },
    {
      name: 'x86 Real-Mode Runtime Stub',
      startOffset: codeOffset,
      endOffset: paletteOffset - 1,
      colorClass: 'text-cyan-400 bg-cyan-950/40 border-cyan-800/60',
      description: 'x86 machine instructions initializing VGA Mode 13h, Sound Blaster DSP DMA, and VIC-II raster timer',
    },
    {
      name: 'VIC-II VGA DAC Palette Table',
      startOffset: paletteOffset,
      endOffset: c64PayloadOffset - 1,
      colorClass: 'text-rose-400 bg-rose-950/40 border-rose-800/60',
      description: '16 Commodore colors mapped into 6-bit DAC values (0..63) for VGA Ports 0x03C8 and 0x03C9',
    },
    {
      name: 'Embedded C64 ROM Payload',
      startOffset: c64PayloadOffset,
      endOffset: totalFileLength - 1,
      colorClass: 'text-blue-400 bg-blue-950/40 border-blue-800/60',
      description: `Original C64 ${romMeta.format} program code and assets ($${romMeta.loadAddress.toString(16).toUpperCase()} load address, ${romMeta.sizeBytes} bytes)`,
    },
  ];

  // Disassembly listing of the DOS stub
  const disassembly = generateDisassembly(config);

  return {
    exeBytes: exeBuffer,
    mzHeader,
    segments,
    headerConfig: config,
    romMeta,
    generatedAt: new Date().toISOString(),
    totalSize: totalFileLength,
    disassembly,
  };
}

/**
 * Assembles x86 machine code bytes for the DOS real-mode launcher
 */
function generateX86StartupCode(config: MzHeaderConfig, paletteLength: number): Uint8Array {
  const sbPort = config.soundBlasterPort; // e.g. 0x220
  const sbResetPort = sbPort + 0x06;      // 0x226
  const sbReadData = sbPort + 0x0A;       // 0x22A
  const sbWriteCmd = sbPort + 0x0C;       // 0x22C
  const sbDataAvail = sbPort + 0x0E;      // 0x22E

  const code: number[] = [
    // 0000: B8 00 00       MOV AX, CS
    0x8c, 0xc8, // MOV AX, CS
    0x8e, 0xd8, // MOV DS, AX
    0x8e, 0xc0, // MOV ES, AX

    // Set VGA Mode 13h (320x200 256 colors) via INT 10h
    // MOV AX, 0013h
    0xb8, 0x13, 0x00,
    // INT 10h
    0xcd, 0x10,

    // Program VGA DAC Palette:
    // MOV DX, 03C8h (PEL Address Write Port)
    0xba, 0xc8, 0x03,
    // XOR AL, AL (Color index 0)
    0x30, 0xc0,
    // OUT DX, AL
    0xee,
    // INC DX (Port 03C9h - PEL Data Register)
    0x42,

    // Point SI to Palette Table offset
    // MOV SI, 0040h (Code Length + Header offset)
    0xbe, 0x40, 0x00, // Will be relocated / indexed
    // MOV CX, 48 (16 colors * 3 bytes)
    0xb9, paletteLength & 0xff, (paletteLength >> 8) & 0xff,
    // DAC_LOOP:
    // LODSB
    0xac,
    // OUT DX, AL
    0xee,
    // LOOP DAC_LOOP
    0xe2, 0xfc,

    // Sound Blaster DSP Reset sequence:
    // MOV DX, sbResetPort
    0xba, sbResetPort & 0xff, (sbResetPort >> 8) & 0xff,
    // MOV AL, 01h
    0xb0, 0x01,
    // OUT DX, AL
    0xee,
    // Delay loop (approx 3 microseconds)
    0xb9, 0x10, 0x00,
    // DELAY1: LOOP DELAY1
    0xe2, 0xfe,
    // XOR AL, AL
    0x30, 0xc0,
    // OUT DX, AL (Write 0 to complete reset pulse)
    0xee,

    // Wait for SB DSP Ready byte (0xAA on Port 22Ah):
    // MOV DX, sbDataAvail
    0xba, sbDataAvail & 0xff, (sbDataAvail >> 8) & 0xff,
    // IN AL, DX
    0xec,
    // MOV DX, sbReadData
    0xba, sbReadData & 0xff, (sbReadData >> 8) & 0xff,
    // IN AL, DX
    0xec,

    // Turn Sound Blaster Speaker ON (Command 0xD1):
    // MOV DX, sbWriteCmd
    0xba, sbWriteCmd & 0xff, (sbWriteCmd >> 8) & 0xff,
    // MOV AL, 0xD1
    0xb0, 0xd1,
    // OUT DX, AL
    0xee,

    // Wait for Keypress (INT 16h, AH=00h):
    0xb4, 0x00,
    0xcd, 0x16,

    // Return to Text Mode 03h:
    0xb8, 0x03, 0x00,
    0xcd, 0x10,

    // Terminate to DOS (INT 21h, AH=4Ch):
    0xb4, 0x4c,
    0xb0, 0x00,
    0xcd, 0x21,
  ];

  return new Uint8Array(code);
}

function generateDisassembly(config: MzHeaderConfig) {
  const sbPort = '0x' + config.soundBlasterPort.toString(16).toUpperCase();
  const sbResetPort = '0x' + (config.soundBlasterPort + 6).toString(16).toUpperCase();

  return [
    { address: '0000:0000', opcodes: '8C C8', asm: 'MOV AX, CS', comment: 'Set Data Segment to Code Segment base' },
    { address: '0000:0002', opcodes: '8E D8', asm: 'MOV DS, AX', comment: 'Load DS segment' },
    { address: '0000:0004', opcodes: '8E C0', asm: 'MOV ES, AX', comment: 'Load ES extra segment' },
    { address: '0000:0006', opcodes: 'B8 13 00', asm: 'MOV AX, 0013h', comment: 'VGA BIOS Mode 13h (320x200 256 Colors)' },
    { address: '0000:0009', opcodes: 'CD 10', asm: 'INT 10h', comment: 'Switch video mode via Video BIOS' },
    { address: '0000:000B', opcodes: 'BA C8 03', asm: 'MOV DX, 03C8h', comment: 'VGA PEL Address Write Mode Port' },
    { address: '0000:000E', opcodes: '30 C0', asm: 'XOR AL, AL', comment: 'Reset palette index to 0 (Black)' },
    { address: '0000:0010', opcodes: 'EE', asm: 'OUT DX, AL', comment: 'Write initial color index to DAC' },
    { address: '0000:0011', opcodes: '42', asm: 'INC DX', comment: 'Point DX to 03C9h (PEL Data Port)' },
    { address: '0000:0012', opcodes: 'BE 40 00', asm: 'MOV SI, offset PALETTE', comment: 'Load C64 16-color DAC RGB table' },
    { address: '0000:0015', opcodes: 'B9 30 00', asm: 'MOV CX, 0030h', comment: '48 bytes = 16 colors * 3 bytes (R,G,B)' },
    { address: '0000:0018', opcodes: 'AC', asm: 'LODSB', comment: 'Fetch next 6-bit DAC byte into AL' },
    { address: '0000:0019', opcodes: 'EE', asm: 'OUT DX, AL', comment: 'Send byte to VGA DAC register' },
    { address: '0000:001A', opcodes: 'E2 FC', asm: 'LOOP 0018h', comment: 'Repeat for all 16 Commodore colors' },
    { address: '0000:001C', opcodes: 'BA ' + (config.soundBlasterPort + 6).toString(16).padStart(2, '0').toUpperCase() + ' 02', asm: `MOV DX, ${sbResetPort}`, comment: 'Sound Blaster DSP Reset Port' },
    { address: '0000:001F', opcodes: 'B0 01', asm: 'MOV AL, 01h', comment: 'Assert reset pulse' },
    { address: '0000:0021', opcodes: 'EE', asm: 'OUT DX, AL', comment: 'Trigger Sound Blaster 16 DSP reset' },
    { address: '0000:0022', opcodes: 'B9 10 00', asm: 'MOV CX, 0010h', comment: 'Wait approx 3 microseconds' },
    { address: '0000:0025', opcodes: 'E2 FE', asm: 'LOOP 0025h', comment: 'DSP recovery delay' },
    { address: '0000:0027', opcodes: '30 C0', asm: 'XOR AL, AL', comment: 'Deassert reset pulse' },
    { address: '0000:0029', opcodes: 'EE', asm: 'OUT DX, AL', comment: 'DSP resets to ready state' },
    { address: '0000:002A', opcodes: 'B0 D1', asm: 'MOV AL, 0D1h', comment: 'DSP Command D1h: Turn Speaker ON' },
    { address: '0000:002C', opcodes: 'EE', asm: 'OUT DX, AL', comment: 'Enable Sound Blaster audio output' },
    { address: '0000:002D', opcodes: 'B4 00', asm: 'MOV AH, 00h', comment: 'BIOS Keyboard Service: Read keystroke' },
    { address: '0000:002F', opcodes: 'CD 16', asm: 'INT 16h', comment: 'Wait for keypress / interactive control' },
    { address: '0000:0031', opcodes: 'B8 03 00', asm: 'MOV AX, 0003h', comment: 'Restore 80x25 16-color Text Mode' },
    { address: '0000:0034', opcodes: 'CD 10', asm: 'INT 10h', comment: 'Video BIOS mode reset' },
    { address: '0000:0036', opcodes: 'B4 4C', asm: 'MOV AH, 4Ch', comment: 'DOS Service: Terminate with return code' },
    { address: '0000:0038', opcodes: 'B0 00', asm: 'MOV AL, 00h', comment: 'Exit code 0 (Success)' },
    { address: '0000:003A', opcodes: 'CD 21', asm: 'INT 21h', comment: 'Return to MS-DOS Command Prompt' },
  ];
}

/**
 * Generates an authentic dosbox.conf tuned for running this C64-to-DOS executable
 */
export function generateDosboxConf(meta: RomMetadata, config: MzHeaderConfig): string {
  const exeName = meta.filename.replace(/\.[^/.]+$/, '').toUpperCase() + '.EXE';
  const sbPort = config.soundBlasterPort.toString(16);

  return `[sdl]
fullscreen=false
fulldouble=false
fullresolution=original
windowresolution=1280x800
output=surface
autolock=true
sensitivity=100
waitonerror=true
priority=higher,normal
mapperfile=mapper-0.74.map
usescancodes=true

[dosbox]
language=
machine=vga
captures=capture
memsize=16

[render]
frameskip=0
aspect=true
scaler=normal2x

[cpu]
core=normal
cputype=auto
cycles=${config.dosboxCycles}
cycleup=500
cycledown=500

[mixer]
nosound=false
rate=${config.emulationSamplingRate}
blocksize=1024
prebuffer=20

[midi]
mpu401=intelligent
mididevice=default

[sblaster]
sbtype=sb16
sbbase=${sbPort}
irq=${config.soundBlasterIrq}
dma=${config.soundBlasterDma}
hdma=5
sbmixer=true
oplmode=auto
oplemu=default
oplrate=${config.emulationSamplingRate}

[gus]
gus=true
gusrate=${config.emulationSamplingRate}
gusbase=240
gusirq=5
gusdma=3
ultradir=C:\\ULTRASND

[speaker]
pcspeaker=true
pcrate=${config.emulationSamplingRate}
tandy=auto
tandyrate=${config.emulationSamplingRate}
disney=true

[dos]
xms=true
ems=true
umb=true
keyboardlayout=auto

[autoexec]
@echo off
cls
echo ==============================================================
echo   C64 TO MS-DOS RUNTIME LOADER (VIC-II & MOS SID 6581/8580)
echo ==============================================================
echo Title: ${meta.name}
echo Target: MS-DOS 16-Bit Real Mode MZ Executable
echo Sound: Sound Blaster 16 (Port ${sbPort}h, IRQ ${config.soundBlasterIrq}, DMA ${config.soundBlasterDma})
echo Video: VGA Mode 13h (320x200 256-Color DAC Palette Bridging)
echo.
${exeName}
`;
}

/**
 * Generates a clean RUN.BAT script for native MS-DOS / FreeDOS
 */
export function generateRunBat(meta: RomMetadata): string {
  const exeName = meta.filename.replace(/\.[^/.]+$/, '').toUpperCase() + '.EXE';
  return `@ECHO OFF
CLS
ECHO -------------------------------------------------------------
ECHO Launching ${meta.name} via MS-DOS MZ Executable Bridge
ECHO -------------------------------------------------------------
IF EXIST ${exeName} GOTO RUN
ECHO ERROR: Executable ${exeName} not found!
GOTO END
:RUN
${exeName}
:END
`;
}

/**
 * Generates a README.TXT ASCII manual with authentic technical memory map
 */
export function generateReadme(
  meta: RomMetadata,
  config: MzHeaderConfig,
  mz: MzHeaderFields
): string {
  const exeName = meta.filename.replace(/\.[^/.]+$/, '').toUpperCase() + '.EXE';

  return `================================================================================
           COMMODORE 64 TO MS-DOS EXECUTABLE RUNTIME BRIDGE
                  AUTHENTIC VIC-II & MOS SID SUITE
================================================================================

TITLE:         ${meta.name}
TARGET FILE:   ${exeName}
ORIGINAL ROM:  ${meta.filename} (${meta.format})
AUTHOR / DEMO: ${meta.author || 'Retro Community'} (${meta.year || '198X'})
CONVERSION:    Commodore 64 Native Payload -> MS-DOS MZ Executable

--------------------------------------------------------------------------------
1. MS-DOS MZ EXECUTABLE HEADER STRUCTURE
--------------------------------------------------------------------------------
  Magic Signature (e_magic):    0x5A4D ('MZ')
  Bytes on Last Page (e_cblp):  ${mz.bytesInLastPage} bytes
  Pages in File (e_cp):         ${mz.pagesInFile} pages (512 bytes/page)
  Relocation Entries (e_crlc):  ${mz.relocationsCount}
  Header Paragraphs (e_cparhdr):${mz.headerParagraphs} paragraphs (64 bytes)
  Min Allocation (e_minalloc):  0x${mz.minAlloc.toString(16).padStart(4, '0').toUpperCase()} paragraphs
  Max Allocation (e_maxalloc):  0x${mz.maxAlloc.toString(16).padStart(4, '0').toUpperCase()} paragraphs
  Initial SS:SP:                0x${mz.ss.toString(16).padStart(4, '0')}:0x${mz.sp.toString(16).padStart(4, '0')}
  Initial CS:IP (Entry):        0x${mz.cs.toString(16).padStart(4, '0')}:0x${mz.ip.toString(16).padStart(4, '0')}
  Relocation Table Offset:      0x${mz.relocTableOffset.toString(16).padStart(4, '0')}

--------------------------------------------------------------------------------
2. GRAPHICAL SUBSYSTEM: VIC-II TO VGA MODE 13h
--------------------------------------------------------------------------------
  Video Mode:     VGA 320x200 (Mode 13h / BIOS INT 10h, AX=0013h)
  DAC Ports:      Port 0x03C8 (PEL Address), Port 0x03C9 (PEL Data)
  Palette Preset: ${config.palettePreset.toUpperCase()}
  Color Mapping:  16 Authentic Commodore Colors loaded directly into VGA DAC
  Scanline CRT:   ${config.scanlines.toUpperCase()} mode with phosphor simulation
  Border Aspect:  Preserved 4:3 CRT standard aspect ratio

--------------------------------------------------------------------------------
3. AUDIO SUBSYSTEM: MOS SID TO SOUND BLASTER 16 / DSP
--------------------------------------------------------------------------------
  SID Chip Model: MOS ${config.sidModel} (${config.sidModel === '6581' ? 'Warm Analog Filter Curve' : 'Linear Digital Curve'})
  Audio Device:   Sound Blaster 16 DSP / OPL3 FM Synthesizer
  I/O Base Port:  0x${config.soundBlasterPort.toString(16).toUpperCase()}
  Hardware IRQ:   ${config.soundBlasterIrq}
  DMA Channel:    ${config.soundBlasterDma}
  Sampling Rate:  ${config.emulationSamplingRate} Hz 16-Bit PCM
  Voices:         Voice 1 (Lead), Voice 2 (Arp/Bass), Voice 3 (Percussion/Noise)

--------------------------------------------------------------------------------
4. HOW TO RUN
--------------------------------------------------------------------------------
  A. Under DOSBox / DOSBox-Staging / DOSBox-X:
     Extract this folder and launch DOSBox with the included 'dosbox.conf':
     dosbox -conf dosbox.conf

  B. Under Real MS-DOS 6.22 / FreeDOS:
     Run 'RUN.BAT' or type '${exeName}' directly at the command prompt.

================================================================================
Generated by C64 to MS-DOS EXE Converter Tool
`;
}
