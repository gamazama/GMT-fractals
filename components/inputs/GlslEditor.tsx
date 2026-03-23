/**
 * GlslEditor — Lightweight GLSL code editor using CodeMirror 6.
 * Uses C++ syntax highlighting (GLSL is C-like: same keywords, types, comments).
 *
 * Supports optional inline highlights with click-to-promote behaviour
 * for the Formula Workshop's variable detector.
 */

import React, { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, StateField, StateEffect, type Extension } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';

// ── Highlight types ──────────────────────────────────────────────────────────

export interface EditorHighlight {
    /** Char offset start */
    from: number;
    /** Char offset end */
    to: number;
    /** Unique id — returned on click */
    id: string;
    /** CSS class suffix, e.g. 'dv-scale' → '.cm-dv-scale' */
    colorClass?: string;
    /** Tooltip shown on hover */
    tooltip?: string;
}

// ── CodeMirror plumbing for decorations ──────────────────────────────────────

const setHighlightsEffect = StateEffect.define<EditorHighlight[]>();

const highlightField = StateField.define<DecorationSet>({
    create() { return Decoration.none; },
    update(decos, tr) {
        // Apply position mapping for doc changes
        decos = decos.map(tr.changes);
        for (const e of tr.effects) {
            if (e.is(setHighlightsEffect)) {
                const builder: { from: number; to: number; value: Decoration }[] = [];
                for (const h of e.value) {
                    if (h.from >= 0 && h.to <= tr.state.doc.length && h.from < h.to) {
                        builder.push({
                            from: h.from,
                            to: h.to,
                            value: Decoration.mark({
                                class: `cm-dv-highlight ${h.colorClass ? `cm-${h.colorClass}` : ''}`,
                                attributes: {
                                    'data-dv-id': h.id,
                                    ...(h.tooltip ? { title: h.tooltip } : {}),
                                },
                            }),
                        });
                    }
                }
                // Sort by from position (required by RangeSet)
                builder.sort((a, b) => a.from - b.from || a.to - b.to);
                decos = Decoration.set(builder.map(b => b.value.range(b.from, b.to)));
            }
        }
        return decos;
    },
    provide: f => EditorView.decorations.from(f),
});

// ── Highlight theme ──────────────────────────────────────────────────────────

const highlightTheme = EditorView.theme({
    '.cm-dv-highlight': {
        cursor: 'pointer',
        borderRadius: '2px',
        padding: '0 1px',
        transition: 'background-color 0.15s, box-shadow 0.15s',
    },
    '.cm-dv-highlight:hover': {
        filter: 'brightness(1.3)',
        boxShadow: '0 0 6px rgba(255,255,255,0.2)',
    },
    // Color classes
    '.cm-dv-define':  { backgroundColor: 'rgba(244,114,182,0.25)', borderBottom: '1px dashed rgba(244,114,182,0.6)' },  // pink
    '.cm-dv-iter':    { backgroundColor: 'rgba(96,165,250,0.25)',  borderBottom: '1px dashed rgba(96,165,250,0.6)' },   // blue
    '.cm-dv-vec':     { backgroundColor: 'rgba(34,211,238,0.25)',  borderBottom: '1px dashed rgba(34,211,238,0.6)' },   // cyan
    '.cm-dv-scale':   { backgroundColor: 'rgba(74,222,128,0.25)',  borderBottom: '1px dashed rgba(74,222,128,0.6)' },   // green
    '.cm-dv-rot':     { backgroundColor: 'rgba(192,132,252,0.25)', borderBottom: '1px dashed rgba(192,132,252,0.6)' },  // purple
    '.cm-dv-clamp':   { backgroundColor: 'rgba(250,204,21,0.25)',  borderBottom: '1px dashed rgba(250,204,21,0.6)' },   // yellow
    '.cm-dv-sphere':  { backgroundColor: 'rgba(251,146,60,0.25)',  borderBottom: '1px dashed rgba(251,146,60,0.6)' },   // orange
    '.cm-dv-magic':   { backgroundColor: 'rgba(156,163,175,0.2)',  borderBottom: '1px dashed rgba(156,163,175,0.5)' },  // gray
    '.cm-dv-local':   { backgroundColor: 'rgba(251,191,36,0.25)',  borderBottom: '1px dashed rgba(251,191,36,0.6)' },   // amber
});

// ── Component ────────────────────────────────────────────────────────────────

