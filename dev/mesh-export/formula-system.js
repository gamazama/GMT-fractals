// formula-system.js — GMF parser, GLSL shader templating, formula UI, builtins
// Plain ES2020, no modules. All symbols are global.
// GMT Fractal Explorer — prototype mesh export

// ============================================================================
// GMF Parser
// ============================================================================

/** Parse a GMF file string into a formula config object */
function parseGMFStandalone(content) {
  function extract(tag) {
    var regex = new RegExp('<' + tag + '>([\\s\\S]*?)<\\/' + tag + '>');
    var match = content.match(regex);
    return match ? match[1].trim() : null;
  }
  var metadataStr = extract('Metadata');
  if (!metadataStr) throw new Error('Invalid GMF: Missing <Metadata> tag');
  var metadata = JSON.parse(metadataStr);
  var preamble = extract('Shader_Preamble');
  var func = extract('Shader_Function');
  var loop = extract('Shader_Loop');
  var init = extract('Shader_Init');
  var dist = extract('Shader_Dist');
  var sceneStr = extract('Scene');
  if (!func || !loop) throw new Error('Invalid GMF: Missing <Shader_Function> or <Shader_Loop>');

  // If Scene block exists, overlay its coreMath/geometry values onto defaultPreset
  // so the UI shows the actual saved scene state, not just factory defaults.
  if (sceneStr) {
    try {
      var scene = JSON.parse(sceneStr);
      if (scene.features) {
        if (!metadata.defaultPreset) metadata.defaultPreset = {};
        if (!metadata.defaultPreset.features) metadata.defaultPreset.features = {};
        if (scene.features.coreMath) {
          metadata.defaultPreset.features.coreMath = scene.features.coreMath;
        }
        if (scene.features.geometry) {
          metadata.defaultPreset.features.geometry = scene.features.geometry;
        }
      }
    } catch (e) { console.warn('Failed to parse Scene block:', e); }
  }

  return {
    metadata: metadata,
    shaderPreamble: preamble,
    shaderFunction: func,
    shaderLoop: loop,
    shaderInit: init,
    shaderDist: dist
  };
}

// ============================================================================
// DE Type Classification
// ============================================================================

