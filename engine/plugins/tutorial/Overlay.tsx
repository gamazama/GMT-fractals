/**
 * Tutorial overlay — chrome (lesson title, step counter, advance buttons)
 * + custom-renderer dispatch. Card placement is computed from anchor
 * bounds (highlightTargets[0] for vertical center, optional positionTarget
 * for horizontal). Apps register custom step kinds via `stepRenderers`.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEngineStore } from '../../../store/engineStore';
import { tutorAnchors } from './anchors';
import { onKeyPressed } from './triggers';
import { stepRenderers } from './stepRenderers';
import { TutorialHighlight } from './Highlight';
import type { TutorialStep, TutorialLesson, PositionConfig } from './types';
import { getLesson } from './lessons';

interface PanelPosition { left: number; top: number; }

const PANEL_WIDTH = 360;
const PANEL_MARGIN = 14;
const TRANSITION_MS = 200;

function resolveVerticalCenter(targets: string[] | undefined): number | null {
    if (!targets) return null;
    for (const t of targets) {
        const entry = tutorAnchors.get(t);
        if (!entry) continue;
        const r = entry.el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return r.top + r.height / 2;
    }
    return null;
}

function computePosition(targets: string[] | undefined, pos?: PositionConfig): PanelPosition | null {
    const ptArr: string[] = pos?.target
        ? (Array.isArray(pos.target) ? pos.target : [pos.target])
        : [];
    const list = ptArr.length > 0 ? [...ptArr, ...(targets ?? [])] : (targets ?? []);
    if (list.length === 0) return null;

    const highlightCenterY = ptArr.length > 0 ? resolveVerticalCenter(targets) : null;

    for (const target of list) {
        const entry = tutorAnchors.get(target);
        if (!entry) continue;
        const r = entry.el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;

        const centerX = r.left + r.width / 2;
        const centerY = (ptArr.length > 0 && ptArr.includes(target) && highlightCenterY !== null)
            ? highlightCenterY
            : r.top + r.height / 2;
        const spaceLeft = r.left;
        const spaceRight = window.innerWidth - r.right;
        const spaceBelow = window.innerHeight - r.bottom;

        const isTopBar = r.top < 120 && r.height < 80;
        const skipSides = isTopBar || pos?.side === 'below';

        if (!skipSides && spaceLeft > PANEL_WIDTH + PANEL_MARGIN * 2) {
            return { left: r.left - PANEL_WIDTH - PANEL_MARGIN, top: Math.max(PANEL_MARGIN, Math.min(centerY - 60, window.innerHeight - 200)) };
        } else if (!skipSides && spaceRight > PANEL_WIDTH + PANEL_MARGIN * 2) {
            return { left: r.right + PANEL_MARGIN, top: Math.max(PANEL_MARGIN, Math.min(centerY - 60, window.innerHeight - 200)) };
        } else if (spaceBelow > 120) {
            const leftPos = pos?.align === 'start'
                ? Math.max(PANEL_MARGIN, Math.min(r.left, window.innerWidth - PANEL_WIDTH - PANEL_MARGIN))
                : Math.max(PANEL_MARGIN, Math.min(centerX - PANEL_WIDTH / 2, window.innerWidth - PANEL_WIDTH - PANEL_MARGIN));
            return { left: leftPos, top: r.bottom + PANEL_MARGIN };
        } else {
            if (spaceLeft > PANEL_WIDTH + PANEL_MARGIN * 2) {
                return { left: r.left - PANEL_WIDTH - PANEL_MARGIN, top: Math.max(PANEL_MARGIN, Math.min(centerY - 60, window.innerHeight - 200)) };
            }
            return {
                left: Math.max(PANEL_MARGIN, Math.min(centerX - PANEL_WIDTH / 2, window.innerWidth - PANEL_WIDTH - PANEL_MARGIN)),
                top: Math.max(PANEL_MARGIN, r.top - 160),
            };
        }
    }
    return null;
}

const KeyCap: React.FC<{ label: string; pressed: boolean }> = ({ label, pressed }) => (
    <span style={{
        display: 'inline-block', padding: '2px 7px', margin: '0 2px',
        fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
        borderRadius: 4,
        border: `1px solid ${pressed ? 'rgba(103,232,249,0.8)' : 'rgba(255,255,255,0.25)'}`,
        background: pressed ? 'rgba(103,232,249,0.25)' : 'rgba(255,255,255,0.08)',
        color: pressed ? 'rgba(103,232,249,1)' : 'rgba(255,255,255,0.7)',
        transition: 'all 0.15s ease',
        transform: pressed ? 'scale(1.1)' : 'scale(1)',
        boxShadow: pressed ? '0 0 8px rgba(103,232,249,0.3)' : 'none',
        minWidth: 22, textAlign: 'center' as const,
    }}>{label}</span>
);

// Default text-card body. Custom step kinds replace this entirely.
const TextStepBody: React.FC<{ step: TutorialStep; pressedKeys: Set<string> }> = ({ step, pressedKeys }) => (
    <>
        {step.text && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', margin: 0, lineHeight: 1.5 }}>
                {step.text}
            </p>
        )}
        {step.subtext && (
            <p style={{ fontSize: 12, color: 'rgba(103, 232, 249, 0.75)', margin: '4px 0 0', lineHeight: 1.5 }}>
                {step.subtext.split('\n').map((line, i, arr) => (
                    <React.Fragment key={i}>{line}{i < arr.length - 1 && <br />}</React.Fragment>
                ))}
            </p>
        )}
        {step.showKeys && (
            <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {step.showKeys.map((k) => (
                    <KeyCap key={k} label={k} pressed={pressedKeys.has(k.toLowerCase())} />
                ))}
            </div>
        )}
    </>
);

/** Outer gate — subscribes to a single store field. When no lesson is
 *  active (the common case), no further work happens and TutorialOverlayInner
 *  isn't even mounted, so its 5 selectors don't subscribe to the store. */
