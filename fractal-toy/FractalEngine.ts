/**
 * FractalEngine — minimal WebGL2 renderer for Fractal Toy.
 *
 * Responsibilities (small on purpose):
 *   - Create a WebGL2 context on a given canvas
 *   - Compile the assembled fragment shader
 *   - Render a fullscreen quad via requestAnimationFrame
 *   - Set built-in uniforms (uTime, uResolution, uFrame) each frame
 *   - Expose setUniformF / setUniformI / setUniform* for feature-managed uniforms
 *   - Handle resize + dispose cleanly
 *
 * What this is NOT (for now): the full GMT FractalEngine. No MRT, no
 * accumulation, no ping-pong, no convergence, no path tracing, no
 * history buffers. All of that lands when the minimal rendering is
 * proven and we tackle the full GMT port. See docs/10_Viewport.md for
 * the viewport-plugin integration plan.
 */

const VERTEX_SRC = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export class FractalEngine {
    private gl: WebGL2RenderingContext;
    private program: WebGLProgram | null = null;
    private vao: WebGLVertexArrayObject | null = null;
    private uniformLocations = new Map<string, WebGLUniformLocation>();
    private rafId: number | null = null;
    private startTime = performance.now();
    private frameCount = 0;

    constructor(public readonly canvas: HTMLCanvasElement) {
        const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
        if (!gl) throw new Error('[FractalEngine] WebGL2 is required and not available.');
        this.gl = gl;
        this.initQuad();
    }

    /** Compile and install a new fragment shader. Replaces any previous program. */
    public setShader(fragSrc: string): void {
        const gl = this.gl;
        if (this.program) gl.deleteProgram(this.program);

        const vs = this.compile(VERTEX_SRC, gl.VERTEX_SHADER, 'vertex');
        const fs = this.compile(fragSrc, gl.FRAGMENT_SHADER, 'fragment');
        const prog = gl.createProgram();
        if (!prog) throw new Error('[FractalEngine] createProgram failed');
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        // Bind position attribute to location 0 (matches VAO setup).
        gl.bindAttribLocation(prog, 0, 'aPosition');
        gl.linkProgram(prog);
        gl.deleteShader(vs);
        gl.deleteShader(fs);

        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(prog);
            gl.deleteProgram(prog);
            throw new Error(`[FractalEngine] program link failed: ${info}`);
        }

        this.program = prog;
        this.cacheUniforms();
    }

    public setUniformF(name: string, v: number): void { this.uniformApply(name, (gl, loc) => gl.uniform1f(loc, v)); }
    public setUniformI(name: string, v: number): void { this.uniformApply(name, (gl, loc) => gl.uniform1i(loc, v)); }
    public setUniform2F(name: string, a: number, b: number): void { this.uniformApply(name, (gl, loc) => gl.uniform2f(loc, a, b)); }
    public setUniform3F(name: string, a: number, b: number, c: number): void { this.uniformApply(name, (gl, loc) => gl.uniform3f(loc, a, b, c)); }
    public setUniform4F(name: string, a: number, b: number, c: number, d: number): void { this.uniformApply(name, (gl, loc) => gl.uniform4f(loc, a, b, c, d)); }

    public resize(widthPx: number, heightPx: number): void {
        if (widthPx < 1 || heightPx < 1) return;
        this.canvas.width = widthPx;
        this.canvas.height = heightPx;
        this.gl.viewport(0, 0, widthPx, heightPx);
    }

    public start(): void {
        if (this.rafId !== null) return;
        const loop = () => {
            this.render();
            this.rafId = requestAnimationFrame(loop);
        };
        this.rafId = requestAnimationFrame(loop);
    }

    public stop(): void {
        if (this.rafId !== null) cancelAnimationFrame(this.rafId);
        this.rafId = null;
    }

    public dispose(): void {
        this.stop();
        const gl = this.gl;
        if (this.program) { gl.deleteProgram(this.program); this.program = null; }
        if (this.vao) { gl.deleteVertexArray(this.vao); this.vao = null; }
        this.uniformLocations.clear();
    }

    private render(): void {
        const gl = this.gl;
        if (!this.program || !this.vao) return;

        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program);

        // Built-in per-frame uniforms. Set via direct calls (not through
        // setUniformF) to avoid the redundant useProgram() each call.
        const timeSec = (performance.now() - this.startTime) / 1000;
        const timeLoc = this.uniformLocations.get('uTime');
        if (timeLoc) gl.uniform1f(timeLoc, timeSec);
        const resLoc = this.uniformLocations.get('uResolution');
        if (resLoc) gl.uniform2f(resLoc, this.canvas.width, this.canvas.height);
        const frameLoc = this.uniformLocations.get('uFrame');
        if (frameLoc) gl.uniform1i(frameLoc, this.frameCount);

        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        this.frameCount++;
    }

    private uniformApply(name: string, fn: (gl: WebGL2RenderingContext, loc: WebGLUniformLocation) => void): void {
        const loc = this.uniformLocations.get(name);
        if (!loc || !this.program) return;
        const gl = this.gl;
        gl.useProgram(this.program);
        fn(gl, loc);
    }

    private cacheUniforms(): void {
        this.uniformLocations.clear();
        const gl = this.gl;
        const prog = this.program!;
        const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < n; i++) {
            const info = gl.getActiveUniform(prog, i);
            if (!info) continue;
            // Strip array suffix `[0]` when present.
            const name = info.name.endsWith('[0]') ? info.name.slice(0, -3) : info.name;
            const loc = gl.getUniformLocation(prog, name);
            if (loc) this.uniformLocations.set(name, loc);
        }
    }

    private initQuad(): void {
        const gl = this.gl;
        const data = new Float32Array([
            -1, -1,  1, -1,  1,  1,
            -1, -1,  1,  1, -1,  1,
        ]);
        const vao = gl.createVertexArray();
        const vbo = gl.createBuffer();
        if (!vao || !vbo) throw new Error('[FractalEngine] VAO/VBO creation failed');
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);
        this.vao = vao;
    }

    private compile(src: string, type: number, label: string): WebGLShader {
        const gl = this.gl;
        const sh = gl.createShader(type);
        if (!sh) throw new Error(`[FractalEngine] createShader failed (${label})`);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(sh);
            const numbered = src.split('\n').map((l, i) => `${String(i + 1).padStart(3, ' ')}: ${l}`).join('\n');
            gl.deleteShader(sh);
            throw new Error(`[FractalEngine] ${label} shader compile failed: ${info}\n\n${numbered}`);
        }
        return sh;
    }
}
