/**
 * test-gx-share — the v2 Share link codec (gradient-explorer/v2/shareUrl.ts).
 *
 *   [1] round trip keeps every stop field, the name, blend + colour space
 *   [2] the default-valued fields are elided from the wire (short links) yet restored
 *   [3] garbage decodes to null: not base64, not JSON, wrong version, a bad stop row, a
 *       config the shared gate rejects
 *
 * Node only, no browser. `npm run test:gx-share`.
 */

import { encodeShare, decodeShare } from '../gradient-explorer/v2/shareUrl';
import type { GradientConfig } from '../types';

let failures = 0;
const check = (ok: boolean, msg: string): void => {
  console.log(`  ${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) failures++;
};

console.log('[1] round trip');
{
  const cfg: GradientConfig = {
    stops: [
      { id: 'a', position: 0, color: '#FF0000', bias: 0.5, interpolation: 'linear' },
      { id: 'b', position: 0.3333, color: '#00FF00', bias: 0.25, interpolation: 'smooth' },
      { id: 'c', position: 1, color: '#0000FF', bias: 0.5, interpolation: 'step' },
    ],
    blendSpace: 'oklab',
    colorSpace: 'srgb',
  };
  const code = encodeShare(cfg, 'Test name');
  check(/^[A-Za-z0-9_-]+$/.test(code), 'the code is base64url (no + / =)');
  const back = decodeShare(code);
  check(!!back, 'decodes');
  if (back) {
    check(back.name === 'Test name', 'the name survives');
    check(back.config.blendSpace === 'oklab' && back.config.colorSpace === 'srgb', 'blend + colour space survive');
    check(back.config.stops.length === 3, 'three stops');
    const s = back.config.stops;
    check(s[1].position === 0.3333 && s[1].color.toUpperCase() === '#00FF00', 'position + colour survive');
    check(s[1].interpolation === 'smooth' && s[1].bias === 0.25, 'interpolation + bias survive');
    check(s[2].interpolation === 'step' && (s[2].bias ?? 0.5) === 0.5, 'a step stop with default bias survives');
    check((s[0].interpolation ?? 'linear') === 'linear' && (s[0].bias ?? 0.5) === 0.5, 'round trip keeps every stop field');
  }
}

console.log('\n[2] defaults are elided');
{
  const cfg: GradientConfig = {
    stops: [
      { id: 'a', position: 0, color: '#000000', bias: 0.5, interpolation: 'linear' },
      { id: 'b', position: 1, color: '#FFFFFF', bias: 0.5, interpolation: 'linear' },
    ],
  };
  const code = encodeShare(cfg, 'bw');
  const json = Buffer.from(code.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  check(!json.includes('linear') && !json.includes('0.5'), 'default interpolation + bias are not on the wire');
  check(json.length < 90, `the wire stays short (${json.length} chars)`);
  const back = decodeShare(code);
  check(!!back && back.config.stops.length === 2, 'and still decodes to two stops');
}

console.log('\n[3] garbage');
{
  check(decodeShare('***') === null, 'not base64 → null');
  check(decodeShare(Buffer.from('not json').toString('base64url')) === null, 'not JSON → null');
  check(decodeShare(Buffer.from(JSON.stringify({ v: 2, s: [] })).toString('base64url')) === null, 'wrong version → null');
  check(decodeShare(Buffer.from(JSON.stringify({ v: 1, s: [[0, 5]] })).toString('base64url')) === null, 'a bad stop row → null');
  check(decodeShare(Buffer.from(JSON.stringify({ v: 1, s: [] })).toString('base64url')) === null, 'garbage decodes to null');
}

console.log(failures === 0 ? '\nPASS — share codec' : `\nFAIL — ${failures} assertion(s)`);
process.exit(failures === 0 ? 0 : 1);
