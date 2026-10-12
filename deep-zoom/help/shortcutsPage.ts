/**
 * deep-zoom/help/shortcutsPage.ts - Help's Keyboard Shortcuts page, written from the shortcuts
 * registry when it is read. No list of keys is kept here by hand.
 *
 * PURPOSE
 *   A hand-written key list rots: a key moves in deep-zoom/hotkeys.ts and the page goes on
 *   naming the old one. This page is `shortcuts.list()` (engine/plugins/Shortcuts.ts) turned into
 *   the help browser's small markdown, so whatever is registered - this app's keys, the engine's
 *   (undo, the scene's PNG, hints, the timeline's), the location slots - is what it says, in the
 *   words each registration gave. The one part the registry cannot give is the fly keys, which
 *   are deliberately not registered: those come from ./flyKeys.ts, first on the page.
 *
 * THE SEAM
 *   - `shortcutsMarkdown()` is the page's text. The topic in ./topics.ts hands it out through a
 *     GETTER on `content`, so the registry is read every time the help browser draws or searches
 *     the page - a shortcut registered after Help first opened (the timeline's are registered when
 *     it mounts, the Gradient Studio's brush keys while its Paint face is open) is on the page
 *     the next time it is drawn.
 *   - `shortcutGroups()` is the same thing as data, with `count` = how many registry entries a
 *     row stands for. The sum over all rows is the registry's length: nothing registered is left
 *     off the page.
 *   - This file is part of the lazy help chunk (only ./topics.ts imports it).
 *
 * HOW ROWS ARE MADE (three rules, none of them about a particular key)
 *   1. One group a `category`; an entry with no category goes under "Other". The groups that
 *      hold a registration of this app's own (an id that starts `deep-zoom.`) come first, then
 *      the engine's; inside each half, in the order the categories first appear in the registry.
 *   2. Entries of one group with the same description and the same scope are one row with every
 *      key (Redo: two keys).
 *   3. A run of entries whose description and key end in the same digit, 1 2 3 ..., is one row:
 *      "1 to 9". The location slots are 18 registrations and two rows.
 *   An entry bound to a SCOPE acts only while that scope is active; the row says so: in the
 *   scope's own words where this file knows it (`SCOPE_WORDS`), in general words where it does not.
 *
 * PITFALLS
 *   - A row's key is PRINTED from the registered string, not from what the dispatcher matched:
 *     `Mod` is the platform's own (`modKeyLabel`), a single letter is upper-cased, the backtick -
 *     which the markdown cannot show inside its code marks - is written as a word, and Escape is
 *     `Esc` (`KEY_WORDS`). The topics name a key the same way, or the check does not know it.
 *   - The registry does not say WHEN a shortcut acts (`when` is a function). Space is listed as
 *     the timeline's Play; that it is fly-up in Fly mode is said by the fly keys' own table.
 *   - In the topics, backticks mean "a key" (`npm run check:deep-zoom-help` reads them that way),
 *     so a description is printed as plain text and nothing else here is put in code marks.
 */
import { modKeyLabel, shortcuts } from '../../engine/plugins/Shortcuts';
import type { ShortcutDef } from '../../engine/plugins/Shortcuts';
import { FLY_KEYS } from './flyKeys';

export interface ShortcutRow {
    /** Key labels as printed. Two for a run: its first and its last. */
    keys: string[];
    /** True when `keys` is a run's first and last, to be joined with "to". */
    run: boolean;
    text: string;
    /** How many registry entries this row stands for. */
    count: number;
}

export interface ShortcutGroup {
    title: string;
    rows: ShortcutRow[];
}

/** How this app's own registrations are told from the engine's: the id prefix deep-zoom/hotkeys.ts gives every one. */
const OWN_ID_PREFIX = 'deep-zoom.';

/** Scopes this app can put into words. */
const SCOPE_WORDS: Record<string, string> = {
    'timeline-hover': 'with the pointer over the timeline',
};
/** Any other scope. A scope's own name is no word for a reader: the Escape that closes Help itself
 *  is registered under a scope of its own (`dismiss:` and an id: hooks/useDismiss.ts gives every
 *  open surface one), and it is on the page whenever the page is read. What every scope has in
 *  common is said instead. */
const SCOPE_UNKNOWN = 'while its window or tool is open';

/** A key under another name than its registered one: the backtick, which the help markdown cannot
 *  print between its code marks, and Escape as its key cap says it. */
const KEY_WORDS: Record<string, string> = { '`': 'Backtick', Escape: 'Esc' };

