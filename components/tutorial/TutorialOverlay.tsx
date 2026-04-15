
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFractalStore } from '../../store/fractalStore';
import { useTutorialEngine, onKeyPressed } from '../../hooks/useTutorialEngine';
import { NEXT_STEPS_ITEMS, TutorialStep } from '../../data/tutorialLessons';
import TutorialHighlight from './TutorialHighlight';

interface PanelPosition {
    left: number;
    top: number;
}

const PANEL_WIDTH = 360;
const PANEL_MARGIN = 14;
const TRANSITION_MS = 200;

// Resolve vertical center from the first visible highlightTarget (for Y alignment).
function resolveVerticalCenter(targets: string[] | undefined): number | null {
    if (!targets) return null;
    for (const t of targets) {
        const el = document.querySelector(`[data-tut="${t}"]`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return r.top + r.height / 2;
    }
    return null;
}

function computePosition(targets: string[] | undefined, positionTarget?: string | string[], positionSide?: 'below', positionAlign?: 'start'): PanelPosition | null {
    // When a positionTarget is set, use it only for horizontal placement.
    // Vertical alignment comes from the first visible highlight target instead.
    const ptArr = Array.isArray(positionTarget) ? positionTarget : positionTarget ? [positionTarget] : [];
    const list = ptArr.length > 0 ? [...ptArr, ...(targets ?? [])] : (targets ?? []);
    if (list.length === 0) return null;

    // Pre-compute the Y override from highlight targets when positionTarget is provided.
    const highlightCenterY = ptArr.length > 0 ? resolveVerticalCenter(targets) : null;

    for (const target of list) {
        const el = document.querySelector(`[data-tut="${target}"]`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;

        const centerX = r.left + r.width / 2;
        // Use highlight-target centerY when this is the positionTarget, otherwise use element's own center.
        const centerY = (ptArr.length > 0 && ptArr.includes(target) && highlightCenterY !== null)
            ? highlightCenterY
            : r.top + r.height / 2;
        const spaceLeft = r.left;
        const spaceRight = window.innerWidth - r.right;
        const spaceBelow = window.innerHeight - r.bottom;

        // Small elements in the top bar (height < 80px, near top) should not get
        // left/right placement — they'd land in the corner. Tall elements like dock
        // panels are exempt and intentionally get LEFT/RIGHT placement.
        const isTopBar = r.top < 120 && r.height < 80;
        const skipSides = isTopBar || positionSide === 'below';

        if (!skipSides && spaceLeft > PANEL_WIDTH + PANEL_MARGIN * 2) {
            return {
                left: r.left - PANEL_WIDTH - PANEL_MARGIN,
                top: Math.max(PANEL_MARGIN, Math.min(centerY - 60, window.innerHeight - 200)),
            };
        } else if (!skipSides && spaceRight > PANEL_WIDTH + PANEL_MARGIN * 2) {
            return {
                left: r.right + PANEL_MARGIN,
                top: Math.max(PANEL_MARGIN, Math.min(centerY - 60, window.innerHeight - 200)),
            };
        } else if (spaceBelow > 120) {
            const leftPos = positionAlign === 'start'
                ? Math.max(PANEL_MARGIN, Math.min(r.left, window.innerWidth - PANEL_WIDTH - PANEL_MARGIN))
                : Math.max(PANEL_MARGIN, Math.min(centerX - PANEL_WIDTH / 2, window.innerWidth - PANEL_WIDTH - PANEL_MARGIN));
            return {
                left: leftPos,
                top: r.bottom + PANEL_MARGIN,
            };
        } else {
            // Last resort: above the element, or fall back to left/right
            if (spaceLeft > PANEL_WIDTH + PANEL_MARGIN * 2) {
                return {
                    left: r.left - PANEL_WIDTH - PANEL_MARGIN,
                    top: Math.max(PANEL_MARGIN, Math.min(centerY - 60, window.innerHeight - 200)),
                };
            }
            return {
                left: Math.max(PANEL_MARGIN, Math.min(centerX - PANEL_WIDTH / 2, window.innerWidth - PANEL_WIDTH - PANEL_MARGIN)),
                top: Math.max(PANEL_MARGIN, r.top - 160),
            };
        }
    }
    return null;
}

// --- Key Cap Component ---
const KeyCap: React.FC<{ label: string; pressed: boolean }> = ({ label, pressed }) => (
    <span style={{
        display: 'inline-block',
        padding: '2px 7px',
        margin: '0 2px',
        fontSize: 11,
        fontWeight: 700,
        fontFamily: 'monospace',
        borderRadius: 4,
        border: `1px solid ${pressed ? 'rgba(103,232,249,0.8)' : 'rgba(255,255,255,0.25)'}`,
        background: pressed ? 'rgba(103,232,249,0.25)' : 'rgba(255,255,255,0.08)',
        color: pressed ? 'rgba(103,232,249,1)' : 'rgba(255,255,255,0.7)',
        transition: 'all 0.15s ease',
        transform: pressed ? 'scale(1.1)' : 'scale(1)',
        boxShadow: pressed ? '0 0 8px rgba(103,232,249,0.3)' : 'none',
        minWidth: 22,
        textAlign: 'center' as const,
    }}>
        {label}
    </span>
);

const TutorialOverlay: React.FC = () => {
    const tutorialActive = useFractalStore(s => s.tutorialActive);
    const skipTutorial = useFractalStore(s => s.skipTutorial);
    const completeTutorial = useFractalStore(s => s.completeTutorial);
    const advanceTutorialStep = useFractalStore(s => s.advanceTutorialStep);

    const { lesson, step, stepIndex } = useTutorialEngine();
    const [hoveredTarget, setHoveredTarget] = useState<string | null>(null);
    const [flashTarget, setFlashTarget] = useState<string | null>(null);
    const [pos, setPos] = useState<PanelPosition | null>(null);
    const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
    const panelRef = useRef<HTMLDivElement>(null);

    // Transition state
    const [visible, setVisible] = useState(true);
    const [displayedStep, setDisplayedStep] = useState<TutorialStep | null>(null);
    const [displayedIndex, setDisplayedIndex] = useState(0);
    const prevStepIdRef = useRef<string | null>(null);

    // Handle step transitions with fade
    useEffect(() => {
        if (!step) { setDisplayedStep(null); return; }
        if (step.id === prevStepIdRef.current) return;

        if (prevStepIdRef.current !== null) {
            // Fade out
            setVisible(false);
            const timer = setTimeout(() => {
                setDisplayedStep(step);
                setDisplayedIndex(stepIndex);
                setPressedKeys(new Set());
                setVisible(true);
                prevStepIdRef.current = step.id;
            }, TRANSITION_MS);
            return () => clearTimeout(timer);
        } else {
            // First step — no fade
            setDisplayedStep(step);
            setDisplayedIndex(stepIndex);
            prevStepIdRef.current = step.id;
        }
    }, [step?.id, stepIndex]);

    // Track key presses for visual feedback
    useEffect(() => {
        if (!tutorialActive || !displayedStep?.showKeys) return undefined;
        const unsub = onKeyPressed((key) => {
            setPressedKeys(prev => {
                const next = new Set(prev);
                next.add(key.toLowerCase());
                setTimeout(() => setPressedKeys(p => {
                    const n = new Set(p);
                    n.delete(key.toLowerCase());
                    return n;
                }), 400);
                return next;
            });
        });
        return () => { unsub(); };
    }, [tutorialActive, displayedStep?.id]);

    // Recompute position when step changes
    const updatePos = useCallback(() => {
        if (!displayedStep) return;
        setPos(computePosition(displayedStep.highlightTargets, displayedStep.positionTarget, displayedStep.positionSide, displayedStep.positionAlign));
    }, [displayedStep?.id, displayedStep?.highlightTargets, displayedStep?.positionTarget, displayedStep?.positionSide, displayedStep?.positionAlign]);

    useEffect(() => {
        updatePos();
        const interval = setInterval(updatePos, 300);
        window.addEventListener('resize', updatePos);
        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', updatePos);
        };
    }, [updatePos]);

    if (!tutorialActive || !lesson || !displayedStep) return null;

    const totalSteps = lesson.steps.length;
    const isLastStep = displayedIndex === totalSteps - 1;

    const offsetX = displayedStep.positionOffset?.x ?? 0;
    const offsetY = displayedStep.positionOffset?.y ?? 0;

    const posStyle: React.CSSProperties = pos
        ? {
            position: 'fixed',
            left: pos.left + offsetX,
            top: pos.top + offsetY,
            zIndex: 9998,
            pointerEvents: 'auto' as const,
            width: PANEL_WIDTH,
            transition: `left ${TRANSITION_MS}ms ease, top ${TRANSITION_MS}ms ease, opacity ${TRANSITION_MS}ms ease`,
            opacity: visible ? 1 : 0,
        }
        : {
            position: 'fixed',
            bottom: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9998,
            pointerEvents: 'auto' as const,
            maxWidth: PANEL_WIDTH,
            width: '90vw',
            transition: `opacity ${TRANSITION_MS}ms ease`,
            opacity: visible ? 1 : 0,
        };

    // Handle next-steps item click with flash
    const handleNextStepClick = (target: string) => {
        setFlashTarget(target);
        setTimeout(() => setFlashTarget(null), 600);
    };

    return (
        <>
            {/* Highlight targets from current step */}
            {displayedStep.highlightTargets && displayedStep.highlightTargets.length > 0 && (
                <TutorialHighlight targets={displayedStep.highlightTargets} />
            )}

            {/* Highlight for hovered "next steps" item */}
            {(hoveredTarget || flashTarget) && (
                <TutorialHighlight targets={[flashTarget || hoveredTarget!]} flash={!!flashTarget} />
            )}

            {/* Instruction panel */}
            <div ref={panelRef} style={posStyle}>
                <div
                    style={{
                        background: 'rgba(0, 0, 0, 0.88)',
                        borderRadius: 8,
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        padding: '10px 14px',
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                    }}
                >
                    {/* Step counter + lesson title */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {displayedIndex === 0 && (
                                <>
                                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
                                        Tutorial {lesson.id}
                                    </span>
                                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>{'\u2022'}</span>
                                </>
                            )}
                            <span style={{ fontSize: 10, color: 'rgba(103, 232, 249, 0.7)', fontWeight: 600, letterSpacing: '0.05em' }}>
                                {lesson.title}
                            </span>
                        </div>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
                            {displayedIndex + 1} / {totalSteps}
                        </span>
                    </div>

                    {/* Main text */}
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', margin: 0, lineHeight: 1.5 }}>
                        {displayedStep.text}
                    </p>

                    {/* Subtext */}
                    {displayedStep.subtext && (
                        <p style={{ fontSize: 12, color: 'rgba(103, 232, 249, 0.75)', margin: '4px 0 0', lineHeight: 1.5 }}>
                            {displayedStep.subtext.split('\n').map((line, i, arr) => (
                                <React.Fragment key={i}>{line}{i < arr.length - 1 && <br />}</React.Fragment>
                            ))}
                        </p>
                    )}

                    {/* Key caps display */}
                    {displayedStep.showKeys && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {displayedStep.showKeys.map(k => (
                                <KeyCap key={k} label={k} pressed={pressedKeys.has(k.toLowerCase())} />
                            ))}
                        </div>
                    )}

                    {/* Next steps interactive list */}
                    {displayedStep.nextStepsMode && (
                        <div style={{ marginTop: 8 }}>
                            {NEXT_STEPS_ITEMS.map((item) => (
                                <div
                                    key={item.target}
                                    onMouseEnter={() => setHoveredTarget(item.target)}
                                    onMouseLeave={() => setHoveredTarget(null)}
                                    onClick={() => handleNextStepClick(item.target)}
                                    style={{
                                        fontSize: 11,
                                        color: hoveredTarget === item.target ? 'rgba(103, 232, 249, 1)' : 'rgba(255,255,255,0.7)',
                                        padding: '3px 0',
                                        cursor: 'pointer',
                                        transition: 'color 0.15s',
                                    }}
                                >
                                    {'\u2022'} {item.label}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                        {!isLastStep && (
                            <button
                                onClick={skipTutorial}
                                style={{
                                    fontSize: 10,
                                    color: 'rgba(255,255,255,0.4)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                            >
                                Skip Tutorial
                            </button>
                        )}
                        {/* Last step with a continue-chain: show Finish + Continue as separate buttons */}
                        {isLastStep && displayedStep.autoStartLesson ? (
                            <>
                                <button
                                    onClick={completeTutorial}
                                    style={{
                                        fontSize: 10,
                                        color: 'rgba(255,255,255,0.4)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px 8px',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                                >
                                    Finish
                                </button>
                                <button
                                    onClick={advanceTutorialStep}
                                    style={{
                                        fontSize: 10,
                                        color: 'rgba(103, 232, 249, 0.9)',
                                        background: 'rgba(103, 232, 249, 0.1)',
                                        border: '1px solid rgba(103, 232, 249, 0.3)',
                                        borderRadius: 4,
                                        cursor: 'pointer',
                                        padding: '4px 12px',
                                        fontWeight: 600,
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(103, 232, 249, 0.2)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(103, 232, 249, 0.1)'; }}
                                >
                                    {displayedStep.buttonLabel ?? 'Continue'}
                                </button>
                            </>
                        ) : (displayedStep.trigger.kind === 'manual' || displayedStep.allowManual) && (
                            <button
                                onClick={isLastStep ? completeTutorial : advanceTutorialStep}
                                style={{
                                    fontSize: 10,
                                    color: 'rgba(103, 232, 249, 0.9)',
                                    background: 'rgba(103, 232, 249, 0.1)',
                                    border: '1px solid rgba(103, 232, 249, 0.3)',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    padding: '4px 12px',
                                    fontWeight: 600,
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(103, 232, 249, 0.2)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(103, 232, 249, 0.1)'; }}
                            >
                                {isLastStep ? 'Finish' : displayedStep.buttonLabel ?? (displayedStep.beginButton ? 'Begin' : 'Next')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default TutorialOverlay;
