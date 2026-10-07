/**
 * deep-zoom-prototype/ui/LookPanel.tsx — the 'Look' side panel: detail and reach, colour, light, formula.
 *
 * PURPOSE
 *   Every control here is bound to one renderer handle through the bridge. The panel holds no
 *   settings of its own: it reads `bridge.settings()` and `bridge.look()` when it opens and after
 *   each change, so the numbers shown are the renderer's, not a guess.
 *
 * SEAMS
 *   - `useDeepZoom` for the bridge, the live frame size, the path flag and the toast line.
 *   - Ranges for the light sliders are copied from the renderer's own developer panel (grep
 *     `key height` in the core page); the renderer does not publish them.
 *
 * PITFALLS
 *   - Never call the bridge during render. All calls go through `act()` from event handlers, or
 *     from the effect that runs when the bridge arrives.
 *   - Loading a gradient while colour is 'plain' makes the renderer switch to 'orbit-trap' by
 *     itself; the panel re-reads settings after a load so the segmented control follows.
 *   - The renderer's file picker reports only 'image' or 'text', never the file name, and never
 *     answers at all when the picker is cancelled. So no file name is shown.
 *   - 'Reset look' restores the values this panel read the first time it saw the renderer in this
 *     page load (kept in a module variable so closing the panel does not lose them). If the look
 *     was changed with the renderer's keys before the panel was ever opened, those are the values
 *     it returns to.
 *
 * @assumption Detail cost follows about 3.3x at detail 32 (HANDOFF figure), spread evenly per
 *   doubling. It is shown with the word 'about'; nothing measures it here.
 */
import React, { useCallback, useEffect, useState } from 'react';
import type { DzBridge, DzLook, DzSettings } from '../bridge';
import { useDeepZoom } from '../store';
import { Button, Field, PanelFrame, Section, Seg, Slider } from './kit';

/** What 'Reset look' goes back to. Captured once per page load. */
interface Baseline { settings: DzSettings; lookMode: number }
let baseline: Baseline | null = null;

const num = (v: unknown, fallback: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? v : fallback;

/** About 3.3x at 32, 1.0x at 1, even per doubling. */
function detailCost(detail: number): number {
    const d = Math.max(0.25, detail);
    return Math.pow(3.3, Math.log2(d) / 5);
}

const CAPTION = 'text-[11px] text-fg-dim leading-snug';

/* A kit Slider with a 56 px number field on its right. The field commits on Enter or blur. */
function NumSlider({ label, value, min, max, step, onChange, format, log, digits = 2 }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (v: number) => void;
    format?: (v: number) => string;
    log?: boolean;
    digits?: number;
}) {
    const shown = Number.isFinite(value) ? String(Number(value.toFixed(digits))) : '';
    const [draft, setDraft] = useState<string | null>(null);
    const commit = () => {
        if (draft === null) return;
        const v = Number(draft);
        setDraft(null);
        if (draft.trim() === '' || !Number.isFinite(v)) return;
        onChange(Math.min(max, Math.max(min, v)));
    };
    return (
        <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
                <Slider label={label} value={value} min={min} max={max} step={step} onChange={onChange} format={format} log={log} />
            </div>
            <input
                type="text"
                inputMode="decimal"
                aria-label={label + ' value'}
                value={draft ?? shown}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') { commit(); (e.target as HTMLInputElement).blur(); }
                    if (e.key === 'Escape') setDraft(null);
                    e.stopPropagation();
                }}
                className="pointer-events-auto w-14 h-[24px] mb-1 bg-surface-header border border-line/20 rounded px-1 text-[11px] text-fg-secondary font-mono tabular-nums text-right focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-400"
            />
        </div>
    );
}

