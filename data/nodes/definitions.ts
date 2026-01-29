
import { nodeRegistry } from '../../engine/NodeRegistry';

// --- UTILS ---
nodeRegistry.register({
    id: 'Note',
    label: 'Comment / Note',
    category: 'Utils',
    description: 'A text block for leaving comments. Ignored by renderer.',
    inputs: [],
    glsl: (ctx) => ''
});

nodeRegistry.register({
    id: 'AddConstant',
    label: 'Add C (Julia/Pixel)',
    category: 'Utils',
    description: 'Adds the Julia Constant (or Pixel Coordinate) to the position. Essential for Mandelbrot/Julia hybrids.',
    inputs: [
        { id: 'scale', label: 'Strength', min: 0.0, max: 2.0, step: 0.01, default: 1.0 }
    ],
    glsl: (ctx) => `${ctx.indent}${ctx.varName}_p += c.xyz * ${ctx.getParam('scale')};`
});

// --- TRANSFORMS ---
nodeRegistry.register({
    id: 'Scale',
    label: 'Scale (Mult)',
    category: 'Transforms',
    description: 'Simple multiplication. Warning: For fractals, use IFS Scale to keep centered.',
    inputs: [
        { id: 'scale', label: 'Scale', min: 0.1, max: 5.0, step: 0.01, default: 2.0, hardMin: 0.001 }
    ],
    glsl: (ctx) => `
${ctx.indent}${ctx.varName}_p *= ${ctx.getParam('scale')};
${ctx.indent}${ctx.varName}_dr *= abs(${ctx.getParam('scale')});
`
});

nodeRegistry.register({
    id: 'IFSScale',
    label: 'IFS Scale (Homothety)',
    category: 'Transforms',
    description: 'Scales space while shifting to maintain a center. Critical for Menger/Sierpinski.',
    inputs: [
        { id: 'scale', label: 'Scale', min: 1.0, max: 5.0, step: 0.01, default: 2.0 },
        { id: 'offset', label: 'Offset', min: 0.0, max: 5.0, step: 0.01, default: 1.0 }
    ],
    glsl: (ctx) => `
${ctx.indent}{
${ctx.indent}    float scale = ${ctx.getParam('scale')};
${ctx.indent}    float off = ${ctx.getParam('offset')};
${ctx.indent}    ${ctx.varName}_p = ${ctx.varName}_p * scale - vec3(off * (scale - 1.0));
${ctx.indent}    ${ctx.varName}_dr *= abs(scale);
${ctx.indent}}
`
});

nodeRegistry.register({
    id: 'Rotate',
    label: 'Rotate',
    category: 'Transforms',
    description: 'Rotates space around X, Y, Z axes.',
    inputs: [
        { id: 'x', label: 'Rot X', min: -180, max: 180, step: 1, default: 0 },
        { id: 'y', label: 'Rot Y', min: -180, max: 180, step: 1, default: 0 },
        { id: 'z', label: 'Rot Z', min: -180, max: 180, step: 1, default: 0 },
    ],
    glsl: (ctx) => `
${ctx.indent}{
${ctx.indent}    vec3 rot = vec3(radians(${ctx.getParam('x')}), radians(${ctx.getParam('y')}), radians(${ctx.getParam('z')}));
${ctx.indent}    if(abs(rot.x)>0.001) { float s=sin(rot.x); float c=cos(rot.x); mat2 m=mat2(c,-s,s,c); ${ctx.varName}_p.yz = m*${ctx.varName}_p.yz; }
${ctx.indent}    if(abs(rot.y)>0.001) { float s=sin(rot.y); float c=cos(rot.y); mat2 m=mat2(c,-s,s,c); ${ctx.varName}_p.xz = m*${ctx.varName}_p.xz; }
${ctx.indent}    if(abs(rot.z)>0.001) { float s=sin(rot.z); float c=cos(rot.z); mat2 m=mat2(c,-s,s,c); ${ctx.varName}_p.xy = m*${ctx.varName}_p.xy; }
${ctx.indent}}
`
});

