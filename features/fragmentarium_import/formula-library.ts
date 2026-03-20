/**
 * Formula Library — fetches the formula index from public/formulas/manifest.json.
 *
 * Call `loadLibrary()` once at startup; all query functions are synchronous after that.
 * Formula source code is loaded on demand via `loadFragSource()` / `loadDECSource()`.
 *
 * References:
 *   Frag gallery: https://github.com/3Dickulus/Fragmentarium_Examples_Folder
 *   DEC gallery:  https://jbaker.graphics/writings/DEC.html
 *
 * To regenerate: npx tsx debug/build-formula-manifest.mts
 */

// ============================================================================
// Types
// ============================================================================

export type FormulaSource = 'frag' | 'dec';

export interface FormulaEntry {
    /** Unique ID: frag relative path or DEC id */
    id: string;
    /** Display name (human-readable) */
    name: string;
    /** Source type */
    source: FormulaSource;
    /** Artist/collector/folder that contributed this formula */
    artist: string;
    /** Category for browsing (fractal family / technique) */
    category: string;
    /** Tags for search/filtering */
    tags: string[];
}

export interface CategoryInfo {
    id: string;
    name: string;
    formulaCount: number;
}

export interface FolderInfo {
    id: string;
    name: string;
    formulaCount: number;
}

// ============================================================================
// Internal state
// ============================================================================

interface DECFormulaJSON {
    id: string;
    author: string;
    code: string;
}

let _library: FormulaEntry[] | null = null;
let _decData: DECFormulaJSON[] | null = null;
let _loading: Promise<void> | null = null;

// ============================================================================
// Loading
// ============================================================================

/** Load the formula library from the manifest. Safe to call multiple times. */
export function loadLibrary(): Promise<void> {
    if (_library) return Promise.resolve();
    if (_loading) return _loading;

    _loading = (async () => {
        const [manifestRes, decRes] = await Promise.all([
            fetch('/formulas/manifest.json'),
            fetch('/formulas/dec.json'),
        ]);

        if (!manifestRes.ok) throw new Error(`Failed to load manifest: ${manifestRes.status}`);
        if (!decRes.ok) throw new Error(`Failed to load DEC data: ${decRes.status}`);

        const manifest = await manifestRes.json();
        _decData = await decRes.json() as DECFormulaJSON[];

        // Build unified FormulaEntry[] from manifest
        const fragEntries: FormulaEntry[] = manifest.frags.map((f: any) => ({
            id: f.id,
            name: f.name,
            source: 'frag' as FormulaSource,
            artist: f.folder,
            category: f.category,
            tags: f.tags,
        }));

        const decEntries: FormulaEntry[] = manifest.decs.map((d: any) => ({
            id: d.id,
            name: d.name,
            source: 'dec' as FormulaSource,
            artist: d.author,
            category: d.category,
            tags: d.tags,
        }));

        _library = [...fragEntries, ...decEntries];
    })();

    return _loading;
}

/** Returns true if the library has been loaded. */
export function isLibraryLoaded(): boolean {
    return _library !== null;
}

function getLibrary(): FormulaEntry[] {
    if (!_library) throw new Error('Formula library not loaded — call loadLibrary() first');
    return _library;
}

// ============================================================================
// Source code loading
// ============================================================================

/** Fetch a .frag formula's source code from public/formulas/frag/ */
export async function loadFragSource(id: string): Promise<string> {
    const res = await fetch(`/formulas/frag/${id}`);
    if (!res.ok) throw new Error(`Failed to load frag: ${id} (${res.status})`);
    return res.text();
}

/** Get a DEC formula's source code from the cached dec.json */
export function loadDECSource(id: string): { code: string; author: string } | null {
    if (!_decData) return null;
    const entry = _decData.find(d => d.id === id);
    return entry ? { code: entry.code, author: entry.author } : null;
}

// ============================================================================
// Query API (synchronous — requires loadLibrary() to have completed)
// ============================================================================

/** Get the full formula library */
export function getFormulaLibrary(): FormulaEntry[] {
    return getLibrary();
}

/** Get all unique categories with counts, optionally filtered by source */
export function getCategories(source?: FormulaSource): CategoryInfo[] {
    const library = getLibrary();
    const catMap = new Map<string, number>();

    for (const entry of library) {
        if (source && entry.source !== source) continue;
        catMap.set(entry.category, (catMap.get(entry.category) || 0) + 1);
    }

    return Array.from(catMap.entries())
        .map(([id, count]) => ({ id, name: id, formulaCount: count }))
        .sort((a, b) => b.formulaCount - a.formulaCount);
}

/** Get all frag folders (artist/collection directories) with counts */
export function getFolders(): FolderInfo[] {
    const library = getLibrary();
    const folderMap = new Map<string, number>();

    for (const entry of library) {
        if (entry.source === 'frag') {
            folderMap.set(entry.artist, (folderMap.get(entry.artist) || 0) + 1);
        }
    }

    return Array.from(folderMap.entries())
        .map(([id, count]) => ({ id, name: id, formulaCount: count }))
        .sort((a, b) => b.formulaCount - a.formulaCount);
}

/** Get formulas filtered by category, optionally filtered by source */
export function getFormulasByCategory(category: string, source?: FormulaSource): FormulaEntry[] {
    return getLibrary().filter(e => e.category === category && (!source || e.source === source));
}

/** Get formulas filtered by folder (frag artist/collection) */
export function getFormulasByFolder(folder: string): FormulaEntry[] {
    return getLibrary().filter(e => e.source === 'frag' && e.artist === folder);
}

/** Get formulas filtered by source type */
export function getFormulasBySource(source: FormulaSource): FormulaEntry[] {
    return getLibrary().filter(e => e.source === source);
}

/** Search formulas by name, tags, artist, or category */
export function searchFormulas(query: string): FormulaEntry[] {
    const q = query.toLowerCase().trim();
    if (!q) return getLibrary();
    return getLibrary().filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.artist.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.tags.some(t => t.includes(q))
    );
}

/** Pick a random formula (optionally filtered by source) */
export function pickRandom(source?: FormulaSource): FormulaEntry {
    const pool = source ? getFormulasBySource(source) : getLibrary();
    return pool[Math.floor(Math.random() * pool.length)];
}
