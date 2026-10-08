import { C64RomData } from '../types/c64dos';

/**
 * Generates screen matrix 40 columns x 25 rows
 */
function createBlankMatrix(fillChar = 32, fillCol = 14): { chars: number[][]; cols: number[][] } {
  const chars: number[][] = [];
  const cols: number[][] = [];
  for (let r = 0; r < 25; r++) {
    chars.push(new Array(40).fill(fillChar));
    cols.push(new Array(40).fill(fillCol));
  }
  return { chars, cols };
}

function writeStringToScreen(
  chars: number[][],
  cols: number[][],
  row: number,
  col: number,
  text: string,
  color: number
) {
  for (let i = 0; i < text.length; i++) {
    const c = col + i;
    if (c >= 0 && c < 40 && row >= 0 && row < 25) {
      chars[row][c] = text.charCodeAt(i);
      cols[row][c] = color;
    }
  }
}

/**
 * Built-in Sample ROM: Commodore 64 BASIC V2
 */
function createBasicRom(): C64RomData {
  const { chars, cols } = createBlankMatrix(32, 14); // blank space, light blue text on dark blue

  writeStringToScreen(chars, cols, 1, 4, '**** COMMODORE 64 BASIC V2 ****', 14);
  writeStringToScreen(chars, cols, 3, 2, '64K RAM SYSTEM  38911 BASIC BYTES FREE', 14);
  writeStringToScreen(chars, cols, 5, 0, 'READY.', 14);
  writeStringToScreen(chars, cols, 6, 0, 'LOAD "MSDOS.EXE",8,1', 1); // typed command in white
  writeStringToScreen(chars, cols, 7, 0, 'SEARCHING FOR MSDOS.EXE', 14);
  writeStringToScreen(chars, cols, 8, 0, 'LOADING', 14);
  writeStringToScreen(chars, cols, 9, 0, 'READY.', 14);
  writeStringToScreen(chars, cols, 10, 0, 'SYS 2064', 1);
  writeStringToScreen(chars, cols, 12, 0, 'INITIALIZING DOS MZ BRIDGE...', 7); // yellow
  writeStringToScreen(chars, cols, 13, 0, 'SOUND BLASTER 16 DSP: PORT 220h IRQ 7', 13); // light green
  writeStringToScreen(chars, cols, 14, 0, 'VGA MODE 13h DAC PALETTE: 16 COLORS', 3); // cyan
  writeStringToScreen(chars, cols, 16, 0, 'READY.', 14);
  // Cursor
  chars[17][0] = 160; // inverted space / cursor block
  cols[17][0] = 14;

  // PRG bytes: Load address $0801 (0x01, 0x08) followed by BASIC line: 10 SYS 2064
  const payload = new Uint8Array([
    0x01, 0x08, // Load Address $0801
    // Next line pointer: $080C (0x0C, 0x08)
    0x0C, 0x08,
    // Line number: 10 (0x0A, 0x00)
    0x0A, 0x00,
    // Token $9E (SYS) followed by " 2064"
    0x9E, 0x20, 0x32, 0x30, 0x36, 0x34, 0x00,
    // Next line pointer: $0000 (End of BASIC program)
    0x00, 0x00,
    // Machine code at $0810 (2064):
    0xA9, 0x00, // LDA #$00
    0x8D, 0x20, 0xD0, // STA $D020 (Border Color)
    0x8D, 0x21, 0xD0, // STA $D021 (Background Color)
    0x60, // RTS
  ]);

  return {
    meta: {
      id: 'basic-v2',
      name: 'Commodore 64 BASIC V2 & KERNAL',
      filename: 'BASIC_V2.PRG',
      format: 'PRG',
      loadAddress: 0x0801,
      sizeBytes: payload.length,
      author: 'Commodore Business Machines / Microsoft',
      year: '1982',
      genre: 'System Environment',
      description: 'Original boot environment with Commodore BASIC prompt, 38,911 free bytes, and system vector table.',
      defaultBorderColor: 14, // Light Blue
      defaultBgColor: 6,      // Blue
    },
    rawBytes: payload,
    screenChars: chars,
    screenColors: cols,
    musicTuneId: 'basic_boot',
  };
}