nodeRegistry.register({
    id: 'Translate',
    label: 'Translate',
    category: 'Transforms',
    description: 'Linear shift of coordinates.',
    inputs: [
        { id: 'x', label: 'X', min: -5, max: 5, step: 0.01, default: 0 },
        { id: 'y', label: 'Y', min: -5, max: 5, step: 0.01, default: 0 },
        { id: 'z', label: 'Z', min: -5, max: 5, step: 0.01, default: 0 },
    ],
    glsl: (ctx) => `
${ctx.indent}${ctx.varName}_p += vec3(${ctx.getParam('x')}, ${ctx.getParam('y')}, ${ctx.getParam('z')});
`
});

nodeRegistry.register({
    id: 'Mod',
    label: 'Modulo (Repeat)',
    category: 'Transforms',
    description: 'Tiles space infinitely in a grid.',
    inputs: [
        { id: 'x', label: 'X Period', min: 0, max: 10, step: 0.1, default: 0 },
        { id: 'y', label: 'Y Period', min: 0, max: 10, step: 0.1, default: 0 },
        { id: 'z', label: 'Z Period', min: 0, max: 10, step: 0.1, default: 0 },
    ],
    glsl: (ctx) => `
${ctx.indent}{
${ctx.indent}    vec3 per = vec3(${ctx.getParam('x')}, ${ctx.getParam('y')}, ${ctx.getParam('z')});
${ctx.indent}    if(abs(per.x)>0.001) ${ctx.varName}_p.x = mod(${ctx.varName}_p.x + 0.5*per.x, per.x) - 0.5*per.x;
${ctx.indent}    if(abs(per.y)>0.001) ${ctx.varName}_p.y = mod(${ctx.varName}_p.y + 0.5*per.y, per.y) - 0.5*per.y;
${ctx.indent}    if(abs(per.z)>0.001) ${ctx.varName}_p.z = mod(${ctx.varName}_p.z + 0.5*per.z, per.z) - 0.5*per.z;
${ctx.indent}}
`
});

// --- FOLDS ---
nodeRegistry.register({
    id: 'AmazingFold',
    label: 'Amazing Fold',
    category: 'Folds',
    description: 'The core folding logic of the Amazing Box (Box + Sphere fold). Does not scale or add C.',
    inputs: [
        { id: 'limit', label: 'Box Limit', min: 0.1, max: 3.0, step: 0.01, default: 1.0 },
        { id: 'minR', label: 'Min Radius', min: 0.0, max: 2.0, step: 0.01, default: 0.5 },
        { id: 'fixedR', label: 'Fixed Radius', min: 0.0, max: 3.0, step: 0.01, default: 1.0 }
    ],
    glsl: (ctx) => `
${ctx.indent}boxFold(${ctx.varName}_p, ${ctx.varName}_dr, ${ctx.getParam('limit')});
${ctx.indent}sphereFold(${ctx.varName}_p, ${ctx.varName}_dr, ${ctx.getParam('minR')}, ${ctx.getParam('fixedR')});
`
});

nodeRegistry.register({
    id: 'Abs',
    label: 'Abs (Mirror)',
    category: 'Folds',
    description: 'Absolute value fold on all axes. Creates cubic symmetries.',
    inputs: [],
    glsl: (ctx) => `${ctx.indent}${ctx.varName}_p = abs(${ctx.varName}_p);`
});

nodeRegistry.register({
    id: 'BoxFold',
    label: 'Box Fold',
    category: 'Folds',
    description: 'Clamps space inside a box limit. The core of the Mandelbox.',
    inputs: [
        { id: 'limit', label: 'Limit', min: 0.1, max: 3.0, step: 0.01, default: 1.0, hardMin: 0.001 }
    ],
    glsl: (ctx) => `${ctx.indent}boxFold(${ctx.varName}_p, ${ctx.varName}_dr, ${ctx.getParam('limit')});`
});

nodeRegistry.register({
    id: 'SphereFold',
    label: 'Sphere Fold',
    category: 'Folds',
    description: 'Inverts space inside a sphere. Creates spherical voids.',
    inputs: [
        { id: 'minR', label: 'Min Radius', min: 0, max: 2.0, step: 0.01, default: 0.5 },
        { id: 'fixedR', label: 'Fixed Radius', min: 0, max: 3.0, step: 0.01, default: 1.0 }
    ],
    glsl: (ctx) => `${ctx.indent}sphereFold(${ctx.varName}_p, ${ctx.varName}_dr, ${ctx.getParam('minR')}, ${ctx.getParam('fixedR')});`
});

