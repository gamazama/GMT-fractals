/**
 * Vite's `?worker&url` import form.
 *
 * Returns the URL of a self-contained ES chunk. Used for the audio analysis
 * worklet: `AudioWorklet.addModule` needs a URL to a module with no unresolved
 * imports, and this is the suffix that produces one — verified against a real
 * build (a 462-byte chunk with zero import statements).
 *
 * Note `?worker&url` NOT `?worker`. The latter emits a constructor wrapper for
 * `new Worker()`, which an AudioWorklet cannot use.
 *
 * @see docs/adr/0110-audio-analysis-in-a-worklet.md
 */
declare module '*?worker&url' {
    const src: string;
    export default src;
}
