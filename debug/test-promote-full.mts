import * as fs from 'fs';
import { detectVariables, promoteVariable } from '../engine-gmt/features/fragmentarium_import/workshop/variable-detector';
import { processFormula } from '../engine-gmt/features/fragmentarium_import/v4';
const dec = JSON.parse(fs.readFileSync('h:/GMT/workspace-gmt/dev/public/formulas/dec.json','utf8'));
let pre=0, post=0, regressed=0; const fails:string[]=[];
for (const e of dec) {
  const before:any = processFormula(e.code, e.id, e.id, e.id);
  if(!before.ok) continue; pre++;
  const vars = detectVariables(e.code);
  const tgt = vars.find(v=>v.type==='vec3') ?? vars[0];
  if(!tgt){ post++; continue; }
  const after:any = processFormula(promoteVariable(e.code, tgt), e.id, e.id, e.id);
  if(after.ok) post++; else { regressed++; if(fails.length<12) fails.push(e.id+' ('+after.error?.kind+')'); }
}
console.log(`ALL DEC: ${post}/${pre} import OK after promoting a var (${regressed} regressed)`);
if(fails.length) console.log('regressions:', fails.join(', '));