nodeRegistry.register({
    id: 'PlaneFold',
    label: 'Plane Fold',
    category: 'Folds',
    description: 'Reflects space across a plane defined by a Normal and Distance.',
    inputs: [
        { id: 'x', label: 'Normal X', min: -1, max: 1, step: 0.01, default: 0 },
        { id: 'y', label: 'Normal Y', min: -1, max: 1, step: 0.01, default: 1 },
        { id: 'z', label: 'Normal Z', min: -1, max: 1, step: 0.01, default: 0 },
        { id: 'd', label: 'Offset', min: -2, max: 2, step: 0.01, default: 0 }
    ],
    glsl: (ctx) => `
${ctx.indent}{
${ctx.indent}    vec3 n = normalize(vec3(${ctx.getParam('x')}, ${ctx.getParam('y')}, ${ctx.getParam('z')}));
${ctx.indent}    ${ctx.varName}_p -= 2.0 * min(0.0, dot(${ctx.varName}_p, n) - ${ctx.getParam('d')}) * n;
${ctx.indent}}
`
});

nodeRegistry.register({
    id: 'MengerFold',
    label: 'Menger Fold',
    category: 'Folds',
    description: 'Permutes coordinates (sorts xyz). Essential for Menger Sponges.',
    inputs: [],
    glsl: (ctx) => `
${ctx.indent}if(${ctx.varName}_p.x < ${ctx.varName}_p.y) ${ctx.varName}_p.xy = ${ctx.varName}_p.yx;
${ctx.indent}if(${ctx.varName}_p.x < ${ctx.varName}_p.z) ${ctx.varName}_p.xz = ${ctx.varName}_p.zx;
${ctx.indent}if(${ctx.varName}_p.y < ${ctx.varName}_p.z) ${ctx.varName}_p.yz = ${ctx.varName}_p.zy;
`
});

nodeRegistry.register({
    id: 'SierpinskiFold',
    label: 'Sierpinski Fold',
    category: 'Folds',
    description: 'Diagonal folding for Tetrahedral fractals (MixPinski).',
    inputs: [],
    glsl: (ctx) => `
${ctx.indent}if(${ctx.varName}_p.x + ${ctx.varName}_p.y < 0.0) ${ctx.varName}_p.xy = -${ctx.varName}_p.yx;
${ctx.indent}if(${ctx.varName}_p.x + ${ctx.varName}_p.z < 0.0) ${ctx.varName}_p.xz = -${ctx.varName}_p.zx;
${ctx.indent}if(${ctx.varName}_p.y + ${ctx.varName}_p.z < 0.0) ${ctx.varName}_p.yz = -${ctx.varName}_p.zy;
`
});

// --- FRACTALS ---
nodeRegistry.register({
    id: 'Mandelbulb',
    label: 'Mandelbulb',
    category: 'Fractals',
    description: 'The standard Power function. Includes phase shifts.',
    inputs: [
        { id: 'power', label: 'Power', min: 1, max: 16, step: 0.1, default: 8.0 },
        { id: 'phaseX', label: 'Phi Phase', min: -3.14, max: 3.14, step: 0.01, default: 0.0 },
        { id: 'phaseY', label: 'Theta Phase', min: -3.14, max: 3.14, step: 0.01, default: 0.0 },
        { id: 'twist', label: 'Z Twist', min: -2.0, max: 2.0, step: 0.01, default: 0.0 }
    ],
    glsl: (ctx) => `
${ctx.indent}{
${ctx.indent}    vec3 p = ${ctx.varName}_p;
${ctx.indent}    float r = length(p);
${ctx.indent}    float power = ${ctx.getParam('power')};
${ctx.indent}    ${ctx.varName}_dr = pow(max(r, 1e-5), power - 1.0) * power * ${ctx.varName}_dr + 1.0;
${ctx.indent}    float theta = acos(clamp(p.z / r, -1.0, 1.0));
${ctx.indent}    float phi = atan(p.y, p.x);
${ctx.indent}    theta = theta * power + ${ctx.getParam('phaseX')};
${ctx.indent}    phi = phi * power + ${ctx.getParam('phaseY')};
${ctx.indent}    float zr = pow(r, power);
${ctx.indent}    p = zr * vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
${ctx.indent}    float tw = ${ctx.getParam('twist')};
${ctx.indent}    if(abs(tw) > 0.001) { float ang = p.z * tw; float s = sin(ang); float c = cos(ang); p.xy = mat2(c,-s,s,c) * p.xy; }
${ctx.indent}    ${ctx.varName}_p = p;
${ctx.indent}}
`
});

