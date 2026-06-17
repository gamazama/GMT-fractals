
/**
 * CPU-based Julia set loading spinner — direct port of the WebGL LoadingRenderer.
 * Renders to a Canvas2D ImageData buffer. At 500×64 (32K pixels) this runs
 * comfortably at 60fps on any modern CPU, with no GPU contention.
 */
export class LoadingRendererCPU {
    private ctx: CanvasRenderingContext2D | null = null;
    private imageData: ImageData | null = null;

    constructor(canvas: HTMLCanvasElement) {
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;
        this.ctx = ctx;
    }

    public render(time: number, progress: number) {
        if (!this.ctx) return;
        const canvas = this.ctx.canvas;

        if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            this.imageData = null;
        }

        const W = canvas.width;
        const H = canvas.height;
        if (W === 0 || H === 0) return;

        if (!this.imageData || this.imageData.width !== W || this.imageData.height !== H) {
            this.imageData = this.ctx.createImageData(W, H);
        }

        const data = this.imageData.data;
        const uTime = time * 0.001;

        // Pre-compute Julia animation params (mirrors GLSL)
        const t = uTime * 0.5;
        const cRe = Math.cos(t) * 0.7885;
        const cIm = Math.sin(t) * 0.7885;

        // Unfolding params
        const zoom = 1.5 - 0.9 * Math.pow(progress, 0.5);
        const ang = (1.0 - Math.pow(progress, 0.2)) * 0.5;
        const sinA = Math.sin(ang);
        const cosA = Math.cos(ang);
        const xShift = (1.0 - progress) * 0.5;

        const maxIter = 10.0 + 80.0 * Math.pow(progress, 1.5);
        const maxIterInt = Math.min(Math.floor(maxIter), 90);

        const invH = 1.0 / H;
        const halfW = W * 0.5;
        const halfH = H * 0.5;

        for (let y = 0; y < H; y++) {
            // Canvas2D has y=0 at top, GLSL at bottom — flip
            const fragY = H - 1 - y;
            const uvX_base = 1.0 / W; // for scanline effect

            for (let x = 0; x < W; x++) {
                // Normalized coords matching GLSL
                let px = (x - halfW) * invH;
                let py = (fragY - halfH) * invH;

                // Unfolding
                px += xShift;
                px *= zoom;
                py *= zoom;

                // Rotation
                const rx = cosA * px - sinA * py;
                const ry = sinA * px + cosA * py;

                // Julia iteration
                let zr = rx;
                let zi = ry;
                let iter = 0;
                for (let i = 0; i < maxIterInt; i++) {
                    const zr2 = zr * zr;
                    const zi2 = zi * zi;
                    if (zr2 + zi2 > 4.0) break;
                    zi = 2.0 * zr * zi + cIm;
                    zr = zr2 - zi2 + cRe;
                    iter++;
                }

                const idx = (y * W + x) * 4;

                if (iter >= maxIterInt) {
                    // Interior — transparent black
                    data[idx] = 0;
                    data[idx + 1] = 0;
                    data[idx + 2] = 0;
                    data[idx + 3] = 0;
                } else {
                    // Smooth iteration count
                    const dot = zr * zr + zi * zi;
                    const sn = iter - Math.log2(Math.log2(dot)) + 4.0;
                    const val = sn / 64.0;

                    // Cosine palette (same as GLSL)
                    const base = 3.0 + val * 10.0;
                    let r = 0.5 + 0.5 * Math.cos(base);
                    let g = 0.5 + 0.5 * Math.cos(base + 0.6);
                    let b = 0.5 + 0.5 * Math.cos(base + 1.0);

                    // Scanline shimmer
                    const uvX = x * uvX_base;
                    const shimmer = 0.1 * Math.sin(uvX * 30.0 - uTime * 8.0) * progress;
                    r += shimmer;
                    g += shimmer;
                    b += shimmer;

                    data[idx]     = Math.max(0, Math.min(255, (r * 255) | 0));
                    data[idx + 1] = Math.max(0, Math.min(255, (g * 255) | 0));
                    data[idx + 2] = Math.max(0, Math.min(255, (b * 255) | 0));
                    data[idx + 3] = 255;
                }
            }
        }

        this.ctx.putImageData(this.imageData, 0, 0);
    }

    public dispose() {
        this.ctx = null;
        this.imageData = null;
    }
}
