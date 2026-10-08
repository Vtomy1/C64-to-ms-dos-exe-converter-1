/**
 * Authentic Commodore 64 VIC-II Palettes & MS-DOS VGA DAC Mapping
 */

export interface C64Color {
  index: number;
  name: string;
  hex: string;
  r: number;
  g: number;
  b: number;
  vgaDacR: number; // 0..63 for DOS VGA Port 3C9h
  vgaDacG: number;
  vgaDacB: number;
}

// Pepto Palette (by Philip "Pepto" Timmermann - PAL TV luminance and chrominance model)
export const PEPTO_COLORS_HEX: string[] = [
  '#000000', // 0: Black
  '#FFFFFF', // 1: White
  '#880000', // 2: Red
  '#AAFFEE', // 3: Cyan
  '#CC44CC', // 4: Purple
  '#00CC55', // 5: Green
  '#0000AA', // 6: Blue
  '#EEEE77', // 7: Yellow
  '#DD8855', // 8: Orange
  '#664400', // 9: Brown
  '#FF7777', // 10: Light Red
  '#333333', // 11: Dark Grey
  '#777777', // 12: Grey
  '#AAFF66', // 13: Light Green
  '#0088FF', // 14: Light Blue
  '#BBBBBB', // 15: Light Grey
];

// Colodore Modern Colorimetric Palette (Phosphors & CRT gamma 2.2)
export const COLODORE_COLORS_HEX: string[] = [
  '#000000', // 0
  '#FFFFFF', // 1
  '#813338', // 2
  '#75CEC8', // 3
  '#8E3C97', // 4
  '#56AC4D', // 5
  '#2E2C9B', // 6
  '#EDF171', // 7
  '#8E5029', // 8
  '#553800', // 9
  '#C46C71', // 10
  '#4A4A4A', // 11
  '#7B7B7B', // 12
  '#A9FF9F', // 13
  '#706DEB', // 14
  '#B2B2B2', // 15
];

// VICE Classic Palette
export const VICE_COLORS_HEX: string[] = [
  '#000000', // 0
  '#FFFFFF', // 1
  '#894036', // 2
  '#7ABFC7', // 3
  '#8A4836', // 4
  '#52AB59', // 5
  '#3C339F', // 6
  '#D7E894', // 7
  '#8D5224', // 8
  '#634400', // 9
  '#B86962', // 10
  '#505050', // 11
  '#787878', // 12
  '#94E089', // 13
  '#7869C4', // 14
  '#9F9F9F', // 15
];

// NTSC Warm Composite
export const NTSC_COLORS_HEX: string[] = [
  '#000000', // 0
  '#FFFFFF', // 1
  '#9B2D20', // 2
  '#69C5C5', // 3
  '#973999', // 4
  '#4FA83D', // 5
  '#2B2896', // 6
  '#F4F06E', // 7
  '#A05713', // 8
  '#6C4100', // 9
  '#D66F64', // 10
  '#464646', // 11
  '#707070', // 12
  '#9BF085', // 13
  '#6960D8', // 14
  '#B0B0B0', // 15
];

export const C64_COLOR_NAMES = [
  'Black',
  'White',
  'Red',
  'Cyan',
  'Purple',
  'Green',
  'Blue',
  'Yellow',
  'Orange',
  'Brown',
  'Light Red',
  'Dark Grey',
  'Grey',
  'Light Green',
  'Light Blue',
  'Light Grey',
];

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

export function getPaletteColors(preset: 'pepto' | 'colodore' | 'vice' | 'ntsc'): C64Color[] {
  let hexList = PEPTO_COLORS_HEX;
  if (preset === 'colodore') hexList = COLODORE_COLORS_HEX;
  if (preset === 'vice') hexList = VICE_COLORS_HEX;
  if (preset === 'ntsc') hexList = NTSC_COLORS_HEX;

  return hexList.map((hex, idx) => {
    const [r, g, b] = hexToRgb(hex);
    // MS-DOS VGA DAC registers take 6-bit values (0..63)
    const vgaDacR = Math.min(63, Math.round((r / 255) * 63));
    const vgaDacG = Math.min(63, Math.round((g / 255) * 63));
    const vgaDacB = Math.min(63, Math.round((b / 255) * 63));

    return {
      index: idx,
      name: C64_COLOR_NAMES[idx],
      hex,
      r,
      g,
      b,
      vgaDacR,
      vgaDacG,
      vgaDacB,
    };
  });
}

/**
 * Returns raw 48 bytes (16 colors x 3 bytes RGB 0..63) ready to write into
 * MS-DOS VGA DAC registers (Ports 3C8h / 3C9h) in the generated executable.
 */
export function generateVgaDacTable(preset: 'pepto' | 'colodore' | 'vice' | 'ntsc'): Uint8Array {
  const colors = getPaletteColors(preset);
  const table = new Uint8Array(48);
  for (let i = 0; i < 16; i++) {
    table[i * 3 + 0] = colors[i].vgaDacR;
    table[i * 3 + 1] = colors[i].vgaDacG;
    table[i * 3 + 2] = colors[i].vgaDacB;
  }
  return table;
}
