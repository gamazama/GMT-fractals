
import * as THREE from 'three';
import { engine } from './FractalEngine';
import { Uniforms } from './UniformNames';
import { FractalEvents, FRACTAL_EVENTS } from './FractalEvents';
import { useFractalStore } from '../store/fractalStore';
import { injectMetadata } from '../utils/pngMetadata';
import { getExportFileName } from '../utils/fileUtils';

export interface BucketRenderConfig {
    bucketSize: number;
    bucketUpscale: number;
    convergenceThreshold: number;
    accumulation: boolean;
}

export class BucketRenderer {
    private isRunning: boolean = false;
    private isExporting: boolean = false;
    
    private buckets: { minX: number, minY: number, maxX: number, maxY: number }[] = [];
    private currentBucketIndex: number = 0;
    
    private bucketFrameCount: number = 0;
    private readonly MAX_FRAMES_PER_BUCKET = 512; 
    
    private originalSize = new THREE.Vector2();
    private activeUpscale: number = 1.0;
    private targetResolution = new THREE.Vector2();
    
    // Cached config
    private config: BucketRenderConfig = { 
        bucketSize: 128, 
        bucketUpscale: 1.0, 
        convergenceThreshold: 0.1, 
        accumulation: true 
    };

    public start(exportImage: boolean, config: BucketRenderConfig) {
        if (!engine.renderer || this.isRunning) return;
        
        this.isExporting = exportImage;
        this.config = { ...config };
        this.activeUpscale = config.bucketUpscale || 1.0;
        
        const gl = engine.renderer;
        
        // Store current size to restore later
        gl.getSize(this.originalSize);
        
        // Calculate Target Resolution
        const targetW = Math.floor(this.originalSize.x * this.activeUpscale);
        const targetH = Math.floor(this.originalSize.y * this.activeUpscale);
        this.targetResolution.set(targetW, targetH);
        
        engine.pipeline.resize(targetW, targetH);
        engine.mainUniforms.uResolution.value.set(targetW, targetH);
        
        this.buckets = [];
        
        const size = config.bucketSize;
        const cols = Math.ceil(targetW / size);
        const rows = Math.ceil(targetH / size);
        
        for (let y = rows - 1; y >= 0; y--) {
            for (let x = 0; x < cols; x++) {
                const x1 = (x * size) / targetW;
                const y1 = (y * size) / targetH;
                const x2 = Math.min(1.0, ((x + 1) * size) / targetW);
                const y2 = Math.min(1.0, ((y + 1) * size) / targetH);
                this.buckets.push({ minX: x1, minY: y1, maxX: x2, maxY: y2 });
            }
        }
        
        this.currentBucketIndex = 0;
        this.bucketFrameCount = 0;
        this.isRunning = true;
        
        // Notify UI via Event
        FractalEvents.emit(FRACTAL_EVENTS.BUCKET_STATUS, { isRendering: true, progress: 0 });
        
        this.applyCurrentBucket();
    }
    
    public stop() {
        if (this.isRunning) {
            this.cleanup();
        }
    }
    
    private cleanup() {
        this.isRunning = false;
        this.isExporting = false;
        
        const min = new THREE.Vector2(0, 0);
        const max = new THREE.Vector2(1, 1);
        engine.materials.setUniform(Uniforms.RegionMin, min);
        engine.materials.setUniform(Uniforms.RegionMax, max);
        
        engine.pipeline.resize(this.originalSize.x, this.originalSize.y);
        engine.mainUniforms.uResolution.value.set(this.originalSize.x, this.originalSize.y);
        engine.resetAccumulation();
        
        // Notify UI via Event
        FractalEvents.emit(FRACTAL_EVENTS.BUCKET_STATUS, { isRendering: false, progress: 0 });
    }
    
    private applyCurrentBucket() {
        if (this.currentBucketIndex >= this.buckets.length) {
            this.finish();
            return;
        }
        
        const b = this.buckets[this.currentBucketIndex];
        const min = new THREE.Vector2(b.minX, b.minY);
        const max = new THREE.Vector2(b.maxX, b.maxY);
        
        engine.materials.setUniform(Uniforms.RegionMin, min);
        engine.materials.setUniform(Uniforms.RegionMax, max);
        
        engine.pipeline.resetAccumulation();
        this.bucketFrameCount = 0;
    }
    
    private finish() {
        if (this.isExporting) {
            this.saveImage();
        } else {
            if (this.activeUpscale === 1.0) {
                 engine.pipeline.setHold(true);
            }
        }
        this.cleanup();
    }
    
    private saveImage() {
        const tex = engine.pipeline.getOutputTexture();
        if (!tex || !engine.renderer) return;
        
        const w = this.targetResolution.x;
        const h = this.targetResolution.y;
        
        const exportTarget = new THREE.WebGLRenderTarget(w, h, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType,
            stencilBuffer: false,
            depthBuffer: false
        });
        
        const mat = engine.materials.exportMaterial;
        const displayMat = engine.materials.displayMaterial;
        
