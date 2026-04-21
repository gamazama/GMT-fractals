import React from 'react';
import { SaveIcon, CameraIcon, LoadIcon, UploadIcon } from '../../components/Icons';

interface Props {
  // Status bits (replaces the old absolute status overlay on the canvas)
  kind: 'julia' | 'mandelbrot';
  forceMode: string;
  juliaC: [number, number];
  zoom: number;
  simResolution: number;
  effectiveSimRes: number;
  fps: number;
  orbitOn: boolean;
  paused: boolean;
  // Actions
  onSavePng: () => void;
  onScreenshot: () => void;
  onLoadFile: (file: File) => void;
  onSubmit: () => void;
}

/** Shared GMT-style icon button. Mirrors the classes used in components/topbar/*. */
const btnBase = 'p-2 rounded-lg transition-all active:scale-95 border flex items-center justify-center';
const btnInactive = 'bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/10';

const IconButton: React.FC<{ title: string; onClick: () => void; children: React.ReactNode }> = ({ title, onClick, children }) => (
  <button type="button" onClick={onClick} title={title} className={`${btnBase} ${btnInactive}`}>
    {children}
  </button>
);

export const TopBar: React.FC<Props> = ({
  kind, forceMode, juliaC, zoom, simResolution, effectiveSimRes, fps, orbitOn, paused,
  onSavePng, onScreenshot, onLoadFile, onSubmit,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const onLoadClick = () => fileInputRef.current?.click();
  const onFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onLoadFile(f);
    e.target.value = '';
  };

  const resTag = effectiveSimRes === simResolution
    ? `${simResolution}px`
    : `${effectiveSimRes}px / ${simResolution}`;

  return (
    <div className="h-10 shrink-0 border-b border-white/5 bg-[#0b0b0d] flex items-center px-2 gap-2 text-[11px] font-mono text-gray-300"
         data-testid="top-bar">
      {/* Left: title / back link */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-100 font-sans">Julia Fluid</span>
        <a href="./index.html" className="text-[10px] text-cyan-300 hover:underline font-sans">← GMT</a>
      </div>

      <div className="h-6 w-px bg-white/10 mx-1" />

      {/* Status (inlined into top bar — replaces the canvas overlay) */}
      <div className="flex items-center gap-3 min-w-0" data-testid="status-bar">
        <span>{kind === 'julia' ? 'Julia' : 'Mandelbrot'}</span>
        <span className="text-cyan-300">{forceMode}</span>
        <span className="text-gray-500 whitespace-nowrap" data-testid="status-c">
          c=({juliaC[0].toFixed(3)}, {juliaC[1].toFixed(3)})
        </span>
        <span className="text-gray-500 whitespace-nowrap" data-testid="status-zoom">z={zoom.toFixed(3)}</span>
        <span className={`whitespace-nowrap ${effectiveSimRes < simResolution ? 'text-amber-300' : 'text-gray-500'}`}>{resTag}</span>
        <span className="text-gray-500 whitespace-nowrap" data-testid="status-fps">{fps} fps</span>
        {orbitOn && <span className="text-amber-300">orbit on</span>}
        {paused && <span className="text-red-400">paused</span>}
      </div>

      {/* Right: action icons */}
      <div className="ml-auto flex items-center gap-1">
        <IconButton title="Save scene as PNG (state embedded in metadata)" onClick={onSavePng}><SaveIcon /></IconButton>
        <IconButton title="Screenshot canvas as plain PNG" onClick={onScreenshot}><CameraIcon /></IconButton>
        <IconButton title="Load a saved .png or .json" onClick={onLoadClick}><LoadIcon /></IconButton>
        <div className="h-6 w-px bg-white/10 mx-1" />
        <IconButton title="Submit this preset to the curator" onClick={onSubmit}><UploadIcon /></IconButton>
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.json,image/png,application/json,text/plain"
          onChange={onFileChosen}
          className="hidden"
          aria-label="Load saved state"
        />
      </div>
    </div>
  );
};
