import { preprocessDEC } from '../features/fragmentarium_import/parsers/dec-preprocessor.js';
import { detectFormula } from '../features/fragmentarium_import/workshop/detection.js';
import { buildTransformResult } from '../features/fragmentarium_import/workshop/preview.js';

const src = `float de( vec3 p0 ){
    vec4 p = vec4(p0, 1.);
    for(int i = 0; i < 8; i++){
      p.xyz = mod(p.xyz-1.,2.)-1.;
      p*=1.4/dot(p.xyz,p.xyz);
    }
    return (length(p.xz/p.w)*0.25);
  }`;

console.log('=== DEC PREPROCESSED ===');
const dec = preprocessDEC(src);
console.log(dec.fragmentariumSource);

console.log('\n=== DETECTION ===');
const det = detectFormula(src);
if ('error' in det) { console.log('ERROR:', det.error); process.exit(1); }
console.log('Selected:', det.selectedFunction, 'loopMode:', det.loopMode);
console.log('Uniforms:', det.uniforms.map(u => u.name + ':' + u.type));
console.log('DE distanceExpression:', det.doc.deFunction?.distanceExpression);
console.log('DE loopInfo body:', det.doc.deFunction?.loopInfo?.body?.substring(0, 200));

console.log('\n=== TRANSFORM ===');
const transform = buildTransformResult(det, det.selectedFunction, det.loopMode, 'DECTest', det.params);
if (!transform) { console.log('Transform returned null!'); process.exit(1); }
console.log('Function:\n' + transform.function);
console.log('\ngetDist:', transform.getDist);
console.log('\nloopInit:', transform.loopInit);
console.log('\nWarnings:', transform.warnings);
