import pako from 'pako';
import * as THREE from 'three';

type DictEntry = string | { _alias: string; children?: Dict };
type Dict = Record<string, DictEntry>;
// Represents any JSON-serializable value flowing through diff/merge/quantize
type JsonVal = string | number | boolean | null | undefined | JsonVal[] | { [key: string]: JsonVal };

export class UrlStateEncoder<T extends object> {
    private defaultState: T;
    private dictionary: Dict | null;
    private reverseDictCache: Map<Dict, Record<string, string>> = new Map();

    constructor(defaultState: T, dictionary: Dict | null = null) {
        this.defaultState = defaultState;
        this.dictionary = dictionary;
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
            Object.keys(obj).forEach(key => {
                let targetKey = key;
                let subDict = null;
                const entry = dict[key];
                if (entry) {
                    if (typeof entry === 'string') targetKey = entry;
                    else { targetKey = entry._alias; subDict = entry.children; }
                }
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