/**
 * Built-in Sample ROM: Cyber-SID Chiptune 64
 */
function createCyberSidRom(): C64RomData {
  const { chars, cols } = createBlankMatrix(32, 1);

  writeStringToScreen(chars, cols, 1, 7, '=== CYBER-SID CHIPTUNE 64 ===', 7);
  writeStringToScreen(chars, cols, 3, 2, 'MOS 6581/8580 DUAL-FILTER DEMO TRACK', 3);
  writeStringToScreen(chars, cols, 5, 2, 'VOICE 1: SAWTOOTH LEAD ARPEGGIO', 13);
  writeStringToScreen(chars, cols, 6, 2, 'VOICE 2: PULSE PWM 50% BASSLINE', 14);
  writeStringToScreen(chars, cols, 7, 2, 'VOICE 3: WHITE NOISE LFSR SNARE', 10);

  writeStringToScreen(chars, cols, 9, 2, 'SID REGISTERS [0xD400 - 0xD418]:', 1);
  writeStringToScreen(chars, cols, 10, 4, 'FREQ1: $4A20   PULSE1: $0800  V1_CTRL: $41', 15);
  writeStringToScreen(chars, cols, 11, 4, 'FREQ2: $2510   PULSE2: $0400  V2_CTRL: $11', 15);
  writeStringToScreen(chars, cols, 12, 4, 'FREQ3: $8C00   NOISE3: $80    V3_CTRL: $81', 15);
  writeStringToScreen(chars, cols, 13, 4, 'CUTOFF: $0C80  RESON: $F7     MODE: 12dB LP', 7);

  writeStringToScreen(chars, cols, 15, 2, 'MS-DOS SOUND BLASTER 16 ROUTE:', 14);
  writeStringToScreen(chars, cols, 16, 4, 'DSP DMA BUFFER: 44.1 kHz 16-BIT STEREO', 13);
  writeStringToScreen(chars, cols, 17, 4, 'SB16 BASE PORT: 0x220   IRQ: 7   DMA: 1', 13);

  writeStringToScreen(chars, cols, 19, 2, 'RASTER SPLIT MONITOR (LINE 240):', 12);
  for (let c = 2; c < 38; c++) {
    chars[20][c] = 160;
    cols[20][c] = (c % 8) + 2;
  }
  writeStringToScreen(chars, cols, 22, 6, 'PRESS SPACE OR ENTER TO RETRIGGER', 1);

  const payload = new Uint8Array(256);
  payload[0] = 0x00;
  payload[1] = 0x10; // Load Address $1000
  // Fill sample SID music code
  for (let i = 2; i < 256; i++) {
    payload[i] = (i * 37 + 13) & 0xff;
  }

  return {
    meta: {
      id: 'cyber-sid',
      name: 'Cyber-SID Chiptune 64',
      filename: 'CYBER_SID.PRG',
      format: 'PRG',
      loadAddress: 0x1000,
      sizeBytes: payload.length,
      author: 'Retro Sound Lab',
      year: '1987',
      genre: 'Music & SID Showcase',
      description: 'High-energy 3-voice demo with dynamic pulse-width modulation, 12dB/octave resonant filter sweeps, and Sound Blaster DSP bridge.',
      defaultBorderColor: 0, // Black
      defaultBgColor: 11,    // Dark Grey
    },
    rawBytes: payload,
    screenChars: chars,
    screenColors: cols,
    musicTuneId: 'cyber_anthem',
  };
}

/**
 * Built-in Sample ROM: Turbo Racer 64
 */
