/**
 * AppErrorBoundary — the one root-level React error boundary. Mount it as the
 * outermost element of every app entry (`app-gmt/main.tsx`, `fluid-toy/main.tsx`,
 * `fractal-toy/main.tsx`, `gradient-explorer/main.tsx`, `mesh-export/main.tsx`) so a render-time throw
 * anywhere in the tree — plugin-mounted panels included — degrades to a visible
 * page with the error message and a Reload button, instead of React unmounting
 * the whole root (white screen, no diagnostic, unsaved work gone — the failure
 * mode plans/overnight-audit/PROPOSALS.md records under "Pre-2026-04-25 scene
 * files killed the app").
 *
 * Pure on purpose: zero store imports, zero theme tokens, no `<Layer>` / z-index.
 * This is the one component that has to render when the thing that just broke
 * may be the store, the colour-scheme machinery or a portal host, so it depends
 * on nothing but React. Colours are inline for that reason, not as a style
 * choice. When the fallback shows, the children are gone, so it IS the page —
 * nothing to stack against.
 *
 * What it does with a caught error:
 *   - `console.error('[AppErrorBoundary] …', error, componentStack)`
 *   - `window.__lastBoundaryError = error` — read by `debug/smoke-boot.mts`.
 *
 * @invariant A render throw caught here still fails `npm run smoke:boot`; the
 *   boundary never turns a boot-breaking error into a green smoke. Proven by:
 *   `npm run smoke:boot` ("boundary caught: <message>" under Errors, exit 1) —
 *   falsified 2026-09-02 by throwing from a child of the boundary in
 *   app-gmt/main.tsx and watching the smoke go red.
 *
 * @assumption Pre-mount throws are NOT covered by React. In `app-gmt/main.tsx`,
 *   `useEngineStore.getState().loadScene({ preset: bootPreset })` runs inside
 *   `resolveBootPreset().then(...)` BEFORE `ReactDOM.createRoot(...).render(...)`,
 *   so no tree exists to catch it. That one call site wraps itself in try/catch
 *   and hands the error in as `initialError`, which renders this same fallback.
 *   Everything else that runs pre-mount is still a blank page if it throws: a
 *   rejection of `resolveBootPreset()` itself, the module-level `install*()`
 *   chain above it, fluid-toy's `loadPreset?.(incomingScene)`, fractal-toy's
 *   `setupFractalToy()`, gradient-explorer's `wireGradientExplorer()`.
 *
 * Per-panel boundaries are deliberately absent — one root boundary only
 * (plans/overnight-audit/TRIAGE-2026-08-02.md, L1816).
 */
import React from 'react';

declare global {
    interface Window {
        /** Last error the root boundary caught (or was handed as `initialError`). */
        __lastBoundaryError?: unknown;
    }
}

export interface AppErrorBoundaryProps {
    /**
     * An error that happened before React mounted (the app-gmt boot-preset load).
     * When set, the fallback renders on first paint instead of the children.
     * The caller is expected to have logged it already.
     */
    initialError?: unknown;
    children?: React.ReactNode;
}

interface AppErrorBoundaryState {
    caught: boolean;
    error: unknown;
}

function publish(error: unknown): void {
    if (typeof window !== 'undefined') window.__lastBoundaryError = error;
}

function describe(error: unknown): { message: string; stack: string | null } {
    if (error instanceof Error) {
        return { message: `${error.name}: ${error.message}`, stack: error.stack ?? null };
    }
    return { message: String(error), stack: null };
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
    constructor(props: AppErrorBoundaryProps) {
        super(props);
        const hasInitial = props.initialError !== undefined && props.initialError !== null;
        this.state = { caught: hasInitial, error: hasInitial ? props.initialError : null };
    }

    static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
        return { caught: true, error };
    }

    componentDidMount(): void {
        if (this.state.caught) publish(this.state.error);
    }

    componentDidCatch(error: unknown, info: React.ErrorInfo): void {
        console.error(
            '[AppErrorBoundary] A component threw during render; showing the fallback page instead of the app.',
            error,
            info.componentStack,
        );
        publish(error);
    }

    render(): React.ReactNode {
        if (!this.state.caught) return this.props.children;
        return <AppErrorFallback error={this.state.error} />;
    }
}

const S = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        boxSizing: 'border-box',
        background: '#0b0d12',
        color: '#e6e8ee',
        fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
    },
    card: {
        width: '100%',
        maxWidth: 640,
        padding: 24,
        borderRadius: 12,
        border: '1px solid rgba(255, 96, 96, 0.5)',
        background: '#151821',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    },
    title: { margin: '0 0 8px', fontSize: 18, fontWeight: 600 },
    body: { margin: '0 0 16px', fontSize: 13, lineHeight: 1.5, opacity: 0.8 },
    pre: {
        margin: '0 0 16px',
        padding: 12,
        borderRadius: 8,
        background: '#0b0d12',
        fontSize: 12,
        lineHeight: 1.45,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        maxHeight: 240,
        overflow: 'auto',
    },
    button: {
        padding: '8px 16px',
        borderRadius: 8,
        border: '1px solid rgba(255, 255, 255, 0.2)',
        background: '#2a2f3d',
        color: '#e6e8ee',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
    },
} as const satisfies Record<string, React.CSSProperties>;

const AppErrorFallback: React.FC<{ error: unknown }> = ({ error }) => {
    const { message, stack } = describe(error);
    return (
        <div role="alert" style={S.page}>
            <div style={S.card}>
                <h1 style={S.title}>Something broke while drawing the app</h1>
                <p style={S.body}>
                    A component threw an error during render, so the page has been replaced with this
                    notice instead of going blank. Reload to get back to a working app. The full error and
                    component stack are in the browser console.
                </p>
                {/* V8 stacks begin with "Name: message"; JavaScriptCore and SpiderMonkey
                    stacks do NOT — a Safari user pasting this block sent frames and no
                    message (owner, 2026-09-11). So the message leads unless the stack
                    already carries it. */}
                <pre style={S.pre}>{stack ? (stack.startsWith(message) ? stack : `${message}\n${stack}`) : message}</pre>
                <button type="button" style={S.button} onClick={() => window.location.reload()}>
                    Reload
                </button>
            </div>
        </div>
    );
};
