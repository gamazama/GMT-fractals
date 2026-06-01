/**
 * useCatalogData — loads the Workshop formula library + the committed-thumbnail
 * index, then exposes the ~438 thumbnailed frag/DEC entries as CatalogItems for
 * the unified <FormulaPicker>.
 *
 * Only entries that actually have a committed thumbnail (public/thumbnails/frag/
 * index.json) are surfaced — the 438 works+needsLight set, which is NOT
 * derivable from the v3-v4 compat catalog (that only knows pipeline pass/fail).
 *
 * Group builders (sectionGroups / categoryGroups / folderGroups) are pure and
 * memo-friendly: callers wrap them in useMemo keyed on `data`.
 *
 * @see catalogGroups.ts (types + thumbnail-path helper)
 */

import { useEffect, useMemo, useState } from 'react';
import {
    loadLibrary, isLibraryLoaded, getFormulaLibrary,
    type FormulaEntry,
} from '../../features/fragmentarium_import/formula-library';
import {
    type CatalogItem, type CatalogGroup, type CatalogSource, fragThumbSrc,
} from './catalogGroups';

// ── Thumbnail index (module-cached; fetched once per session) ────────────────
let _thumbIndex: Set<string> | null = null;
let _thumbLoading: Promise<Set<string>> | null = null;

function loadThumbIndex(): Promise<Set<string>> {
    if (_thumbIndex) return Promise.resolve(_thumbIndex);
    if (_thumbLoading) return _thumbLoading;
    _thumbLoading = fetch('thumbnails/frag/index.json')
        .then(r => {
            if (!r.ok) throw new Error(`thumb index ${r.status}`);
            return r.json();
        })
        .then((ids: string[]) => { _thumbIndex = new Set(ids); return _thumbIndex!; })
        .catch((e) => {
            // Don't cache the failure — clear _thumbLoading so a later mount
            // retries instead of pinning the catalog to empty for the session.
            console.warn('[useCatalogData] thumb index load failed; will retry:', e);
            _thumbLoading = null;
            return new Set<string>();
        });
    return _thumbLoading;
}

export interface CatalogData {
    ready: boolean;
    /** Thumbnailed frag entries, by display name. */
    frag: CatalogItem[];
    /** Thumbnailed DEC entries, by display name. */
    dec: CatalogItem[];
    byId: Map<string, CatalogItem>;
}

const EMPTY: CatalogData = { ready: false, frag: [], dec: [], byId: new Map() };

function toItem(e: FormulaEntry): CatalogItem {
    return {
        id: e.id, name: e.name, source: e.source,
        thumbSrc: fragThumbSrc(e.id), category: e.category, artist: e.artist,
    };
}

const byName = (a: CatalogItem, b: CatalogItem) => a.name.localeCompare(b.name);

/** Load the catalog library + thumbnail index and expose the catalog entries.
 *  Returns `{ ready: false }` until loaded.
 *
 *  @param opts.thumbnailedOnly  When true (default) only the ~438 entries with a
 *    committed thumbnail are surfaced — for the main picker, so every card has
 *    an image. The Workshop browser passes false to show ALL importable
 *    formulas (thumbnail where available, cube-icon fallback otherwise). */
export function useCatalogData(opts?: { thumbnailedOnly?: boolean }): CatalogData {
    const thumbnailedOnly = opts?.thumbnailedOnly ?? true;
    const [ready, setReady] = useState(() => isLibraryLoaded() && _thumbIndex !== null);

    useEffect(() => {
        if (ready) return;
        let alive = true;
        Promise.all([loadLibrary(), loadThumbIndex()])
            .then(() => { if (alive) setReady(true); })
            .catch(e => console.warn('[useCatalogData] load failed:', e));
        return () => { alive = false; };
    }, [ready]);

    return useMemo(() => {
        if (!ready) return EMPTY;
        let lib = getFormulaLibrary();
        if (thumbnailedOnly) {
            const thumbed = _thumbIndex ?? new Set<string>();
            lib = lib.filter(e => thumbed.has(e.id));
        }
        const frag = lib.filter(e => e.source === 'frag').map(toItem).sort(byName);
        const dec = lib.filter(e => e.source === 'dec').map(toItem).sort(byName);
        const byId = new Map<string, CatalogItem>();
        for (const it of frag) byId.set(it.id, it);
        for (const it of dec) byId.set(it.id, it);
        return { ready: true, frag, dec, byId };
    }, [ready, thumbnailedOnly]);
}

// ── Group builders ───────────────────────────────────────────────────────────

/** Two flat sections for the main formula picker: Fragmentarium + DEC. */
export function sectionGroups(d: CatalogData): CatalogGroup[] {
    if (!d.ready) return [];
    const groups: CatalogGroup[] = [];
    if (d.frag.length) {
        groups.push({ id: 'catalog:frag', name: 'Fragmentarium', sectionLabel: 'Catalog', items: d.frag });
    }
    if (d.dec.length) {
        groups.push({ id: 'catalog:dec', name: 'DEC', sectionLabel: d.frag.length ? undefined : 'Catalog', items: d.dec });
    }
    return groups;
}

function groupBy(items: CatalogItem[], key: (i: CatalogItem) => string): Map<string, CatalogItem[]> {
    const m = new Map<string, CatalogItem[]>();
    for (const it of items) {
        const k = key(it) || 'Uncategorized';
        const arr = m.get(k);
        if (arr) arr.push(it); else m.set(k, [it]);
    }
    return m;
}

function sortedGroupEntries(m: Map<string, CatalogItem[]>): Array<[string, CatalogItem[]]> {
    // Largest groups first — matches the Workshop's getCategories()/getFolders() ordering.
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
}

/** Per-category groups (fractal families) for the Workshop browser's
 *  category view. `source` filters to frag or DEC; omit for both combined. */
export function categoryGroups(d: CatalogData, source?: CatalogSource): CatalogGroup[] {
    if (!d.ready) return [];
    const pool = source === 'frag' ? d.frag : source === 'dec' ? d.dec : [...d.frag, ...d.dec];
    return sortedGroupEntries(groupBy(pool, i => i.category)).map(([cat, items]) => ({
        id: `catalog:cat:${source ?? 'all'}:${cat}`,
        name: `${cat} (${items.length})`,
        items: items.slice().sort(byName),
    }));
}

/** Per-folder groups (frag = contributing folder, DEC = author) for the
 *  Workshop browser's folder view. */
export function folderGroups(d: CatalogData, source?: CatalogSource): CatalogGroup[] {
    if (!d.ready) return [];
    const pool = source === 'frag' ? d.frag : source === 'dec' ? d.dec : [...d.frag, ...d.dec];
    return sortedGroupEntries(groupBy(pool, i => i.artist)).map(([folder, items]) => ({
        id: `catalog:folder:${source ?? 'all'}:${folder}`,
        name: `${folder} (${items.length})`,
        items: items.slice().sort(byName),
    }));
}