// --- PRIMITIVES ---
nodeRegistry.register({
    id: 'Sphere',
    label: 'Sphere',
    category: 'Primitives',
    description: 'SDF Sphere.',
    inputs: [
        { id: 'r', label: 'Radius', min: 0.1, max: 5.0, step: 0.01, default: 1.0 }
    ],
    glsl: (ctx) => `${ctx.indent}${ctx.varName}_d = length(${ctx.varName}_p) - ${ctx.getParam('r')};`
});

nodeRegistry.register({
    id: 'Box',
    label: 'Box',
    category: 'Primitives',
    description: 'SDF Box.',
    inputs: [
        { id: 'x', label: 'Size X', min: 0.1, max: 5.0, step: 0.01, default: 1.0 },
        { id: 'y', label: 'Size Y', min: 0.1, max: 5.0, step: 0.01, default: 1.0 },
        { id: 'z', label: 'Size Z', min: 0.1, max: 5.0, step: 0.01, default: 1.0 },
    ],
    glsl: (ctx) => `
${ctx.indent}{
${ctx.indent}    vec3 b = vec3(${ctx.getParam('x')}, ${ctx.getParam('y')}, ${ctx.getParam('z')});
${ctx.indent}    vec3 d = abs(${ctx.varName}_p) - b;
${ctx.indent}    ${ctx.varName}_d = length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
${ctx.indent}}
`
});

// --- DISTORTIONS ---

nodeRegistry.register({
    id: 'Twist',
    label: 'Twist (Z)',
    category: 'Distortion',
    description: 'Twists space along the Z-axis.',
    inputs: [
        { id: 'amount', label: 'Amount', min: -5.0, max: 5.0, step: 0.01, default: 1.0 }
    ],
    glsl: (ctx) => `
${ctx.indent}{
${ctx.indent}    float c_tw = cos(${ctx.getParam('amount')} * ${ctx.varName}_p.z);
${ctx.indent}    float s_tw = sin(${ctx.getParam('amount')} * ${ctx.varName}_p.z);
${ctx.indent}    mat2 m_tw = mat2(c_tw, -s_tw, s_tw, c_tw);
${ctx.indent}    ${ctx.varName}_p.xy = m_tw * ${ctx.varName}_p.xy;
${ctx.indent}}
`
});

nodeRegistry.register({
    id: 'Bend',
    label: 'Bend (Y)',
    category: 'Distortion',
    description: 'Bends space along the Y-axis.',
    inputs: [
        { id: 'amount', label: 'Amount', min: -2.0, max: 2.0, step: 0.01, default: 0.5 }
    ],
    glsl: (ctx) => `
${ctx.indent}{
${ctx.indent}    float c_bn = cos(${ctx.getParam('amount')} * ${ctx.varName}_p.y);
${ctx.indent}    float s_bn = sin(${ctx.getParam('amount')} * ${ctx.varName}_p.y);
${ctx.indent}    mat2 m_bn = mat2(c_bn, -s_bn, s_bn, c_bn);
${ctx.indent}    ${ctx.varName}_p.xz = m_bn * ${ctx.varName}_p.xz;
${ctx.indent}}
`
});

nodeRegistry.register({
    id: 'SineWave',
    label: 'Sine Wave',
    category: 'Distortion',
    description: 'Adds a sinusoidal ripple to the position.',
    inputs: [
        { id: 'freq', label: 'Frequency', min: 0.1, max: 10.0, step: 0.1, default: 2.0 },
        { id: 'amp', label: 'Amplitude', min: 0.0, max: 1.0, step: 0.01, default: 0.1 }
    ],
    glsl: (ctx) => `
${ctx.indent}${ctx.varName}_p += sin(${ctx.varName}_p.yzx * ${ctx.getParam('freq')}) * ${ctx.getParam('amp')};
`
});

