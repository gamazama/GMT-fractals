/**
 * Uniform and preset parsing.
 * Contains:
 *   - V2 regex-based fallback uniform/preset/include extraction
 *   - V1 GenericFragmentariumParser class (handles slider annotations)
 */

import type { FragUniform, FragPreset, GenericFragDocument, ParamMapping, TransformedFormula } from '../types';

// ============================================================================
// V2 fallback extraction (used when no V1 doc is available)
// ============================================================================

export function findUniforms(source: string): FragUniform[] {
    const uniforms: FragUniform[] = [];
    const uniformPattern = /uniform\s+(float|int|vec2|vec3|vec4|bool)\s+(\w+)\s*(?:=\s*([^;]+))?;/g;

    let match;
    while ((match = uniformPattern.exec(source)) !== null) {
        const type = match[1] as FragUniform['type'];
        const name = match[2];
        const defaultValue = match[3]?.trim();

        let defaultVal: number | number[] = 0;
        if (defaultValue) {
            if (type === 'vec4') {
                const vecMatch = defaultValue.match(/vec4\s*\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\s*\)/);
                if (vecMatch) {
                    defaultVal = [parseFloat(vecMatch[1]), parseFloat(vecMatch[2]), parseFloat(vecMatch[3]), parseFloat(vecMatch[4])];
                }
            } else if (type === 'vec3') {
                const vecMatch = defaultValue.match(/vec3\s*\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\s*\)/);
                if (vecMatch) {
                    defaultVal = [parseFloat(vecMatch[1]), parseFloat(vecMatch[2]), parseFloat(vecMatch[3])];
                }
            } else if (type === 'vec2') {
                const vecMatch = defaultValue.match(/vec2\s*\(\s*([^,]+),\s*([^)]+)\s*\)/);
                if (vecMatch) {
                    defaultVal = [parseFloat(vecMatch[1]), parseFloat(vecMatch[2])];
                }
            } else if (type === 'bool') {
                defaultVal = defaultValue === 'true' ? 1 : 0;
            } else {
                defaultVal = parseFloat(defaultValue) || 0;
            }
        }

        uniforms.push({
            name, type, uiType: 'slider', default: defaultVal,
            min: 0, max: type === 'int' ? 100 : 10, step: type === 'int' ? 1 : 0.1
        });
    }

    return uniforms;
}

