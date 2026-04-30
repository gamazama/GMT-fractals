export { calcEtaRange } from '../../../components/timeline/exportHelpers';

/** Format seconds into human-readable time with units (e.g. "5s", "2m 30s", "1h 15m") */
export const formatTimeWithUnits = (secs: number) => {
    if (!isFinite(secs) || secs < 0) return "--";

    if (secs < 60) return `${secs.toFixed(0)}s`;

    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);

    if (m < 60) return `${m}m ${s}s`;

    const h = Math.floor(m / 60);
    const remM = m % 60;
    return `${h}h ${remM}m`;
};

/** Format milliseconds into human-readable duration (e.g. "250ms", "1.5s", "2m 30s") */
export const formatDurationMs = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    const secs = ms / 1000;
    if (secs < 60) return `${secs.toFixed(1)}s`;
    return formatTimeWithUnits(secs);
};
