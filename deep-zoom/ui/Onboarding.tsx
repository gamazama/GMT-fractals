/**
 * deep-zoom/ui/Onboarding.tsx — the first-run strip at the bottom centre of the picture.
 *
 * PURPOSE
 *   One slim line of guidance at a time, never a modal, never taking input from flying. Each prompt
 *   disappears when the action it names is detected in the renderer's own window (pointer lock,
 *   mouse movement, the W key) or in telemetry (ready, still convergence). A visitor who clicks the
 *   picture and flies at once is moved ahead, never asked for something already done.
 *
 * INTEGRATION SEAMS
 *   - The shell mounts it only while `onboarded` is false; finishing or 'Skip' calls
 *     `setOnboarded(true)` (store key gmt.deepzoom.onboarded.v1). Help's 'Show the intro again'
 *     clears the flag, which remounts this at step 'start'.
 *   - Before a dive it dispatches `window` CustomEvent 'deep-zoom:back-view' with the view captured
 *     by `bridge.getView()` as `detail`, so the shell can keep it for Backspace. Nothing breaks if
 *     nobody listens.
 *   - Listens on `bridge.win` (same-origin iframe window) and its document; it never binds a key
 *     the core or the shell uses, it only observes.
 *
 * PITFALLS
 *   - The root uses `self-end` so it sits at the bottom of whatever flex box the shell centres it in.
 *   - No bridge call happens during render; all of them are in handlers and effects.
 *   - The strip is static while idle (the only animation is the compile line, which stops at ready),
 *     so it does not repaint the page while a still converges.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { DzPath } from '../bridge';
import { useDeepZoom } from '../store';
import { openHelp } from './HelpPanel';
import { Button, Kbd } from './kit';

type Step = 'start' | 'diving' | 'click' | 'look' | 'keys' | 'shift' | 'still' | 'tips' | 'final';

const FIRST_DIVE = 1e-12;
const RECORD_DIVE = 1e-30;
const W_HOLD_MS = 2000;

/** 6.40e-53 */
function fmtDepth(d: number): string {
    if (!Number.isFinite(d) || d <= 0) return '-';
    const [m, e] = d.toExponential(2).split('e');
    return m + 'e' + String(Number(e));
}

function arrivalLine(depth: number, target: number): string {
    if (!Number.isFinite(depth) || depth <= 0) return 'Stopped';
    return depth <= target * 3 ? 'Arrived · ' + fmtDepth(depth) : 'Stopped at ' + fmtDepth(depth);
}

