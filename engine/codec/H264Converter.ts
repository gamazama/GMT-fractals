/**
 * H264 AnnexB → AVCC conversion utilities.
 * Shared between VideoExporter (main thread) and WorkerExporter (worker thread).
 */

export class H264Converter {
    static findNALUs(buffer: Uint8Array) {
        const nalus: { type: number; data: Uint8Array }[] = [];
        let i = 0;
        while (i < buffer.length) {
            let prefixLen = 0;
            if (i + 2 < buffer.length && buffer[i] === 0 && buffer[i + 1] === 0 && buffer[i + 2] === 1) {
                prefixLen = 3;
            } else if (i + 3 < buffer.length && buffer[i] === 0 && buffer[i + 1] === 0 && buffer[i + 2] === 0 && buffer[i + 3] === 1) {
                prefixLen = 4;
            }
            if (prefixLen > 0) {
                let end = buffer.length;
                for (let j = i + prefixLen; j < buffer.length - 2; j++) {
                    if (buffer[j] === 0 && buffer[j + 1] === 0 && (buffer[j + 2] === 1 || (j + 3 < buffer.length && buffer[j + 2] === 0 && buffer[j + 3] === 1))) {
                        end = j;
                        break;
                    }
                }
                const naluData = buffer.subarray(i + prefixLen, end);
                const type = naluData[0] & 0x1f;
                nalus.push({ type, data: naluData });
                i = end;
            } else {
                i++;
            }
        }
        return nalus;
    }

    static createAVCCDescription(sps: Uint8Array, pps: Uint8Array) {
        const body = [1, sps[1], sps[2], sps[3], 0xff, 0xe1, (sps.length >> 8) & 0xff, sps.length & 0xff];
        for (let i = 0; i < sps.length; i++) body.push(sps[i]);
        body.push(1, (pps.length >> 8) & 0xff, pps.length & 0xff);
        for (let i = 0; i < pps.length; i++) body.push(pps[i]);
        return new Uint8Array(body);
    }

    static convertChunkToAVCC(buffer: Uint8Array) {
        const nalus = this.findNALUs(buffer);
        let totalLen = 0;
        nalus.forEach(n => (totalLen += 4 + n.data.length));
        const avccBuffer = new Uint8Array(totalLen);
        let offset = 0;
        let sps: Uint8Array | null = null;
        let pps: Uint8Array | null = null;
        for (const nalu of nalus) {
            if (nalu.type === 7) sps = nalu.data;
            if (nalu.type === 8) pps = nalu.data;
            const len = nalu.data.length;
            avccBuffer[offset] = (len >> 24) & 0xff;
            avccBuffer[offset + 1] = (len >> 16) & 0xff;
            avccBuffer[offset + 2] = (len >> 8) & 0xff;
            avccBuffer[offset + 3] = len & 0xff;
            avccBuffer.set(nalu.data, offset + 4);
            offset += 4 + len;
        }
        return { data: avccBuffer, sps, pps };
    }
}

/**
 * Halton low-discrepancy sequence for TAA jitter.
 * Shared between VideoExporter and WorkerExporter.
 */
export const halton = (index: number, base: number) => {
    let result = 0;
    let f = 1 / base;
    let i = index;
    while (i > 0) {
        result = result + f * (i % base);
        i = Math.floor(i / base);
        f = f / base;
    }
    return result;
};
