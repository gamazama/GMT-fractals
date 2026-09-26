/**
 * lazyWithFallback — `React.lazy` that survives its code failing to download.
 *
 * A lazily-imported surface fetches its module the first time it renders. When
 * that fetch fails, `React.lazy` throws the rejection during render, and with
 * one root boundary (`engine/components/AppErrorBoundary.tsx`, deliberately the
 * only one) the whole app is replaced by the crash page — for a panel the user
 * merely opened. Two real ways the fetch fails, neither a bug in the panel:
 *   - production: a deploy replaced the hashed chunks while a tab was open (the
 *     service worker claims clients immediately — see vite.config.ts's VitePWA
 *     block), so the old tab asks for a file that no longer exists. Reported
 *     2026-09-20: an un-updated user crashed entering the gradient editor.
 *   - dev: the Vite server stopped, then a not-yet-opened panel was opened.
 * So a LOAD failure resolves to a small in-place notice with a Reload button,
 * and the rest of the app keeps running (unsaved work stays reachable; Reload
 * goes through the page's own beforeunload guard, where it has one).
 *
 * Integration: use it exactly like `React.lazy`, inside the same `<Suspense>`.
 * `label` names the surface in the notice ("The gradient editor").
 *
 * Pitfalls:
 *   - Only load failures are caught (`isModuleLoadFailure`). A module that
 *     downloads but throws while evaluating, or a component that throws while
 *     rendering, is a real bug and still reaches the root boundary — so it
 *     still fails `smoke:boot`. Widening the catch would hide those.
 *   - `React.lazy` memoises its first outcome: after a failure the notice stays
 *     until the page reloads, even if the server comes back. That is intended —
 *     the running page belongs to the old build / server session anyway.
 *   - The regex matches the three engines' wording for a failed module fetch,
 *     plus Vite's preload failure. A browser that words it differently falls
 *     through to the root boundary (today's behaviour), not to a silent notice.
 *
 * Pure: no store, no `<Layer>` — the notice renders in place, in whatever the
 * lazy surface was mounted in.
 *
 * @invariant Opening a lazily-imported surface whose code can't be fetched
 *   shows the notice and leaves the app running. Proven by:
 *   `npm run smoke:lazy-fallback` ("app survived — no root-boundary error") —
 *   falsified 2026-09-25 by putting AutoFeaturePanel back on plain
 *   `React.lazy` and watching the step go red with the boundary's error.
 */
import React from 'react';

/** True for "the module's code could not be downloaded", across engines. */
export const isModuleLoadFailure = (error: unknown): boolean => {
    const message = error instanceof Error ? error.message : String(error);
    return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload/i.test(message);
};

const LoadFailedNotice: React.FC<{ label: string }> = ({ label }) => (
    <div role="alert" className="m-2 rounded border border-warn/40 bg-warn/10 px-3 py-2 text-[11px] leading-snug text-fg-secondary">
        <div className="font-bold text-warn">{label} couldn't load.</div>
        <div className="mt-1 text-fg-muted">
            The app may have been updated since this page opened, or its server can't be reached.
        </div>
        <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 rounded border border-line/20 bg-line/5 px-2 py-1 text-[11px] font-bold text-fg hover:bg-line/10"
        >
            Reload
        </button>
    </div>
);

export function lazyWithFallback<T extends React.ComponentType<any>>(
    loader: () => Promise<{ default: T }>,
    label = 'This panel',
): React.LazyExoticComponent<T> {
    return React.lazy(() => loader().catch((error: unknown) => {
        if (!isModuleLoadFailure(error)) throw error;
        console.warn(`[lazyWithFallback] ${label} couldn't load its code — showing the reload notice.`, error);
        const Notice = () => <LoadFailedNotice label={label} />;
        return { default: Notice as unknown as T };
    }));
}
