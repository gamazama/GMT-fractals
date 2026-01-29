
import pako from 'pako';
import * as THREE from 'three';

export class UrlStateEncoder<T extends object> {
    private defaultState: T;
    private dictionary: any;
    private reverseDictCache: Map<any, any> = new Map();

    constructor(defaultState: T, dictionary: any = null) {
        this.defaultState = defaultState;
        this.dictionary = dictionary;
    }

    public encode(currentState: T, debug: boolean = false): string {
        try {
            const diffed = this.getDiff(currentState, this.defaultState);
            if (!diffed || Object.keys(diffed).length === 0) return "";
            
            // Limit to 5 decimals for URL compactness
            let cleaned = this.quantize(diffed);
            if (!cleaned || Object.keys(cleaned).length === 0) return "";

            if (this.dictionary) {
                cleaned = this.applyDictionary(cleaned, this.dictionary, true);
            }

            const jsonString = JSON.stringify(cleaned);
            
            if (debug) {
                console.group("UrlStateEncoder: Debug Output");
                console.log("Input State:", currentState);
                console.log("Minified JSON:", jsonString);
                console.groupEnd();
            }

            const compressed = pako.deflate(jsonString);
            const binaryString = Array.from(compressed).map((b: number) => String.fromCharCode(b)).join('');
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

            return this.deepMerge({ ...this.defaultState }, data);
        } catch (e) {
            console.error("UrlStateEncoder: Error decoding", e);
            return null;
        }
    }

    private getReverseDict(dict: any) {
        if (this.reverseDictCache.has(dict)) return this.reverseDictCache.get(dict);
        
        const reverse: any = {};
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

    private applyDictionary(obj: any, dict: any, toShort: boolean): any {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
        const result: any = {};
        
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

    private isEqual(a: any, b: any): boolean {
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
            const keysA = Object.keys(a).filter(k => !k.startsWith('is'));
            const keysB = Object.keys(b).filter(k => !k.startsWith('is'));
            if (keysA.length !== keysB.length) return false;
            return keysA.every(k => this.isEqual(a[k], b[k]));
        }
        return false;
    }

    private quantize(obj: any): any {
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
            const out: any = {};
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

    private getDiff(current: any, base: any): any {
        if (this.isEqual(current, base)) return undefined;
        if (typeof current !== 'object' || current === null || typeof base !== 'object' || base === null) return current;
        if (Array.isArray(current)) return current;

        const diff: any = {};
        let hasDiff = false;
        Object.keys(current).forEach(key => {
            // Ignore non-persistent properties
            if (key.startsWith('is') || key === 'histogramData' || key === 'interactionSnapshot' || key === 'liveModulations' || key.endsWith('Stack')) return;
            const res = this.getDiff(current[key], base[key]);
            if (res !== undefined) {
                diff[key] = res;
                hasDiff = true;
            }
        });
        return hasDiff ? diff : undefined;
    }

    private deepMerge(target: any, source: any): any {
        if (typeof source !== 'object' || source === null) return source;
        const output = { ...target };
        Object.keys(source).forEach(key => {
            if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                output[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                output[key] = source[key];
            }
        });
        return output;
    }
}
