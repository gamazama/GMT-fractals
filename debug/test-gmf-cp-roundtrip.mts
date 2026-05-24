import { registerFeatures } from '../engine-gmt/features/index.ts';
registerFeatures();
import '../engine-gmt/formulas/index.ts';
import { registry } from '../engine-gmt/engine/FractalRegistry.ts';
import { generateGMF, parseGMF } from '../engine-gmt/utils/FormulaFormat.ts';
import { buildMeshPreviewShader } from '../engine-gmt/engine/SDFShaderBuilder.ts';

const def = registry.get('SierpinskiTetrahedron');
if (!def) throw new Error('not found');

const gmf = generateGMF(def, def.defaultPreset || {});
const reparsed = parseGMF(gmf);
console.log('1) roundtrip preserves supportsCuttingPlane:', reparsed.shader.supportsCuttingPlane === true);

const stripped = gmf.replace(/,?\s*"shaderMeta":\s*\{[^}]*\}/, '');
const legacy = parseGMF(stripped);
console.log('2) auto-detect rescues legacy file:', legacy.shader.supportsCuttingPlane === true);

const src = buildMeshPreviewShader({ definition: reparsed, deType: 'auto', estimator: 0 });
const declAt = src.indexOf('float cp_dmin;');
const useAt = src.indexOf('cp_dmin = max(');
console.log('3) declaration before use:', declAt >= 0 && useAt >= 0 && declAt < useAt, '(decl=' + declAt + ', use=' + useAt + ')');