// --- CSG ---
nodeRegistry.register({
    id: 'Union',
    label: 'Union',
    category: 'Combiners (CSG)',
    description: 'Combines two shapes (min).',
    inputs: [],
    glsl: (ctx) => `
${ctx.indent}bool winA = ${ctx.varName}_d < ${ctx.in2}_d;
${ctx.indent}${ctx.varName}_d = winA ? ${ctx.varName}_d : ${ctx.in2}_d;
${ctx.indent}${ctx.varName}_p = winA ? ${ctx.varName}_p : ${ctx.in2}_p;
${ctx.indent}${ctx.varName}_dr = winA ? ${ctx.varName}_dr : ${ctx.in2}_dr;
`
});

nodeRegistry.register({
    id: 'Subtract',
    label: 'Subtract',
    category: 'Combiners (CSG)',
    description: 'Carves B out of A.',
    inputs: [],
    glsl: (ctx) => `
${ctx.indent}float negB = -${ctx.in2}_d;
${ctx.indent}bool winA = ${ctx.varName}_d > negB; 
${ctx.indent}${ctx.varName}_d = winA ? ${ctx.varName}_d : negB;
${ctx.indent}${ctx.varName}_p = winA ? ${ctx.varName}_p : ${ctx.in2}_p;
${ctx.indent}${ctx.varName}_dr = winA ? ${ctx.varName}_dr : ${ctx.in2}_dr;
`
});

nodeRegistry.register({
    id: 'Intersect',
    label: 'Intersect',
    category: 'Combiners (CSG)',
    description: 'Area where A and B overlap.',
    inputs: [],
    glsl: (ctx) => `
${ctx.indent}bool winA = ${ctx.varName}_d > ${ctx.in2}_d;
${ctx.indent}${ctx.varName}_d = winA ? ${ctx.varName}_d : ${ctx.in2}_d;
${ctx.indent}${ctx.varName}_p = winA ? ${ctx.varName}_p : ${ctx.in2}_p;
${ctx.indent}${ctx.varName}_dr = winA ? ${ctx.varName}_dr : ${ctx.in2}_dr;
`
});

nodeRegistry.register({
    id: 'SmoothUnion',
    label: 'Smooth Union',
    category: 'Combiners (CSG)',
    description: 'Merges shapes organically.',
    inputs: [
        { id: 'k', label: 'Smoothness', min: 0.01, max: 2.0, step: 0.01, default: 0.5 }
    ],
    glsl: (ctx) => `
${ctx.indent}float h = clamp(0.5 + 0.5 * (${ctx.in2}_d - ${ctx.varName}_d) / ${ctx.getParam('k')}, 0.0, 1.0);
${ctx.indent}${ctx.varName}_d = mix(${ctx.in2}_d, ${ctx.varName}_d, h) - ${ctx.getParam('k')} * h * (1.0 - h);
${ctx.indent}${ctx.varName}_p = mix(${ctx.in2}_p, ${ctx.varName}_p, h);
${ctx.indent}${ctx.varName}_dr = mix(${ctx.in2}_dr, ${ctx.varName}_dr, h);
`
});

nodeRegistry.register({
    id: 'Mix',
    label: 'Mix (Lerp)',
    category: 'Combiners (CSG)',
    description: 'Linear interpolation between shapes.',
    inputs: [
        { id: 'factor', label: 'Factor', min: 0.0, max: 1.0, step: 0.01, default: 0.5 }
    ],
    glsl: (ctx) => `
${ctx.indent}${ctx.varName}_d = mix(${ctx.varName}_d, ${ctx.in2}_d, ${ctx.getParam('factor')});
${ctx.indent}${ctx.varName}_p = mix(${ctx.varName}_p, ${ctx.in2}_p, ${ctx.getParam('factor')});
${ctx.indent}${ctx.varName}_dr = mix(${ctx.varName}_dr, ${ctx.in2}_dr, ${ctx.getParam('factor')});
`
});

// Alias "Custom" to Note for now to prevent crash if loaded
nodeRegistry.register({
    id: 'Custom',
    label: 'Custom (Legacy)',
    category: 'Utils',
    description: 'Legacy node.',
    inputs: [],
    glsl: (ctx) => ''
});
