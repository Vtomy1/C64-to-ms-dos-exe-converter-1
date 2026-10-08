import React, { useEffect, useRef, useState } from 'react';
import { C64RomData, MzHeaderConfig } from '../types/c64dos';
import { getPaletteColors } from '../utils/c64Palettes';
import { Monitor, Terminal, Maximize2, Camera, RefreshCw } from 'lucide-react';

interface ScreenPreviewProps {
  romData: C64RomData;
  config: MzHeaderConfig;
  activeView: 'screen' | 'dos';
  onChangeView: (view: 'screen' | 'dos') => void;
}

export const ScreenPreview: React.FC<ScreenPreviewProps> = ({
  romData,
  config,
  activeView,
  onChangeView,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [animFrame, setAnimFrame] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);

  const colors = getPaletteColors(config.palettePreset);

  // Animation and cursor loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimFrame((prev) => (prev + 1) % 1000);
      setCursorVisible((prev) => !prev);
    }, 320);

    return () => clearInterval(timer);
  }, []);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions: VIC-II with border is 384 x 272 (Border: 32px horizontal, 36px vertical)
    const width = 384;
    const height = 272;
    canvas.width = width;
    canvas.height = height;

    const borderColor = colors[romData.meta.defaultBorderColor]?.hex || '#000000';
    const bgColor = colors[romData.meta.defaultBgColor]?.hex || '#0000AA';

    if (activeView === 'dos') {
      // Draw MS-DOS Boot Screen
      drawDosBootScreen(ctx, width, height, romData, config, animFrame);
    } else {
      // Draw VIC-II Screen
      drawVicScreen(ctx, width, height, romData, colors, borderColor, bgColor, cursorVisible, animFrame);
    }
  }, [romData, config, activeView, animFrame, cursorVisible, colors]);

  const handleDownloadScreenshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${romData.meta.filename.replace(/\.[^/.]+$/, '')}_preview.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 flex flex-col">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-rose-400" />
          <h2 className="text-sm font-semibold text-neutral-100 font-mono">
            {activeView === 'screen'
              ? 'VIC-II Authentic Display Pipeline (320x200 Mode 13h)'
              : 'MS-DOS 16-Bit Real Mode Execution Environment'}
          </h2>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 p-0.5 bg-neutral-950 border border-neutral-800 rounded">
          <button
            onClick={() => onChangeView('screen')}
            className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
              activeView === 'screen'
                ? 'bg-neutral-800 text-neutral-100 font-medium'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            VIC-II CRT Screen
          </button>
          <button
            onClick={() => onChangeView('dos')}
            className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
              activeView === 'dos'
                ? 'bg-neutral-800 text-neutral-100 font-medium'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            MS-DOS Boot Prompt
          </button>
        </div>
      </div>

      {/* Screen Container with CRT Bezel */}
      <div className="relative mx-auto w-full max-w-3xl aspect-[384/272] bg-black rounded-lg overflow-hidden border-2 border-neutral-800 shadow-2xl flex items-center justify-center group">
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain image-rendering-pixelated"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Scanline Overlay */}
        {config.scanlines !== 'none' && (
          <div
            className={`absolute inset-0 pointer-events-none ${
              config.scanlines === 'subtle'
                ? 'opacity-20'
                : config.scanlines === 'heavy'
                ? 'opacity-55'
                : 'opacity-35'
            }`}
            style={{
              backgroundImage:
                'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.75) 50%)',
              backgroundSize: '100% 4px',
            }}
          />
        )}

        {/* Subtle Vignette & Curvature Effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.8), inset 0 0 100px rgba(0, 0, 0, 0.5)',
          }}
        />

        {/* Floating Quick Action Overlay */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-neutral-900/90 backdrop-blur-sm border border-neutral-700/60 rounded px-2 py-1 text-xs font-mono text-neutral-300">
          <button
            onClick={handleDownloadScreenshot}
            className="flex items-center gap-1 hover:text-white transition-colors"
            title="Save PNG Frame"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Screenshot</span>
          </button>
        </div>
      </div>

      {/* Bottom Technical Status Bar */}
      <div className="mt-4 pt-3 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-neutral-400">
        <div className="flex items-center gap-2">
          <span>Raster: 312 Lines (PAL 50Hz)</span>
          <span aria-hidden="true">·</span>
          <span>Aspect: 4:3 CRT</span>
          <span aria-hidden="true">·</span>
          <span>Palette: {config.palettePreset.toUpperCase()}</span>
        </div>

        <div className="flex items-center gap-2">
          <span>VGA Port 3C8h: OK</span>
          <span aria-hidden="true">·</span>
          <span>DSP 220h: Mounted</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Draws the authentic Commodore 64 VIC-II display
 */
function drawVicScreen(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  romData: C64RomData,
  colors: { hex: string }[],
  borderColor: string,
  bgColor: string,
  cursorVisible: boolean,
  animFrame: number
) {
  // 1. Draw Border (Overscan 384x272)
  ctx.fillStyle = borderColor;
  ctx.fillRect(0, 0, width, height);

  // 2. Draw 320x200 Main Screen Area (32px left/right, 36px top/bottom)
  const screenX = 32;
  const screenY = 36;
  const screenW = 320;
  const screenH = 200;

  ctx.fillStyle = bgColor;
  ctx.fillRect(screenX, screenY, screenW, screenH);

  // Character cell is 8x8 pixels (40 columns x 25 rows = 320x200)
  const chars = romData.screenChars;
  const cols = romData.screenColors;

  if (chars && cols) {
    ctx.font = '8px "IBM Plex Mono", monospace';
    ctx.textBaseline = 'top';

    for (let r = 0; r < 25; r++) {
      for (let c = 0; c < 40; c++) {
        const charCode = chars[r][c];
        const colorIdx = cols[r][c];
        const charColor = colors[colorIdx]?.hex || '#FFFFFF';

        const px = screenX + c * 8;
        const py = screenY + r * 8;

        if (charCode === 32) {
          // Space
          continue;
        } else if (charCode === 160) {
          // Cursor block (blinking)
          if (cursorVisible) {
            ctx.fillStyle = charColor;
            ctx.fillRect(px, py, 8, 8);
          }
        } else {
          // Regular PETSCII / ASCII character
          const str = String.fromCharCode(charCode);
          ctx.fillStyle = charColor;
          ctx.fillText(str, px, py - 1);
        }
      }
    }
  }

  // Dynamic animations for specific demo ROMs
  if (romData.meta.id === 'cyber-sid') {
    // Dynamic raster color bars at bottom
    const rasterY = screenY + 160;
    for (let i = 0; i < 8; i++) {
      const colIdx = ((animFrame + i) % 15) + 1;
      ctx.fillStyle = colors[colIdx]?.hex || '#FF00FF';
      ctx.fillRect(screenX, rasterY + i * 2, screenW, 2);
    }
  } else if (romData.meta.id === 'turbo-racer') {
    // Road animation stripes
    const curbOffset = (animFrame * 2) % 16;
    ctx.fillStyle = curbOffset > 8 ? '#FF0000' : '#FFFFFF';
    ctx.fillRect(screenX + 80, screenY + 120, 8, 12);
  }
}

/**
 * Draws the authentic MS-DOS boot prompt and execution log
 */
function drawDosBootScreen(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  romData: C64RomData,
  config: MzHeaderConfig,
  animFrame: number
) {
  // Pure Black MS-DOS Screen
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#AAAAAA'; // MS-DOS Standard Grey
  ctx.font = '9px "IBM Plex Mono", monospace';
  ctx.textBaseline = 'top';

  const exeName = romData.meta.filename.replace(/\.[^/.]+$/, '').toUpperCase() + '.EXE';
  const sbPort = '0x' + config.soundBlasterPort.toString(16).toUpperCase();

  const lines = [
    'MS-DOS Version 6.22 (C)Copyright Microsoft Corp 1981-1994.',
    'HIMEM: DOS XMS Driver 3.09 Installed (15,360K High Memory)',
    '',
    `C:\\GAMES\\C64> DIR ${exeName}`,
    ` Volume in drive C has no label`,
    ` Directory of C:\\GAMES\\C64`,
    '',
    `${exeName.padEnd(12, ' ')}  ${romData.meta.sizeBytes.toString().padStart(6, ' ')}  10-07-26   7:02p`,
    '         1 file(s)      4,288 bytes',
    '         0 dir(s)  14,520,320 bytes free',
    '',
    `C:\\GAMES\\C64> ${exeName}`,
    '-------------------------------------------------------',
    'C64-TO-MSDOS RUNTIME LOADER v2.4 (MZ EXEC BRIDGE)',
    '  * VGA Mode 13h (320x200 256c) Initialized via INT 10h',
    `  * Loaded 16-Color DAC Table [${config.palettePreset.toUpperCase()}] to Port 3C8h/3C9h`,
    `  * SB16 DSP Detected at Port ${sbPort} IRQ ${config.soundBlasterIrq} DMA ${config.soundBlasterDma}`,
    `  * Emulating MOS ${config.sidModel} 3-Voice Synthesizer (44.1 kHz)`,
    `  * Jumping to Payload Entry Vector: $${romData.meta.loadAddress.toString(16).toUpperCase()}`,
    '-------------------------------------------------------',
    animFrame % 2 === 0 ? 'STATUS: EXECUTING PAYLOAD... _' : 'STATUS: EXECUTING PAYLOAD...',
  ];

  let y = 14;
  lines.forEach((line) => {
    if (line.startsWith('C:\\GAMES\\C64>') || line.startsWith('STATUS:')) {
      ctx.fillStyle = '#FFFFFF'; // Bright white
    } else if (line.includes('[') && line.includes(']')) {
      ctx.fillStyle = '#55FF55'; // DOS light green
    } else {
      ctx.fillStyle = '#AAAAAA'; // DOS standard grey
    }
    ctx.fillText(line, 14, y);
    y += 12;
  });
}