function createTurboRacerRom(): C64RomData {
  const { chars, cols } = createBlankMatrix(32, 1);

  writeStringToScreen(chars, cols, 1, 10, '>>> TURBO RACER 64 <<<', 7);
  writeStringToScreen(chars, cols, 2, 8, 'COMMODORE GRAND PRIX CIRCUIT', 1);

  // Road drawing
  for (let r = 4; r < 20; r++) {
    const curbCol = r % 2 === 0 ? 2 : 1; // Red or White curb
    const grassCol = 5; // Green
    // Left grass
    for (let c = 0; c < 10; c++) {
      chars[r][c] = 46; // dot grass
      cols[r][c] = grassCol;
    }
    // Left curb
    chars[r][10] = 160;
    cols[r][10] = curbCol;
    // Tarmac
    for (let c = 11; c < 29; c++) {
      chars[r][c] = 32;
      cols[r][c] = 11;
    }
    // Lane markings
    if (r % 3 !== 0) {
      chars[r][20] = 124; // vertical bar
      cols[r][20] = 7; // Yellow
    }
    // Right curb
    chars[r][29] = 160;
    cols[r][29] = curbCol;
    // Right grass
    for (let c = 30; c < 40; c++) {
      chars[r][c] = 46;
      cols[r][c] = grassCol;
    }
  }

  // Player Race Car Sprite (ASCII representation)
  writeStringToScreen(chars, cols, 16, 18, '[####]', 2); // Red sports car
  writeStringToScreen(chars, cols, 17, 18, 'O====O', 1);

  // HUD
  writeStringToScreen(chars, cols, 21, 2, 'SPEED: 224 KM/H', 7);
  writeStringToScreen(chars, cols, 21, 22, 'LAP: 02/03', 14);
  writeStringToScreen(chars, cols, 22, 2, 'TIME: 01:14.88', 13);
  writeStringToScreen(chars, cols, 22, 22, 'SCORE: 048250', 1);
  writeStringToScreen(chars, cols, 23, 2, 'VIC-II RASTER SPLIT: OK', 3);

  const payload = new Uint8Array(384);
  payload[0] = 0x01;
  payload[1] = 0x08;
  for (let i = 2; i < 384; i++) {
    payload[i] = (i * 19 + 7) & 0xff;
  }

  return {
    meta: {
      id: 'turbo-racer',
      name: 'Turbo Racer 64',
      filename: 'TURBO_RACER.PRG',
      format: 'PRG',
      loadAddress: 0x0801,
      sizeBytes: payload.length,
      author: 'SpeedByte Games',
      year: '1989',
      genre: 'Arcade Racing',
      description: 'Multicolor bitmap racer demo with raster split road horizon, hardware sprite multiplexing, and engine exhaust audio synthesis.',
      defaultBorderColor: 2, // Red
      defaultBgColor: 0,     // Black
    },
    rawBytes: payload,
    screenChars: chars,
    screenColors: cols,
    musicTuneId: 'racing_rush',
  };
}

/**
 * Built-in Sample ROM: Space Defender DX
 */
function createSpaceDefenderRom(): C64RomData {
  const { chars, cols } = createBlankMatrix(32, 1);

  // Starfield
  for (let r = 1; r < 21; r++) {
    for (let c = 0; c < 40; c++) {
      if ((r * 17 + c * 31) % 19 === 0) {
        chars[r][c] = 46;
        cols[r][c] = (r + c) % 2 === 0 ? 1 : 15;
      }
    }
  }

  writeStringToScreen(chars, cols, 1, 2, 'SCORE: 012480', 7);
  writeStringToScreen(chars, cols, 1, 20, 'SHIELD: [========]', 13);
  writeStringToScreen(chars, cols, 1, 38, '3x', 10);

  // Hostile Mothership
  writeStringToScreen(chars, cols, 5, 14, '<!===X===!>', 2);
  writeStringToScreen(chars, cols, 6, 12, '<<| ALIEN BOSS |>>', 8);

  // Enemy Fighters
  writeStringToScreen(chars, cols, 10, 8, '>-o-<', 7);
  writeStringToScreen(chars, cols, 11, 26, '>-o-<', 7);

  // Player Spacecraft
  writeStringToScreen(chars, cols, 17, 18, '/^\\', 14);
  writeStringToScreen(chars, cols, 18, 17, '<==#==>', 3);
  writeStringToScreen(chars, cols, 19, 18, ' ! ! ', 10);

  // Lasers
  writeStringToScreen(chars, cols, 13, 19, '|', 10);
  writeStringToScreen(chars, cols, 15, 19, '|', 10);

  // Status Bar
  writeStringToScreen(chars, cols, 22, 2, 'SECTOR 07: ASTEROID BELT', 14);
  writeStringToScreen(chars, cols, 23, 2, 'DOS VGA 320x200 MCGA ACTIVE', 5);

  const payload = new Uint8Array(512);
  payload[0] = 0x01;
  payload[1] = 0x08;
  for (let i = 2; i < 512; i++) {
    payload[i] = (i * 29 + 11) & 0xff;
  }

  return {
    meta: {
      id: 'space-defender',
      name: 'Space Defender DX',
      filename: 'SPACE_DEFENDER.PRG',
      format: 'PRG',
      loadAddress: 0x0801,
      sizeBytes: payload.length,
      author: 'Nova Stellar Soft',
      year: '1985',
      genre: 'Space Action Shoot-em-up',
      description: 'Parallax starfield shooter demo featuring hardware sprite multiplexer, plasma blaster sound effects, and smooth raster scanline splits.',
      defaultBorderColor: 6, // Blue
      defaultBgColor: 0,     // Black
    },
    rawBytes: payload,
    screenChars: chars,
    screenColors: cols,
    musicTuneId: 'space_ambience',
  };
}

