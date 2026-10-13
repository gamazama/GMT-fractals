/**
 * Guard: the saved-state library's three optional additions.
 *
 *   `SlotShortcutOptions.when`      (engine/store/installStateLibrary.ts) — a predicate for the
 *                                   slot KEYS, handed to both the recall and the save binding.
 *   `StateLibraryPanelProps.sortBy` (components/StateLibraryPanel.tsx) — a display order; drag
 *                                   handle off while it is set; slot numbers stay stored positions.
 *   `StateLibraryPanelProps.renderMeta`                              — a second line per row.
 *
 * Plain node, no browser. The key half drives the REAL library, the REAL shortcut registry and
 * the REAL dispatcher (`installShortcuts` on a fake event target, fake key events). The panel
 * half RENDERS the real component with `react-dom/server` and reads the markup, so it sees what
 * a row is made of; it cannot see event handlers, which is why "a drag does nothing under
 * sortBy" is not claimed here (driven once in a browser on 2026-10-08, see the panel's JSDoc).
 *
 *   [1] both registrations of every slot carry the predicate
 *   [2] neither key fires while it returns false; the event is left unconsumed; it is asked on
 *       every press
 *   [3] the menu's slot rows ignore it (a click is deliberate), and stay visible and enabled
 *   [4] no predicate passed = none registered, the keys are always live (what every library
 *       had before the option existed)
 *   [5] sortBy: rows follow the comparator, ties keep stored order, the caller's array is not
 *       reordered, each row prints its STORED slot number, nothing is draggable
 *   [6] renderMeta: one line per row under the label, none for a null result, none at all
 *       when the prop is absent
 *
 * Run: `npx tsx debug/test-state-library-options.mts`
 *
 * ── FALSIFIED 2026-10-08, seven ways, each break reverted ──────────────────────────────────
 *   installStateLibrary.ts
 *   - `when` dropped from the SAVE registration → 6 red: "the save registration carries the
 *     predicate", "Mod+digit does not save while when() is false" (slots 99, 22, 99),
 *     "the refused save key is left unconsumed", "the predicate was asked on each of those
 *     presses", and the two menu lines of [3] (they read the slots the stray save overwrote).
 *   - `when` dropped from the RECALL registration → 4 red: "the recall registration carries
 *     the predicate", "digit does not recall while when() is false", "the refused digit is
 *     left unconsumed", "the predicate was asked on that press".
 *   - the menu row's onSelect made to return early on a false predicate → 2 red: "a menu click
 *     recalls while when() is false", "a menu click on an empty slot saves while when() is false".
 *   StateLibraryPanel.tsx
 *   - `snapshots.sort(sortBy)` (the caller's array sorted in place) → 5 red, the render throws
 *     on the frozen array: "the rows follow the comparator…", "the caller's array is not
 *     reordered", and the three that need rows.
 *   - a copy sorted first and the index taken AFTER (the row's place on screen) → 2 red:
 *     "each row prints its stored slot number" (E:1 B:2 D:3 C:4 A:5), "a row stored past
 *     slot 9 has no hint even when shown first".
 *   - the drag handle rendered regardless of sortBy → 1 red: "no row is draggable under sortBy".
 *   - the second line's wrapper rendered unconditionally → 2 red: "no second line without
 *     renderMeta", "a null result renders no line".
 *
 *   NOT falsifiable from here, and so not claimed: that a row's drag HANDLERS are off under
 *   sortBy (static markup has no handlers), and the order of ties ("EBDCA" has B before D) —
 *   that one is `Array.prototype.sort` being stable, not this code.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { StateSnapshot } from '../engine/store/createStateLibrarySlice';

// The dispatcher's input guard reads `document.activeElement`; nothing is focused here.
(globalThis as any).document = { activeElement: null };

const { installStateLibrary } = await import('../engine/store/installStateLibrary');
const { shortcuts, installShortcuts, uninstallShortcuts } = await import('../engine/plugins/Shortcuts');
const { menu } = await import('../engine/plugins/Menu');
const { useEngineStore } = await import('../store/engineStore');
const { StateLibraryPanel } = await import('../components/StateLibraryPanel');

let failures = 0;
const ok = (cond: boolean, msg: string, detail = ''): void => {
    if (cond) console.log(`  ✓ ${msg}`);
    else { failures++; console.log(`  ✗ ${msg}${detail ? `  — ${detail}` : ''}`); }
};

type Payload = { n: number };
const store = () => useEngineStore.getState() as unknown as Record<string, any>;

// ── A library whose slot keys are conditional ──────────────────────────────────────────────
const live = { n: 10 };
let captures = 0;
const applied: number[] = [];
let gateOpen = true;
let gateCalls = 0;
const gate = () => { gateCalls++; return gateOpen; };

const actionsFor = (p: string) => ({
    add: `${p}Add`, update: `${p}Update`, delete: `${p}Delete`, duplicate: `${p}Duplicate`,
    select: `${p}Select`, reorder: `${p}Reorder`, saveToSlot: `${p}SaveToSlot`, reset: `${p}Reset`,
});

installStateLibrary<Payload>({
    panelId: 'Test A',
    arrayKey: 'tA',
    activeIdKey: 'tAActive',
    actions: actionsFor('tA'),
    capture: () => { captures++; return { n: live.n }; },
    apply: (s) => { applied.push(s.n); live.n = s.n; },
    slotShortcuts: { count: 3, when: gate },
    menu: { menuId: 'tA-menu', slot: 'right', order: 1 },
});

console.log('Block 1 — both registrations of every slot carry the predicate');
{
    const defs = shortcuts.list();
    const saves = [1, 2, 3].map((n) => defs.find((d) => d.id === `tASaveToSlot.save.${n}`));
    const recalls = [1, 2, 3].map((n) => defs.find((d) => d.id === `tASaveToSlot.recall.${n}`));
    ok(saves.every((d) => !!d) && recalls.every((d) => !!d), 'three save and three recall bindings are registered',
        `save ${saves.filter(Boolean).length}, recall ${recalls.filter(Boolean).length}`);
    ok(saves.every((d) => d?.when === gate), 'the save registration carries the predicate',
        `when on save.1..3: ${saves.map((d) => (d?.when === gate ? 'yes' : typeof d?.when)).join(', ')}`);
    ok(recalls.every((d) => d?.when === gate), 'the recall registration carries the predicate',
        `when on recall.1..3: ${recalls.map((d) => (d?.when === gate ? 'yes' : typeof d?.when)).join(', ')}`);
}

// ── The real dispatcher on a fake event target ─────────────────────────────────────────────
class FakeRoot {
    fn: ((e: unknown) => void) | null = null;
    addEventListener(_t: string, fn: (e: unknown) => void) { this.fn = fn; }
    removeEventListener() { this.fn = null; }
}
const root = new FakeRoot();
installShortcuts({ domRoot: root as unknown as HTMLElement });
// 'Mod' is Ctrl here and Cmd on a Mac; ask the registry which, so the test presses the bound key.
const modIsCtrl = shortcuts.lookup('Ctrl+1').some((d) => d.id === 'tASaveToSlot.save.1');
const press = (digit: number, mod = false): { consumed: boolean } => {
    let consumed = false;
    root.fn?.({
        key: String(digit), code: `Digit${digit}`,
        ctrlKey: mod && modIsCtrl, metaKey: mod && !modIsCtrl, altKey: false, shiftKey: false,
        preventDefault() { consumed = true; }, stopPropagation() {},
    });
    return { consumed };
};
const arrA = () => store().tA as StateSnapshot<Payload>[];

console.log('\nBlock 2 — neither key fires while the predicate returns false');
{
    // Open: fill two slots, then recall the first.
    live.n = 11; press(1, true);
    live.n = 22; press(2, true);
    ok(arrA().length === 2 && arrA()[0].state.n === 11 && arrA()[1].state.n === 22,
        'open: Mod+digit saves', `slots: ${arrA().map((s) => s.state.n).join(', ')}`);
    applied.length = 0;
    const r1 = press(1);
    ok(applied.join() === '11' && store().tAActive === arrA()[0].id && r1.consumed,
        'open: digit recalls and consumes the key', `applied ${applied.join()}, consumed ${r1.consumed}`);

    // Closed.
    gateOpen = false;
    applied.length = 0;
    const activeBefore = store().tAActive;
    let asked = gateCalls;
    const r2 = press(2);
    ok(applied.length === 0 && store().tAActive === activeBefore, 'digit does not recall while when() is false',
        `applied ${applied.join() || 'nothing'}, active ${store().tAActive === activeBefore ? 'unchanged' : 'CHANGED'}`);
    ok(r2.consumed === false, 'the refused digit is left unconsumed', `consumed ${r2.consumed}`);
    ok(gateCalls === asked + 1, 'the predicate was asked on that press', `asked ${gateCalls - asked} time(s)`);

    live.n = 99;
    const capBefore = captures;
    asked = gateCalls;
    const r3 = press(1, true);
    const r4 = press(3, true);
    ok(arrA().length === 2 && arrA()[0].state.n === 11 && captures === capBefore,
        'Mod+digit does not save while when() is false',
        `slots: ${arrA().map((s) => s.state.n).join(', ')}, captures +${captures - capBefore}`);
    ok(r3.consumed === false && r4.consumed === false, 'the refused save key is left unconsumed', `consumed ${r3.consumed}, ${r4.consumed}`);
    ok(gateCalls === asked + 2, 'the predicate was asked on each of those presses', `asked ${gateCalls - asked} time(s)`);

    // Open again — the answer is not cached.
    gateOpen = true;
    applied.length = 0;
    press(2);
    ok(applied.join() === '22', 'open again: the next press is asked afresh and recalls', `applied ${applied.join() || 'nothing'}`);
}

console.log('\nBlock 3 — the menu\'s slot rows ignore the predicate');
{
    gateOpen = false;
    const items = menu.listItems('tA-menu') as any[];
    const row1 = items.find((i) => i.id === 'tA-menu-slot-1');
    const row3 = items.find((i) => i.id === 'tA-menu-slot-3');
    ok(!!row1 && !!row3, 'the slot rows are registered', `rows: ${items.map((i) => i.id).join(', ')}`);
    ok(row1?.when === undefined && row1?.disabled === undefined, 'a slot row stays visible and enabled',
        `when ${typeof row1?.when}, disabled ${typeof row1?.disabled}`);
    applied.length = 0;
    live.n = 33;
    row1?.onSelect();
    ok(applied.join() === '11', 'a menu click recalls while when() is false', `applied ${applied.join() || 'nothing'}`);
    live.n = 33;
    row3?.onSelect();
    ok(arrA().length === 3 && arrA()[2].state.n === 33, 'a menu click on an empty slot saves while when() is false',
        `slots: ${arrA().map((s) => s.state.n).join(', ')}`);
    gateOpen = true;
}

console.log('\nBlock 4 — no predicate passed = none registered, the keys are always live');
{
    // Library A's digits would shadow these (first-registered wins a tie), so start clean.
    shortcuts.clear();
    const liveB = { n: 5 };
    const appliedB: number[] = [];
    installStateLibrary<Payload>({
        panelId: 'Test B', arrayKey: 'tB', activeIdKey: 'tBActive', actions: actionsFor('tB'),
        capture: () => ({ n: liveB.n }), apply: (s) => { appliedB.push(s.n); },
        slotShortcuts: { count: 2, category: 'Test' },
        menu: null,
    });
    const defsB = shortcuts.list();
    ok(defsB.length === 4 && defsB.every((d) => d.when === undefined), 'an options object without `when` registers no predicate',
        `${defsB.length} bindings, with a predicate: ${defsB.filter((d) => d.when !== undefined).length}`);
    liveB.n = 7;
    const s1 = press(1, true);
    const g1 = press(1);
    ok((store().tB as StateSnapshot<Payload>[]).length === 1 && appliedB.join() === '7' && s1.consumed && g1.consumed,
        'its keys save and recall', `slots ${(store().tB as unknown[]).length}, applied ${appliedB.join() || 'nothing'}`);

    shortcuts.clear();
    installStateLibrary<Payload>({
        panelId: 'Test C', arrayKey: 'tC', activeIdKey: 'tCActive', actions: actionsFor('tC'),
        capture: () => ({ n: 1 }), apply: () => {},
        menu: null,
    });
    const defsC = shortcuts.list();
    ok(defsC.length === 18 && defsC.every((d) => d.when === undefined), 'the default (slotShortcuts omitted) registers nine slots and no predicate',
        `${defsC.length} bindings, with a predicate: ${defsC.filter((d) => d.when !== undefined).length}`);
}
uninstallShortcuts();

// ── The panel, rendered ────────────────────────────────────────────────────────────────────
const snap = (id: string, n: number): StateSnapshot<Payload> => ({ id, label: id.toUpperCase(), state: { n }, createdAt: 1 });
const STORED = () => [snap('a', 3), snap('b', 1), snap('c', 2), snap('d', 1), snap('e', 0.5)];
const noop = () => {};
const base = {
    activeId: null, onSelect: noop, onRename: noop, onUpdate: noop, onDuplicate: noop, onDelete: noop, onReorder: noop,
};
const ROW_MARK = '<div class="flex items-center gap-1.5 p-1.5 rounded border transition-all group';
interface Row { label: string; hint: string | null; digit: string | null; draggable: boolean; meta: string | null; metaAt: number; labelAt: number; hintAt: number }
const render = (props: Record<string, unknown>): Row[] => {
    const html = renderToStaticMarkup(React.createElement(StateLibraryPanel as React.ComponentType<any>, { ...base, ...props }));
    return html.split(ROW_MARK).slice(1).map((chunk) => {
        const label = /title="Double-click to rename">([^<]*)<\/span>/.exec(chunk);
        const hint = /<span class="text-\[7px\] text-fg-faint">([^<]*)<\/span>/.exec(chunk);
        const digit = /text-fg-ghost text-\[7px\]">([^<]*)<\/div>/.exec(chunk);
        const meta = /<div data-snapshot-meta[^>]*>([^<]*)<\/div>/.exec(chunk);
        return {
            label: label ? label[1] : '?', hint: hint ? hint[1] : null, digit: digit ? digit[1] : null,
            draggable: chunk.includes('draggable="true"') || chunk.includes('Drag to reorder'),
            meta: meta ? meta[1] : null,
            metaAt: meta ? meta.index : -1, labelAt: label ? label.index : -1, hintAt: hint ? hint.index : -1,
        };
    });
};
const byN = (a: StateSnapshot<Payload>, b: StateSnapshot<Payload>) => a.state.n - b.state.n;

console.log('\nBlock 5 — sortBy is a display order');
{
    const plain = render({ snapshots: STORED() });
    ok(plain.map((r) => r.label).join('') === 'ABCDE', 'without sortBy the rows are in stored order', plain.map((r) => r.label).join(''));
    ok(plain.every((r) => r.draggable), 'without sortBy every row has its drag handle', `${plain.filter((r) => r.draggable).length} of ${plain.length}`);
    ok(plain.map((r) => r.digit).join('') === '12345' && plain.map((r) => r.hint).join(' ') === 'Ctrl+1 Ctrl+2 Ctrl+3 Ctrl+4 Ctrl+5',
        'without sortBy the slot numbers run 1..5', `${plain.map((r) => r.digit).join('')} / ${plain.map((r) => r.hint).join(' ')}`);

    const stored = STORED();
    const before = stored.slice();
    Object.freeze(stored); // an in-place sort of the caller's array throws here
    let sorted: Row[] = [];
    let threw = '';
    try { sorted = render({ snapshots: stored, sortBy: byN }); } catch (e) { threw = (e as Error).message; }
    ok(sorted.map((r) => r.label).join('') === 'EBDCA', 'the rows follow the comparator, ties in stored order',
        threw ? `render threw: ${threw}` : `shown ${sorted.map((r) => r.label).join('')}, expected EBDCA`);
    ok(!threw && stored.length === before.length && stored.every((s, i) => s === before[i]), 'the caller\'s array is not reordered',
        threw ? `render threw: ${threw}` : `stored ${stored.map((s) => s.label).join('')}`);
    const slotOf: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5 };
    ok(sorted.length === 5 && sorted.every((r) => r.digit === String(slotOf[r.label]) && r.hint === `Ctrl+${slotOf[r.label]}`),
        'each row prints its stored slot number', sorted.map((r) => `${r.label}:${r.digit}:${r.hint}`).join(' '));
    ok(sorted.length === 5 && sorted.every((r) => !r.draggable), 'no row is draggable under sortBy',
        `${sorted.filter((r) => r.draggable).length} of ${sorted.length} draggable`);

    // Past nine stored positions there is no hint, wherever the sort shows the row.
    const many = Array.from({ length: 11 }, (_, i) => snap(`s${i + 1}`, 100 - i));
    const manySorted = render({ snapshots: many, sortBy: byN });
    ok(manySorted[0].label === 'S11' && manySorted[0].hint === null && manySorted[0].digit === '11' && manySorted[10].hint === 'Ctrl+1',
        'a row stored past slot 9 has no hint even when shown first',
        `first ${manySorted[0].label} hint ${manySorted[0].hint} digit ${manySorted[0].digit}; last ${manySorted[10].label} hint ${manySorted[10].hint}`);
}

console.log('\nBlock 6 — renderMeta is a second line under the label');
{
    const none = render({ snapshots: STORED() });
    ok(none.every((r) => r.meta === null), 'no second line without renderMeta', `${none.filter((r) => r.meta !== null).length} rows have one`);

    const withMeta = render({ snapshots: STORED(), renderMeta: (s: StateSnapshot<Payload>) => (s.id === 'c' ? null : `n ${s.state.n}`) });
    ok(withMeta.filter((r) => r.label !== 'C').every((r) => r.meta === `n ${STORED().find((s) => s.label === r.label)!.state.n}`),
        'each row shows what renderMeta returned for its snapshot', withMeta.map((r) => `${r.label}:${r.meta}`).join(' '));
    ok(withMeta.find((r) => r.label === 'C')!.meta === null, 'a null result renders no line', `C: ${withMeta.find((r) => r.label === 'C')!.meta}`);
    ok(withMeta.filter((r) => r.meta !== null).every((r) => r.labelAt >= 0 && r.metaAt > r.labelAt && r.hintAt > r.metaAt),
        'the second line sits after the label and before the slot hint', withMeta.map((r) => `${r.labelAt}<${r.metaAt}<${r.hintAt}`).join(' '));

    const both = render({ snapshots: STORED(), sortBy: byN, renderMeta: (s: StateSnapshot<Payload>) => `n ${s.state.n}` });
    ok(both.map((r) => r.meta).join('|') === 'n 0.5|n 1|n 1|n 2|n 3', 'with sortBy the second line follows its row',
        both.map((r) => `${r.label}:${r.meta}`).join(' '));
}

console.log(failures === 0 ? '\nPASS — state library options' : `\nFAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
