
import { useEffect, useRef, useState, useCallback } from 'react';
import { useFractalStore } from '../store/fractalStore';
import { TUTORIAL_HINTS, type TutorialHint, type HintContext } from '../data/tutorialHints';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';

// ─── localStorage persistence ──────────────────────────────────────────

const STORAGE_KEY = 'gmt-hints';
const STORAGE_VERSION = 2;  // bump to invalidate stale hint data

interface PersistedProfile {
    version?: number;
    shown: Record<string, number>;       // hint id → times shown
    panelsOpened: string[];
    featuresUsed: string[];
    formulaSwitches: number;
    paramChanges: number;
    snapshots: number;
    rightClicks: number;
}

const DEFAULT_PROFILE: PersistedProfile = {
    version: STORAGE_VERSION,
    shown: {},
    panelsOpened: [],
    featuresUsed: [],
    formulaSwitches: 0,
    paramChanges: 0,
    snapshots: 0,
    rightClicks: 0,
};

function loadProfile(): PersistedProfile {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_PROFILE };
        const parsed = JSON.parse(raw);
        // Invalidate stale data from older versions
        if (parsed.version !== STORAGE_VERSION) {
            localStorage.removeItem(STORAGE_KEY);
            return { ...DEFAULT_PROFILE };
        }
        return { ...DEFAULT_PROFILE, ...parsed };
    } catch {
        return { ...DEFAULT_PROFILE };
    }
}

function saveProfile(p: PersistedProfile) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch { /* quota exceeded — silently ignore */ }
}

// ─── Hint evaluation ───────────────────────────────────────────────────

const EVAL_INTERVAL_MS = 5000;   // Check every 5 seconds
const MIN_GAP_MS = 20000;        // 20s minimum between hint changes
const HINT_DISPLAY_MS = 12000;   // Show each hint for 12 seconds before re-evaluating

export interface ActiveHint {
    id: string;
    text: string;
    helpTopicId?: string;
}

export interface TutorialHintsAPI {
    activeHint: ActiveHint | null;
    dismissHint: () => void;
    resetHints: () => void;
}