interface GlslEditorProps {
    value: string;
    onChange: (value: string) => void;
    height?: string;
    readOnly?: boolean;
    placeholder?: string;
    /** Optional inline highlights (e.g. detected variables) */
    highlights?: EditorHighlight[];
    /** Called when a highlight is clicked */
    onHighlightClick?: (id: string) => void;
}

export const GlslEditor: React.FC<GlslEditorProps> = ({
    value,
    onChange,
    height = '176px', // matches h-44 (11rem)
    readOnly = false,
    placeholder,
    highlights,
    onHighlightClick,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef      = useRef<EditorView | null>(null);
    const onChangeRef  = useRef(onChange);
    onChangeRef.current = onChange;
    const onHighlightClickRef = useRef(onHighlightClick);
    onHighlightClickRef.current = onHighlightClick;

    // Track whether the update is coming from outside (prop change) vs inside (user edit)
    const externalUpdateRef = useRef(false);

    useEffect(() => {
        if (!containerRef.current) return;

        const state = EditorState.create({
            doc: value,
            extensions: [
                basicSetup,
                cpp(),
                oneDark,
                highlightField,
                highlightTheme,
                EditorView.updateListener.of(update => {
                    if (update.docChanged && !externalUpdateRef.current) {
                        onChangeRef.current(update.state.doc.toString());
                    }
                }),
                // Click handler for highlight decorations
                EditorView.domEventHandlers({
                    click(event, view) {
                        const target = event.target as HTMLElement;
                        const dvId = target?.getAttribute?.('data-dv-id')
                            ?? target?.closest?.('[data-dv-id]')?.getAttribute('data-dv-id');
                        if (dvId && onHighlightClickRef.current) {
                            event.preventDefault();
                            event.stopPropagation();
                            onHighlightClickRef.current(dvId);
                            return true;
                        }
                        return false;
                    },
                }),
                // Use EditorState.readOnly (not EditorView.editable) so text remains
                // selectable and copyable in read-only mode.
                ...(readOnly ? [EditorState.readOnly.of(true)] : [] as Extension[]),
                EditorView.theme({
                    '&': {
                        fontSize: '11px',
                        backgroundColor: 'transparent',
                        height: height,
                        borderRadius: '8px',
                        overflow: 'hidden',
                    },
                    '.cm-scroller': {
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        overflowY: 'auto',
                        height: '100%',
                    },
                    '.cm-content': {
                        padding: '12px',
                        minHeight: height,
                    },
                    '.cm-focused': { outline: 'none' },
                    '.cm-line': { padding: '0' },
                    // Match GMT dark UI
                    '&.cm-editor': { backgroundColor: 'rgba(0,0,0,0.4)' },
                    '&.cm-editor.cm-focused': { outline: '1px solid rgba(255,255,255,0.3)' },
                    '.cm-gutters': { backgroundColor: 'rgba(0,0,0,0.3)', borderRight: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)' },
                    '.cm-activeLineGutter': { backgroundColor: 'rgba(255,255,255,0.04)' },
                    '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.03)' },
                    '.cm-placeholder': { color: 'rgba(156,163,175,0.4)', fontStyle: 'italic' },
                }),
                ...(placeholder ? [EditorView.contentAttributes.of({ 'data-placeholder': placeholder })] : []),
            ],
        });

        const view = new EditorView({ state, parent: containerRef.current });
        viewRef.current = view;

        return () => {
            view.destroy();
            viewRef.current = null;
        };
    // Only run on mount/unmount — value updates handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [readOnly, height]);

    // Sync external value changes into the editor without triggering onChange
    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;
        const current = view.state.doc.toString();
        if (current === value) return;
        externalUpdateRef.current = true;
        view.dispatch({
            changes: { from: 0, to: current.length, insert: value },
        });
        externalUpdateRef.current = false;
    }, [value]);

    // Sync highlight decorations into CodeMirror
    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;
        view.dispatch({
            effects: setHighlightsEffect.of(highlights ?? []),
        });
    }, [highlights]);

    // Prevent keyboard events from bubbling to camera/navigation handlers.
    // CodeMirror uses contentEditable divs, not <input>/<textarea>, so many
    // global listeners don't recognise it as a text editing context.
    const stopPropagation = (e: React.KeyboardEvent) => e.stopPropagation();

    return (
        <div
            ref={containerRef}
            onKeyDown={stopPropagation}
            onKeyUp={stopPropagation}
            className="w-full border border-white/10 rounded-lg overflow-hidden focus-within:border-white/30 transition-colors"
            style={{ height }}
        />
    );
};