/** Auto-detect DE type from formula GLSL source */
function classifyDEType(config) {
  if (config.shaderDist) return 'custom';
  var body = config.shaderFunction + ' ' + config.shaderLoop + ' ' + (config.shaderPreamble || '');
  if (/boxFold|sphereFold/.test(body)) return 'ifs';
  // Sierpinski-type: linear DR accumulation without pow()
  if (/dr\s*=\s*dr\s*\*\s*\w/.test(body) && !/pow\s*\(/.test(body)) return 'ifs';
  // Fold-based: abs() on z combined with DR scaling, no pow()
  if (/abs\s*\(\s*z/.test(body) && /dr\s*[\*=]/.test(body) && !/pow\s*\(/.test(body)) return 'ifs';
  return 'power';
}

/** Get the effective DE type (user override or auto) */
function getEffectiveDEType(config) {
  var override = document.getElementById('deType').value;
  if (override !== 'auto') return override;
  if (config._deType) return config._deType;
  return classifyDEType(config);
}

// ============================================================================
// Built-in Formula Definitions (pseudo-GMF configs)
// ============================================================================

var BUILTIN_MANDELBULB = {
  metadata: {
    id: 'mandelbulb', name: 'Mandelbulb',
    parameters: [
      { label: 'Power', id: 'paramA', min: 2, max: 20, step: 0.5, default: 8 }
    ],
    defaultPreset: { features: { coreMath: { iterations: 12, paramA: 8 }, geometry: {} } }
  },
  shaderFunction: [
    'void formula_Mandelbulb(inout vec4 z, inout float dr, inout float trap, vec4 c) {',
    '  vec3 p = z.xyz;',
    '  float power = uParamA;',
    '  float r = length(p);',
    '  if (r > 2.0) return;',
    '  float theta = acos(clamp(p.z / r, -1.0, 1.0));',
    '  float phi = atan(p.y, p.x);',
    '  dr = pow(r, power - 1.0) * power * dr + 1.0;',
    '  float zr = pow(r, power);',
    '  theta *= power; phi *= power;',
    '  z.xyz = zr * vec3(sin(theta)*cos(phi), sin(theta)*sin(phi), cos(theta)) + c.xyz;',
    '  trap = min(trap, length(z.xyz));',
    '}'
  ].join('\n'),
  shaderLoop: 'formula_Mandelbulb(z, dr, trap, c);',
  shaderPreamble: null, shaderInit: null, shaderDist: null,
  _deType: 'power'
};

var BUILTIN_KALIBOX = {
  metadata: {
    id: 'kalibox', name: 'KaliBox',
    parameters: [
      { label: 'Scale', id: 'paramA', min: -3, max: 3, step: 0.01, default: 2.043 },
      { label: 'MinRad', id: 'paramB', min: 0.001, max: 2, step: 0.01, default: 0.349 },
      { label: 'Trans X', id: 'paramC', min: -5, max: 5, step: 0.001, default: 0.036 },
      { label: 'Trans Y', id: 'paramD', min: -5, max: 5, step: 0.001, default: -1.861 },
      { label: 'Trans Z', id: 'paramE', min: -5, max: 5, step: 0.001, default: 0.036 },
      { label: 'Julia X', id: 'juliaX', min: -3, max: 3, step: 0.001, default: -0.6691 },
      { label: 'Julia Y', id: 'juliaY', min: -3, max: 3, step: 0.001, default: -1.3028 },
      { label: 'Julia Z', id: 'juliaZ', min: -3, max: 3, step: 0.001, default: -0.45775 }
    ],
    defaultPreset: {
      features: {
        coreMath: { iterations: 12, paramA: 2.043, paramB: 0.349, paramC: 0.036, paramD: -1.861, paramE: 0.036 },
        geometry: { juliaMode: true, juliaX: -0.6691, juliaY: -1.3028, juliaZ: -0.45775 }
      }
    }
  },
  shaderFunction: [
    'void formula_KaliBox(inout vec4 z, inout float dr, inout float trap, vec4 c) {',
    '  vec3 p = z.xyz;',
    '  float scale = uParamA;',
    '  float minRad2 = uParamB;',
    '  p = abs(p) + vec3(uParamC, uParamD, uParamE);',
    '  float r2 = dot(p, p);',
    '  float k = clamp(max(minRad2 / r2, minRad2), 0.0, 1.0);',
    '  p *= k;',
    '  dr = dr * k * (abs(scale) / minRad2) + 1.0;',
    '  p = p * (scale / minRad2) + c.xyz;',
    '  z.xyz = p;',
    '  trap = min(trap, length(p));',
    '}'
  ].join('\n'),
  shaderLoop: 'formula_KaliBox(z, dr, trap, c);',
  shaderPreamble: null, shaderInit: null,
  shaderDist: [
    'float absScalem1 = abs(uParamA - 1.0);',
    'float d = (r - absScalem1) / safeDr;',
    'return vec2(d, iter);'
  ].join('\n'),
  _deType: 'ifs'
};

var BUILTIN_FORMULAS = { mandelbulb: BUILTIN_MANDELBULB, kalibox: BUILTIN_KALIBOX };

// Active formula state
var activeFormulaConfig = BUILTIN_MANDELBULB;

// ============================================================================
// GLSL Common Blocks
// ============================================================================

/** Standard GMT uniform declarations shared by all shaders */
var GLSL_UNIFORMS = [
  'uniform float uParamA, uParamB, uParamC, uParamD, uParamE, uParamF;',
  'uniform vec2  uVec2A, uVec2B, uVec2C;',
  'uniform vec3  uVec3A, uVec3B, uVec3C;',
  'uniform vec4  uVec4A, uVec4B, uVec4C;',
  'uniform vec3  uJulia;',
  'uniform float uJuliaMode;',
  'uniform float uEscapeThresh;',
  'uniform float uDistanceMetric;',
  '#define uIterations uIters',
  'vec4 g_orbitTrap;'
].join('\n');

/** Helper functions available to all formulas (subset of GMT's math.ts) */
var GLSL_HELPERS = [
  '// --- Helper functions available to all formulas ---',
  'void sphereFold(inout vec3 z, inout float dz, float minR, float fixedR) {',
  '  float r2 = max(dot(z,z), 1.0e-9);',
  '  float minR2 = max(minR * minR, 1.0e-9);',
  '  float fixedR2 = max(fixedR * fixedR, 1.0e-9);',
  '  float k = clamp(fixedR2 / r2, 1.0, fixedR2 / minR2);',
  '  z *= k; dz *= k;',
  '}',
  '',
  'void boxFold(inout vec3 z, inout float dz, float foldLimit) {',
  '  z = clamp(z, -foldLimit, foldLimit) * 2.0 - z;',
  '}',
  '',
  'float getLength(vec3 p) { return length(p); }',
  '',
  'void applyPreRotation(inout vec3 p) {}',
  'void applyPostRotation(inout vec3 p) {}',
  'void applyWorldRotation(inout vec3 p) {}',
  '',
  '// Simplex noise (Stefan Gustavson)',
  'vec3 _mod289v3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }',
  'vec4 _mod289v4(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }',
  'vec4 _permute(vec4 x) { return _mod289v4(((x*34.0)+1.0)*x); }',
  'vec4 _taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }',
  'float snoise(vec3 v) {',
  '  const vec2 C = vec2(1.0/6.0, 1.0/3.0);',
  '  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);',
  '  vec3 i = floor(v + dot(v, C.yyy));',
  '  vec3 x0 = v - i + dot(i, C.xxx);',
  '  vec3 g = step(x0.yzx, x0.xyz);',
  '  vec3 l = 1.0 - g;',
  '  vec3 i1 = min(g.xyz, l.zxy);',
  '  vec3 i2 = max(g.xyz, l.zxy);',
  '  vec3 x1 = x0 - i1 + C.xxx;',
  '  vec3 x2 = x0 - i2 + C.yyy;',
  '  vec3 x3 = x0 - D.yyy;',
  '  i = _mod289v3(i);',
  '  vec4 p = _permute(_permute(_permute(',
  '    i.z + vec4(0.0, i1.z, i2.z, 1.0))',
  '    + i.y + vec4(0.0, i1.y, i2.y, 1.0))',
  '    + i.x + vec4(0.0, i1.x, i2.x, 1.0));',
  '  float n_ = 0.142857142857;',
  '  vec3 ns = n_ * D.wyz - D.xzx;',
  '  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);',
  '  vec4 x_ = floor(j * ns.z);',
  '  vec4 y_ = floor(j - 7.0 * x_);',
  '  vec4 x2_ = x_ * ns.x + ns.yyyy;',
  '  vec4 y2_ = y_ * ns.x + ns.yyyy;',
  '  vec4 h = 1.0 - abs(x2_) - abs(y2_);',
  '  vec4 b0 = vec4(x2_.xy, y2_.xy);',
  '  vec4 b1 = vec4(x2_.zw, y2_.zw);',
  '  vec4 s0 = floor(b0)*2.0 + 1.0;',
  '  vec4 s1 = floor(b1)*2.0 + 1.0;',
  '  vec4 sh = -step(h, vec4(0.0));',
  '  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;',
  '  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;',
  '  vec3 p0 = vec3(a0.xy,h.x);',
  '  vec3 p1 = vec3(a0.zw,h.y);',
  '  vec3 p2 = vec3(a1.xy,h.z);',
  '  vec3 p3 = vec3(a1.zw,h.w);',
  '  vec4 norm = _taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));',
  '  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;',
  '  vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);',
  '  m = m * m;',
  '  return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));',
  '}'
].join('\n');

// ============================================================================
// Shared GLSL Building Blocks (deduplicates buildSDFFrag / buildNewtonFrag)
// ============================================================================

/** Build the _getDistCustom wrapper if config has shaderDist, else empty string */
function _buildGetDistBlock(config) {
  if (!config.shaderDist) return '';
  return '\nvec2 _getDistCustom(float r, float safeDr, float iter, vec4 z) {\n' +
    '  float dr = safeDr;\n' +
    '  ' + config.shaderDist + '\n' +
    '}\n';
}

/** Build the DE return expression for formulaDE() */
function _buildDEReturn(deType, hasCustomDist, thresholdExpr) {
  if (hasCustomDist) {
    return deType === 'ifs'
      ? 'return _getDistCustom(r, safeDr, iter, z).x - ' + thresholdExpr + ';'
      : 'return _getDistCustom(r, safeDr, iter, z).x;';
  }
  if (deType === 'power') {
    return '// Power fractals: orbit must escape (r > 2) for valid DE.\n' +
      '    // Non-escaped = interior sentinel.\n' +
      '    if (r > 2.0) return 0.5 * log(r) * r / safeDr;\n' +
      '    return -1.0;';
  }
  // ifs without custom getDist
  return 'return (r - 1.0) / safeDr - ' + thresholdExpr + ';';
}

/** Build the common formula iteration block (used by all three shaders) */
function _buildIterationLoop(config, itersVar) {
  return '  vec4 z = vec4(pos, 0.0);\n' +
    '  vec4 c = mix(z, vec4(uJulia, 0.0), step(0.5, uJuliaMode));\n' +
    '  float dr = 1.0;\n' +
    '  float trap = 1e10;\n' +
    '  float iter = 0.0;\n' +
    '  ' + (config.shaderInit || '') + '\n' +
    '\n' +
    '  for (int i = 0; i < 100; i++) {\n' +
    '    if (i >= ' + itersVar + ') break;\n' +
    '    float r2 = dot(z.xyz, z.xyz);\n' +
    '    if (r2 > 1e4) break;\n' +
    '    ' + config.shaderLoop + '\n' +
    '    iter += 1.0;\n' +
    '  }';
}

// ============================================================================
// Shader Builders
// ============================================================================

/** Vertex shader shared by all GPU passes — fullscreen quad via gl_VertexID */
var SDF_VERT = '#version 300 es\n' +
  'void main() {\n' +
  '  vec2 p = vec2((gl_VertexID & 1) * 2 - 1, (gl_VertexID >> 1) * 2 - 1);\n' +
  '  gl_Position = vec4(p, 0, 1);\n' +
  '}';

/**
 * Build SDF fragment shader from formula config.
 * Assembles: uniforms + helpers + preamble + function + formulaDE wrapper + main
 */
function buildSDFFrag(config, deSamples) {
  var deType = getEffectiveDEType(config);
  if (!deSamples) deSamples = 2;

  var getDistBlock = _buildGetDistBlock(config);
  var deReturn = _buildDEReturn(deType, !!config.shaderDist, 'uBoundsRange * uInvRes * 0.5');

  return '#version 300 es\n' +
    'precision highp float;\n' +
    'uniform float uZ;\n' +
    'uniform float uPower;\n' +
    'uniform int   uIters;\n' +
    'uniform float uInvRes;\n' +
    'uniform vec2  uTileOffset;\n' +
    'uniform float uBoundsMin;\n' +
    'uniform float uBoundsRange;\n' +
    GLSL_UNIFORMS + '\n' +
    'out vec4 fragColor;\n\n' +
    GLSL_HELPERS + '\n\n' +
    '// --- Preamble (global variables / helpers) ---\n' +
    (config.shaderPreamble || '') + '\n\n' +
    '// --- Formula function ---\n' +
    config.shaderFunction + '\n\n' +
    getDistBlock + '\n' +
    'float formulaDE(vec3 pos, float power, int iters) {\n' +
    _buildIterationLoop(config, 'iters') + '\n\n' +
    '  float r = length(z.xyz);\n' +
    '  float safeDr = max(abs(dr), 1e-10);\n' +
    '  ' + deReturn + '\n' +
    '}\n\n' +
    'void main() {\n' +
    '  float voxelSize = uBoundsRange * uInvRes;\n' +
    '  vec3 center = vec3(\n' +
    '    (gl_FragCoord.x + uTileOffset.x) * uInvRes * uBoundsRange + uBoundsMin,\n' +
    '    (gl_FragCoord.y + uTileOffset.y) * uInvRes * uBoundsRange + uBoundsMin,\n' +
    '    uZ * uBoundsRange + uBoundsMin\n' +
    '  );\n\n' +
    '  const int SS = ' + deSamples + ';\n' +
    '  const int TOTAL = SS * SS * SS;\n' +
    '  float step = 1.0 / float(SS);\n' +
    '  float halfStep = step * 0.5;\n' +
    '  float h = voxelSize * 0.5;\n\n' +
    '  float sumDist = 0.0;\n' +
    '  int insideCount = 0;\n' +
    '  int outsideCount = 0;\n' +
    '  float minOutsideDist = 1e10;\n\n' +
    '  float jx = fract(sin(dot(center.xy, vec2(12.9898, 78.233))) * 43758.5453);\n' +
    '  float jy = fract(sin(dot(center.yz, vec2(93.989, 67.345))) * 23421.6312);\n' +
    '  float jz = fract(sin(dot(center.xz, vec2(45.164, 38.927))) * 61532.2847);\n' +
    '  float jitter = h * step * 0.3;\n\n' +
    '  for (int sz = 0; sz < SS; sz++) {\n' +
    '    for (int sy = 0; sy < SS; sy++) {\n' +
    '      for (int sx = 0; sx < SS; sx++) {\n' +
    '        vec3 p = center + h * vec3(\n' +
    '          (float(sx) * step + halfStep) * 2.0 - 1.0,\n' +
    '          (float(sy) * step + halfStep) * 2.0 - 1.0,\n' +
    '          (float(sz) * step + halfStep) * 2.0 - 1.0\n' +
    '        );\n' +
    '        p += vec3(jx - 0.5, jy - 0.5, jz - 0.5) * jitter;\n\n' +
    '        float d = formulaDE(p, uPower, uIters);\n' +
    '        if (d < 0.0) {\n' +
    '          insideCount++;\n' +
    '        } else {\n' +
    '          outsideCount++;\n' +
    '          minOutsideDist = min(minOutsideDist, d);\n' +
    '          sumDist += d;\n' +
    '        }\n' +
    '      }\n' +
    '    }\n' +
    '  }\n\n' +
    '  float sdf;\n' +
    '  if (insideCount == 0) {\n' +
    '    sdf = sumDist / float(TOTAL);\n' +
    '  } else if (outsideCount == 0) {\n' +
    '    sdf = -voxelSize * (1.0 + float(insideCount) / float(TOTAL) * 0.25);\n' +
    '  } else {\n' +
    '    float ratio = float(outsideCount) / float(TOTAL);\n' +
    '    sdf = mix(-minOutsideDist, minOutsideDist, ratio);\n' +
    '  }\n\n' +
    '  fragColor = vec4(sdf, 0.0, 0.0, 1.0);\n' +
    '}';
}

/**
 * Build escape-test fragment shader from formula config.
 * Outputs 1.0 for interior (orbit didn't escape) or 0.0 for exterior.
 * Used for solid cavity fill on IFS fractals where SDF is unreliable.
 */
function buildEscapeFrag(config) {
  return '#version 300 es\n' +
    'precision highp float;\n' +
    'uniform float uZ;\n' +
    'uniform float uPower;\n' +
    'uniform int   uIters;\n' +
    'uniform float uInvRes;\n' +
    'uniform vec2  uTileOffset;\n' +
    'uniform float uBoundsMin;\n' +
    'uniform float uBoundsRange;\n' +
    GLSL_UNIFORMS + '\n' +
    'out vec4 fragColor;\n\n' +
    GLSL_HELPERS + '\n\n' +
    (config.shaderPreamble || '') + '\n\n' +
    config.shaderFunction + '\n\n' +
    'void main() {\n' +
    '  vec3 pos = vec3(\n' +
    '    (gl_FragCoord.x + uTileOffset.x) * uInvRes * uBoundsRange + uBoundsMin,\n' +
    '    (gl_FragCoord.y + uTileOffset.y) * uInvRes * uBoundsRange + uBoundsMin,\n' +
    '    uZ * uBoundsRange + uBoundsMin\n' +
    '  );\n\n' +
    _buildIterationLoop(config, 'uIters') + '\n\n' +
    '  float r2 = dot(z.xyz, z.xyz);\n' +
    '  // 1.0 = interior (did not escape), 0.0 = exterior\n' +
    '  fragColor = vec4(r2 < 1e4 ? 1.0 : 0.0, 0.0, 0.0, 1.0);\n' +
    '}';
}

/**
 * Build vertex coloring fragment shader from formula config.
 * Runs formula iteration for orbit trap, maps to false color.
 */
function buildColorFrag(config) {
  return '#version 300 es\n' +
    'precision highp float;\n' +
    'uniform sampler2D uPositions;\n' +
    'uniform float uPower;\n' +
    'uniform int uIters;\n' +
    'uniform int uWidth;\n' +
    GLSL_UNIFORMS + '\n' +
    'out vec4 fragColor;\n\n' +
    GLSL_HELPERS + '\n\n' +
    (config.shaderPreamble || '') + '\n\n' +
    '// --- Formula function ---\n' +
    config.shaderFunction + '\n\n' +
    'void main() {\n' +
    '  ivec2 coord = ivec2(gl_FragCoord.xy);\n' +
    '  vec4 pd = texelFetch(uPositions, coord, 0);\n' +
    '  vec3 pos = pd.xyz;\n' +
    '  if (pd.w < 0.5) { fragColor = vec4(0.5, 0.5, 0.5, 1.0); return; }\n\n' +
    _buildIterationLoop(config, 'uIters') + '\n\n' +
    '  float t = log(max(1e-5, trap)) * -0.3;\n' +
    '  t = fract(t * 1.5 + 0.1);\n' +
    '  vec3 c1 = vec3(0.02, 0.01, 0.08);\n' +
    '  vec3 c2 = vec3(0.8, 0.2, 0.05);\n' +
    '  vec3 c3 = vec3(1.0, 0.85, 0.4);\n' +
    '  vec3 c4 = vec3(0.95, 0.95, 1.0);\n' +
    '  vec3 col;\n' +
    '  if (t < 0.33) col = mix(c1, c2, t / 0.33);\n' +
    '  else if (t < 0.66) col = mix(c2, c3, (t - 0.33) / 0.33);\n' +
    '  else col = mix(c3, c4, (t - 0.66) / 0.34);\n' +
    '  col = pow(col, vec3(0.8));\n' +
    '  fragColor = vec4(col, 1.0);\n' +
    '}';
}

/**
 * Build GPU Newton projection fragment shader.
 * Reads vertex positions from a texture, runs Newton steps to project
 * vertices onto the isosurface, outputs refined position + normal via MRT.
 */
function buildNewtonFrag(config) {
  var deType = getEffectiveDEType(config);
  var getDistBlock = _buildGetDistBlock(config);
  var deReturn = _buildDEReturn(deType, !!config.shaderDist, 'uVoxelSize * 0.5');

  return '#version 300 es\n' +
    'precision highp float;\n' +
    'uniform sampler2D uPositions;\n' +
    'uniform float uPower;\n' +
    'uniform int   uIters;\n' +
    'uniform float uVoxelSize;\n' +
    'uniform int   uNewtonSteps;\n' +
    GLSL_UNIFORMS + '\n\n' +
    'layout(location = 0) out vec4 outPosition;\n' +
    'layout(location = 1) out vec4 outNormal;\n\n' +
    GLSL_HELPERS + '\n\n' +
    (config.shaderPreamble || '') + '\n\n' +
    '// --- Formula function ---\n' +
    config.shaderFunction + '\n\n' +
    getDistBlock + '\n' +
    'float formulaDE(vec3 pos) {\n' +
    _buildIterationLoop(config, 'uIters') + '\n\n' +
    '  float r = length(z.xyz);\n' +
    '  float safeDr = max(abs(dr), 1e-10);\n' +
    '  ' + deReturn + '\n' +
    '}\n\n' +
    'vec3 sdfGradient(vec3 p) {\n' +
    '  float h = 1e-5;\n' +
    '  float gx = formulaDE(p + vec3(h,0,0)) - formulaDE(p - vec3(h,0,0));\n' +
    '  float gy = formulaDE(p + vec3(0,h,0)) - formulaDE(p - vec3(0,h,0));\n' +
    '  float gz = formulaDE(p + vec3(0,0,h)) - formulaDE(p - vec3(0,0,h));\n' +
    '  float len = length(vec3(gx, gy, gz));\n' +
    '  if (len < 1e-12) return vec3(0.0, 1.0, 0.0);\n' +
    '  return vec3(gx, gy, gz) / len;\n' +
    '}\n\n' +
    'void main() {\n' +
    '  ivec2 coord = ivec2(gl_FragCoord.xy);\n' +
    '  vec4 pd = texelFetch(uPositions, coord, 0);\n' +
    '  vec3 pos = pd.xyz;\n\n' +
    '  if (pd.w < 0.5) {\n' +
    '    outPosition = vec4(pos, 0.0);\n' +
    '    outNormal = vec4(0.0, 1.0, 0.0, 0.0);\n' +
    '    return;\n' +
    '  }\n\n' +
    '  vec3 orig = pos;\n' +
    '  float prevAbsD = 1e10;\n' +
    '  float maxDist = uVoxelSize * 2.0;\n\n' +
    '  for (int i = 0; i < 8; i++) {\n' +
    '    if (i >= uNewtonSteps) break;\n' +
    '    float d = formulaDE(pos);\n' +
    '    float absD = abs(d);\n' +
    '    if (absD < 1e-7) break;\n' +
    '    if (absD > prevAbsD * 1.5) break;\n' +
    '    prevAbsD = absD;\n\n' +
    '    vec3 g = sdfGradient(pos);\n' +
    '    vec3 newPos = pos - d * g;\n' +
    '    if (length(newPos - orig) > maxDist) break;\n' +
    '    pos = newPos;\n' +
    '  }\n\n' +
    '  vec3 n = sdfGradient(pos);\n' +
    '  outPosition = vec4(pos, 1.0);\n' +
    '  outNormal = vec4(n, 0.0);\n' +
    '}';
}

// ============================================================================
// Uniform Binding
// ============================================================================

/** Set all formula uniforms on a GL program from a params object */
function setFormulaUniforms(gl, loc, params) {
  if (loc.uParamA) gl.uniform1f(loc.uParamA, params.paramA !== undefined ? params.paramA : 0);
  if (loc.uParamB) gl.uniform1f(loc.uParamB, params.paramB !== undefined ? params.paramB : 0);
  if (loc.uParamC) gl.uniform1f(loc.uParamC, params.paramC !== undefined ? params.paramC : 0);
  if (loc.uParamD) gl.uniform1f(loc.uParamD, params.paramD !== undefined ? params.paramD : 0);
  if (loc.uParamE) gl.uniform1f(loc.uParamE, params.paramE !== undefined ? params.paramE : 0);
  if (loc.uParamF) gl.uniform1f(loc.uParamF, params.paramF !== undefined ? params.paramF : 0);
  // vec2 uniforms
  var v2a = params.vec2A || [0, 0], v2b = params.vec2B || [0, 0], v2c = params.vec2C || [0, 0];
  if (loc.uVec2A) gl.uniform2f(loc.uVec2A, v2a[0], v2a[1]);
  if (loc.uVec2B) gl.uniform2f(loc.uVec2B, v2b[0], v2b[1]);
  if (loc.uVec2C) gl.uniform2f(loc.uVec2C, v2c[0], v2c[1]);
  // vec3 uniforms
  var v3a = params.vec3A || [0, 0, 0], v3b = params.vec3B || [0, 0, 0], v3c = params.vec3C || [0, 0, 0];
  if (loc.uVec3A) gl.uniform3f(loc.uVec3A, v3a[0], v3a[1], v3a[2]);
  if (loc.uVec3B) gl.uniform3f(loc.uVec3B, v3b[0], v3b[1], v3b[2]);
  if (loc.uVec3C) gl.uniform3f(loc.uVec3C, v3c[0], v3c[1], v3c[2]);
  // vec4 uniforms
  var v4a = params.vec4A || [0, 0, 0, 0], v4b = params.vec4B || [0, 0, 0, 0], v4c = params.vec4C || [0, 0, 0, 0];
  if (loc.uVec4A) gl.uniform4f(loc.uVec4A, v4a[0], v4a[1], v4a[2], v4a[3]);
  if (loc.uVec4B) gl.uniform4f(loc.uVec4B, v4b[0], v4b[1], v4b[2], v4b[3]);
  if (loc.uVec4C) gl.uniform4f(loc.uVec4C, v4c[0], v4c[1], v4c[2], v4c[3]);
  // Julia + system
  var j = params.julia || [0, 0, 0];
  if (loc.uJulia) gl.uniform3f(loc.uJulia, j[0], j[1], j[2]);
  if (loc.uJuliaMode) gl.uniform1f(loc.uJuliaMode, params.juliaMode ? 1.0 : 0.0);
  if (loc.uEscapeThresh) gl.uniform1f(loc.uEscapeThresh, params.escapeThresh !== undefined ? params.escapeThresh : 100.0);
  if (loc.uDistanceMetric) gl.uniform1f(loc.uDistanceMetric, params.distanceMetric !== undefined ? params.distanceMetric : 0.0);
}

// ============================================================================
// Dynamic Parameter UI
// ============================================================================

/** Build formula parameter inputs from config metadata */
function buildFormulaUI(config) {
  var container = document.getElementById('formulaParams');
  container.innerHTML = '';
  var params = config.metadata.parameters || [];
  var preset = config.metadata.defaultPreset;
  var coreMath = (preset && preset.features && preset.features.coreMath) || {};
  var geometry = (preset && preset.features && preset.features.geometry) || {};

  function fmt3(v) { return parseFloat(parseFloat(v).toFixed(3)); }

  /** Create a slider+number input for a scalar param */
  function addSlider(labelText, id, min, max, step, value) {
    var group = document.createElement('div');
    group.className = 'param-group';
    var lbl = document.createElement('span');
    lbl.className = 'param-label';
    lbl.textContent = labelText;
    lbl.title = labelText;

    var slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'param-slider';
    slider.min = min; slider.max = max;
    slider.step = step || 0.001;
    slider.value = fmt3(value);

    var num = document.createElement('input');
    num.type = 'number';
    num.className = 'param-val';
    num.id = 'fp_' + id;
    num.min = min; num.max = max;
    num.step = step || 0.001;
    num.value = fmt3(value);
    num.dataset.paramId = id;

    slider.addEventListener('input', function() { num.value = fmt3(slider.value); });
    num.addEventListener('input', function() { slider.value = num.value; });

    group.appendChild(lbl);
    group.appendChild(slider);
    group.appendChild(num);
    container.appendChild(group);
  }

  /** Create a vec input group (XYZ or XYZW) with colored component labels */
  function addVecGroup(labelText, id, comps, min, max, step, values) {
    var group = document.createElement('div');
    group.className = 'vec-group';
    var lbl = document.createElement('span');
    lbl.className = 'vec-label';
    lbl.textContent = labelText;
    lbl.title = labelText;
    group.appendChild(lbl);

    for (var ci = 0; ci < comps.length; ci++) {
      var comp = document.createElement('div');
      comp.className = 'vec-comp';
      var letter = document.createElement('span');
      letter.className = 'vec-comp-letter ' + comps[ci];
      letter.textContent = comps[ci].toUpperCase();
      var num = document.createElement('input');
      num.type = 'number';
      num.className = 'param-val';
      num.id = 'fp_' + id + '_' + comps[ci];
      num.min = min; num.max = max;
      num.step = step || 0.001;
      num.value = fmt3(values[comps[ci]] !== undefined ? values[comps[ci]] : 0);
      num.dataset.paramId = id + '_' + comps[ci];
      comp.appendChild(letter);
      comp.appendChild(num);
      group.appendChild(comp);
    }
    container.appendChild(group);
  }

  for (var i = 0; i < params.length; i++) {
    var p = params[i];
    if (p.id === 'juliaX' || p.id === 'juliaY' || p.id === 'juliaZ') continue;

    var presetVal = coreMath[p.id];
    var defVal = p.default;

    if (p.type === 'vec2') {
      var v = presetVal || defVal || { x: 0, y: 0 };
      addVecGroup(p.label, p.id, ['x', 'y'], p.min, p.max, p.step, v);
    } else if (p.type === 'vec3') {
      var v = presetVal || defVal || { x: 0, y: 0, z: 0 };
      addVecGroup(p.label, p.id, ['x', 'y', 'z'], p.min, p.max, p.step, v);
    } else if (p.type === 'vec4') {
      var v = presetVal || defVal || { x: 0, y: 0, z: 0, w: 0 };
      addVecGroup(p.label, p.id, ['x', 'y', 'z', 'w'], p.min, p.max, p.step, v);
    } else {
      var val = presetVal !== undefined ? presetVal : (typeof defVal === 'object' ? 0 : defVal);
      addSlider(p.label, p.id, p.min, p.max, p.step, val);
    }
  }

  // Julia controls as a vec3 group
  if (geometry.juliaMode) {
    addVecGroup('Julia', 'julia_vec', ['x', 'y', 'z'], -5, 5, 0.001, {
      x: geometry.juliaX || 0,
      y: geometry.juliaY || 0,
      z: geometry.juliaZ || 0
    });
  }

  // Set iterations default
  var itersInput = document.getElementById('iters');
  if (coreMath.iterations) itersInput.value = coreMath.iterations;
}

/** Read current UI parameter values into a uniform params object */
function readFormulaParams() {
  var params = {
    paramA: 0, paramB: 0, paramC: 0, paramD: 0, paramE: 0, paramF: 0,
    vec2A: [0, 0], vec2B: [0, 0], vec2C: [0, 0],
    vec3A: [0, 0, 0], vec3B: [0, 0, 0], vec3C: [0, 0, 0],
    vec4A: [0, 0, 0, 0], vec4B: [0, 0, 0, 0], vec4C: [0, 0, 0, 0],
    julia: [0, 0, 0], juliaMode: false, escapeThresh: 100.0, distanceMetric: 0
  };

  var inputs = document.querySelectorAll('#formulaParams input[data-param-id]');
  for (var i = 0; i < inputs.length; i++) {
    var id = inputs[i].dataset.paramId;
    var val = parseFloat(inputs[i].value);
    if (id.match(/^param[A-F]$/)) {
      params[id] = val;
    } else if (id === 'julia_vec_x') { params.julia[0] = val; params.juliaMode = true; }
    else if (id === 'julia_vec_y') { params.julia[1] = val; params.juliaMode = true; }
    else if (id === 'julia_vec_z') { params.julia[2] = val; params.juliaMode = true; }
    else {
      var vecMatch = id.match(/^(vec[234][A-C])_([xyzw])$/);
      if (vecMatch) {
        var vecId = vecMatch[1];
        var comp = { x: 0, y: 1, z: 2, w: 3 }[vecMatch[2]];
        if (params[vecId]) params[vecId][comp] = val;
      }
    }
  }

  // Check preset for juliaMode
  var config = activeFormulaConfig;
  var geo = config.metadata.defaultPreset && config.metadata.defaultPreset.features && config.metadata.defaultPreset.features.geometry;
  if (geo && geo.juliaMode) params.juliaMode = true;

  return params;
}

// ============================================================================
// Formula Selection UI
// ============================================================================

function onFormulaChange() {
  var sel = document.getElementById('formula');
  var val = sel.value;
  if (val === '__gmf__') {
    document.getElementById('gmfFile').click();
    sel.value = activeFormulaConfig.metadata.id;
    return;
  }
  if (BUILTIN_FORMULAS[val]) {
    activeFormulaConfig = BUILTIN_FORMULAS[val];
    buildFormulaUI(activeFormulaConfig);
  }
}

function loadGMFFile(event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var gmf = parseGMFStandalone(e.target.result);
      activeFormulaConfig = gmf;

      var deType = classifyDEType(gmf);
      log('Loaded GMF: ' + gmf.metadata.name + ' (DE type: ' + deType + ')', 'success');
      log('Shader blocks: Function=' + (gmf.shaderFunction ? 'yes' : 'no') +
        ' Loop=' + (gmf.shaderLoop ? 'yes' : 'no') +
        ' Init=' + (gmf.shaderInit ? 'yes' : 'no') +
        ' Dist=' + (gmf.shaderDist ? 'yes' : 'no') +
        ' Preamble=' + (gmf.shaderPreamble ? 'yes' : 'no'), 'data');
      log('Parameters: ' + (gmf.metadata.parameters || []).map(function(p) { return p.id + '(' + (p.type || 'float') + ')'; }).join(', '), 'data');

      var sel = document.getElementById('formula');
      var existing = sel.querySelector('option[value="__loaded_gmf__"]');
      if (existing) {
        existing.textContent = gmf.metadata.name + ' (GMF)';
      } else {
        var opt = document.createElement('option');
        opt.value = '__loaded_gmf__';
        opt.textContent = gmf.metadata.name + ' (GMF)';
        sel.insertBefore(opt, sel.querySelector('option[value="__gmf__"]'));
      }
      sel.value = '__loaded_gmf__';

      buildFormulaUI(activeFormulaConfig);
      setStatus('Loaded: ' + gmf.metadata.name);
    } catch (err) {
      log('GMF load FAILED: ' + err.message, 'error');
      setStatus('GMF Error: ' + err.message);
      console.error(err);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}