export function findPresets(source: string): FragPreset[] {
    const presets: FragPreset[] = [];
    const lines = source.split('\n');
    let inFunction = false;
    let braceCount = 0;

    for (const line of lines) {
        const trimmed = line.trim();
        if (/^(void|float|vec3|vec4|int|bool|mat3|mat4)\s+\w+\s*\(/.test(trimmed)) {
            inFunction = true;
        }
        if (inFunction) {
            braceCount += (trimmed.match(/{/g) || []).length;
            braceCount -= (trimmed.match(/}/g) || []).length;
            if (braceCount === 0 && trimmed.includes('}')) inFunction = false;
            continue;
        }
        const presetMatch = trimmed.match(/^(float|vec2|vec3|int|bool)\s+(\w+)\s*=\s*([^;]+);/);
        if (presetMatch && !trimmed.startsWith('uniform')) {
            const type = presetMatch[1];
            const name = presetMatch[2];
            const valueStr = presetMatch[3].trim();
            let value: string | number | number[] | boolean = valueStr;
            if (type === 'float') value = parseFloat(valueStr) || 0;
            else if (type === 'int') value = parseInt(valueStr) || 0;
            else if (type === 'bool') value = valueStr === 'true';
            presets.push({ name, values: { [name]: value } });
        }
    }
    return presets;
}

export function findIncludes(source: string): string[] {
    const includes: string[] = [];
    const includePattern = /#include\s+["']([^"']+)["']/g;
    let match;
    while ((match = includePattern.exec(source)) !== null) {
        includes.push(match[1]);
    }
    return includes;
}

// ============================================================================
// V1 parser class (handles slider annotations; used as pre-pass for V2)
// ============================================================================

export class GenericFragmentariumParser {

    public static hasProvidesColor(source: string): boolean {
        return /#define\s+providesColor/.test(source);
    }

    public static hasDEFunction(source: string): boolean {
        return /float\s+DE\s*\(\s*vec3/.test(source);
    }

    public static parse(source: string): GenericFragDocument {
        const doc: GenericFragDocument = {
            uniforms: [],
            presets: [],
            deFunction: '',
            deFunctionName: 'DE',
            helperFunctions: [],
            includes: [],
            rawGLSL: source,
            iterations: 15
        };

        const includeRegex = /#include\s+["']([^"']+)["']/g;
        let match;
        while ((match = includeRegex.exec(source)) !== null) {
            doc.includes.push(match[1]);
        }

        // Extract presets
        const presetRegex = /#preset\s+([^\n]+)\n([\s\S]*?)#endpreset/g;
        while ((match = presetRegex.exec(source)) !== null) {
            const presetName = match[1].trim();
            const presetBody = match[2];
            const values: Record<string, string | number | number[] | boolean> = {};
            const lineRegex = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/gm;
            let lineMatch;
            while ((lineMatch = lineRegex.exec(presetBody)) !== null) {
                const key = lineMatch[1];
                const valStr = lineMatch[2].trim();
                if (valStr.includes(',')) {
                    // Comma-separated: vec2/vec3 in some formats
                    const numArr = valStr.split(',').map(s => parseFloat(s.trim()));
                    values[key] = numArr.some(isNaN) ? valStr : numArr;
                } else if (valStr.toLowerCase() === 'true') {
                    values[key] = true;
                } else if (valStr.toLowerCase() === 'false') {
                    values[key] = false;
                } else if (valStr.includes(' ')) {
                    // Space-separated: Fragmentarium's native vec2/vec3 preset format ("0 0 1")
                    const numArr = valStr.split(/\s+/).map(s => parseFloat(s));
                    values[key] = numArr.some(isNaN) ? valStr : numArr;
                } else {
                    const num = parseFloat(valStr);
                    values[key] = isNaN(num) ? valStr : num;
                }
            }
            doc.presets.push({ name: presetName, values });
            if (doc.presets.length === 1 && typeof values['Iterations'] === 'number') {
                doc.iterations = values['Iterations'] as number;
            }
        }

        // Extract uniforms with slider annotations
        const uniformRegex = /uniform\s+(float|int|vec2|vec3|vec4|bool)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=\s*([^;]+))?;\s*(?:\/\/\s*)?(?:slider\[([^\]]+)\]|checkbox\[([^\]]+)\]|color\[([^\]]+)\])?/g;
        const rawUniforms: Array<{name: string; type: string; rawValue: string; sliderData: string}> = [];

        while ((match = uniformRegex.exec(source)) !== null) {
            const type = match[1];
            const name = match[2];
            const rawValue = match[3] ? match[3].trim() : '';
            const sliderData = match[4];
            if (['Iterations', 'ColorIterations', 'i', 'j', 'k', 'd', 'p', 'z', 'iter', 'dist'].includes(name)) continue;
            rawUniforms.push({ name, type, rawValue, sliderData });
        }

        const PARAM_SLOTS = ['paramA', 'paramB', 'paramC', 'paramD', 'paramE', 'paramF'];
        const VEC2_SLOTS_V1 = ['vec2A', 'vec2B', 'vec2C'];
        const VEC3_SLOTS_V1 = ['vec3A', 'vec3B', 'vec3C'];
        let slotIndex = 0, vec2SlotIndex = 0, vec3SlotIndex = 0;

        for (const u of rawUniforms) {
            const { name, type, rawValue, sliderData } = u;
            let uiMin = type === 'float' ? -10 : 0;
            let uiMax = type === 'float' ? 10 : 10;
            let uiStep = type === 'float' ? 0.01 : 1;
            let uiDefault: number | number[] = 0;
            let isDegrees = false;

            if (type === 'vec4') {
                uiDefault = [0, 0, 0, 0];
                if (sliderData) {
                    const parts = sliderData.split(/\)\s*,\s*\(/);
                    if (parts.length >= 3) {
                        const defParts = parts[1].replace(/[()]/g, '').split(',').map(s => parseFloat(s.trim()));
                        if (defParts.length === 4 && !defParts.some(isNaN)) uiDefault = defParts;
                        uiStep = 0.001;
                    }
                }
            } else if (type === 'vec3') {
                uiDefault = [0, 0, 0];
                if (rawValue && rawValue.includes(',')) {
                    const parts = rawValue.split(',').map(s => parseFloat(s.trim()));
                    if (parts.length === 3 && !parts.some(isNaN)) uiDefault = parts;
                }
                if (sliderData) {
                    const parts = sliderData.split(/\)\s*,\s*\(/);
                    if (parts.length >= 3) {
                        uiMin = parseFloat(parts[0].replace(/[()]/g, '').split(',')[0]) || -10;
                        uiMax = parseFloat(parts[2].replace(/[()]/g, '').split(',')[0]) || 10;
                        const defParts = parts[1].replace(/[()]/g, '').split(',').map(s => parseFloat(s.trim()));
                        if (defParts.length === 3 && !defParts.some(isNaN)) uiDefault = defParts;
                        const range = uiMax - uiMin;
                        uiStep = range > 10 ? 0.1 : range > 2 ? 0.01 : 0.001;
                    } else { uiStep = 0.01; }
                } else { uiStep = 0.01; }
            } else if (type === 'vec2') {
                uiDefault = [0, 0];
                if (rawValue && rawValue.includes(',')) {
                    const parts = rawValue.split(',').map(s => parseFloat(s.trim()));
                    if (parts.length === 2 && !parts.some(isNaN)) uiDefault = parts;
                }
                if (sliderData) {
                    const parts = sliderData.split(/\)\s*,\s*\(/);
                    if (parts.length >= 3) {
                        uiMin = parseFloat(parts[0].replace(/[()]/g, '').split(',')[0]) || -10;
                        uiMax = parseFloat(parts[2].replace(/[()]/g, '').split(',')[0]) || 10;
                        const defParts = parts[1].replace(/[()]/g, '').split(',').map(s => parseFloat(s.trim()));
                        if (defParts.length === 2 && !defParts.some(isNaN)) uiDefault = defParts;
                        const range = uiMax - uiMin;
                        uiStep = range > 10 ? 0.1 : range > 2 ? 0.01 : 0.001;
                    } else { uiStep = 0.01; }
                } else { uiStep = 0.01; }
            } else if (type === 'bool') {
                uiDefault = rawValue === 'true' ? 1 : 0;
            } else {
                uiDefault = parseFloat(rawValue) || 0;
                if (sliderData) {
                    const parts = sliderData.split(',');
                    if (parts.length >= 3) {
                        uiMin = parseFloat(parts[0]);
                        uiMax = parseFloat(parts[2]);
                        const sd = parseFloat(parts[1]);
                        if (!isNaN(sd)) uiDefault = sd;
                    }
                }
            }

            if (name.toLowerCase().includes('angle') || name.toLowerCase().includes('rot')) {
                if (Math.abs(uiMax) > 3.5 || Math.abs(uiMin) > 3.5) isDegrees = true;
            }

            const lowerName = name.toLowerCase();
            let mappedSlot = 'fixed';
            if (lowerName === 'juliavalues') {
                mappedSlot = 'uJulia';
            } else if (lowerName === 'dojulia') {
                mappedSlot = 'uJuliaMode';
            } else if (lowerName === 'julia') {
                mappedSlot = type === 'bool' ? 'uJuliaMode' : 'uJulia';
            } else if (type === 'vec3' && vec3SlotIndex < VEC3_SLOTS_V1.length) {
                mappedSlot = VEC3_SLOTS_V1[vec3SlotIndex++];
            } else if (type === 'vec2' && vec2SlotIndex < VEC2_SLOTS_V1.length) {
                mappedSlot = VEC2_SLOTS_V1[vec2SlotIndex++];
            } else if (type !== 'vec4' && slotIndex < PARAM_SLOTS.length) {
                // vec4 has no GMT scalar slot — leave as 'fixed' so it gets baked as a const
                mappedSlot = PARAM_SLOTS[slotIndex++];
            }

            doc.uniforms.push({
                name, type: type as any, uiType: type === 'vec3' ? 'slider' : 'fixed' as any,
                min: uiMin, max: uiMax, step: uiStep,
                default: uiDefault, mappedSlot, isDegrees
            });
        }

        doc.deFunction = this.extractDEFunction(source);
        doc.helperFunctions = this.extractHelperFunctions(source);
        return doc;
    }

    private static extractDEFunction(source: string): string {
        const deRegex = /float\s+DE\s*\(\s*vec3\s+\w+\s*\)\s*\{/g;
        const match = deRegex.exec(source);
        if (!match) return '';
        const startIndex = match.index + match[0].length;
        let braceCount = 1, endIndex = startIndex;
        while (braceCount > 0 && endIndex < source.length) {
            if (source[endIndex] === '{') braceCount++;
            if (source[endIndex] === '}') braceCount--;
            endIndex++;
        }
        return source.substring(startIndex, endIndex - 1).trim();
    }

    private static extractHelperFunctions(source: string): string[] {
        const helpers: string[] = [];
        const helperNames = ['rotationMatrix3', 'boxFold', 'sphereFold', 'dodecaFold'];
        for (const name of helperNames) {
            const regex = new RegExp(`(mat3|void|float|vec3|vec4)\\s+${name}\\s*\\([^)]*\\)\\s*\\{`, 'g');
            if (regex.test(source)) {
                const funcMatch = source.match(new RegExp(`(mat3|void|float|vec3|vec4)\\s+${name}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\}`));
                if (funcMatch) helpers.push(funcMatch[0]);
            }
        }
        return helpers;
    }

    public static transformToGMT(doc: GenericFragDocument, mappings: ParamMapping[], formulaName: string): TransformedFormula {
        const warnings: string[] = [];
        const paramSubstitutions: Record<string, string> = {};
        for (const mapping of mappings) {
            if (mapping.mappedSlot === 'fixed' && mapping.fixedValue) {
                paramSubstitutions[mapping.name] = mapping.fixedValue;
            } else if (mapping.mappedSlot.startsWith('vec3') || mapping.mappedSlot.startsWith('vec2')) {
                paramSubstitutions[mapping.name] = 'u' + mapping.mappedSlot.charAt(0).toUpperCase() + mapping.mappedSlot.slice(1);
            } else if (mapping.mappedSlot === 'uJulia') {
                paramSubstitutions[mapping.name] = 'uJulia';
            } else if (mapping.mappedSlot === 'uJuliaMode') {
                paramSubstitutions[mapping.name] = '(uJuliaMode > 0.5)';
            } else {
                paramSubstitutions[mapping.name] = 'u' + mapping.mappedSlot.charAt(0).toUpperCase() + mapping.mappedSlot.slice(1);
            }
        }
        let transformedBody = doc.deFunction;
        for (const [uniformName, replacement] of Object.entries(paramSubstitutions)) {
            transformedBody = transformedBody.replace(new RegExp(`\\b${uniformName}\\b`, 'g'), replacement);
        }
        transformedBody = transformedBody.replace(/\borbitTrap\b/g, 'trap');
        const functionBody = `void formula_${formulaName}(inout vec4 z, inout float dr, inout float trap, vec4 c) {\n    vec3 f_z = z.xyz;\n${transformedBody}\n    z.xyz = f_z;\n}`;
        return {
            function: functionBody,
            loopBody: `formula_${formulaName}(z, dr, trap, c);`,
            getDist: '',
            uniforms: '',
            warnings
        };
    }
}