/**
 * Built-in Sample ROM: Dungeon of Commodore
 */
function createDungeonRom(): C64RomData {
  const { chars, cols } = createBlankMatrix(32, 1);

  writeStringToScreen(chars, cols, 1, 8, '[ THE DUNGEON OF COMMODORE ]', 7);

  // Draw Stone Room Walls
  for (let c = 4; c < 36; c++) {
    chars[3][c] = 35; // '#'
    cols[3][c] = 12;  // Grey
    chars[16][c] = 35;
    cols[16][c] = 12;
  }
  for (let r = 3; r <= 16; r++) {
    chars[r][4] = 35;
    cols[r][4] = 12;
    chars[r][35] = 35;
    cols[r][35] = 12;
  }

  // Inside Room Floor
  for (let r = 4; r < 16; r++) {
    for (let c = 5; c < 35; c++) {
      chars[r][c] = 46; // '.' floor
      cols[r][c] = 11;  // Dark grey
    }
  }

  // Torches & Treasure
  writeStringToScreen(chars, cols, 4, 6, '*~', 8);   // Torch
  writeStringToScreen(chars, cols, 4, 33, '~*', 8);  // Torch
  writeStringToScreen(chars, cols, 7, 28, '[$]', 7);  // Treasure chest
  writeStringToScreen(chars, cols, 12, 10, '[@]', 14); // Player wizard
  writeStringToScreen(chars, cols, 10, 22, '(D)', 2);  // Red dragon boss

  // Character Stats
  writeStringToScreen(chars, cols, 18, 4, 'HERO: VALERIUS LVL 5', 1);
  writeStringToScreen(chars, cols, 18, 26, 'HP: 142/150', 13);
  writeStringToScreen(chars, cols, 19, 4, 'MANA: 088/090', 14);
  writeStringToScreen(chars, cols, 19, 26, 'GOLD: 1,420 GP', 7);
  writeStringToScreen(chars, cols, 21, 4, 'SPELL: SID THUNDERBOLT (D400h)', 3);
  writeStringToScreen(chars, cols, 22, 4, 'INVENTORY: 1x C64 KERNAL ROM, 1x DOS MZ HEADER', 15);

  const payload = new Uint8Array(420);
  payload[0] = 0x01;
  payload[1] = 0x08;
  for (let i = 2; i < 420; i++) {
    payload[i] = (i * 43 + 3) & 0xff;
  }

  return {
    meta: {
      id: 'dungeon-c64',
      name: 'Dungeon of Commodore',
      filename: 'DUNGEON.PRG',
      format: 'PRG',
      loadAddress: 0x0801,
      sizeBytes: payload.length,
      author: 'QuestByte Studios',
      year: '1986',
      genre: 'Classic Dungeon RPG',
      description: 'Tile-based fantasy dungeon crawler with PETSCII character graphics, torch flicker animation, and mysterious subterranean chiptune theme.',
      defaultBorderColor: 9, // Brown
      defaultBgColor: 0,     // Black
    },
    rawBytes: payload,
    screenChars: chars,
    screenColors: cols,
    musicTuneId: 'dungeon_echo',
  };
}