export const TutorialOverlay: React.FC = () => {
    const tutorialActive = useEngineStore((s: any) => s.tutorialActive);
    if (!tutorialActive) return null;
    return <TutorialOverlayInner />;
};

const TutorialOverlayInner: React.FC = () => {
    const lessonId = useEngineStore((s: any) => s.tutorialLessonId);
    const stepIndex = useEngineStore((s: any) => s.tutorialStepIndex);
    const skipTutorial = useEngineStore((s: any) => s.skipTutorial);
    const completeTutorial = useEngineStore((s: any) => s.completeTutorial);
    const advanceTutorialStep = useEngineStore((s: any) => s.advanceTutorialStep);

    const lesson: TutorialLesson | null = lessonId != null ? getLesson(lessonId) ?? null : null;
    const step: TutorialStep | null = lesson && stepIndex < lesson.steps.length ? lesson.steps[stepIndex] : null;

    const [pos, setPos] = useState<PanelPosition | null>(null);
    const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

    const [visible, setVisible] = useState(true);
    const [displayedStep, setDisplayedStep] = useState<TutorialStep | null>(null);
    const [displayedIndex, setDisplayedIndex] = useState(0);
    const prevStepIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!step) { setDisplayedStep(null); return; }
        if (step.id === prevStepIdRef.current) return;
        if (prevStepIdRef.current !== null) {
            setVisible(false);
            const t = setTimeout(() => {
                setDisplayedStep(step);
                setDisplayedIndex(stepIndex);
                setPressedKeys(new Set());
                setVisible(true);
                prevStepIdRef.current = step.id;
            }, TRANSITION_MS);
            return () => clearTimeout(t);
        } else {
            setDisplayedStep(step);
            setDisplayedIndex(stepIndex);
            prevStepIdRef.current = step.id;
        }
    }, [step?.id, stepIndex]);

    useEffect(() => {
        if (!displayedStep?.showKeys) return undefined;
        return onKeyPressed((key) => {
            const k = key.toLowerCase();
            setPressedKeys((prev) => {
                const next = new Set(prev);
                next.add(k);
                setTimeout(() => setPressedKeys((p) => {
                    const n = new Set(p); n.delete(k); return n;
                }), 400);
                return next;
            });
        });
    }, [displayedStep?.id]);

    const updatePos = useCallback(() => {
        if (!displayedStep) return;
        setPos(computePosition(displayedStep.highlightTargets, displayedStep.position));
    }, [displayedStep?.id, displayedStep?.highlightTargets, displayedStep?.position]);

    // Observe target elements for layout changes. ResizeObserver fires
    // when an anchor's size changes; window resize + scroll catch
    // viewport-level shifts; the anchor registry's own subscribe covers
    // anchor (un)registration. No polling fallback — if a layout change
    // bypasses all three (e.g. a CSS transform animation on an ancestor)
    // the card lags by one anchor-mutation, which is acceptable.
    useEffect(() => {
        updatePos();
        const ro = new ResizeObserver(updatePos);
        const targets = displayedStep
            ? [
                ...(displayedStep.highlightTargets ?? []),
                ...(displayedStep.position?.target
                    ? (Array.isArray(displayedStep.position.target) ? displayedStep.position.target : [displayedStep.position.target])
                    : []),
            ]
            : [];
        for (const id of targets) {
            for (const entry of tutorAnchors.getAll(id)) ro.observe(entry.el);
        }
        window.addEventListener('resize', updatePos);
        window.addEventListener('scroll', updatePos, { passive: true, capture: true });
        const unsub = tutorAnchors.subscribe(updatePos);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', updatePos);
            window.removeEventListener('scroll', updatePos, true);
            unsub();
        };
    }, [updatePos, displayedStep?.id]);

    if (!lesson || !displayedStep) return null;

    const totalSteps = lesson.steps.length;
    const isLastStep = displayedIndex === totalSteps - 1;
    const offsetX = displayedStep.position?.offset?.x ?? 0;
    const offsetY = displayedStep.position?.offset?.y ?? 0;

    const posStyle: React.CSSProperties = pos
        ? {
            position: 'fixed', left: pos.left + offsetX, top: pos.top + offsetY,
            zIndex: 9998, pointerEvents: 'auto', width: PANEL_WIDTH,
            transition: `left ${TRANSITION_MS}ms ease, top ${TRANSITION_MS}ms ease, opacity ${TRANSITION_MS}ms ease`,
            opacity: visible ? 1 : 0,
        }
        : {
            position: 'fixed', bottom: 60, left: '50%', transform: 'translateX(-50%)',
            zIndex: 9998, pointerEvents: 'auto', maxWidth: PANEL_WIDTH, width: '90vw',
            transition: `opacity ${TRANSITION_MS}ms ease`, opacity: visible ? 1 : 0,
        };

    // Renderer dispatch — custom kinds replace TextStepBody.
    const kind = displayedStep.kind ?? 'text';
    const renderer = kind !== 'text' ? stepRenderers.get(kind) : undefined;
    const body = renderer
        ? renderer.render(displayedStep, {
            lesson, stepIndex: displayedIndex, isLastStep,
            advance: advanceTutorialStep, skip: skipTutorial, complete: completeTutorial,
            pressedKeys,
        })
        : <TextStepBody step={displayedStep} pressedKeys={pressedKeys} />;

    return (
        <>
            {displayedStep.highlightTargets && displayedStep.highlightTargets.length > 0 && (
                <TutorialHighlight targets={displayedStep.highlightTargets} />
            )}
            <div style={posStyle}>
                <div style={{
                    background: 'rgba(0, 0, 0, 0.88)', borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.15)', padding: '10px 14px',
                    backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {displayedIndex === 0 && (
                                <>
                                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
                                        Tutorial {lesson.id}
                                    </span>
                                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>{'•'}</span>
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

                    {body}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                        {!isLastStep && (
                            <button onClick={skipTutorial} style={{
                                fontSize: 10, color: 'rgba(255,255,255,0.4)', background: 'none',
                                border: 'none', cursor: 'pointer', padding: '4px 8px',
                            }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
                                Skip Tutorial
                            </button>
                        )}
                        {isLastStep && displayedStep.autoStartLesson ? (
                            <>
                                <button onClick={completeTutorial} style={{
                                    fontSize: 10, color: 'rgba(255,255,255,0.4)', background: 'none',
                                    border: 'none', cursor: 'pointer', padding: '4px 8px',
                                }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
                                    Finish
                                </button>
                                <button onClick={advanceTutorialStep} style={primaryBtnStyle}>
                                    {displayedStep.buttonLabel ?? 'Continue'}
                                </button>
                            </>
                        ) : (displayedStep.trigger.kind === 'manual' || displayedStep.allowManual) && (
                            <button onClick={isLastStep ? completeTutorial : advanceTutorialStep} style={primaryBtnStyle}>
                                {isLastStep ? 'Finish' : displayedStep.buttonLabel ?? (displayedStep.beginButton ? 'Begin' : 'Next')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

const primaryBtnStyle: React.CSSProperties = {
    fontSize: 10, color: 'rgba(103, 232, 249, 0.9)',
    background: 'rgba(103, 232, 249, 0.1)', border: '1px solid rgba(103, 232, 249, 0.3)',
    borderRadius: 4, cursor: 'pointer', padding: '4px 12px', fontWeight: 600,
};