        mat.uniforms.map.value = tex;
        mat.uniforms.uSaturation.value = displayMat.uniforms.uSaturation.value;
        mat.uniforms.uLevelsMin.value = displayMat.uniforms.uLevelsMin.value;
        mat.uniforms.uLevelsMax.value = displayMat.uniforms.uLevelsMax.value;
        mat.uniforms.uLevelsGamma.value = displayMat.uniforms.uLevelsGamma.value;
        mat.uniforms.uEncodeOutput.value = 1.0;
        
        const currentTarget = engine.renderer.getRenderTarget();
        const currentViewport = new THREE.Vector4();
        engine.renderer.getViewport(currentViewport);

        engine.renderer.setRenderTarget(exportTarget);
        engine.renderer.setViewport(0, 0, w, h); 
        engine.renderer.clear();
        
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
        scene.add(quad);
        engine.renderer.render(scene, camera);
        
        const buffer = new Uint8Array(w * h * 4);
        engine.renderer.readRenderTargetPixels(exportTarget, 0, 0, w, h, buffer);
        
        engine.renderer.setRenderTarget(currentTarget);
        engine.renderer.setViewport(currentViewport);
        exportTarget.dispose();
        
        const flipped = new Uint8ClampedArray(w * h * 4);
        const stride = w * 4;
        for (let y = 0; y < h; y++) {
            const srcRowStart = y * stride;
            const destRowStart = (h - 1 - y) * stride;
            flipped.set(buffer.subarray(srcRowStart, srcRowStart + stride), destRowStart);
        }
        for(let i=3; i<flipped.length; i+=4) flipped[i] = 255;
        
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            const imageData = new ImageData(flipped, w, h);
            ctx.putImageData(imageData, 0, 0);
            
            // Get preset data from store
            const store = useFractalStore.getState();
            const preset = store.getPreset({ includeScene: true });
            const presetStr = JSON.stringify(preset);
            
            // Increment PNG Counter
            const currentVersion = store.prepareExport();

            // Construct Filename
            const filename = getExportFileName(
                store.projectSettings.name,
                currentVersion,
                'png',
                `${w}x${h}`
            );

            canvas.toBlob(async (blob) => {
                if (!blob) return;
                
                try {
                    // Inject Metadata
                    const taggedBlob = await injectMetadata(blob, "FractalData", presetStr);
                    const url = URL.createObjectURL(taggedBlob);
                    
                    const link = document.createElement('a');
                    link.download = filename;
                    link.href = url;
                    link.click();
                    URL.revokeObjectURL(url);
                } catch (e) {
                    console.error("Failed to inject metadata", e);
                    // Fallback to simple save
                    const link = document.createElement('a');
                    link.download = filename;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                }
            }, 'image/png');
        }
    }
    
    public update(gl: THREE.WebGLRenderer, config: BucketRenderConfig) {
        if (!this.isRunning) return;
        
        // Update local config ref if it changed (e.g. from UI sliders during render)
        if (config) {
            this.config.convergenceThreshold = config.convergenceThreshold;
            this.config.accumulation = config.accumulation;
        }

        const uRes = engine.mainUniforms.uResolution.value;
        if (uRes.x !== this.targetResolution.x || uRes.y !== this.targetResolution.y) {
            uRes.set(this.targetResolution.x, this.targetResolution.y);
        }
        
        const isAccumulating = this.config.accumulation;
        const warmupFrames = isAccumulating ? 10 : 4; 

        if (this.bucketFrameCount < warmupFrames) {
            this.bucketFrameCount++;
            return;
        }

        const currentBucket = this.buckets[this.currentBucketIndex];
        const min = new THREE.Vector2(currentBucket.minX, currentBucket.minY);
        const max = new THREE.Vector2(currentBucket.maxX, currentBucket.maxY);

        let delta = 0.0;
        
        if (isAccumulating) {
            delta = engine.pipeline.measureConvergence(gl, min, max);
        } else {
             delta = 0.0; 
        }

        const thresholdPct = this.config.convergenceThreshold;
        const thresholdRaw = thresholdPct / 100.0;
        
        if (delta < thresholdRaw || this.bucketFrameCount > this.MAX_FRAMES_PER_BUCKET) {
            this.currentBucketIndex++;
            this.applyCurrentBucket();
            
            // If we finished (in applyCurrentBucket -> finish -> cleanup), isRunning is now false.
            if (!this.isRunning) return;

            // Emit progress
            const prog = (this.currentBucketIndex / this.buckets.length) * 100;
            FractalEvents.emit(FRACTAL_EVENTS.BUCKET_STATUS, { isRendering: true, progress: prog });
        } else {
            this.bucketFrameCount++;
        }
    }
    
    public getProgress() {
        if (!this.isRunning || this.buckets.length === 0) return 0;
        return (this.currentBucketIndex / this.buckets.length) * 100;
    }
}

export const bucketRenderer = new BucketRenderer();
