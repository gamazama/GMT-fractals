/** Decode an audio File into a flat peak-amplitude array suitable for a
 *  timeline strip waveform. Walks every channel, takes the max absolute
 *  sample over `bucketSize` consecutive samples, and clamps to `targetBuckets`
 *  total entries (the renderer can downsample further if it needs to).
 *
 *  Uses a short-lived OfflineAudioContext so the decoded buffer is GCed once
 *  the peaks are computed — keeps memory flat regardless of file length. */
export async function computeWaveformPeaks(
    file: File,
    targetBuckets = 1024
): Promise<{ peaks: number[]; durationSeconds: number }> {
    const arrayBuf = await file.arrayBuffer();
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    try {
        const audioBuf = await ctx.decodeAudioData(arrayBuf.slice(0));
        const channelData: Float32Array[] = [];
        for (let c = 0; c < audioBuf.numberOfChannels; c++) {
            channelData.push(audioBuf.getChannelData(c));
        }
        const totalSamples = audioBuf.length;
        const buckets = Math.min(targetBuckets, totalSamples);
        const bucketSize = Math.max(1, Math.floor(totalSamples / buckets));
        const peaks: number[] = new Array(buckets);
        for (let i = 0; i < buckets; i++) {
            const start = i * bucketSize;
            const end = Math.min(totalSamples, start + bucketSize);
            let peak = 0;
            for (let s = start; s < end; s++) {
                for (let c = 0; c < channelData.length; c++) {
                    const a = Math.abs(channelData[c][s]);
                    if (a > peak) peak = a;
                }
            }
            peaks[i] = peak > 1 ? 1 : peak;
        }
        return { peaks, durationSeconds: audioBuf.duration };
    } finally {
        if (typeof ctx.close === 'function') ctx.close();
    }
}
