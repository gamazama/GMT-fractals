/**
 * Floating perf-test panel for the deep-zoom kernel. Mounts beside
 * DeepZoomStatus when deepZoom is enabled. One click runs the full
 * benchmark matrix (~12 cases × ~1.5s warmup + 30-frame sample = ~40s
 * total), displays a results table, and prints a markdown copy to
 * console for easy paste-back.
 *
 * Constraint: this component imports useEngineStore — same boot-order
 * trap as DeepZoomStatus, so it's mounted directly in FluidToyApp's
 * tree (after the store is constructed) rather than via componentRegistry.
 */

import React, { useState } from 'react';
import { useEngineStore } from '../../store/engineStore';
import {
    runBenchmark,
    DEFAULT_BENCH_CASES,
    formatResultsAsMarkdown,
    computeSpeedups,
    type BenchmarkResult,
    type BenchmarkCase,
} from '../deepZoom/benchmark';
import type { FluidEngine } from '../fluid/FluidEngine';

interface Props {
    engineRef: React.RefObject<FluidEngine | null>;
}

const cellStyle: React.CSSProperties = {
    padding: '2px 6px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    whiteSpace: 'nowrap',
};

const headerStyle: React.CSSProperties = {
    ...cellStyle,
    fontWeight: 600,
    color: '#cbd5e1',
    borderBottom: '1px solid rgba(255,255,255,0.2)',
};

export const DeepZoomBench: React.FC<Props> = ({ engineRef }) => {
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState({ i: 0, total: 0, name: '' });
    const [results, setResults] = useState<BenchmarkResult[] | null>(null);

    const onClick = async (): Promise<void> => {
        const engine = engineRef.current;
        if (!engine || running) return;
        setRunning(true);
        setResults(null);
        try {
            const r = await runBenchmark(
                engine,
                useEngineStore,
                DEFAULT_BENCH_CASES,
                (i, total, current: BenchmarkCase) => {
                    setProgress({ i, total, name: current.name });
                },
            );
            setResults(r);
            // Mirror to console — easy paste-back.
            const md = formatResultsAsMarkdown(r);
            const speedups = computeSpeedups(r);
            console.log('[deepZoom bench]\n' + md);
            if (speedups.length > 0) console.log('[deepZoom bench]\n' + speedups.join('\n'));
        } finally {
            setRunning(false);
        }
    };

    return (
        <div style={{
            fontSize: '10.5px',
            lineHeight: '1.5',
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            color: '#9ca3af',
            padding: '6px 8px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '4px',
            margin: '4px 0',
            pointerEvents: 'auto',
            maxWidth: 480,
        }}>
            <button
                onClick={() => { void onClick(); }}
                disabled={running || engineRef.current === null}
                style={{
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    padding: '4px 10px',
                    background: running ? '#444' : '#1f6feb',
                    color: 'white',
                    border: 'none',
                    borderRadius: 3,
                    cursor: running ? 'wait' : 'pointer',
                }}
            >
                {running
                    ? `Running ${progress.i + 1}/${progress.total}: ${progress.name}`
                    : 'Run perf benchmark'}
            </button>

            {results && (
                <div style={{ marginTop: 8, overflow: 'auto', maxHeight: 320 }}>
                    <table style={{ borderCollapse: 'collapse', fontSize: '10.5px' }}>
                        <thead>
                            <tr>
                                <th style={headerStyle}>Case</th>
                                <th style={headerStyle}>Iter</th>
                                <th style={headerStyle}>D</th>
                                <th style={headerStyle}>LA</th>
                                <th style={headerStyle}>AT</th>
                                <th style={headerStyle}>ms (med)</th>
                                <th style={headerStyle}>min</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r, i) => (
                                <tr key={i}>
                                    <td style={cellStyle}>{r.name}</td>
                                    <td style={cellStyle}>{r.iter}</td>
                                    <td style={cellStyle}>{r.deep ? '✓' : ''}</td>
                                    <td style={cellStyle}>{r.useLA ? '✓' : ''}</td>
                                    <td style={cellStyle}>{r.useAT ? '✓' : ''}</td>
                                    <td style={{ ...cellStyle, color: '#e5e7eb', textAlign: 'right' }}>
                                        {r.timerOk ? r.juliaMs.toFixed(2) : '—'}
                                    </td>
                                    <td style={{ ...cellStyle, textAlign: 'right' }}>
                                        {r.timerOk ? r.juliaMsMin.toFixed(2) : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div style={{ marginTop: 4, color: '#94a3b8' }}>
                        {results.some((r) => !r.timerOk)
                            ? '(— = GPU timer unavailable on this device)'
                            : 'Open devtools console for markdown + speedup ratios.'}
                    </div>
                </div>
            )}
        </div>
    );
};
