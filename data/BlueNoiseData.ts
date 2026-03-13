
import * as THREE from 'three';

// Detect if running in a Web Worker (no document/Image available)
const isWorkerContext = typeof document === 'undefined';

/**
 * Creates a blue noise texture. Uses TextureLoader in main thread,
 * fetch + DataTexture in worker context (no DOM APIs available).
 */
export const createBlueNoiseTexture = (): THREE.Texture => {
    if (isWorkerContext) {
        return createBlueNoiseWorker();
    }
    return createBlueNoiseMainThread();
};

function createBlueNoiseMainThread(): THREE.Texture {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';

    try {
        const texture = loader.load(
            'blueNoise.png',
            undefined,
            undefined,
            () => {
                // Fallback handled by catch path
            }
        );

        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.generateMipmaps = false;
        texture.colorSpace = THREE.LinearSRGBColorSpace;
        texture.format = THREE.RGBAFormat;
        texture.type = THREE.UnsignedByteType;

        return texture;
    } catch {
        return createProceduralFallback();
    }
}

function createBlueNoiseWorker(): THREE.Texture {
    // Create a placeholder texture immediately
    const placeholder = createProceduralFallback();

    // Fetch the real PNG asynchronously and replace data when ready.
    // In production, worker lives in assets/ — derive page base from worker URL.
    // In dev mode (Vite), public files are served at origin root.
    const workerHref = typeof self !== 'undefined' ? self.location?.href || '' : '';
    const prodBase = workerHref.includes('/assets/')
        ? workerHref.substring(0, workerHref.lastIndexOf('/assets/') + 1)
        : null;
    const tryFetch = (url: string) => fetch(url).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.blob();
    });
    // Try production path first, then dev origin-relative path
    const fetchPromise = prodBase
        ? tryFetch(`${prodBase}blueNoise.png`).catch(() => tryFetch('/blueNoise.png'))
        : tryFetch('/blueNoise.png');
    fetchPromise
        .then(blob => createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }))
        .then(bitmap => {
            // Read pixels from ImageBitmap via OffscreenCanvas
            // IMPORTANT: willReadFrequently avoids GPU readback overhead
            const w = bitmap.width;
            const h = bitmap.height;
            const oc = new OffscreenCanvas(w, h);
            const ctx = oc.getContext('2d', { willReadFrequently: true })!;
            ctx.drawImage(bitmap, 0, 0);
            const imageData = ctx.getImageData(0, 0, w, h);
            bitmap.close();

            // Update the placeholder texture with real data
            // UniformManager auto-syncs resolution from tex.image each frame
            placeholder.image = { data: new Uint8Array(imageData.data.buffer), width: w, height: h };
            placeholder.needsUpdate = true;
        })
        .catch((err) => {
            console.warn('[BlueNoise] Failed to load PNG, using procedural fallback:', err);
        });

    return placeholder;
}

function createProceduralFallback(): THREE.DataTexture {
    const size = 128;
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size * 4; i++) {
        data[i] = Math.floor(Math.random() * 255);
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
}