export function useTutorialHints(showTimeline: boolean): TutorialHintsAPI {
    const profileRef = useRef<PersistedProfile>(loadProfile());
    const sessionStartRef = useRef(Date.now());
    const lastHintTimeRef = useRef(0);
    const currentHintStartRef = useRef(0);
    const lastShownIdRef = useRef<string | null>(null);  // for rotation: skip the just-shown hint
    const skipSetRef = useRef<Set<string>>(new Set());    // hints dismissed this cycle
    const hasActiveHintRef = useRef(false);               // shadow of activeHint for interval checks

    const [activeHint, setActiveHint] = useState<ActiveHint | null>(null);

    // Keep the ref in sync with state (avoids stale closure in interval)
    useEffect(() => { hasActiveHintRef.current = activeHint !== null; }, [activeHint]);

    // ── Behavior tracking via store subscriptions ──────────────────────

    useEffect(() => {
        const store = useFractalStore;
        const p = profileRef.current;

        // Track panel opens
        const unsubPanel = store.subscribe(
            (s) => s.activeRightTab,
            (tab) => {
                if (tab && !p.panelsOpened.includes(tab)) {
                    p.panelsOpened.push(tab);
                    saveProfile(p);
                }
            }
        );

        // Track formula switches
        const unsubFormula = store.subscribe(
            (s) => s.formula,
            () => {
                p.formulaSwitches++;
                saveProfile(p);
            }
        );

        // Track advanced mode toggle
        const unsubAdvanced = store.subscribe(
            (s) => s.advancedMode,
            (adv) => {
                if (adv && !p.featuresUsed.includes('advancedMode')) {
                    p.featuresUsed.push('advancedMode');
                    saveProfile(p);
                }
            }
        );

        // Track right-click context menu opens
        const unsubCtx = store.subscribe(
            (s) => s.contextMenu.visible,
            (visible) => {
                if (visible) {
                    p.rightClicks++;
                    // No need to save on every right-click
                }
            }
        );

        return () => {
            unsubPanel();
            unsubFormula();
            unsubAdvanced();
            unsubCtx();
            saveProfile(p);
        };
    }, []);

    // Track parameter changes: detect when isUserInteracting goes true
    useEffect(() => {
        const unsub = useFractalStore.subscribe(
            (s) => s.isUserInteracting,
            (interacting) => {
                if (interacting) {
                    profileRef.current.paramChanges++;
                }
            }
        );
        return unsub;
    }, []);

    // ── Mark feature intros as "used" when hints are shown ─────────────

    const markFeatureIntro = useCallback((hintId: string) => {
        const p = profileRef.current;
        // Map hint IDs to feature flags used in preconditions
        const featureMap: Record<string, string> = {
            'intro-gradient': 'gradient-intro',
            'intro-scene': 'scene-intro',
            'intro-quality': 'quality-intro',
            'intro-shader': 'shader-intro',
            'intro-light': 'light-intro',
            'intro-timeline': 'timeline-intro',
            'workflow-undo': 'undo-hint',
            'workflow-snapshot-meta': 'snapshot-meta',
            'power-advanced-intro': 'advanced-intro',
            'power-timeline': 'timeline-hint',
            'power-video': 'video-hint',
            'light-shadows': 'shadow-hint',
        };
        const feat = featureMap[hintId];
        if (feat && !p.featuresUsed.includes(feat)) {
            p.featuresUsed.push(feat);
        }
    }, []);

    // ── Core evaluation function (shared by interval and dismiss) ─────

    const evaluateNext = useCallback((skipId?: string) => {
        const store = useFractalStore.getState();
        // Suppress contextual hints while guided tutorial is active
        if (store.tutorialActive) { setActiveHint(null); return; }
        const p = profileRef.current;
        const now = Date.now();
        const sessionAge = (now - sessionStartRef.current) / 1000;

        // Don't show hints if disabled or in broadcast mode
        if (!store.showHints || store.isBroadcastMode) {
            setActiveHint(null);
            return;
        }

        // Build context
        const ctx: HintContext = {
            cameraMode: store.cameraMode,
            activeRightTab: store.activeRightTab,
            advancedMode: store.advancedMode,
            showHints: store.showHints,
            isBroadcastMode: store.isBroadcastMode,
            formula: store.formula,
            tabSwitchCount: store.tabSwitchCount,
            isTimelineOpen: showTimeline,
            sessionAge,
            panelsEverOpened: p.panelsOpened,
            featuresEverUsed: p.featuresUsed,
            formulaSwitchCount: p.formulaSwitches,
            parameterChangeCount: p.paramChanges,
            snapshotsTaken: p.snapshots,
            rightClickCount: p.rightClicks,
        };

        // Evaluate candidates
        const candidates = TUTORIAL_HINTS.filter((h) => {
            if (h.id === skipId) return false;                   // skip dismissed hint
            if (skipSetRef.current.has(h.id)) return false;      // skip previously dismissed this cycle
            if (h.id === lastShownIdRef.current) return false;   // rotation: don't repeat the last hint
            const shown = p.shown[h.id] || 0;
            if (shown >= h.maxShows) return false;
            if (h.minSessionTime && sessionAge < h.minSessionTime) return false;
            try {
                return h.precondition(ctx);
            } catch {
                return false;
            }
        });

        // If all non-last candidates exhausted, allow the last-shown hint back
        // (but still respect skipId from dismiss)
        if (candidates.length === 0 && lastShownIdRef.current) {
            const fallback = TUTORIAL_HINTS.filter((h) => {
                if (h.id === skipId) return false;
                if (skipSetRef.current.has(h.id)) return false;
                const shown = p.shown[h.id] || 0;
                if (shown >= h.maxShows) return false;
                if (h.minSessionTime && sessionAge < h.minSessionTime) return false;
                try { return h.precondition(ctx); } catch { return false; }
            });
            if (fallback.length > 0) {
                candidates.push(...fallback);
            }
        }

        if (candidates.length === 0) {
            setActiveHint(null);
            // Reset skip set when we run out — next cycle starts fresh
            skipSetRef.current.clear();
            return;
        }

        // Sort by priority (descending)
        candidates.sort((a, b) => b.priority - a.priority);
        const best = candidates[0];

        // Resolve text
        const text = typeof best.text === 'function' ? best.text(ctx) : best.text;

        // Record the show
        p.shown[best.id] = (p.shown[best.id] || 0) + 1;
        markFeatureIntro(best.id);
        saveProfile(p);

        lastShownIdRef.current = best.id;
        lastHintTimeRef.current = now;
        currentHintStartRef.current = now;
        setActiveHint({ id: best.id, text, helpTopicId: best.helpTopicId });
    }, [showTimeline, markFeatureIntro]);

    // ── Timed evaluation loop ──────────────────────────────────────────

    // Run first evaluation quickly after mount (1s), then every EVAL_INTERVAL_MS
    useEffect(() => {
        const tick = () => {
            const now = Date.now();

            // Only apply timing guards when a hint is currently showing —
            // if nothing is showing, always try to find one
            if (hasActiveHintRef.current) {
                if (now - lastHintTimeRef.current < MIN_GAP_MS) return;
                if (now - currentHintStartRef.current < HINT_DISPLAY_MS) return;
            }

            evaluateNext();
        };

        // First evaluation after a short delay
        const initialTimer = setTimeout(tick, 1000);
        const interval = setInterval(tick, EVAL_INTERVAL_MS);

        return () => {
            clearTimeout(initialTimer);
            clearInterval(interval);
        };
    }, [evaluateNext]);

    // ── Dismiss (click to advance) ─────────────────────────────────────

    const dismissHint = useCallback(() => {
        if (!activeHint) return;
        const dismissedId = activeHint.id;
        skipSetRef.current.add(dismissedId);
        setActiveHint(null);
        // Immediately evaluate next, skipping the dismissed hint
        // Use a microtask so the state clear takes effect
        setTimeout(() => evaluateNext(dismissedId), 50);
    }, [activeHint, evaluateNext]);

    // ── Reset ──────────────────────────────────────────────────────────

    const resetHints = useCallback(() => {
        profileRef.current = { ...DEFAULT_PROFILE };
        saveProfile(profileRef.current);
        sessionStartRef.current = Date.now();
        lastHintTimeRef.current = 0;
        currentHintStartRef.current = 0;
        lastShownIdRef.current = null;
        skipSetRef.current.clear();
        setActiveHint(null);
    }, []);

    // Listen for reset event from SystemMenu (decoupled via FractalEvents)
    useEffect(() => {
        return FractalEvents.on(FRACTAL_EVENTS.RESET_HINTS, resetHints);
    }, [resetHints]);

    return { activeHint, dismissHint, resetHints };
}
