
import React, { useRef, useState } from 'react';
import { DraggableNumber } from './Slider';
import { useFractalStore } from '../store/fractalStore';

interface Vector2PadProps {
  label: string;
  valueX: number;
  valueY: number;
  onChange: (x: number, y: number) => void;
  min: number;
  max: number;
}

const Vector2Pad: React.FC<Vector2PadProps> = ({ label, valueX, valueY, onChange, min, max }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { handleInteractionStart, handleInteractionEnd } = useFractalStore();

  // Normalize value to 0-1 range for display
  const toPercent = (val: number) => ((val - min) / (max - min)) * 100;
  
  // Normalize mouse pos to value range
  const fromPercent = (pct: number) => min + (pct / 100) * (max - min);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    handleInteractionStart('param');
    setIsDragging(true);
    (e.target as Element).setPointerCapture(e.pointerId);
    updateFromPointer(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updateFromPointer(e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
        setIsDragging(false);
        (e.target as Element).releasePointerCapture(e.pointerId);
        handleInteractionEnd();
    }
  };

  const updateFromPointer = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    
    // Invert Y for UI intuition (Up is positive Y usually in 3D, but screen coords Y is down)
    const calculatedYPct = 100 - yPct;

    const newX = fromPercent(xPct);
    const newY = fromPercent(calculatedYPct);
    
    onChange(newX, newY);
  };

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs text-gray-400 font-medium">{label}</label>
        <div className="flex gap-1 w-32 h-5">
            <div className="flex-1 bg-black/40 rounded border border-white/10 relative overflow-hidden">
                <DraggableNumber 
                    value={valueX} 
                    onChange={(v) => onChange(v, valueY)} 
                    step={0.01} 
                    highlight 
                />
            </div>
            <div className="flex-1 bg-black/40 rounded border border-white/10 relative overflow-hidden">
                <DraggableNumber 
                    value={valueY} 
                    onChange={(v) => onChange(valueX, v)} 
                    step={0.01} 
                    highlight 
                />
            </div>
        </div>
      </div>
      <div 
        ref={containerRef}
        className="w-full h-24 bg-gray-900 border border-gray-700 rounded relative cursor-crosshair touch-none overflow-hidden hover:border-gray-500 transition-colors"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Grid lines */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-800 pointer-events-none" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-800 pointer-events-none" />

        {/* Cursor */}
        <div 
          className={`absolute w-3 h-3 border-2 border-white rounded-full -ml-1.5 -mt-1.5 shadow-md pointer-events-none transition-transform ${isDragging ? 'scale-125 bg-cyan-500' : 'bg-transparent'}`}
          style={{ 
            left: `${toPercent(valueX)}%`, 
            top: `${100 - toPercent(valueY)}%` 
          }}
        />
      </div>
    </div>
  );
};

export default Vector2Pad;
