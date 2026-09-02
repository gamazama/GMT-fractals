/**
 * Share-link state codec: diff against a default template, quantize, alias
 * long keys through a dictionary, deflate, base64url. `utils/Sharing.ts` is
 * the only production caller (grep `new UrlStateEncoder`), and the dictionary
 * it passes is `featureRegistry.getDictionary()` (engine/FeatureSystem.ts).
 *
 * ── Dictionary contract ────────────────────────────────────────────────────
 * A `Dict` maps long key → short alias per object level; nested levels hang
 * off `children`. `applyDictionary` writes `result[alias] = value` on encode
 * and inverts ONE `alias → longKey` map on decode, so two siblings that share
 * an alias collapse onto a single wire entry: the later writer's value
 * replaces the earlier's, no error, and the loser's state is simply absent on
 * the far side. Two such collisions shipped and went unnoticed until
 * 2026-07-27 — droste vs drawing on feature alias 'dr', and materials
 * emissionMode vs envMapColorSpace on param alias 'ec' (both fixed in
 * 8f59b143, which also gave `getDictionary()` its own detector).
 *
 * @invariant Within one dictionary level every alias is claimed by exactly one
 *   long key, and on encode no two source keys ever write the same wire key.
 *   Checked twice here: statically by `findDictionaryCollisions` when an
 *   encoder is constructed (memoised per dictionary object — the registry
 *   memoises its dictionary, so this runs once per build, not once per
 *   share), and dynamically by the write-time backstop in `applyDictionary`,
 *   which also sees the case a static walk cannot: an alias equal to the name
 *   of an UN-aliased sibling present in the data (un-aliased keys are absent
 *   from the dictionary and pass through verbatim). On a hit: throw in DEV,
 *   `console.warn` once per distinct collision in prod — a prod throw would
 *   take every share link down with it, the warn keeps the pre-detector
 *   behaviour plus a signal. Never silent.
 *   — proven by: npm run test:share-dictionary ("dictionary has no alias
 *   collisions" and "every root key and every feature slice round-tripped
 *   value-for-value").
 *
 * Node-reachable on purpose — no DOM, no three: `debug/test-share-dictionary.mts`
 * builds the real GMT dictionary and round-trips a synthetic preset through
 * this class with no server and no browser. Keep it that way.
 */
import pako from 'pako';

export type DictEntry = string | { _alias: string; children?: Dict };
export type Dict = Record<string, DictEntry>;

/** One alias claimed by two sibling long keys at the same dictionary level. */
export interface DictCollision {
    /** '' for the root level, 'features' for the feature map, 'features.<id>'
     *  for one feature's params. */
    scope: string;
    alias: string;
    /** The two long keys claiming `alias`, in dictionary order — the second
     *  overwrites the first on both encode and decode. */
    keys: [string, string];
}

/**
 * Pure, side-effect-free walk of a dictionary. Returns every alias that two
 * sibling long keys claim at the same level, recursing into `children`. With
 * three claimants it reports two collisions (each later key vs the first).
 * The node harness uses this directly; the encoder uses it via the memoised
 * constructor check below.
 */
export function findDictionaryCollisions(dict: Dict, scope = ''): DictCollision[] {
    const out: DictCollision[] = [];
    const claimed = new Map<string, string>();
    for (const longKey of Object.keys(dict)) {
        const entry = dict[longKey];
        const alias = typeof entry === 'string' ? entry : entry._alias;
        const prior = claimed.get(alias);
        if (prior !== undefined) out.push({ scope, alias, keys: [prior, longKey] });
        else claimed.set(alias, longKey);
        if (typeof entry !== 'string' && entry.children) {
            out.push(...findDictionaryCollisions(entry.children, scope ? `${scope}.${longKey}` : longKey));
        }
    }
    return out;
}

// Guarded form: `import.meta.env` is undefined under node/tsx, where these
// detectors take the prod branch (warn once) and the harness asserts on data.
const IS_DEV = typeof import.meta !== 'undefined' && !!import.meta.env?.DEV;
const warnedCollisions = new Set<string>();
const validatedDicts = new WeakSet<Dict>();

/** DEV: throw one Error naming every problem. Prod: `console.warn` each distinct
 *  message once per session, then continue with the lossy dictionary. */
function reportCollisions(problems: string[]): void {
    if (problems.length === 0) return;
    if (IS_DEV) throw new Error(problems.join('\n'));
    for (const p of problems) {
        if (warnedCollisions.has(p)) continue;
        warnedCollisions.add(p);
        console.warn(p);
    }
}

/** Static check, memoised per dictionary object. A dictionary is only recorded
 *  as validated when it is clean, so a lossy one is re-reported (DEV: re-thrown)
 *  on every construction rather than silenced after the first. */
