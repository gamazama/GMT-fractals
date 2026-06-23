/**
 * test:zindex — guards the stacking-tier table.
 *
 * Asserts (1) no two PORTAL tiers' [base, base+span] ranges overlap (a silent
 * cross-tier stacking bug), (2) the load-bearing invariants from the design hold
 * (panel band 100–199 reserved; takeover < panel; popover ≥ 300), and
 * (3) `registerTiers` rejects an overlapping portal band. Run: `npm run test:zindex`.
 *
 * @see plans/z-index-system-design.md
 */
import { allTiers, findPortalOverlaps, registerTiers, z, Z, isPortalTier } from '../components/ui/zIndex';

let failures = 0;
const fail = (msg: string) => { console.error('  ✗', msg); failures++; };
const ok = (msg: string) => console.log('  ✓', msg);

console.log('z-index tier table:');

// 1. No portal-band overlaps.
const overlaps = findPortalOverlaps();
if (overlaps.length) fail(`portal tiers overlap:\n     ${overlaps.join('\n     ')}`);
else ok('no portal-band overlaps');

// 2. Invariants.
const tiers = allTiers();
if (tiers.panel.base !== 100 || tiers.panel.span !== 99) fail(`panel band must be 100..199, got ${tiers.panel.base}..${tiers.panel.base + tiers.panel.span}`);
else ok('panel band reserves 100–199');

if (tiers.takeover.base >= tiers.panel.base) fail(`takeover (${tiers.takeover.base}) must sit under panel (${tiers.panel.base})`);
else ok('takeover sits under panel');

if (tiers.popover.base < 300) fail(`popover must start ≥ 300 (gap above panel), got ${tiers.popover.base}`);
else ok('popover clears the panel band (≥300)');

// 3. z() resolves + clamps; Z proxy matches base; isPortalTier classifies.
if (z('modal') !== 1000) fail(`z('modal') = ${z('modal')}, expected 1000`);
else ok("z('modal') === 1000");
if (Z.panel !== tiers.panel.base) fail('Z proxy out of sync with table base');
else ok('Z proxy matches tier base');
if (!isPortalTier('modal') || isPortalTier('shellDock')) fail('isPortalTier misclassifies');
else ok('isPortalTier classifies portal vs shell');

// 4. registerTiers: gap is accepted, overlap is rejected.
try {
    registerTiers({ testGap: { base: 700, span: 0, domain: 'portal' } });
    ok('registerTiers accepts a non-overlapping portal tier (700)');
} catch (e) {
    fail(`registerTiers rejected a valid tier: ${(e as Error).message}`);
}
try {
    registerTiers({ testClash: { base: 1010, span: 0, domain: 'portal' } }); // inside modal 1000..1050
    fail('registerTiers accepted an overlapping portal tier (should throw)');
} catch {
    ok('registerTiers rejects an overlapping portal tier');
}

if (failures) { console.error(`\nFAILED: ${failures} assertion(s)`); process.exit(1); }
console.log('\nPASS');
