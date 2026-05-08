/** Per-deck cache of the underlying audio File. The animation store's
 *  AudioClip carries metadata + waveform peaks that are structured-cloneable;
 *  the File itself is only needed transiently (to re-decode for export, or
 *  re-compute peaks). Module-level singleton — lifetime = page lifetime. */

const cache = new Map<0 | 1, File>();

export const setAudioFile = (deckIndex: 0 | 1, file: File): void => {
    cache.set(deckIndex, file);
};

export const getAudioFile = (deckIndex: 0 | 1): File | undefined => {
    return cache.get(deckIndex);
};

export const clearAudioFile = (deckIndex: 0 | 1): void => {
    cache.delete(deckIndex);
};
