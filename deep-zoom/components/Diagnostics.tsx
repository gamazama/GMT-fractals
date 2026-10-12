/**
 * deep-zoom/components/Diagnostics.tsx - the Diagnostics tab: the renderer's developer levers, and
 * what it is doing now. For kernel work. Shown in Advanced mode only (deep-zoom/panels.ts,
 * `showIf: 'advancedMode'`; the Settings row and the backtick key switch it).
 *
 * WHAT IT IS, AND IS NOT
 *   ONE registered widget (`dz-diagnostics`, main.tsx) that talks to the HOST and to nothing else:
 *   `host.diagnostics()` to read, `host.setLevers(patch)` to set, and the telemetry store beside
 *   the host for the numbers that are already there. NO STORE STATE: a lever is not a param. It is
 *   in no scene, no share link, no session and no undo step, and a reload - or a fresh renderer
 *   after a lost context - stands at the shell's own values again (`shellOptions` in
 *   deep-zoom/host/moduleHost.ts). That is the point of the tab (plans' decision D7): the levers
 *   stay reachable for measuring without becoming things a scene can hold.
 *
 * THE ROWS, from the top
 *   Now       which path draws, the state of the Mandelbulb's program and of the selected formula's,
 *             the size drawn, the iterations in force, the still's progress, how long each program
 *             took to build, and the accuracy gate's last reading (pass under 1e-3).
 *   Levers    Accuracy gate (the renderer checks one pixel against a CPU referee twice a second
 *             while a still gathers; it is ON in the renderer from the start, and this is the only
 *             switch for it); Path (Deep is the shell's; Auto draws the plain single-precision
 *             picture while shallower than 1e-4; Plain always); Rebase to the origin; Far hand-off.
 *   Ray march the Mandelbulb's program: its three bits as switches (step by the ray estimate, test
 *             a hit by it, resume orbits along the ray) and its six numbers. They do nothing while
 *             the Mandelbox is drawn - its program is another - and say so.
 *   Reset     every lever back to what this renderer started with.
 *
 * NOT HERE (each named in the plan's list of levers, none on the renderer's typed surface today)
 *   - The skip table's tolerance: the skip table (BLA) is gone from the renderer (2026-10-11).
 *   - The four guide values, the bisection caps, the normal-tap cap, force rebuild, the frame
 *     divisor and the old march's step table: the renderer still has a handle for each (grep
 *     `api.setGuide`, `api.setBisect`, `api.setNormalIters`, `api.forceRebuild`, `api.setDiv`,
 *     `api.setMarch` in renderer/core.js), typed nowhere - they sit behind `DeepZoomApi`'s index
 *     signature. Which of them still act on the ray march's program was not established. Typing
 *     them, and saying which are dead, is the renderer's package.
 *   - Step size, Resolution cap, Hit refine, Normal detail and the compare divider ARE levers of
 *     that list and are ordinary params of this app: Quality's advanced rows and Inspect.
 *
 * PITFALLS
 *   - NOTHING HERE MAY WRITE EVERY FRAME. The read-back is asked twice a second and the component
 *     renders only when an answer differs from the last (compared as text).
 *   - "What this renderer started with" is read the first time this file sees a host, and kept by
 *     host. The levers are set from here and nowhere else, so that first sight is the start.
 *   - With the ray march's bits at 0 the renderer's iteration ceiling is 160 again and its count no
 *     longer follows the Formula tab above that. The row says so; Reset puts it back.
 *
 * @assumption The tab is in the right dock in Advanced mode and gone without it; every lever reads
 *   back what was set, moves no store value and leaves no undo step; Reset puts all of them back -
 *   seen in the app on 2026-10-12 (debug/scratch/shell-leftovers/diagnostics.mts, git-ignored).
 *   That the host hands each lever to the renderer's own setter has a standing check (the
 *   "levers: ..." lines of `npx tsx debug/deep-zoom-checks/module-host.mts`); this component has none.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { BaseSlider } from '../../components/Slider';
import { GenericToggleSwitch } from '../../components/GenericToggleSwitch';
import { SectionLabel } from '../../components/SectionLabel';
import { createLogMapping } from '../../components/inputs/primitives/FormatUtils';
import { useHost } from '../host/current';
import { useDzTelemetry } from '../host/telemetry';
import type { DeepZoomHost, DzDiagnostics, DzLeverPatch, DzLevers, DzRayLevers } from '../host/DeepZoomHost';

const ROW = 'flex items-baseline justify-between gap-3 px-3 py-0.5 text-[10px] text-fg-tertiary';
const VALUE = 'font-mono tabular-nums text-fg-secondary text-right';
const NOTE = 'px-3 pt-1 pb-1 text-[10px] leading-snug text-fg-faint';

/** How often the read-back is asked. */
const ASK_MS = 500;
const FAR_HAND_OFF = { min: 1e-3, max: 12 };
const FAR_SCALE = createLogMapping(FAR_HAND_OFF.min, FAR_HAND_OFF.max, { reserveZero: false });
const HIT_SCALE = createLogMapping(4, 1024, { reserveZero: false });
const PATHS: Array<{ label: string; value: DzLevers['mode']; tooltip: string }> = [
    { label: 'Auto', value: 'auto', tooltip: 'The plain single-precision picture while shallower than 1e-4, the deep path below' },
    { label: 'Deep', value: 'deep', tooltip: 'The deep path at every depth: what the app runs' },
    { label: 'Plain', value: 'f32', tooltip: 'The plain single-precision picture always: no deep zoom' },
];
/** The ray march's bits (grep THE RAY ESTIMATE AND RAY-COHERENT ORBITS in renderer/core.js). */
const RAY_BITS: Array<{ bit: number; label: string }> = [
    { bit: 1, label: 'Step by the ray estimate' },
    { bit: 2, label: 'Test a hit by it' },
    { bit: 4, label: 'Resume orbits along the ray' },
];
/** The ray march's numbers: the range of each row. `min` above 0 where the renderer ignores a 0. */
const RAY_NUMBERS: Array<{ key: Exclude<keyof DzRayLevers, 'bits'>; label: string; min: number; max: number; step: number; log?: boolean; title: string }> = [
    { key: 'factor', label: 'Step factor', min: 0.1, max: 1, step: 0.05, title: 'The step as a share of the ray estimate. 1 is what the app runs.' },
    { key: 'hit', label: 'Hit level (pixel /)', min: 4, max: 1024, step: 1, log: true, title: 'With "Test a hit by it": a ray has hit once the estimate is under a display pixel divided by this.' },
    { key: 'tol', label: 'Resume tolerance (px)', min: 0, max: 1, step: 0.01, title: 'With "Resume orbits": how far, in display pixels, a resumed orbit\'s point may stand from the true one.' },
    { key: 'floor', label: 'Hit floor (pixel /)', min: 0, max: 2048, step: 1, title: 'Without "Test a hit by it": also a hit once the ray estimate is under a display pixel divided by this. 0: none.' },
    { key: 'line', label: 'Line allowance', min: 0, max: 8, step: 0.25, title: 'The line against the ball: the longer step it allows is taken, with this multiple of the bend measure as its allowance. 0: off.' },
    { key: 'detail', label: 'Detail override (pixel /)', min: 0, max: 256, step: 1, title: 'Above 0: the hit level is a display pixel divided by this, whatever the Detail setting says.' },
];

