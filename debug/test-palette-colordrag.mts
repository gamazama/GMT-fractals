/**
 * colorDrag harness — dragging a COLOUR onto a gradient must stay distinguishable from
 * dragging a whole GRADIENT, using only what a browser exposes during `dragover`.
 *
 * That is the whole risk in this feature. While a drag is in flight the browser hands a drop
 * target `dataTransfer.types` but refuses the VALUES until the drop, so the type string is the
 * only discriminator the ramp has. The shelf already drags favients; if the two shared a type,
 * dropping a saved gradient on the ramp would silently recolour a knot with garbage.
 *
 *   [1] a colour drag round-trips, and normalises to upper case
 *   [2] a FAVIENT drag is not a colour drag (the invariant on components/gradient/colorDrag.ts)
 *   [3] junk in the slot reads as nothing, rather than as a colour
 *   [4] nudgeChannel: one channel moves by a delta, the rest of each colour stays put
 *
 * Falsified 2026-09-08 by setting COLOR_DND_MIME to FAVIENT_DND_MIME: [2] goes red.
 *
 * Run: `npx tsx debug/test-palette-colordrag.mts`
 */
import { COLOR_DND_MIME, setColorDrag, isColorDrag, readColorDrag } from '../components/gradient/colorDrag';
import { nudgeChannel } from '../utils/colorUtils';
import { FAVIENT_DND_MIME } from '../palette/core/favientDnd';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++;
    console.error('  ✗ ' + msg);
  } else {
    console.log('  ✓ ' + msg);
  }
};

/** The slice of DataTransfer these helpers touch — node has no DOM. */
const fakeDT = (seed: Record<string, string> = {}) => {
  const data: Record<string, string> = { ...seed };
  return {
    get types() { return Object.keys(data); },
    setData(type: string, v: string) { data[type] = v; },
    getData(type: string) { return data[type] ?? ''; },
    effectAllowed: 'none',
  } as unknown as DataTransfer;
};

console.log('[1] a colour drag round-trips');
{
  const dt = fakeDT();
  setColorDrag(dt, '#bd5d8d');
  ok(isColorDrag(dt), 'the drag reads as a colour drag');
  ok(readColorDrag(dt) === '#BD5D8D', `the hex comes back upper-case (${readColorDrag(dt)})`);
  ok(dt.getData('text/plain') === '#BD5D8D', 'text/plain carries it too, so a drop elsewhere pastes the hex');
}

console.log('\n[2] a gradient drag is not a colour drag');
{
  const favient = fakeDT({ [FAVIENT_DND_MIME]: '{"name":"whatever"}', 'text/plain': 'whatever' });
  ok(!isColorDrag(favient), 'a favient drag is not a colour drag');
  ok(readColorDrag(favient) === null, 'and it yields no colour');
  ok(COLOR_DND_MIME !== FAVIENT_DND_MIME, `the two types are distinct (${COLOR_DND_MIME} vs ${FAVIENT_DND_MIME})`);
}

console.log('\n[3] junk is not a colour');
{
  for (const junk of ['', 'red', '#fff', '#12345', 'BD5D8D', '#GGGGGG']) {
    const dt = fakeDT({ [COLOR_DND_MIME]: junk });
    ok(readColorDrag(dt) === null, `"${junk}" reads as no colour`);
  }
}

console.log('\n[4] one channel moves, the rest of the colour stays');
{
  // What a channel slider means with SEVERAL things selected: everyone's red moves by the
  // same amount, nobody's other channels move, and the differences between them survive.
  // Falsified by rebuilding each colour from the shared value instead of a per-colour delta:
  // "each keeps its own green and blue" goes red.
  const a = nudgeChannel('#89B994', 'r', -57);
  const b = nudgeChannel('#9FC8A7', 'r', -57);
  ok(a === '#50B994', `red moves by the delta (#89B994 -57 -> ${a})`);
  ok(b === '#66C8A7', `and by the SAME delta on another colour (#9FC8A7 -57 -> ${b})`);
  ok(a.slice(3) === 'B994' && b.slice(3) === 'C8A7', 'each keeps its own green and blue');
  ok(parseInt(a.slice(1, 3), 16) !== parseInt(b.slice(1, 3), 16), 'the difference between them survives');
  ok(nudgeChannel('#0A0000', 'r', -50) === '#000000', 'red clamps at 0 rather than wrapping');
  ok(nudgeChannel('#FA0000', 'r', 50) === '#FF0000', 'and at 255');
  const wrapped = nudgeChannel('#FF0000', 'h', -10);
  ok(/^#FF00[0-9A-F]{2}$/.test(wrapped) && wrapped !== '#FF0000', `hue wraps past 0 (${wrapped})`);
  ok(nudgeChannel('#804020', 'v', 20) !== '#804020', 'value lifts');
  ok(nudgeChannel('#808080', 'r', 0) === '#808080', 'a zero delta changes nothing');
}

console.log(`\n${failures === 0 ? '✓ ALL PASS' : `✗ ${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
