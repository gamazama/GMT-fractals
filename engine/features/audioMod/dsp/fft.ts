/**
 * fft — iterative radix-2 Cooley-Tukey, in-place, precomputed tables.
 *
 * Plain JS on purpose. `pffft.wasm`'s own benchmarks report FFT.js on V8 at
 * roughly TWICE the speed of the WebAssembly builds, because V8 JITs tight
 * typed-array float loops extremely well and WASM pays a boundary + copy cost
 * per call. At 4096 points a few hundred times a second this is not close to a
 * bottleneck, so the simpler thing that can be read and tested wins. Revisit
 * only if Safari/Firefox profiling says otherwise.
 *
 * @invariant No module-scope state, no DOM. This is imported by an
 *   AudioWorklet processor, which has neither — and Vite inlines it into the
 *   worklet chunk. @see docs/adr/0110-audio-analysis-in-a-worklet.md
 * @invariant Real input is fed as a complex transform with a zeroed imaginary
 *   part rather than via the pack-into-N/2 real-FFT trick. That costs ~2x and
 *   is a deliberate trade: the naive form is verifiable against a textbook DFT
 *   (`debug/test-fft.mts` does exactly that), and glitches on the audio thread
 *   are audible. Measure before optimising this.
 */

export class FFT {
    readonly size: number;
    private readonly cosTable: Float32Array;
    private readonly sinTable: Float32Array;
    private readonly revTable: Uint32Array;

    constructor(size: number) {
        if (size < 2 || (size & (size - 1)) !== 0) {
            throw new Error(`FFT size must be a power of two, got ${size}`);
        }
        this.size = size;

        const half = size >> 1;
        this.cosTable = new Float32Array(half);
        this.sinTable = new Float32Array(half);
        for (let i = 0; i < half; i++) {
            this.cosTable[i] = Math.cos((-2 * Math.PI * i) / size);
            this.sinTable[i] = Math.sin((-2 * Math.PI * i) / size);
        }

        // Bit-reversal permutation, precomputed once.
        const bits = Math.round(Math.log2(size));
        this.revTable = new Uint32Array(size);
        for (let i = 0; i < size; i++) {
            let r = 0;
            for (let b = 0; b < bits; b++) if (i & (1 << b)) r |= 1 << (bits - 1 - b);
            this.revTable[i] = r;
        }
    }

    /**
     * In-place complex forward transform. `re` and `im` must both be `size`
     * long; `im` is zero for real input.
     */
    transform(re: Float32Array, im: Float32Array): void {
        const n = this.size;
        const rev = this.revTable;
        const cos = this.cosTable;
        const sin = this.sinTable;

        for (let i = 0; i < n; i++) {
            const j = rev[i];
            if (j > i) {
                let t = re[i]; re[i] = re[j]; re[j] = t;
                t = im[i]; im[i] = im[j]; im[j] = t;
            }
        }

        for (let len = 2; len <= n; len <<= 1) {
            const half = len >> 1;
            const step = n / len;
            for (let i = 0; i < n; i += len) {
                for (let j = 0, k = 0; j < half; j++, k += step) {
                    const cr = cos[k];
                    const ci = sin[k];
                    const a = i + j;
                    const b = a + half;
                    const xr = re[b] * cr - im[b] * ci;
                    const xi = re[b] * ci + im[b] * cr;
                    re[b] = re[a] - xr;
                    im[b] = im[a] - xi;
                    re[a] += xr;
                    im[a] += xi;
                }
            }
        }
    }
}
