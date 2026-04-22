/**
 * ShaderBuilder — generic GLSL assembly with a plugin-extensible section API.
 *
 * The engine provides five generic primitives that any shader needs:
 *   - addDefine        → preprocessor macros
 *   - addUniform       → uniform declarations
 *   - addHeader        → top-of-shader raw GLSL (precision qualifiers, extensions)
 *   - addPreamble      → global-scope code before function definitions
 *   - addFunction      → GLSL function definitions
 *
 * Everything else — fractal-specific hooks like postMapCode, missHandler,
 * hybridFold, materialLogic, shadingLogic, volumetricTracing, compositeLogic —
 * lives in plugins. Plugins register with `addSection(name, code)` and read
 * back via `getSections(name)` to drive their own pipeline template.
 *
 * The default `buildFragment()` produces a minimal shader that apps will
 * typically override. A raymarching plugin supplies its own assembler that
 * reads the feature-injected sections and composes the DE / trace / material /
 * post-process template around them.
 */

export type RenderVariant = 'Main' | 'Physics' | 'Histogram' | 'Mesh';

export class ShaderBuilder {
    private defines = new Map<string, string>();
    private uniforms = new Map<string, { type: string; arraySize?: number }>();
    private headers: string[] = [];
    private preambles: string[] = [];
    private functions: string[] = [];
    private sections = new Map<string, string[]>();

    constructor(public variant: RenderVariant = 'Main') {}

    // ─── Generic Primitives (engine-provided) ───────────────────────────

    addDefine(name: string, value: string = '1') {
        this.defines.set(name, value);
    }

    addUniform(name: string, type: string, arraySize?: number) {
        this.uniforms.set(name, { type, arraySize });
    }

    addHeader(code: string) {
        if (!this.headers.includes(code)) this.headers.push(code);
    }

    addPreamble(code: string) {
        if (!this.preambles.includes(code)) this.preambles.push(code);
    }

    addFunction(code: string) {
        if (!this.functions.includes(code)) this.functions.push(code);
    }

    // ─── Plugin Escape Hatch ────────────────────────────────────────────

    /**
     * Register code into a named pipeline section. The engine itself never
     * interprets section contents — a plugin reads back via `getSections(name)`
     * and assembles them into its own shader template.
     *
     * Example: a raymarching plugin defines sections 'postMapCode',
     * 'materialLogic', 'missHandler', 'volumeBody', 'integrator', etc., then
     * its assembler composes them into the full raymarching shader at build.
     */
    addSection(name: string, code: string) {
        if (!this.sections.has(name)) this.sections.set(name, []);
        this.sections.get(name)!.push(code);
    }

    // ─── Read-back API (for plugin assemblers) ──────────────────────────

    getDefines(): Map<string, string> { return this.defines; }
    getUniforms(): Map<string, { type: string; arraySize?: number }> { return this.uniforms; }
    getHeaders(): ReadonlyArray<string> { return this.headers; }
    getPreambles(): ReadonlyArray<string> { return this.preambles; }
    getFunctions(): ReadonlyArray<string> { return this.functions; }
    getSections(name: string): ReadonlyArray<string> { return this.sections.get(name) ?? []; }
    getAllSectionNames(): string[] { return Array.from(this.sections.keys()); }
    getVariant(): RenderVariant { return this.variant; }

    // ─── Assembly Helpers ───────────────────────────────────────────────

    /** Render defines block: `#define NAME VALUE` lines. */
    buildDefinesBlock(): string {
        const out: string[] = [];
        this.defines.forEach((val, key) => out.push(`#define ${key} ${val}`));
        return out.join('\n');
    }

    /** Render uniform declarations block. */
    buildUniformsBlock(): string {
        const out: string[] = [];
        this.uniforms.forEach((info, name) => {
            out.push(info.arraySize
                ? `uniform ${info.type} ${name}[${info.arraySize}];`
                : `uniform ${info.type} ${name};`);
        });
        return out.join('\n');
    }

    // ─── Default Build ──────────────────────────────────────────────────

    /**
     * Minimal default shader. Apps with non-trivial pipelines should skip
     * this and call `getSections(name)` directly to drive their own template.
     *
     * The `main` section, if registered, becomes the body of `void main()`.
     */
    buildFragment(): string {
        const defines = this.buildDefinesBlock();
        const uniforms = this.buildUniformsBlock();
        const mainBody = this.getSections('main').join('\n');

        return `#version 300 es
precision highp float;

${defines}

${this.headers.join('\n')}

${uniforms}

${this.preambles.join('\n')}

${this.functions.join('\n')}

out vec4 pc_fragColor;

void main() {
${mainBody || '    pc_fragColor = vec4(0.0, 0.0, 0.0, 1.0);'}
}
`;
    }
}