function assertDictionaryUnique(dict: Dict): void {
    if (validatedDicts.has(dict)) return;
    const collisions = findDictionaryCollisions(dict);
    if (collisions.length === 0) { validatedDicts.add(dict); return; }
    reportCollisions(collisions.map(c =>
        `[UrlStateEncoder] share-link dictionary collision at ${c.scope || '<root>'}: ` +
        `'${c.keys[0]}' and '${c.keys[1]}' both alias to '${c.alias}' — the later one ` +
        `overwrites the earlier on encode and decode, so its state is dropped from every share link.`,
    ));
}
// Represents any JSON-serializable value flowing through diff/merge/quantize
type JsonVal = string | number | boolean | null | undefined | JsonVal[] | { [key: string]: JsonVal };

export class UrlStateEncoder<T extends object> {
    private defaultState: T;
    private dictionary: Dict | null;
    private reverseDictCache: Map<Dict, Record<string, string>> = new Map();

    constructor(defaultState: T, dictionary: Dict | null = null) {
        this.defaultState = defaultState;
        this.dictionary = dictionary;
        if (dictionary) assertDictionaryUnique(dictionary);
    }

    public encode(currentState: T, _advancedMode?: boolean): string {
        try {
            const diffed = this.getDiff(currentState as unknown as JsonVal, this.defaultState as unknown as JsonVal);
            if (!diffed || Object.keys(diffed).length === 0) return "";
            
            // Limit to 5 decimals for URL compactness
            let cleaned = this.quantize(diffed);
            if (!cleaned || Object.keys(cleaned).length === 0) return "";

            if (this.dictionary) {
                cleaned = this.applyDictionary(cleaned, this.dictionary, true);
            }

            const jsonString = JSON.stringify(cleaned);
            
            const compressed = pako.deflate(jsonString);
            const binaryString = Array.from(compressed as ArrayLike<number>).map((b: number) => String.fromCharCode(b)).join('');
            const base64 = btoa(binaryString)
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            return base64;
        } catch (e) {
            console.error("UrlStateEncoder: Error encoding", e);
            return "";
        }
    }

    public decode(encodedString: string): T | null {
        try {
            if (!encodedString) return null;

            let base64 = encodedString.replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) base64 += '=';

            const binaryString = atob(base64);
            const compressed = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                compressed[i] = binaryString.charCodeAt(i);
            }

            const jsonString = pako.inflate(compressed, { to: 'string' });
            let data = JSON.parse(jsonString);

            if (this.dictionary) {
                data = this.applyDictionary(data, this.dictionary, false);
            }

