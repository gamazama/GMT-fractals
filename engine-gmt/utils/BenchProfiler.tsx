/**
 * BenchProfiler — wraps React.Profiler only when the perf bench is active.
 *
 * `debug/bench-perf.mts` injects `window.__bench.onRender` at page-init
 * time (before React mounts). When present, this component wraps its
 * children in a `<Profiler>` and pipes commit metrics into the bench's
 * per-id bucket. When absent, it renders children without a wrapper —
 * zero runtime overhead for normal users.
 *
 * The check happens at render time (not module-init) so the bench's
 * init-script can install `__bench` after this module is imported but
 * before AppGmt renders.
 */
import React, { Profiler, type ProfilerOnRenderCallback } from 'react';

interface BenchProfilerProps {
    id: string;
    children: React.ReactNode;
}

const getOnRender = (): ProfilerOnRenderCallback | undefined => {
    if (typeof window === 'undefined') return undefined;
    return (window as any).__bench?.onRender;
};

export const BenchProfiler: React.FC<BenchProfilerProps> = ({ id, children }) => {
    const onRender = getOnRender();
    if (!onRender) return <>{children}</>;
    return <Profiler id={id} onRender={onRender}>{children}</Profiler>;
};
