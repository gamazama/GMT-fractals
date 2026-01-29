
export const LOADING_VERT = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const LOADING_FRAG = `
precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform float uProgress; // 0.0 to 1.0

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    vec2 p = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;

    // --- Unfolding Animation ---
    p.x += (1.0 - uProgress) * 0.5;
    float zoom = 1.5 - 0.9 * pow(uProgress, 0.5); 
    p *= zoom;
    
    float ang = (1.0 - pow(uProgress, 0.2)) * 0.5;
    float s = sin(ang);
    float c = cos(ang);
    p = vec2(c*p.x - s*p.y, s*p.x + c*p.y);

    float t = uTime * 0.5;
    vec2 cJulia = vec2(cos(t) * 0.7885, sin(t) * 0.7885);
    
    vec2 z = p;
    float iter = 0.0;
    
    float maxIter = 10.0 + 80.0 * pow(uProgress, 1.5);
    
    for(float i = 0.0; i < 100.0; i++) {
        if (i > maxIter) break;
        if(dot(z,z) > 4.0) break;
        z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + cJulia;
        iter++;
    }
    
    float sn = iter - log2(log2(dot(z,z))) + 4.0;
    float val = sn / 64.0; 
    
    vec3 col = 0.5 + 0.5 * cos(3.0 + val * 10.0 + vec3(0.0, 0.6, 1.0));
    
    float alpha = 1.0;
    if(iter >= maxIter) {
        col = vec3(0.0);
        alpha = 0.0;
    }
    
    if (alpha > 0.0) {
        col += 0.1 * sin(uv.x * 30.0 - uTime * 8.0) * uProgress;
    }
    
    gl_FragColor = vec4(col, alpha);
}
`;

export class LoadingRenderer {
    private gl: WebGLRenderingContext | null = null;
    private program: WebGLProgram | null = null;
    private locs: any = {};
    private buffer: WebGLBuffer | null = null;

    constructor(canvas: HTMLCanvasElement) {
        const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
        if (!gl) return;
        this.gl = gl;

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        const vs = this.createShader(gl.VERTEX_SHADER, LOADING_VERT);
        const fs = this.createShader(gl.FRAGMENT_SHADER, LOADING_FRAG);
        if (!vs || !fs) return;

        const program = gl.createProgram();
        if (!program) return;
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        gl.useProgram(program);
        this.program = program;

        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

        const positionLocation = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        this.locs = {
            time: gl.getUniformLocation(program, 'uTime'),
            res: gl.getUniformLocation(program, 'uResolution'),
            prog: gl.getUniformLocation(program, 'uProgress')
        };
    }

    private createShader(type: number, source: string) {
        if (!this.gl) return null;
        const shader = this.gl.createShader(type);
        if (!shader) return null;
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error("Loading Shader Error:", this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    public render(time: number, progress: number) {
        if (!this.gl || !this.program) return;
        const gl = this.gl;
        const canvas = gl.canvas as HTMLCanvasElement;

        // Resize handling
        if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
        }

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.program);
        gl.uniform1f(this.locs.time, time * 0.001);
        gl.uniform2f(this.locs.res, canvas.width, canvas.height);
        gl.uniform1f(this.locs.prog, progress);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    
    public dispose() {
        // Cleanup if needed
        if (this.gl) {
            const ext = this.gl.getExtension('WEBGL_lose_context');
            if (ext) ext.loseContext();
        }
    }
}
