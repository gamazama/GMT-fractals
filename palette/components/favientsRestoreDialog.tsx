/**
 * favientsRestoreDialog — the Replace / Append / Omit choice shown when a loaded
 * scene carries gradient favourites (W8 document restore).
 *
 * Imperative + self-mounting: `showFavientsRestoreDialog(opts)` returns a Promise
 * resolving to the user's choice and lazily creates its own React root on
 * document.body the first time it's needed. This keeps the whole flow inside
 * `palette/` — no host component to wire into each app shell (the Gradient
 * Explorer AND app-gmt get it for free), and it stays host-agnostic.
 *
 * It replaces the earlier two-option `window.confirm`: that could only express
 * OK/Cancel, and ran synchronously inside loadPreset (freezing the load). This
 * is async — the scene finishes loading, then the dialog appears over it.
 *
 * @see palette/store/favientsDocument.ts (the caller — computes the counts)
 */

import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Modal } from '../../components/ui/Modal';

export type FavientsRestoreChoice = 'append' | 'replace' | 'omit';

export interface FavientsRestoreOpts {
    /** Gradients in the scene that aren't already on the shelf. */
    newCount: number;
    /** Favourites on the shelf that the scene doesn't contain. */
    extraCount: number;
    /** Total well-formed gradients the scene carries. */
    sceneCount: number;
}

let _root: Root | null = null;
const ensureRoot = (): Root => {
    if (!_root) {
        const container = document.createElement('div');
        container.dataset.favientsRestoreHost = '';
        document.body.appendChild(container);
        _root = createRoot(container);
    }
    return _root;
};

/**
 * Show the choice dialog. Resolves to:
 *   'append'  — merge the scene's gradients into the shelf (dedup by content)
 *   'replace' — overwrite the shelf with the scene's gradients
 *   'omit'    — keep the current shelf untouched (also the Escape/backdrop default)
 *
 * `Append` is only offered when there's something new to add (`newCount > 0`);
 * when the shelf already contains everything the scene has but also has extras,
 * only Replace/Omit make sense.
 */
export const showFavientsRestoreDialog = (opts: FavientsRestoreOpts): Promise<FavientsRestoreChoice> =>
    new Promise((resolve) => {
        const root = ensureRoot();
        const finish = (choice: FavientsRestoreChoice) => {
            root.render(null);
            resolve(choice);
        };
        root.render(<FavientsRestoreCard {...opts} onChoose={finish} />);
    });

const FavientsRestoreCard: React.FC<FavientsRestoreOpts & { onChoose: (c: FavientsRestoreChoice) => void }> = ({
    newCount,
    extraCount,
    sceneCount,
    onChoose,
}) => {
    const canAppend = newCount > 0;
    const headline =
        newCount > 0
            ? `This scene includes ${newCount} gradient${newCount === 1 ? '' : 's'} not in your Favients.`
            : `This scene's ${sceneCount} gradient${sceneCount === 1 ? ' is' : 's are'} already in your Favients,` +
              ` but your shelf has ${extraCount} more.`;

    const btn = 'px-3 py-1.5 rounded text-xs font-medium transition-colors';
    return (
        <Modal onClose={() => onChoose('omit')} labelledBy="favients-restore-title">
            <div
                className="w-[22rem] max-w-[90vw] rounded-lg border border-white/10 bg-gray-900 p-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="favients-restore-title" className="text-sm font-semibold text-gray-100">
                    Saved gradients in this scene
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-gray-400">{headline}</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                    {canAppend
                        ? 'Append adds them (keeping yours), Replace swaps your shelf for the scene’s, Omit keeps your shelf as-is.'
                        : 'Replace swaps your shelf for the scene’s, Omit keeps your shelf as-is.'}
                </p>
                <div className="mt-4 flex justify-end gap-2">
                    <button
                        type="button"
                        className={`${btn} text-gray-300 hover:text-white hover:bg-white/10`}
                        onClick={() => onChoose('omit')}
                    >
                        Omit
                    </button>
                    <button
                        type="button"
                        className={`${btn} text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30`}
                        onClick={() => onChoose('replace')}
                    >
                        Replace
                    </button>
                    {canAppend && (
                        <button
                            type="button"
                            className={`${btn} text-cyan-100 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40`}
                            onClick={() => onChoose('append')}
                        >
                            Append
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
};
