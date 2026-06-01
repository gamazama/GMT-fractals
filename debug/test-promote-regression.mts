/** Regression: (A) promoting a var in DEC formulas no longer breaks V4 import;
 *  (B) genuine frag formulas still classify as frag; (C) DEC formulas still classify as dec. */
import * as fs from 'fs';
import * as path from 'path';
import { detectVariables, promoteVariable } from '../engine-gmt/features/fragmentarium_import/workshop/variable-detector';
import { ingest } from '../engine-gmt/features/fragmentarium_import/v4/ingest';
import { processFormula } from '../engine-gmt/features/fragmentarium_import/v4';

const dec = JSON.parse(fs.readFileSync('h:/GMT/workspace-gmt/dev/public/formulas/dec.json','utf8'));

// (C) DEC formulas still classify as dec (sample 40)
let decOk=0, decBad=0;
for (const e of dec.slice(0, 40)) {
  const r:any = ingest(e.code, e.id);
  if (r.format==='dec') decOk++; else { decBad++; if(decBad<=5) console.log('  DEC misclassified:', e.id, '->', r.format); }
}
console.log(`(C) DEC classification: ${decOk}/${decOk+decBad} stayed dec`);

// (A) promote first var in DEC formulas, V4 import must still succeed where it did before (sample 40)
let preOk=0, postOk=0, regressed=0;
for (const e of dec.slice(0, 40)) {
  const before:any = processFormula(e.code, e.id, e.id, e.id);
  if (!before.ok) continue;        // only care about ones that worked before
  preOk++;
  const vars = detectVariables(e.code);
  if (!vars.length) { postOk++; continue; }
  const promoted = promoteVariable(e.code, vars.find(v=>v.type==='vec3') ?? vars[0]);
  const after:any = processFormula(promoted, e.id, e.id, e.id);
  if (after.ok) postOk++; else { regressed++; if(regressed<=8) console.log('  REGRESSED after promote:', e.id, '->', after.error?.kind); }
}
console.log(`(A) promote-then-import: ${postOk}/${preOk} still import OK after promotion (${regressed} regressed)`);

// (B) genuine frag formulas still classify as frag
const REF = 'engine-gmt/features/fragmentarium_import/reference/Examples';
function findFrags(dir:string, acc:string[]=[], cap=25):string[]{
  if(acc.length>=cap) return acc;
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(acc.length>=cap)break;
    const f=path.join(dir,ent.name);
    if(ent.isDirectory()) findFrags(f,acc,cap);
    else if(ent.name.endsWith('.frag')) acc.push(f);
  }
  return acc;
}
let fragOk=0, fragBad=0;
for (const f of findFrags(REF)) {
  const src=fs.readFileSync(f,'utf8');
  if(!/uniform\s+\w+\s+\w+\s*;\s*(slider|checkbox|color)\[/.test(src)) continue; // only ones with annotations
  const r:any = ingest(src, path.basename(f));
  if (r.format==='frag') fragOk++; else { fragBad++; if(fragBad<=5) console.log('  frag misclassified:', path.basename(f), '->', r.format); }
}
console.log(`(B) annotated .frag classification: ${fragOk}/${fragOk+fragBad} stayed frag`);