            return this.deepMerge({ ...this.defaultState } as unknown as Record<string, JsonVal>, data) as unknown as T;
        } catch (e) {
            console.error("UrlStateEncoder: Error decoding", e);
            return null;
        }
    }

    private getReverseDict(dict: Dict): Record<string, string> {
        if (this.reverseDictCache.has(dict)) return this.reverseDictCache.get(dict)!;

        const reverse: Record<string, string> = {};
        Object.keys(dict).forEach(longKey => {
            const val = dict[longKey];
            if (typeof val === 'string') {
                reverse[val] = longKey;
            } else {
                reverse[val._alias] = longKey;
            }
        });
        this.reverseDictCache.set(dict, reverse);
        return reverse;
    }

    private applyDictionary(obj: JsonVal, dict: Dict, toShort: boolean): JsonVal {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
        const result: Record<string, JsonVal> = {};
        
        if (toShort) {
            // Write-time backstop for the dictionary contract in the file header:
            // remembers which source key wrote each wire key at this level.
            const written = new Map<string, string>();
            Object.keys(obj).forEach(key => {
                let targetKey = key;
                let subDict = null;
                const entry = dict[key];
                if (entry) {
                    if (typeof entry === 'string') targetKey = entry;
                    else { targetKey = entry._alias; subDict = entry.children; }
                }
                const prior = written.get(targetKey);
                if (prior !== undefined) {
                    reportCollisions([
                        `[UrlStateEncoder] share-link key collision on encode: '${prior}' and '${key}' ` +
                        `both write wire key '${targetKey}', so '${prior}' is dropped from this share link.`,
                    ]);
                }
                written.set(targetKey, key);
                const value = obj[key];
                if (subDict && value && typeof value === 'object' && !Array.isArray(value)) {
                    result[targetKey] = this.applyDictionary(value, subDict, true);
                } else result[targetKey] = value;
            });
        } else {
            const reverse = this.getReverseDict(dict);
            Object.keys(obj).forEach(key => {
                const longKey = reverse[key] || key;
                const value = obj[key];
                
                const dictEntry = dict[longKey];
                const subDict = (dictEntry && typeof dictEntry === 'object') ? dictEntry.children : null;
                
                if (subDict && value && typeof value === 'object' && !Array.isArray(value)) {
                    result[longKey] = this.applyDictionary(value, subDict, false);
                } else {
                    result[longKey] = value;
                }
            });
        }
        return result;
    }

    private isEqual(a: JsonVal, b: JsonVal): boolean {
        if (a === b) return true;
        if (a == null || b == null) return a === b;
        
        if (typeof a === 'number' && typeof b === 'number') {
             // Relaxed tolerance for float comparison
             return Math.abs(a - b) < 1e-4;
        }

        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length) return false;
            return a.every((val, i) => this.isEqual(val, b[i]));
        }
        if (typeof a === 'object' && typeof b === 'object') {
            const aObj = a as Record<string, JsonVal>;
            const bObj = b as Record<string, JsonVal>;
            const keysA = Object.keys(aObj).filter(k => !k.startsWith('is'));
            const keysB = Object.keys(bObj).filter(k => !k.startsWith('is'));
            if (keysA.length !== keysB.length) return false;
            return keysA.every(k => this.isEqual(aObj[k], bObj[k]));
        }
        return false;
    }

    private quantize(obj: JsonVal): JsonVal {
        if (typeof obj === 'string') {
            // Strip Base64 Image Data
            if (obj.startsWith('data:image')) {
                return undefined;
            }
            return obj;
        }
        if (typeof obj === 'number') {
            // Keep exact 0
            if (obj === 0 || Math.abs(obj) < 1e-9) return 0;
            // Limit to 5 decimal places to keep URLs short (e.g. 0.12345)
            return parseFloat(obj.toFixed(5));
        }
        if (Array.isArray(obj)) return obj.map(v => this.quantize(v));
        if (obj !== null && typeof obj === 'object') {
            const out: Record<string, JsonVal> = {};
            let hasContents = false;
            const keys = Object.keys(obj).filter(k => !k.startsWith('is'));
            for (const key of keys) {
                const val = this.quantize(obj[key]);
                if (val !== undefined) {
                    out[key] = val;
                    hasContents = true;
                }
            }
            return hasContents ? out : undefined;
        }
        return obj;
    }

    /**
     * READ BEFORE EDITING THE SKIP-LIST BELOW — it reaches far less than it looks.
     *
     * The `typeof base !== 'object'` bail on the third line returns the whole
     * subtree VERBATIM whenever the base side has no counterpart. On the only
     * live path (`utils/Sharing.ts` → `generateShareStringFromPreset`) the base is
     * `getFullDefaultPreset(formula)`, which is a four-key literal whose
     * `features` is `{}` — grep `getFullDefaultPreset` in utils/PresetLogic.ts.
     * So `base.features[<anyFeatureId>]` is always `undefined`, every feature
     * slice takes that bail, and recursion STOPS at the feature-id level.
     * Consequences, both falsified 2026-07-29 with `npm run smoke:share-link`:
     *
     *   - Adding a feature id (`key === 'coloring'`) to the skip-list DOES work —
     *     that key loop runs. Payload 2895 → 2668 chars, smoke exit 1,
     *     "coloring.repeats round-tripped 3.7 (got 1)".
     *   - Adding a param name (`key === 'repeats'`, `key === 'paramA'`) does
     *     NOTHING — those keys live inside a slice the loop never descends into.
     *     Payload byte-identical at 2895 chars, smoke exit 0. (Confirmed the edit
     *     really reached the browser: `if (1) return ''` in encode() gives 0 chars.)
     *
     * Corollary: feature state is NOT diffed against defaults at all — every
     * registered slice is emitted in full on every share. And the four named
     * entries below are unreachable on this path, because `liveModulations`,
     * `histogramData`, `interactionSnapshot` and the `*Stack` fields are store
     * fields that `getPreset` never copies into a Preset (it builds from a fixed
     * literal + `presetFieldRegistry` + `features`). They are defensive only.
     *
     * This cost the 2026-07-28 audit a night: a falsification that added
     * `key === 'repeats'` here appeared to prove the guard blind, when in fact
     * the break was a no-op. See the OPEN ANOMALY note in
     * plans/overnight-audit/results/g08-save-load-gmf.json — now settled.
     */
    private getDiff(current: JsonVal, base: JsonVal): JsonVal {
        if (this.isEqual(current, base)) return undefined;
        if (typeof current !== 'object' || current === null || typeof base !== 'object' || base === null) return current;
        if (Array.isArray(current)) return current;

        const diff: Record<string, JsonVal> = {};
        let hasDiff = false;
        const curObj = current as Record<string, JsonVal>;
        const baseObj = base as Record<string, JsonVal>;
        Object.keys(curObj).forEach(key => {
            // Ignore non-persistent properties. Only reaches the preset root and
            // the `features` map — never inside a slice. See the note above.
            if (key.startsWith('is') || key === 'histogramData' || key === 'interactionSnapshot' || key === 'liveModulations' || key.endsWith('Stack')) return;
            const res = this.getDiff(curObj[key], baseObj[key]);
            if (res !== undefined) {
                diff[key] = res;
                hasDiff = true;
            }
        });
        return hasDiff ? diff : undefined;
    }

    private deepMerge(target: Record<string, JsonVal>, source: Record<string, JsonVal>): Record<string, JsonVal> {
        if (typeof source !== 'object' || source === null) return source;
        const output = { ...target };
        Object.keys(source).forEach(key => {
            if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                output[key] = this.deepMerge((target[key] || {}) as Record<string, JsonVal>, source[key] as Record<string, JsonVal>);
            } else {
                output[key] = source[key];
            }
        });
        return output;
    }
}
