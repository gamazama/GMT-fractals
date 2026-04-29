import React, { useRef, useEffect } from 'react';
import { useMeshExportStore } from '../store/meshExportStore';

const LOG_COLORS: Record<string, string> = {
  info: 'text-gray-400',
  phase: 'text-emerald-400 font-bold',
  data: 'text-sky-400',
  warn: 'text-amber-400',
  error: 'text-red-400 font-bold',
  success: 'text-emerald-400',
  mem: 'text-pink-300',
};

export const ProgressPanel: React.FC = () => {
  const status = useMeshExportStore((s) => s.status);
  const progress = useMeshExportStore((s) => s.progress);
  const phaseName = useMeshExportStore((s) => s.phaseName);
  const phaseProgress = useMeshExportStore((s) => s.phaseProgress);
  const memoryBlocks = useMeshExportStore((s) => s.memoryBlocks);
  const logEntries = useMeshExportStore((s) => s.logEntries);
  const clearLog = useMeshExportStore((s) => s.clearLog);
  const lastMesh = useMeshExportStore((s) => s.lastMesh);
  const lastTimings = useMeshExportStore((s) => s.lastTimings);
  const smoothingSkipped = useMeshExportStore((s) => s.smoothingSkipped);
  const useNarrowBand = useMeshExportStore((s) => s.useNarrowBand);
  const resolution = useMeshExportStore((s) => s.resolution);
  const newton = useMeshExportStore((s) => s.newton);
  const isRunning = useMeshExportStore((s) => s.isRunning);

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logEntries.length]);

  const totalMB = memoryBlocks.reduce((sum, b) => sum + (b.freed ? 0 : b.mb), 0);
  const maxBlock = Math.max(1, ...memoryBlocks.map((b) => b.mb));

  const handleCopyLog = () => {
    const text = logEntries.map((e) => `[${e.time}] ${e.msg}`).join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="font-mono flex flex-col gap-2">
      {/* Status */}
      {status && (
        <div className="text-[13px] text-amber-400 font-bold">{status}</div>
      )}

      {/* Main progress */}
      <div className="h-1 bg-gray-800 rounded overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-700 to-emerald-400 transition-[width] duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      {/* Phase */}
      {phaseName && <div className="text-[11px] text-gray-500">{phaseName}</div>}
      <div className="h-[3px] bg-gray-800 rounded overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-sky-700 to-sky-400 transition-[width] duration-300"
          style={{ width: `${Math.min(100, Math.max(0, phaseProgress))}%` }}
        />
      </div>

      {/* Mesh info summary (after generation) */}
      {lastMesh && lastTimings && !isRunning && (
        <div className="text-[11px] leading-relaxed bg-black/40 border border-white/10 rounded px-2 py-1.5">
          <span className="text-emerald-400">
            {resolution}³ · {lastMesh.vertexCount.toLocaleString()} vertices · {lastMesh.faceCount.toLocaleString()} faces
          </span>
          {' · '}
          <span className="text-sky-400">
            {Math.round((lastMesh.positions.byteLength + lastMesh.normals.byteLength + lastMesh.indices.byteLength) / (1024 * 1024))} MB mesh
          </span>
          {newton && <span className="text-gray-400"> · Newton projected</span>}
          {smoothingSkipped && <span className="text-amber-400"> · smoothing skipped (&gt;5M verts)</span>}
          <br />
          <span className="text-gray-500">
            {useNarrowBand
              ? `Coarse: ${(lastTimings.coarse / 1000).toFixed(1)}s · Fine: ${(lastTimings.fine / 1000).toFixed(1)}s`
              : `SDF: ${(lastTimings.sdf / 1000).toFixed(1)}s`}
            {' · '}DC: {(lastTimings.dc / 1000).toFixed(1)}s
            {lastTimings.newton > 100 && ` · Newton: ${(lastTimings.newton / 1000).toFixed(1)}s`}
            {' · '}Post: {(lastTimings.post / 1000).toFixed(1)}s
            {' · '}Color: {(lastTimings.color / 1000).toFixed(1)}s
            {' · '}Total: {(lastTimings.total / 1000).toFixed(1)}s
          </span>
        </div>
      )}

      {/* Memory map */}
      {memoryBlocks.length > 0 && (
        <div>
          <div className="flex gap-px h-[18px] rounded overflow-hidden">
            {memoryBlocks.map((block) => (
              <div
                key={block.id}
                title={`${block.label}: ${block.mb} MB${block.freed ? ' (freed)' : ''}`}
                className="flex items-center justify-center text-[9px] text-black font-bold overflow-hidden whitespace-nowrap rounded-sm transition-opacity"
                style={{
                  flex: Math.max(block.mb / maxBlock, 0.08),
                  background: block.color,
                  opacity: block.freed ? 0.25 : 1,
                }}
              >
                {block.label}
              </div>
            ))}
          </div>
          <div className="text-[10px] text-gray-600 mt-0.5">Memory: {totalMB} MB active</div>
        </div>
      )}

      {/* Log */}
      {logEntries.length > 0 && (
        <div>
          <div className="max-h-[200px] overflow-y-auto bg-black/80 border border-white/10 rounded p-1.5 text-[11px] leading-relaxed">
            {logEntries.map((entry, i) => (
              <div key={i} className={LOG_COLORS[entry.type] || LOG_COLORS.info}>
                <span className="text-gray-600">{entry.time}</span> {entry.msg}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
          <div className="flex gap-1.5 mt-1">
            <button onClick={handleCopyLog} className="text-[10px] px-2 py-0.5 bg-white/10 text-gray-400 border border-white/10 rounded-sm hover:bg-white/15 cursor-pointer">
              Copy
            </button>
            <button onClick={clearLog} className="text-[10px] px-2 py-0.5 bg-white/10 text-gray-400 border border-white/10 rounded-sm hover:bg-white/15 cursor-pointer">
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
