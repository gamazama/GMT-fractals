/**
 * GlslEditor — Lightweight GLSL code editor using CodeMirror 6.
 * Uses C++ syntax highlighting (GLSL is C-like: same keywords, types, comments).
 */

import React, { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, type Extension } from '@codemirror/state';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';

interface GlslEditorProps {
    value: string;
    onChange: (value: string) => void;
    height?: string;
    readOnly?: boolean;
    placeholder?: string;
}

export const GlslEditor: React.FC<GlslEditorProps> = ({
    value,
    onChange,
    height = '176px', // matches h-44 (11rem)
    readOnly = false,
    placeholder,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef      = useRef<EditorView | null>(null);
    const onChangeRef  = useRef(onChange);
    onChangeRef.current = onChange;

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
                EditorView.updateListener.of(update => {
                    if (update.docChanged && !externalUpdateRef.current) {
                        onChangeRef.current(update.state.doc.toString());
                    }
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