/** What each host started with (see PITFALLS). */
const started = new WeakMap<DeepZoomHost, DzLevers>();

const seconds = (ms: number): string => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`);
const PROGRAM_NAMES: Record<string, string> = { S: 'shading', PR: 'Mandelbulb', X: 'Mandelbox', K: 'KaliBox', PTR: 'Mandelbulb probe', XT: 'Mandelbox probe', KT: 'KaliBox probe' };

const Readout: React.FC<{ label: string; id: string; children: React.ReactNode }> = ({ label, id, children }) => (
    <div className={ROW}>
        <span>{label}</span>
        <span data-dz-diag={id} className={VALUE}>{children}</span>
    </div>
);

export const Diagnostics: React.FC = () => {
    const host = useHost();
    const live = useDzTelemetry((t) => t.live);
    const path = useDzTelemetry((t) => t.mode);
    const frameW = useDzTelemetry((t) => t.frameW);
    const frameH = useDzTelemetry((t) => t.frameH);
    const iters = useDzTelemetry((t) => t.iters);
    const accumN = useDzTelemetry((t) => t.accumN);
    const accumMax = useDzTelemetry((t) => t.accumMax);
    // The read-back as text: the component renders only when it differs (see PITFALLS).
    const [answer, setAnswer] = useState('');

    const ask = useCallback((): void => {
        if (!host) { setAnswer(''); return; }
        const now = host.diagnostics();
        if (!started.has(host)) started.set(host, now.levers);
        setAnswer(JSON.stringify(now));
    }, [host]);
    useEffect(() => {
        ask();
        const timer = window.setInterval(ask, ASK_MS);
        return () => window.clearInterval(timer);
    }, [ask]);

    if (!host || !answer) {
        return <div data-dz-diagnostics className="p-3 text-[10px] text-fg-faint italic">No renderer is mounted.</div>;
    }
    const now = JSON.parse(answer) as DzDiagnostics;
    const levers = now.levers;
    const set = (patch: DzLeverPatch): void => { host.setLevers(patch); ask(); };
    const reset = (): void => { const first = started.get(host); if (first) set(first); };
    const box = now.rayMarch === 'off' && levers.ray.bits !== 0;   // the Mandelbox or KaliBox is drawn: the ray march is the bulb's
    const built = Object.entries(now.compileMs).map(([key, ms]) => `${PROGRAM_NAMES[key] ?? key} ${seconds(ms)}`).join(', ');
    const gate = !levers.gate ? 'off' : !now.gate ? 'no reading yet' : `${now.gate.relT.toExponential(1)} ${now.gate.relT < 1e-3 ? 'pass' : 'MISMATCH'}`;

    return (
        <div data-dz-diagnostics className="flex flex-col pb-2">
            <div className="px-2 pt-2"><SectionLabel>Now</SectionLabel></div>
            <Readout label="Path" id="path">{!live ? '-' : path === 'deep' ? 'deep' : 'plain (single precision)'}</Readout>
            <Readout label="Mandelbulb program" id="ray">{now.rayMarch}</Readout>
            <Readout label="Selected formula's program" id="formula">{now.formula}</Readout>
            <Readout label="Drawn" id="frame">{live ? `${frameW} x ${frameH}` : '-'}</Readout>
            <Readout label="Iterations in force" id="iters">{live ? iters : '-'}</Readout>
            <Readout label="Still" id="still">{live ? `${accumN} of ${accumMax}` : '-'}</Readout>
            <Readout label="Built in" id="built">{built || '-'}</Readout>
            <Readout label="Accuracy gate" id="gate">{gate}</Readout>
            {levers.gate && now.gate && (
                <div className={NOTE} title="The distance one pixel of the picture found, against an independent march on the CPU">
                    GPU <span className="font-mono">{now.gate.gpu.toExponential(3)}</span> against CPU <span className="font-mono">{now.gate.cpu.toExponential(3)}</span>
                </div>
            )}

            <div className="px-2 pt-3"><SectionLabel>Levers</SectionLabel></div>
            <div className={NOTE}>Not saved, not undone: a reload puts every lever back.</div>
            <div data-dz-lever="gate" title="Twice a second while a still gathers, one pixel is read back and held against a CPU referee. Off for the smoothest flying.">
                <GenericToggleSwitch label="Accuracy gate" value={levers.gate} onChange={(v: boolean) => set({ gate: v })} />
            </div>
            <div data-dz-lever="mode">
                <GenericToggleSwitch label="Path" value={levers.mode} options={PATHS} onChange={(v: DzLevers['mode']) => set({ mode: v })} />
            </div>
            <div data-dz-lever="rebaseOrigin" title="The kernel's precision repair: a rebased orbit is carried onto the origin. Off is the old kernel, which draws grain where orbits pass the origin.">
                <GenericToggleSwitch label="Rebase to the origin" value={levers.rebaseOrigin} onChange={(v: boolean) => set({ rebaseOrigin: v })} />
            </div>
            <div data-dz-lever="farHandOff" title="How far the deep march carries a ray before the plain far-field march takes it. The app runs 0.5; 0.001 is the old page.">
                <BaseSlider
                    label="Far hand-off"
                    value={levers.farHandOff}
                    min={FAR_HAND_OFF.min}
                    max={FAR_HAND_OFF.max}
                    step={1}
                    mapping={FAR_SCALE}
                    overrideText={levers.farHandOff.toPrecision(3)}
                    onChange={(v) => set({ farHandOff: v })}
                />
            </div>

            <div className="px-2 pt-3"><SectionLabel>Ray march (Mandelbulb)</SectionLabel></div>
            {box && <div data-dz-diag="ray-idle" className={NOTE}>This formula is drawn by its own program: these act when the Mandelbulb is selected.</div>}
            {levers.ray.bits === 0 && <div data-dz-diag="ray-zero" className={NOTE}>All three off: the old step rule marches, and iterations stop at 160 whatever the Formula tab says.</div>}
            {RAY_BITS.map(({ bit, label }) => (
                <div key={bit} data-dz-lever={`ray-bit-${bit}`}>
                    <GenericToggleSwitch
                        label={label}
                        value={(levers.ray.bits & bit) !== 0}
                        onChange={(v: boolean) => set({ ray: { bits: v ? levers.ray.bits | bit : levers.ray.bits & ~bit } })}
                    />
                </div>
            ))}
            {RAY_NUMBERS.map((row) => (
                <div key={row.key} data-dz-lever={`ray-${row.key}`} title={row.title}>
                    <BaseSlider
                        label={row.label}
                        value={levers.ray[row.key]}
                        min={row.min}
                        max={row.max}
                        step={row.log ? 1 : row.step}
                        mapping={row.log ? HIT_SCALE : undefined}
                        overrideText={row.log ? String(Math.round(levers.ray[row.key])) : undefined}
                        onChange={(v) => set({ ray: { [row.key]: row.log ? Math.round(v) : v } })}
                    />
                </div>
            ))}

            <div className="px-2 pt-3">
                <button
                    type="button"
                    data-dz-lever-reset
                    onClick={reset}
                    title="Every lever back to what this renderer started with"
                    className="w-full h-6 rounded border border-line/20 text-[9px] font-semibold text-fg-secondary hover:text-fg hover:border-line/40"
                >
                    Reset levers
                </button>
            </div>
        </div>
    );
};
