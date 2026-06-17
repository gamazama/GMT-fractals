/**
 * Catalog (Fragmentarium / DEC) group model for the unified <FormulaPicker>.
 *
 * Catalog formulas are the ~438 thumbnailed frag/DEC fixtures from the Workshop
 * library (public/formulas/manifest.json + dec.json). Unlike native formulas
 * they are NOT registered until imported via the Workshop — so picking one
 * loads its source into the Workshop editor rather than switching the live
 * formula. The picker only needs display metadata (name + thumbnail path).
 *
 * @see useCatalogGroups.ts (data hook)
 * @see debug/frag-thumbs-commit.mts (writes thumbnails/frag/<safeId>.jpg + index.json)
 */

export type CatalogSource = 'frag' | 'dec';

export interface CatalogItem {
    /** Catalog id — frag relative path ('3DickUlus/BuffaloBulb.frag') or DEC id ('fractal_de8'). */
    id: string;
    name: string;
    source: CatalogSource;
    /** Committed thumbnail URL, e.g. 'thumbnails/frag/3DickUlus_BuffaloBulb.frag.jpg'. */
    thumbSrc: string;
    /** Fractal-family category (for the Workshop browser's category grouping). */
    category: string;
    /** Contributing folder (frag) or author (DEC) — for folder grouping. */
    artist: string;
}

export interface CatalogGroup {
    /** Stable sidebar key, e.g. 'catalog:frag' or 'catalog:cat:Mandelbulb'. */
    id: string;
    /** Sidebar label, e.g. 'Fragmentarium', 'DEC', or a category/folder name. */
    name: string;
    /** Optional section header rendered above the first group of a catalog run
     *  (e.g. 'Catalog'). Omit on subsequent groups so the header shows once. */
    sectionLabel?: string;
    items: CatalogItem[];
}

/** safeId transform — mirrors debug/frag-thumbs-commit.mts exactly, so the
 *  committed thumbnail filename resolves from a catalog id. */
export function fragThumbSafeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

/** Committed thumbnail URL for a catalog id (relative to the app base). */
export function fragThumbSrc(id: string): string {
    return `thumbnails/frag/${fragThumbSafeId(id)}.jpg`;
}