export const SAMPLE_ROMS: C64RomData[] = [
  createBasicRom(),
  createCyberSidRom(),
  createTurboRacerRom(),
  createSpaceDefenderRom(),
  createDungeonRom(),
];

/**
 * Parses user uploaded file (.prg, .crt, .d64, .bin)
 */
export function parseUploadedRom(file: File, buffer: ArrayBuffer): C64RomData {
  const bytes = new Uint8Array(buffer);
  const ext = file.name.split('.').pop()?.toUpperCase() || 'BIN';
  let format: 'PRG' | 'CRT' | 'D64' | 'RAW' = 'RAW';
  let loadAddress = 0x0801;

  if (ext === 'PRG') {
    format = 'PRG';
    if (bytes.length >= 2) {
      loadAddress = bytes[0] | (bytes[1] << 8);
    }
  } else if (ext === 'CRT') {
    format = 'CRT';
    loadAddress = 0x8000;
  } else if (ext === 'D64') {
    format = 'D64';
    loadAddress = 0x0801;
  }

  // Generate ASCII screen preview based on filename and header
  const { chars, cols } = createBlankMatrix(32, 14);
  writeStringToScreen(chars, cols, 1, 2, `FILE: ${file.name.toUpperCase()}`, 1);
  writeStringToScreen(chars, cols, 2, 2, `FORMAT: ${format}  SIZE: ${bytes.length} BYTES`, 7);
  writeStringToScreen(chars, cols, 3, 2, `LOAD ADDRESS: $${loadAddress.toString(16).toUpperCase().padStart(4, '0')}`, 13);
  writeStringToScreen(chars, cols, 5, 2, 'MS-DOS EXE CONVERSION PIPELINE READY:', 14);
  writeStringToScreen(chars, cols, 6, 4, '- MZ HEADER BUILDER CONFIGURED', 3);
  writeStringToScreen(chars, cols, 7, 4, '- SOUND BLASTER 16 SID ENGINE MOUNTED', 3);
  writeStringToScreen(chars, cols, 8, 4, '- VGA MODE 13h DAC PALETTE MAPPED', 3);
  writeStringToScreen(chars, cols, 10, 2, 'EMBEDDED ROM DATA PREVIEW (HEX):', 15);

  // Show first 32 bytes hex dump on screen
  let hexLine = '';
  for (let i = 0; i < Math.min(16, bytes.length); i++) {
    hexLine += bytes[i].toString(16).padStart(2, '0').toUpperCase() + ' ';
  }
  writeStringToScreen(chars, cols, 12, 2, hexLine.trim(), 7);

  if (bytes.length > 16) {
    let hexLine2 = '';
    for (let i = 16; i < Math.min(32, bytes.length); i++) {
      hexLine2 += bytes[i].toString(16).padStart(2, '0').toUpperCase() + ' ';
    }
    writeStringToScreen(chars, cols, 13, 2, hexLine2.trim(), 7);
  }

  writeStringToScreen(chars, cols, 16, 2, 'READY TO EXECUTE IN MS-DOS OR DOSBOX.', 1);
  chars[18][2] = 160;
  cols[18][2] = 14;

  return {
    meta: {
      id: `custom-${Date.now()}`,
      name: file.name.replace(/\.[^/.]+$/, '').toUpperCase(),
      filename: file.name,
      format,
      loadAddress,
      sizeBytes: bytes.length,
      genre: 'User Provided Image',
      description: `Uploaded Commodore 64 binary payload ($${loadAddress.toString(16).toUpperCase().padStart(4, '0')} load address). Converted for MS-DOS execution.`,
      defaultBorderColor: 14,
      defaultBgColor: 6,
    },
    rawBytes: bytes,
    screenChars: chars,
    screenColors: cols,
    musicTuneId: 'cyber_anthem',
  };
}
