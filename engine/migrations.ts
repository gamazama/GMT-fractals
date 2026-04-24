/**
 * @engine/migrations — preset-load migration layer.
 *
 * Problem: feature slices are not stable forever. When a feature is
 * split, merged, renamed, or a param moves between slices, any preset
 * saved under the old shape needs to be translated before loadPreset
 * dispatches setters — otherwise `setDye({ collisionEnabled: true })`
 * silently drops the field because DyeFeature no longer owns it.
 *
 * Before this module, the workaround was `hidden: true` on displaced
 * params so the old slice kept accepting the field forever. That
 * leaked dead state into every saved preset and made the restructure
 * harder to finish.
 *
 * Pattern:
 *
 *     import { registerMigration, moveField, renameSlice } from '@engine/migrations';
 *
 *     registerMigration({
 *         version: 2,
 *         id: 'dye-split-collision',
 *         apply: (preset) => {
 *             moveField(preset, 'dye.collisionEnabled', 'collision.enabled');
 *             moveField(preset, 'dye.collisionGradient', 'collision.gradient');
 *             return preset;
 *         },
 *     });
 *
 * Migrations are version-numbered and run in order. A preset tagged
 * with `version: N` skips migrations up to and including N. After
 * migrations run the preset is retagged with the highest applied
 * version so subsequent saves don't re-trigger.
 *
 * Apps register migrations once at boot (typically in their
 * `registerFeatures.ts` alongside feature registrations — it's data
 * that the store doesn't need to know about before creation).
 */

interface Migration {
    /** Monotonic version number. Migrations with `version > preset.version`
     *  run in ascending-version order. */
    version: number;
    /** Human id for logging / debugging. */
    id: string;
    /** Receives the raw preset object, returns a (possibly mutated) preset. */
    apply: (preset: any) => any;
}

const _migrations: Migration[] = [];
let _sorted = false;

/** Register a migration. Order between calls doesn't matter — sort
 *  by version at application time. Registering the same id twice
 *  (HMR) replaces the earlier entry. */
export const registerMigration = (m: Migration): void => {
    const existing = _migrations.findIndex((x) => x.id === m.id);
    if (existing >= 0) _migrations[existing] = m;
    else _migrations.push(m);
    _sorted = false;
};

/** List all registered migrations. Read-only snapshot. */
export const listMigrations = (): ReadonlyArray<Migration> => {
    if (!_sorted) { _migrations.sort((a, b) => a.version - b.version); _sorted = true; }
    return _migrations.slice();
};

/**
 * Apply every migration whose `version` exceeds the preset's current
 * version. Mutates the preset (copy if you need the original).
 *
 * Returns the mutated preset with `version` retagged to the highest
 * applied migration version (or the preset's existing version if no
 * migrations ran).
 */
export const applyMigrations = (preset: any): any => {
    if (!preset) return preset;
    if (!_sorted) { _migrations.sort((a, b) => a.version - b.version); _sorted = true; }
    const before = Number.isFinite(preset._migrationVersion) ? preset._migrationVersion : 0;
    let afterVersion = before;
    for (const m of _migrations) {
        if (m.version <= before) continue;
        try {
            preset = m.apply(preset) ?? preset;
        } catch (err) {
            console.error(`[migrations] ${m.id} (v${m.version}) threw:`, err);
        }
        afterVersion = Math.max(afterVersion, m.version);
    }
    preset._migrationVersion = afterVersion;
    return preset;
};

// ── Helpers ──────────────────────────────────────────────────────────
//
// Common migration shapes. Operate on preset objects with shape:
//   { features: { [sliceId]: { [paramKey]: value, ... }, ... }, ... }

const splitPath = (path: string): [string, string] => {
    const dot = path.indexOf('.');
    if (dot < 0) throw new Error(`[migrations] path "${path}" must be of the form "slice.field"`);
    return [path.slice(0, dot), path.slice(dot + 1)];
};

/**
 * Move a single field from one slice.field to another. Handles missing
 * source (no-op). Deletes the old key so a subsequent save doesn't
 * round-trip the stale copy.
 *
 *   moveField(preset, 'dye.collisionEnabled', 'collision.enabled')
 *
 * Works on top-level preset fields too if the path has no dot — pass
 * `topField('name')` semantics by using the 2-arg helper below.
 */
export const moveField = (preset: any, fromPath: string, toPath: string): void => {
    if (!preset?.features) return;
    const [fromSlice, fromKey] = splitPath(fromPath);
    const [toSlice, toKey]     = splitPath(toPath);
    const src = preset.features[fromSlice];
    if (!src || !(fromKey in src)) return;
    const value = src[fromKey];
    delete src[fromKey];
    if (!preset.features[toSlice]) preset.features[toSlice] = {};
    preset.features[toSlice][toKey] = value;
};

/**
 * Rename an entire slice. Merges fields into the destination if both
 * exist (destination wins on conflict — assume the app has already
 * started using the new name).
 */
export const renameSlice = (preset: any, fromSlice: string, toSlice: string): void => {
    if (!preset?.features) return;
    const src = preset.features[fromSlice];
    if (!src) return;
    if (!preset.features[toSlice]) preset.features[toSlice] = {};
    for (const [k, v] of Object.entries(src)) {
        if (!(k in preset.features[toSlice])) preset.features[toSlice][k] = v;
    }
    delete preset.features[fromSlice];
};

/** Rename a single param within the same slice. */
export const renameField = (preset: any, slice: string, fromKey: string, toKey: string): void => {
    const s = preset?.features?.[slice];
    if (!s || !(fromKey in s)) return;
    s[toKey] = s[fromKey];
    delete s[fromKey];
};