export function LookPanel() {
    const bridge = useDeepZoom((s) => s.bridge);
    const frameW = useDeepZoom((s) => s.telemetry?.frameW ?? 0);
    const frameH = useDeepZoom((s) => s.telemetry?.frameH ?? 0);
    const hasPath = useDeepZoom((s) => !!s.path && s.path.frames.length > 0);
    const setPanel = useDeepZoom((s) => s.setPanel);
    const say = useDeepZoom((s) => s.say);

    const [st, setSt] = useState<DzSettings | null>(null);
    const [lk, setLk] = useState<DzLook | null>(null);
    const [gradient, setGradient] = useState<string>('');

    const refresh = useCallback((b: DzBridge) => {
        try {
            const s = b.settings();
            setSt(s);
            setLk(b.look());
            if (!baseline) baseline = { settings: { ...s, phase: [s.phase[0], s.phase[1]] }, lookMode: s.lookMode };
        } catch (e) {
            say('Look: ' + (e instanceof Error ? e.message : String(e)));
        }
    }, [say]);

    useEffect(() => {
        if (bridge) refresh(bridge);
    }, [bridge, refresh]);

    /** Run one bridge call from an event handler, then re-read what the renderer now holds. */
    const act = (fn: (b: DzBridge) => void) => {
        if (!bridge) return;
        try { fn(bridge); } catch (e) {
            say('Look: ' + (e instanceof Error ? e.message : String(e)));
        }
        refresh(bridge);
    };

    const close = () => setPanel('none');

    if (!bridge || !st) {
        return (
            <PanelFrame title="Look" onClose={close} width={340}>
                <p className={'px-3 py-3 m-0 ' + CAPTION}>Waiting for the renderer. The deep shader compiles once (5-10 s on a first visit).</p>
            </PanelFrame>
        );
    }

    const look: DzLook = lk ?? {};
    const lookMode = num(look.mode, st.lookMode);
    const cost = detailCost(st.detail);
    const theta = st.phase[0];
    const phi = st.phase[1];

    const loadGradient = () => {
        const b = bridge;
        setGradient('choosing a file');
        b.loadGradientFile().then((kind) => {
            if (kind === 'image') setGradient('loaded from an image');
            else if (kind === 'text') setGradient('loaded from a text palette');
            else setGradient('load failed, built-in kept');
            refresh(b);
        }).catch((e: unknown) => {
            setGradient('');
            say('Gradient: ' + (e instanceof Error ? e.message : String(e)));
        });
    };

    const resetLook = () => {
        const base = baseline;
        if (!base) return;
        act((b) => {
            const s = base.settings;
            b.setDetail(s.detail);
            b.setReach(s.reach);
            b.setColor(s.color, s.cscale);
            b.setLight(s.light, s.falloff);
            b.setLook({ mode: base.lookMode });
            b.clearGradient();
        });
        setGradient('');
        say('Look reset');
    };

    return (
        <PanelFrame title="Look" onClose={close} width={340}>
            {hasPath ? (
                <p className="m-0 px-3 py-2 text-[11px] text-fg-secondary border-b border-line/10">
                    These settings are used for the next render.
                </p>
            ) : null}

            <Section title="Detail and reach" defaultOpen>
                <NumSlider
                    label="Detail"
                    value={st.detail}
                    min={0.25}
                    max={32}
                    step={0.25}
                    log
                    onChange={(v) => act((b) => b.setDetail(v))}
                    format={(v) => v.toFixed(2)}
                />
                <div className="flex items-center gap-1.5 pb-1">
                    <Button onClick={() => act((b) => b.setDetail(1))} title="Detail 1">1</Button>
                    <Button onClick={() => act((b) => b.setDetail(8))} title="Detail 8">8</Button>
                    <Button onClick={() => act((b) => b.setDetail(32))} title="Detail 32">32</Button>
                    <span className="ml-auto text-[11px] text-fg-secondary font-mono tabular-nums">
                        about {cost.toFixed(1)}x time per sample
                    </span>
                </div>
                <p className={'m-0 pb-2 ' + CAPTION}>fine relief · keys F G</p>

                <Seg<number>
                    label="Reach"
                    value={st.reach}
                    options={[['short 256', 0], ['relaxed 512', 1], ['full 1024', 2]]}
                    onChange={(v) => act((b) => b.setReach(v))}
                />
                <p className={'m-0 pb-2 ' + CAPTION}>steps a ray may take; matters when looking along the surface</p>

                <NumSlider
                    label="Live frame size"
                    value={st.frame}
                    min={320}
                    max={2560}
                    step={16}
                    digits={0}
                    onChange={(v) => act((b) => b.setFrame(v))}
                    format={(v) => Math.round(v) + ' px'}
                />
                <p className={'m-0 font-mono tabular-nums ' + CAPTION}>
                    {frameW > 0 && frameH > 0 ? `long edge · now ${frameW}x${frameH}` : 'long edge'}
                </p>
            </Section>

            <Section title="Colour" defaultOpen>
                <Seg<number>
                    value={st.color}
                    options={[['plain', 0], ['iteration', 1], ['orbit-trap', 2]]}
                    onChange={(v) => act((b) => b.setColor(v, st.cscale))}
                />
                <p className={'m-0 pb-2 ' + CAPTION}>key C</p>

                <NumSlider
                    label="Palette frequency"
                    value={st.cscale}
                    min={0.1}
                    max={20}
                    log
                    onChange={(v) => act((b) => b.setColor(st.color, v))}
                    format={(v) => v.toFixed(2)}
                />
                <p className={'m-0 pb-2 ' + CAPTION}>keys 9 0 · used by iteration and orbit-trap</p>

                <Field label="Gradient" hint="PNG (its top row of pixels) or a text palette of R G B lines. You can also drop the file onto the picture.">
                    <Button onClick={loadGradient}>Load gradient</Button>
                    <Button onClick={() => { act((b) => b.clearGradient()); setGradient('built-in'); }}>Reset</Button>
                    {gradient ? <span className="text-[11px] text-fg-secondary">gradient: {gradient}</span> : null}
                </Field>
            </Section>

            <Section title="Light" defaultOpen={false}>
                <Seg<number>
                    label="Look"
                    value={lookMode}
                    options={[['new', 1], ['classic', 0]]}
                    onChange={(v) => act((b) => b.setLook({ mode: v }))}
                />
                {lookMode === 1 ? (
                    <>
                        <p className={'m-0 pb-1 ' + CAPTION}>Lights follow the surface.</p>
                        <NumSlider label="Key height" value={num(look.keyElev, 40)} min={5} max={85} step={1} digits={0}
                            format={(v) => Math.round(v) + '°'} onChange={(v) => act((b) => b.setLook({ keyElev: v }))} />
                        <NumSlider label="Key turn" value={num(look.keyTurn, 0)} min={-180} max={180} step={5} digits={0}
                            format={(v) => Math.round(v) + '°'} onChange={(v) => act((b) => b.setLook({ keyTurn: v }))} />
                        <NumSlider label="Light colour" value={num(look.tint, 0.5)} min={0} max={1} step={0.05}
                            format={(v) => v.toFixed(2)} onChange={(v) => act((b) => b.setLook({ tint: v }))} />
                        <p className={'m-0 pb-1 ' + CAPTION}>0 = white lights · 1 = orange fill and blue kicker</p>
                        <NumSlider label="Shadows" value={num(look.shadow, 1)} min={0} max={1} step={0.05}
                            format={(v) => v.toFixed(2)} onChange={(v) => act((b) => b.setLook({ shadow: v }))} />
                        <NumSlider label="Occlusion" value={num(look.ao, 1)} min={0} max={2} step={0.05}
                            format={(v) => v.toFixed(2)} onChange={(v) => act((b) => b.setLook({ ao: v }))} />
                        <NumSlider label="Sky" value={num(look.sky, 0.3)} min={0} max={2} step={0.05}
                            format={(v) => v.toFixed(2)} onChange={(v) => act((b) => b.setLook({ sky: v }))} />
                        <NumSlider label="Roughness" value={num(look.rough, 0.75)} min={0.1} max={1} step={0.05}
                            format={(v) => v.toFixed(2)} onChange={(v) => act((b) => b.setLook({ rough: v }))} />
                        <NumSlider label="Haze" value={num(look.haze, 0)} min={0} max={1} step={0.05}
                            format={(v) => v.toFixed(2)} onChange={(v) => act((b) => b.setLook({ haze: v }))} />
                    </>
                ) : (
                    <p className={'m-0 pb-1 ' + CAPTION}>One light fixed to the camera, no shadows.</p>
                )}

                <Seg<number>
                    label="Headlamp"
                    value={st.light}
                    options={[['off', 0], ['on', 1], ['both', 2]]}
                    onChange={(v) => act((b) => b.setLight(v, st.falloff))}
                />
                <NumSlider
                    label="Falloff"
                    value={st.falloff}
                    min={0.5}
                    max={32}
                    step={0.5}
                    digits={1}
                    onChange={(v) => act((b) => b.setLight(st.light, v))}
                    format={(v) => v.toFixed(1)}
                />
                <p className={'m-0 ' + CAPTION}>key L · falloff applies to the headlamp</p>
            </Section>

            <Section title="Formula" defaultOpen={false}>
                <NumSlider
                    label="Power n"
                    value={st.power}
                    min={2}
                    max={16}
                    step={1}
                    digits={0}
                    onChange={(v) => act((b) => b.setPower(Math.round(v)))}
                />
                <p className={'m-0 pb-1 ' + CAPTION}>keys - =</p>
                <NumSlider label="Phase theta" value={theta} min={-3.14} max={3.14} step={0.01}
                    format={(v) => v.toFixed(2)} onChange={(v) => act((b) => b.setPhase(v, phi))} />
                <NumSlider label="Phase phi" value={phi} min={-3.14} max={3.14} step={0.01}
                    format={(v) => v.toFixed(2)} onChange={(v) => act((b) => b.setPhase(theta, v))} />
                <p className={'m-0 py-1 ' + CAPTION}>
                    Changing n or phase changes the fractal. Saved locations belong to the n they were saved at.
                </p>
                <Button onClick={() => act((b) => { b.setPower(8); b.setPhase(0, 0); })}>Reset formula</Button>
            </Section>

            <div className="flex items-center gap-2 px-3 py-3 border-t border-line/10">
                <Button
                    onClick={resetLook}
                    title="Detail, reach, colour mode, palette frequency, light mode, falloff and look mode go back to what they were when this page loaded; the gradient is cleared."
                >
                    Reset look
                </Button>
                <span className={CAPTION}>formula is not touched</span>
            </div>
        </PanelFrame>
    );
}