export function Onboarding() {
    const bridge = useDeepZoom((s) => s.bridge);
    const ready = useDeepZoom((s) => !!s.telemetry?.ready);
    const error = useDeepZoom((s) => s.telemetry?.error ?? '');
    const converged = useDeepZoom((s) => {
        const t = s.telemetry;
        return !!t && t.accumMax > 0 && t.accumN >= t.accumMax;
    });
    const accumMax = useDeepZoom((s) => s.telemetry?.accumMax ?? 64);

    const [step, setStepState] = useState<Step>('start');
    const [busy, setBusy] = useState(false);
    const [details, setDetails] = useState(false);
    const stepRef = useRef<Step>('start');
    const lockedRef = useRef(false);
    const wHeld = useRef({ total: 0, downAt: 0 });

    const setStep = useCallback((s: Step) => { stepRef.current = s; setStepState(s); }, []);

    const finish = useCallback(() => {
        const s = useDeepZoom.getState();
        s.setOnboarded(true);
        s.bridge?.focus();
    }, []);

    // Watch the renderer's window: pointer lock, mouse movement, the W key.
    useEffect(() => {
        if (!bridge) return;
        let win: Window;
        let doc: Document;
        try { win = bridge.win; doc = win.document; } catch { return; }

        const wTotal = () => {
            const w = wHeld.current;
            return w.total + (w.downAt ? performance.now() - w.downAt : 0);
        };
        const onLock = () => {
            const locked = !!doc.pointerLockElement;
            lockedRef.current = locked;
            const s = stepRef.current;
            if (locked && (s === 'start' || s === 'click')) setStep(wTotal() >= W_HOLD_MS ? 'shift' : 'look');
            else if (!locked && s === 'shift') setStep('still');
        };
        const onMove = () => {
            if (lockedRef.current && stepRef.current === 'look') setStep('keys');
        };
        const onDown = (e: KeyboardEvent) => {
            if (e.code !== 'KeyW' || e.repeat) return;
            if (!wHeld.current.downAt) wHeld.current.downAt = performance.now();
            if (stepRef.current === 'look') setStep('keys');
        };
        const onUp = (e: KeyboardEvent) => {
            if (e.code !== 'KeyW') return;
            const w = wHeld.current;
            if (w.downAt) { w.total += performance.now() - w.downAt; w.downAt = 0; }
        };
        const tick = win.setInterval(() => {
            if (stepRef.current === 'keys' && wTotal() >= W_HOLD_MS) setStep('shift');
        }, 250);

        try {
            doc.addEventListener('pointerlockchange', onLock);
            win.addEventListener('mousemove', onMove);
            win.addEventListener('keydown', onDown);
            win.addEventListener('keyup', onUp);
            onLock();
        } catch { /* frame gone */ }
        return () => {
            try {
                win.clearInterval(tick);
                doc.removeEventListener('pointerlockchange', onLock);
                win.removeEventListener('mousemove', onMove);
                win.removeEventListener('keydown', onDown);
                win.removeEventListener('keyup', onUp);
            } catch { /* frame gone */ }
        };
    }, [bridge, setStep]);

    // Timed steps.
    useEffect(() => {
        const ms = step === 'shift' ? 20000 : step === 'still' ? 6000 : step === 'tips' ? 6000 : 0;
        if (!ms) return;
        const next: Step = step === 'shift' ? 'still' : step === 'still' ? 'tips' : 'final';
        const id = window.setTimeout(() => { if (stepRef.current === step) setStep(next); }, ms);
        return () => window.clearTimeout(id);
    }, [step, setStep]);

    // The still prompt goes as soon as the picture has converged once.
    useEffect(() => {
        if (step === 'still' && converged) setStep('tips');
    }, [step, converged, setStep]);

    const rememberView = () => {
        if (!bridge) return;
        try { window.dispatchEvent(new CustomEvent('deep-zoom:back-view', { detail: bridge.getView() })); } catch { /* frame reloading */ }
    };

    const dive = async () => {
        if (!bridge || busy) return;
        setBusy(true);
        setStep('diving');
        rememberView();
        bridge.focus();
        try { await bridge.diveTo(FIRST_DIVE); } catch { /* cancelled */ }
        let depth = NaN;
        try { depth = bridge.telemetry().depth; } catch { /* frame reloading */ }
        useDeepZoom.getState().say(arrivalLine(depth, FIRST_DIVE));
        setBusy(false);
        if (stepRef.current === 'diving') setStep(lockedRef.current ? 'look' : 'click');
    };

    const recordDive = async () => {
        if (!bridge || busy) return;
        const s = useDeepZoom.getState();
        setBusy(true);
        rememberView();
        bridge.focus();
        let path: DzPath | null = null;
        try {
            if (!bridge.recording()) bridge.recordToggle();
            try { await bridge.diveTo(RECORD_DIVE); } catch { /* cancelled */ }
            if (bridge.recording()) bridge.recordToggle();
            path = JSON.parse(JSON.stringify(bridge.lastPath())) as DzPath;
        } catch { path = null; }
        setBusy(false);
        if (!path || !Array.isArray(path.frames) || path.frames.length < 2) {
            s.say('No keys were recorded. Press M and fly it by hand.');
            return;
        }
        let depth = NaN;
        try { depth = bridge.telemetry().depth; } catch { /* frame reloading */ }
        s.setPath(path);
        s.setPanel('record');
        s.say(arrivalLine(depth, RECORD_DIVE) + ' · ' + path.frames.length + ' keys recorded');
        s.setOnboarded(true);
    };

    if (!bridge) return null;

    const skip = (
        <button
            type="button"
            onClick={finish}
            title="Hide the intro. Help can show it again."
            className="shrink-0 text-[11px] text-fg-tertiary hover:text-fg underline-offset-2 hover:underline cursor-pointer px-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-400 rounded-sm"
        >
            Skip
        </button>
    );

    let body: React.ReactNode;
    if (error && step === 'start') {
        body = (
            <div className="flex-1 min-w-0">
                <div className="text-amber-400">The deep shader did not compile on this GPU. The f32 view still flies, down to <span className="font-mono tabular-nums">1e-4</span>.</div>
                <div className="mt-1 flex items-center gap-2">
                    <Button onClick={() => setDetails((d) => !d)}>{details ? 'Hide details' : 'Details'}</Button>
                    <Button onClick={() => setStep(lockedRef.current ? 'look' : 'click')}>I'll fly myself</Button>
                </div>
                {details ? <pre className="mt-1 max-h-32 overflow-auto select-text whitespace-pre-wrap break-all text-[10px] text-fg-tertiary bg-black/40 border border-line/10 rounded-sm p-1.5 m-0">{error}</pre> : null}
            </div>
        );
    } else if (step === 'start') {
        body = (
            <div className="flex-1 min-w-0">
                {!ready ? (
                    <>
                        <div>Deep Zoom: a Mandelbulb you can fly into, down to <span className="font-mono tabular-nums text-fg">1e-77</span>. Compiling the deep shader, 5-10 s the first time. You can fly now: click the picture.</div>
                        <div className="mt-1.5 h-px w-full bg-cyan-400/60 animate-pulse" aria-hidden="true" />
                    </>
                ) : (
                    <div>Deep Zoom: a Mandelbulb you can fly into, down to <span className="font-mono tabular-nums text-fg">1e-77</span>.</div>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Button primary onClick={dive} disabled={!ready || busy} title={ready ? 'Flies straight ahead for about 5 s. Any fly key or Esc stops it.' : 'Waiting for the deep shader to compile'}>
                        {ready ? 'Dive to 1e-12' : 'Dive to 1e-12 (waiting for shader)'}
                    </Button>
                    <Button onClick={() => { setStep(lockedRef.current ? 'look' : 'click'); bridge.focus(); }}>I'll fly myself</Button>
                </div>
            </div>
        );
    } else if (step === 'diving') {
        body = <div className="flex-1 min-w-0">Watch the number on the left. Each step of 1 in the exponent is 10x closer.</div>;
    } else if (step === 'click') {
        body = <div className="flex-1 min-w-0">Click the picture to steer. <Kbd>Esc</Kbd> gives the mouse back.</div>;
    } else if (step === 'look') {
        body = <div className="flex-1 min-w-0">Move the mouse to look.</div>;
    } else if (step === 'keys') {
        body = <div className="flex-1 min-w-0"><Kbd>W</Kbd> forward · <Kbd>S</Kbd> back · <Kbd>A</Kbd><Kbd>D</Kbd> sideways · <Kbd>Q</Kbd><Kbd>E</Kbd> down / up</div>;
    } else if (step === 'shift') {
        body = <div className="flex-1 min-w-0">Hold <Kbd>Shift</Kbd> to go faster. Speed follows your distance to the surface.</div>;
    } else if (step === 'still') {
        body = <div className="flex-1 min-w-0">Stop moving and the picture sharpens: still <span className="font-mono tabular-nums text-fg">{accumMax}/{accumMax}</span>, about a second.</div>;
    } else if (step === 'tips') {
        body = <div className="flex-1 min-w-0"><Kbd>B</Kbd> saves this view · <Kbd>M</Kbd> records a flight · <Kbd>H</Kbd> hides the overlays · <Kbd>/</Kbd> opens Help</div>;
    } else {
        body = (
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <Button primary onClick={recordDive} disabled={!ready || busy} title={ready ? 'Records while the camera dives for about 12 s, then opens the Record panel' : 'Waiting for the deep shader to compile'}>
                        {busy ? 'Recording the dive…' : ready ? 'Record a dive to 1e-30' : 'Record a dive to 1e-30 (waiting for shader)'}
                    </Button>
                    <Button onClick={() => { useDeepZoom.getState().setPanel('locations'); finish(); }} disabled={busy}>Starter dives</Button>
                    <Button onClick={finish} disabled={busy}>Done</Button>
                </div>
                <button
                    type="button"
                    onClick={() => openHelp('tools')}
                    className="mt-1.5 text-[11px] text-fg-tertiary hover:text-fg underline underline-offset-2 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-400 rounded-sm"
                >
                    Coming from Kalles Fraktaler or Mandelbulber?
                </button>
            </div>
        );
    }

    return (
        <div
            role="status"
            aria-live="polite"
            data-dz-onboarding={step}
            className="self-end mb-0 w-full max-w-[640px] flex items-start gap-3 px-3 py-2 font-mono text-[12px] leading-relaxed text-fg-secondary bg-black/70 backdrop-blur-sm border border-white/10 rounded-md"
        >
            {body}
            {skip}
        </div>
    );
}
