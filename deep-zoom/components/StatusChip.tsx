/**
 * deep-zoom/components/StatusChip.tsx — the top bar's centre: how far the still has gathered, and
 * the programs being built.
 *
 * Registered, never mounted by hand: `topbar.register({ id: 'deep-zoom.status', slot: 'center',
 * order: 0, component: StatusChip })` in deep-zoom/main.tsx.
 *
 * What it shows, and only while a host is drawing (`live`):
 *   - "still 37 / 64" while the still gathers (deep mode, Accumulate on), and nothing once it is
 *     gathered: the picture is then as sharp as it gets, and an empty centre says so (STREAMLINE.md,
 *     stage 4: the chip went from five readings to this one). The other four - the path, the depth,
 *     the iterations, the size drawn - are on the Diagnostics tab (components/Diagnostics.tsx, "Now"),
 *     and the depth is on the picture (DepthReadout.tsx).
 *   - for the 20 or so seconds the ray march's shader takes to build, `ray march: building` (the
 *     owner, 2026-10-09: "the 20s switch on is fine except it needs some indication"). That shader is
 *     the bulb's ONE program since 2026-10-11: until it is there the picture is the plain one and
 *     nothing deep is drawn. There is NO notice for a ray march that could not be built: that is the
 *     app's boot failure (the card of components/BootCard.tsx, with `DZ_RAY_FAILED_TEXT`), the host
 *     is taken down, and this chip is not on screen then.
 *   - the same for the Mandelbox's and KaliBox's programs, a few seconds from the first switch to
 *     that formula (`mandelbox: building`; its plain picture is drawn until it is there), and a line
 *     when one could not be built.
 *
 * Reads the telemetry store beside the host (8 writes a second), never the engine store. The still's
 * text is selected already formatted, so the chip re-renders when it changes, not on every sample.
 */

import React from 'react';
import { useDzTelemetry } from '../host/telemetry';
import { useHost } from '../host/current';

const RAY_BUILDING_TITLE = 'The ray march\'s shader is being built, ten seconds or more the first time. Until it is ready the plain single-precision picture is shown and nothing deep is drawn; then the deep picture comes by itself.';
const BOX_BUILDING_TITLE = 'The Mandelbox\'s renderer is being built, a few seconds the first time. Its plain single-precision picture is drawn until it is ready, then changes by itself.';
const BOX_FAILED_TITLE = 'The Mandelbox\'s renderer could not be built on this machine. Its plain single-precision picture is drawn instead, which runs out of precision a few decades in.';
const KALI_BUILDING_TITLE = 'KaliBox\'s renderer is being built, a few seconds the first time. Its plain single-precision picture is drawn until it is ready, then changes by itself.';
const KALI_FAILED_TITLE = 'KaliBox\'s renderer could not be built on this machine. Its plain single-precision picture is drawn instead, which runs out of precision a few decades in.';

export const StatusChip: React.FC = () => {
    const live = useDzTelemetry((t) => t.live);
    // The ray march's shader: the host's `compile` event with what 'variant' (it is not telemetry). It builds from
    // the moment the host is created and the event is said at the host's first poll, 125 ms on: nothing is missed.
    const host = useHost();
    const [ray, setRay] = React.useState<'compiling' | 'ready' | 'failed'>('ready');
    const [box, setBox] = React.useState<'compiling' | 'ready' | 'failed'>('ready');
    const [kali, setKali] = React.useState<'compiling' | 'ready' | 'failed'>('ready');
    React.useEffect(() => {
        setRay('ready');
        setBox('ready');
        setKali('ready');
        if (!host) return undefined;
        return host.on('compile', (e) => {
            if (e.what !== 'variant') return;
            if (e.variant === 'mandelbox') setBox(e.state); else if (e.variant === 'kalibox') setKali(e.state); else setRay(e.state);
        });
    }, [host]);
    // The still while it gathers, in deep mode only (the plain picture, shown while a deep program builds, does not accumulate).
    const still = useDzTelemetry((t) => (t.mode === 'deep' && t.accumMax > 0 && t.accumN < t.accumMax ? `still ${t.accumN} / ${t.accumMax}` : ''));

    // Before the first sample, and after a host is disposed, the store holds placeholders.
    if (!live) return null;

    return (
        <div data-dz-status className="flex items-center gap-2 text-[10px] font-mono select-none">
            {ray === 'compiling' && (
                <span data-dz-status-ray="building" title={RAY_BUILDING_TITLE} className="px-1.5 py-0.5 rounded border border-line/15 text-fg-secondary">
                    ray march: building
                </span>
            )}
            {box === 'compiling' && (
                <span data-dz-status-box="building" title={BOX_BUILDING_TITLE} className="px-1.5 py-0.5 rounded border border-line/15 text-fg-secondary">
                    mandelbox: building
                </span>
            )}
            {box === 'failed' && (
                <span data-dz-status-box="failed" title={BOX_FAILED_TITLE} className="px-1.5 py-0.5 rounded border border-line/15 text-fg-secondary">
                    mandelbox failed
                </span>
            )}
            {kali === 'compiling' && (
                <span data-dz-status-kali="building" title={KALI_BUILDING_TITLE} className="px-1.5 py-0.5 rounded border border-line/15 text-fg-secondary">
                    kalibox: building
                </span>
            )}
            {kali === 'failed' && (
                <span data-dz-status-kali="failed" title={KALI_FAILED_TITLE} className="px-1.5 py-0.5 rounded border border-line/15 text-fg-secondary">
                    kalibox failed
                </span>
            )}
            {still && <span data-dz-status-still title="The still: samples gathered into the picture while the view is still. It sharpens until the last." className="text-fg-tertiary tabular-nums">{still}</span>}
        </div>
    );
};
