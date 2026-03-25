// BoundsPanel.tsx — Bounding box center/size controls using GMT VectorInput
import React from 'react';
import { useMeshExportStore } from '../store/meshExportStore';
import { VectorInput } from '../../components/inputs/VectorInput';
import { GenericToggleSwitch } from '../../components/GenericToggleSwitch';

export function BoundsPanel() {
  const center = useMeshExportStore((s) => s.bboxCenter);
  const size = useMeshExportStore((s) => s.bboxSize);
  const lock = useMeshExportStore((s) => s.bboxLock);
  const setBboxCenter = useMeshExportStore((s) => s.setBboxCenter);
  const setBboxSize = useMeshExportStore((s) => s.setBboxSize);
  const setBboxLock = useMeshExportStore((s) => s.setBboxLock);
  const resetBounds = useMeshExportStore((s) => s.resetBounds);

  const handleCenterChange = (v: { x: number; y: number; z?: number }) => {
    setBboxCenter([v.x, v.y, v.z ?? 0]);
  };

  const handleSizeChange = (v: { x: number; y: number; z?: number }) => {
    if (lock) {
      // When locked, use the axis that changed (compare to current)
      const dx = Math.abs(v.x - size[0]);
      const dy = Math.abs(v.y - size[1]);
      const dz = Math.abs((v.z ?? size[2]) - size[2]);
      const newVal = dx > 0.001 ? v.x : dy > 0.001 ? v.y : (v.z ?? size[2]);
      setBboxSize([newVal, newVal, newVal]);
    } else {
      setBboxSize([v.x, v.y, v.z ?? size[2]]);
    }
  };

  return (
    <div className="flex flex-col gap-px mt-1">
      <VectorInput
        label="Center"
        value={{ x: center[0], y: center[1], z: center[2] }}
        onChange={handleCenterChange}
        axisConfig={{ min: -100, max: 100, step: 0.1 }}
      />

      <VectorInput
        label="Size"
        value={{ x: size[0], y: size[1], z: size[2] }}
        onChange={handleSizeChange}
        axisConfig={{ min: 0.1, max: 100, step: 0.1 }}
      />

      <GenericToggleSwitch
        label="Lock Axes"
        value={lock}
        onChange={setBboxLock}
      />

      {/* Reset + info */}
      <div className="flex items-center gap-2 mt-1 px-0.5">
        <button
          onClick={resetBounds}
          className="text-[10px] px-2 py-0.5 bg-white/10 text-gray-300 border border-white/10 rounded-sm hover:bg-white/15 cursor-pointer"
        >
          Reset
        </button>
        <span className="text-[10px] text-gray-600">
          {size[0].toFixed(1)} × {size[1].toFixed(1)} × {size[2].toFixed(1)}
        </span>
      </div>
    </div>
  );
}
