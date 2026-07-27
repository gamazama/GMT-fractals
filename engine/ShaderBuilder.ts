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

    /**
     * @invariant Keyed on `name` alone, and `Map.set` is last-wins — NOT
     *   idempotent on `(name, type)`. Two features that add the same uniform
     *   name with different `type` or `arraySize` produce one declaration
     *   carrying whichever was added last, silently, with no dev warning.
     *   This is deliberately weaker than the schema layer: `UniformSchema`
     *   THROWS on a name collision at module load, but that check only covers
     *   `BASE_SCHEMA` + `featureRegistry.getUniformDefinitions()` — it cannot
     *   see builder-time `addUniform` calls made from `inject()`. Re-adding an
     *   identical `(name, type, arraySize)` triple is a genuine no-op, which
     *   is what the `backingOnly` re-declaration pattern (R10 in
     *   `docs/policy/uniform-plugin-contract.md`) and `fractal-toy`'s
     *   assembler both rely on.
     */
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
     *
     * Consumer status (checked 2026-07-27): this seam has NO in-repo caller — grep
     *   `addSection(` / `getSections(` and the only hits are this file plus
     *   `buildFragment`'s own `getSections('main')`. engine-gmt drives a typed
     *   17-position assembler (ADR-0043) and `fractal-toy` migrated off
     *   sections in its "Phase A" (see `fractal-toy/renderer/shaderAssembler.ts`
     *   header); both now read the generic primitives instead. ADR-0019
     *   accepted this knowingly — the API is retained for plugin authors — so
     *   an unused-looking seam here is by design, not rot. Do not "clean it
     *   up" without a superseding ADR.
     */
    /**
     * @invariant Multi-valued; does NOT dedup. Repeat `addSection(name, code)`
     *   with identical strings accumulates duplicates (unlike `addHeader` /
     *   `addPreamble` / `addFunction` which dedup on exact-duplicate string).
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

    /**
     * Render uniform declarations block.
     *
     * @invariant Emits from this builder's own `addUniform(name, type,
     *   arraySize?)` entries, so `arraySize` is the only `UniformDefinition`-
     *   shaped field that survives. `comment` is dropped, and — the one that
     *   matters — so is `backingOnly`: this block ALWAYS emits the GLSL
     *   declaration. `backingOnly` is honoured only by the schema walker in
     *   `shaders/chunks/uniforms.ts` (and its `engine-gmt/` mirror), which is
     *   the sole enforcement site; see the `@enforcement` note on
     *   `UniformDefinition.backingOnly` in `engine/UniformSchema.ts`. That
     *   asymmetry is the mechanism behind the `backingOnly` contract: the
     *   schema skips the static declaration and the owning feature re-adds it
     *   on demand from `inject()` via `addUniform`.
     */
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
