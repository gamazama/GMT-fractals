import { AudioClip } from '../../store/animation/types';
import { getAudioFile } from './audioFileCache';

export interface MixedAudio {
    /** Interleaved stereo PCM, normalised to [-1, 1]. Length = numFrames * 2. */
    pcm: Float32Array;
    sampleRate: number;
    numFrames: number;
    durationSec: number;
}

/**
 * Decode each loaded audio clip's source File, slice to the trim range,
 * position at startFrame, sum into an interleaved stereo buffer covering
 * the export's frame range. Returns null when no clips have a cached file.
 *
 * @invariant The export window uses INCLUSIVE end (`(endFrame+1)/fps`) —
 *   without the +1 the audio mix is one frame short (~40ms at 25fps).
 */
export async function mixAudioClipsForExport(
    clips: (AudioClip | null)[],
    fps: number,
    startFrame: number,
    endFrame: number,
    sampleRate = 48000,
): Promise<MixedAudio | null> {
    const hasAny = clips.some(c => c && getAudioFile(c.deckIndex));
    if (!hasAny) return null;

    const safeFps = Math.max(1, fps);
    // Each rendered video frame occupies a `1/fps`-second slot, so the export
    // covers from frame startFrame's start to frame endFrame's END — i.e.
    // `(endFrame - startFrame + 1) / fps`. Without the +1 the audio mix is
    // one frame short at the tail, which adds ~40ms of trailing-end mismatch.
    const exportStartSec = startFrame / safeFps;
    const exportEndSec   = (endFrame + 1) / safeFps;
    const durationSec    = Math.max(0, exportEndSec - exportStartSec);
    if (durationSec <= 0) return null;

    const numFrames = Math.ceil(durationSec * sampleRate);
    const pcm = new Float32Array(numFrames * 2);

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    try {
        for (const clip of clips) {
            if (!clip) continue;
            const file = getAudioFile(clip.deckIndex);
            if (!file) continue;

            const buf = await ctx.decodeAudioData((await file.arrayBuffer()).slice(0));
            const srcRate = buf.sampleRate;
            const srcChannels = buf.numberOfChannels;

            // Map clip into the export window. The clip's audio time t (in the
            // source file) corresponds to timeline second:
            //     timeSec = (clip.startFrame / fps) + (t - clip.trimStartSec)
            // Solve for the timeline window we care about.
            const clipStartSec    = clip.startFrame / safeFps;
            const clipDurationSec = clip.trimEndSec - clip.trimStartSec;
            const clipEndSec      = clipStartSec + clipDurationSec;

            const audibleStartSec = Math.max(exportStartSec, clipStartSec);
            const audibleEndSec   = Math.min(exportEndSec,   clipEndSec);
            if (audibleEndSec <= audibleStartSec) continue;

            // Source-file second range that maps onto the audible window.
            const srcStartT = clip.trimStartSec + (audibleStartSec - clipStartSec);
            const srcEndT   = clip.trimStartSec + (audibleEndSec   - clipStartSec);

            // Output sample range in the export PCM.
            const outStartSample = Math.floor((audibleStartSec - exportStartSec) * sampleRate);
            const outEndSample   = Math.ceil((audibleEndSec   - exportStartSec) * sampleRate);
            const writeLen = outEndSample - outStartSample;

            // Source sample range. For each output sample, resample from the
            // closest source sample (linear interpolation) — adequate for
            // typical 44.1k → 48k conversions.
            //
            // @invariant Linear-interpolation resample only — no anti-alias
            //   lowpass for large rate ratios.
            const ch0 = buf.getChannelData(0);
            const ch1 = srcChannels > 1 ? buf.getChannelData(1) : ch0;

            for (let i = 0; i < writeLen; i++) {
                const tOutSec = audibleStartSec + (i / sampleRate);
                const tSrcSec = srcStartT + (tOutSec - audibleStartSec);
                const srcIdxF = tSrcSec * srcRate;
                const i0 = Math.floor(srcIdxF);
                const i1 = Math.min(buf.length - 1, i0 + 1);
                if (i0 < 0 || i0 >= buf.length) continue;
                const frac = srcIdxF - i0;
                const l = ch0[i0] * (1 - frac) + ch0[i1] * frac;
                const r = ch1[i0] * (1 - frac) + ch1[i1] * frac;

                const outIdx = (outStartSample + i) * 2;
                pcm[outIdx]     += l;
                pcm[outIdx + 1] += r;
            }
            void srcEndT;
        }
    } finally {
        if (typeof ctx.close === 'function') ctx.close();
    }

    // Hard-clip in case multiple clips overlap.
    //
    // @invariant Hard-clipping with no per-clip gain — overlapping clips at
    //   full gain distort. `AudioClip` has no gain field.
    for (let i = 0; i < pcm.length; i++) {
        if (pcm[i] > 1)  pcm[i] = 1;
        else if (pcm[i] < -1) pcm[i] = -1;
    }

    return { pcm, sampleRate, numFrames, durationSec };
}