/** A registered key string as Help prints it: `Mod+z` -> `Ctrl+Z` (or the Mac's own), `b` -> `B`. */
export function keyLabel(key: string): string {
    const printed = modKeyLabel();                                   // 'Ctrl+', or the Mac's command sign, which takes no joiner
    const tight = !printed.endsWith('+');
    const mod = tight ? printed : printed.slice(0, -1);
    const word = (raw: string): string => {
        const w = raw.length === 1 ? raw.toUpperCase() : raw.charAt(0).toUpperCase() + raw.slice(1);
        return KEY_WORDS[w] ?? w;
    };
    const parts = key.split('+').map((p) => p.trim()).filter(Boolean).map((raw) => (raw.toLowerCase() === 'mod' ? mod : word(raw)));
    return parts.reduce((out, part, i) => out + (i === 0 || (tight && parts[i - 1] === mod) ? '' : '+') + part, '');
}

const scopeOf = (def: ShortcutDef): string => (def.scope && def.scope !== 'global' ? def.scope : '');

/** What the entry says of itself; its id when it says nothing. */
const describe = (def: ShortcutDef): string => def.description?.trim() || `(${def.id})`;

/** The scope in words, to go after a description; '' for an entry that acts everywhere. */
function scopeWords(def: ShortcutDef): string {
    const scope = scopeOf(def);
    return scope ? ` (${SCOPE_WORDS[scope] ?? SCOPE_UNKNOWN})` : '';
}

/** The description as the row prints it, the scope said after it. */
const rowText = (def: ShortcutDef): string => describe(def) + scopeWords(def);

/** `Recall slot 3` bound to `3` -> the stem and the digit; null for anything else. */
function numbered(def: ShortcutDef): { stem: string; keyStem: string; n: number } | null {
    const text = /^(.*\D)(\d)$/.exec(def.description?.trim() ?? '');
    const key = /^(.*?)(\d)$/.exec(def.key.trim());
    if (!text || !key || text[2] !== key[2]) return null;
    return { stem: text[1].trimEnd(), keyStem: key[1], n: Number(text[2]) };
}

/** The registry as groups of rows. `defs` is a parameter so a check can hand in a list of its own. */
export function shortcutGroups(defs: readonly ShortcutDef[] = shortcuts.list()): ShortcutGroup[] {
    const groups = new Map<string, ShortcutDef[]>();
    for (const def of defs) {
        const title = def.category?.trim() || 'Other';
        groups.set(title, [...(groups.get(title) ?? []), def]);
    }
    const own = (list: readonly ShortcutDef[]): boolean => list.some((d) => d.id.startsWith(OWN_ID_PREFIX));
    const ordered = [...groups].filter(([, list]) => own(list)).concat([...groups].filter(([, list]) => !own(list)));
    return ordered.map(([title, list]) => {
        const rows: ShortcutRow[] = [];
        const used = new Set<ShortcutDef>();
        for (const def of list) {
            if (used.has(def)) continue;
            // Rule 3: this entry and the ones that count on from it (same stem, same key stem, same scope).
            const first = numbered(def);
            if (first) {
                const run = [def];
                for (let n = first.n + 1; ; n++) {
                    const next = list.find((d) => {
                        const m = !used.has(d) && d !== def ? numbered(d) : null;
                        return !!m && m.n === n && m.stem === first.stem && m.keyStem === first.keyStem && scopeOf(d) === scopeOf(def);
                    });
                    if (!next) break;
                    run.push(next);
                }
                if (run.length > 2) {
                    run.forEach((d) => used.add(d));
                    const last = run[run.length - 1];
                    rows.push({ keys: [keyLabel(def.key), keyLabel(last.key)], run: true, text: `${describe(def)} to ${first.n + run.length - 1}${scopeWords(def)}`, count: run.length });
                    continue;
                }
            }
            // Rule 2: every entry of the group that says the same thing in the same scope.
            const same = list.filter((d) => !used.has(d) && rowText(d) === rowText(def));
            same.forEach((d) => used.add(d));
            rows.push({ keys: [...new Set(same.map((d) => keyLabel(d.key)))], run: false, text: rowText(def), count: same.length });
        }
        return { title, rows };
    });
}

const caps = (keys: readonly string[]): string => keys.map((k) => `\`${k}\``).join(' ');

/** The whole page: the fly keys' table, then the registry. */
export function shortcutsMarkdown(defs: readonly ShortcutDef[] = shortcuts.list()): string {
    const out: string[] = ['## Flying', '> Heard anywhere but in a text field.'];
    for (const group of FLY_KEYS) {
        out.push(`### ${group.title}`);
        if (group.note) out.push(group.note);
        for (const row of group.rows) out.push(`- ${row.keys ? caps(row.keys) : `**${row.hand}**:`} ${row.does}`);
    }
    for (const group of shortcutGroups(defs)) {
        out.push(`## ${group.title}`);
        for (const row of group.rows) out.push(`- ${row.run ? `\`${row.keys[0]}\` to \`${row.keys[1]}\`` : caps(row.keys)} ${row.text}`);
    }
    return `\n${out.join('\n')}\n`;
}
