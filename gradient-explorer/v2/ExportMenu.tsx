/**
 * ExportMenu — the ONE export window (plans/ge-v2-design.md §5.8; §13 item 1; the unified
 * shell plan's §8b item 5, 2026-09-09).
 *
 * ONE WINDOW, TWO AXES. Every export in the app is a cell in a 2×2: *what* is taken —
 * the RAMP (the continuous gradient) or the SWATCHES (the palette composed on the hero) —
 * crossed with *how many* — this one, or a whole set. That covers the three nouns the plan
 * names (a gradient, a palette, a set) and gives the fourth (a set's palettes) for free.
 *
 *   • The subject is a segmented control at the top. It is not a filter over one list: it
 *     changes what is BUILT, and the format list follows, because a format only appears
 *     under Swatches if it carries a `swatches` builder (`palette/core/exportFormats.ts`,
 *     grep `formatsFor`). The registry's shape is the filter; there is no second list here
 *     to fall out of step with it.
 *   • WHERE THE COUNT COMES FROM differs, and that is the only real asymmetry between the
 *     two "how many" cases. For the working gradient the swatch row IS the control and it
 *     lives on the hero (L2), so this window exports it exactly as laid out and offers no
 *     count. A set has no composed row — it is other people's gradients — so it gets one
 *     stepper and the rule places them.
 *   • What else changes per subject is small and named inline: a set has no Copy (no single
 *     text form), gets a .zip where one gradient gets one file unless the format bundles,
 *     carries the `.ai`/`.idml` lossy notice on the ramp side only (the swatches side
 *     reduces nothing), and the image row is a contact sheet of ramps or a sheet of
 *     labelled swatch chips.
 *
 * THE LIST IS AN ACCORDION, ONE SECTION OPEN (owner, 2026-09-09: "users will find the
 * export overwhelming with the long list of options"). Measured before the change: the Ramp
 * subject showed twenty formats across four always-open sections, plus the profile block and
 * the image block — about twenty-seven rows, nothing recommended, and no way to skip the
 * formats you will never use. It is a format CATALOGUE presented as a menu of actions. Three
 * things fix that and none of them removes a format:
 *
 *   1. AGAIN — the last few exports, at the top, one click each. The app already recorded
 *      them (`exportActions.ts`, shown on the Export icon's hover flyout); they were simply
 *      not in the WINDOW, which is where someone who has done this before is looking.
 *   2. The four group headers already say what each group is FOR, so they became the choice:
 *      closed by default, one open at a time, and the one that opens is the one holding your
 *      last export. Twenty visible rows become two to eight.
 *
 *   3. ONE ACTION PER ROW, ON ONE GRID. The row IS the download, and Copy is a small icon
 *      beside it, only for the formats that have a text form. The glyph is the colour
 *      picker's `CopyGlyph` rather than a new one (owner, 2026-09-09: "we have a copy icon
 *      in the main color picker that you can use"). Every row then shares an anatomy —
 *      label, `EXT_COL`, glyph, `COPY_SLOT` — with both fixed columns HELD OPEN whether or
 *      not that row fills them, so a binary format with no Copy button does not sit 28 px
 *      wider than its neighbour and drag its extension out of line with theirs. The
 *      extension lives in that column and nowhere else: the registry's labels carry it
 *      ("Adobe swatches .ase") for hosts that show a bare list, and `labelWithoutExt` takes
 *      it back out here.
 *
 * The output profile is a section like the others with its value on the header — a setting
 * almost nobody touches, previously sitting between the formats and the image row at full
 * weight. The image row stays open: it is one row and it is what most people came for, and
 * it takes the same shape as a format row so there is one row anatomy in the window.
 *
 * The doing lives in `exportActions.ts` (`runExport`, `runSetExport`, `runSetImage`),
 * shared with the hero's hover flyout of recent exports, so the two surfaces cannot drift.
 * This file is only the full window. It hangs off the hero BAND, not the card — the card
 * clips its children (2026-09-07).
 *
 * PHONE (Phase F, 2026-09-10): a full-screen SHEET, and the `positionClass` the host passes
 * is ignored. Both hosts anchor a 360 px window in a corner and both ran it off the screen
 * at 390; where it came from does not change the answer, so the branch is here rather than
 * two `phone ?` strings at the call sites. `fixed` inside `env(safe-area-inset-*)`, its own
 * scroll, and the rows that carried fixed pairs — the subject segments, the swatch stepper,
 * the PNG W × H — wrap. The × stays where it was, at the top right.
 *
 * @see docs/adr/0115-the-shell-on-a-phone.md
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formatsFor, type ExportFormatDef, type ExportSubject } from '../../palette/core/exportFormats';
import { runExport, runSetExport, runSetImage, setLossyCount, useRecentExports, exportActionLabel } from './exportActions';
import { AI_STOP_LIMIT, stopBudgetOf } from '../../palette/core/exportFormats';
import { PALETTE_MAX, PALETTE_MIN, clampCount } from '../../palette/core/paletteSample';
import type { Favient } from '../../palette/store/favientsStore';
import type { RGB } from '../../palette/core/oklab';
import { safeLocalGet, safeLocalSet } from '../../store/safeLocalStorage';
import { Floating } from './ui/Floating';
import { Icon } from './ui/Icon';
import { useIsPhone } from './useIsPhone';
import { ZoneLabel } from './ui/ZoneLabel';
// The copy glyph is the colour picker's, not a second drawing of the same idea (owner,
// 2026-09-09: "we have a copy icon in the main color picker that you can use"). It is a
// 16-unit stroke glyph in `currentColor` like the rest of the v2 set, so it sits inside
// V6 without the icon set growing a near-duplicate of a drawing that already exists.
import { CopyGlyph } from '../../components/gradient/pickerIcons';

const GROUPS: { title: string; keys: string[] }[] = [
  { title: 'For the web', keys: ['css', 'cssvars', 'svg', 'tw', 'tokens', 'hex', 'json', 'js'] },
  { title: 'For design apps', keys: ['ase', 'grd', 'ai', 'idml', 'gpl', 'pdn'] },
  { title: 'For fractal + 3D apps', keys: ['map', 'ggr', 'cpt', 'ugr', 'c4d', 'blender'] },
  { title: 'For code + data', keys: ['csv', 'py'] },
];

/** The output colour profiles, in the order the strip used to cycle them. */
const PROFILES: { id: 'srgb' | 'linear' | 'aces_inverse'; label: string; title: string }[] = [
  { id: 'srgb', label: 'sRGB', title: 'Standard display colours' },
  { id: 'linear', label: 'Linear', title: 'Linear light — for render engines and compositing' },
  { id: 'aces_inverse', label: 'ACES', title: 'ACES inverse — for an ACES-managed pipeline' },
];

/** The section the output profile occupies in the accordion — not a format group, but the
 *  same affordance, so it stops competing with the formats for attention. */
const SETTINGS_SECTION = 'Settings';

/** The Settings category's values, remembered like the open category is. Stops is the
 *  override for every format that reduces (empty = each format's own budget); the two PNG
 *  numbers size the strip. */
const SETTINGS_KEY = 'gx.v2.exportSettings';
interface ExportSettings { budget: number | null; pngW: number; pngH: number }
const DEFAULT_SETTINGS: ExportSettings = { budget: null, pngW: 1024, pngH: 64 };
const readSettings = (): ExportSettings => {
  try {
    const v = JSON.parse(safeLocalGet(SETTINGS_KEY) ?? 'null') as Partial<ExportSettings> | null;
    if (!v || typeof v !== 'object') return DEFAULT_SETTINGS;
    const num = (x: unknown, min: number, max: number, fallback: number) =>
      typeof x === 'number' && Number.isFinite(x) ? Math.max(min, Math.min(max, Math.round(x))) : fallback;
    return {
      budget: typeof v.budget === 'number' && Number.isFinite(v.budget) ? Math.max(2, Math.min(256, Math.round(v.budget))) : null,
      pngW: num(v.pngW, 1, 8192, DEFAULT_SETTINGS.pngW),
      pngH: num(v.pngH, 1, 8192, DEFAULT_SETTINGS.pngH),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

/** A small number field. Blank is allowed and MEANS something on the stop budget (each
 *  format's own), so the empty string is a state this holds rather than coerces to zero. */
const NumField: React.FC<{
  value: number | null;
  onChange: (n: number | null) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  title?: string;
  ariaLabel: string;
  width?: string;
}> = ({ value, onChange, placeholder, min = 1, max = 8192, title, ariaLabel, width = 'w-16' }) => (
  <input
    type="number"
    inputMode="numeric"
    min={min}
    max={max}
    value={value === null ? '' : value}
    placeholder={placeholder}
    title={title}
    aria-label={ariaLabel}
    onChange={(e) => {
      const raw = e.target.value.trim();
      if (raw === '') return onChange(null);
      const n = Number(raw);
      onChange(Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : null);
    }}
    className={`${width} h-7 px-1.5 rounded-lg border border-line/20 bg-transparent text-[13px] font-mono text-fg text-right outline-none focus:border-accent-400`}
  />
);

/** WHICH CATEGORY IS OPEN, remembered across sessions (owner, 2026-09-10: "the accordion
 *  should remember, this is one area where a user is likely to only require a few paths").
 *  A person who exports .ase every time should not reopen that category every time. The
 *  empty string is a REMEMBERED CLOSE, not "nothing stored" — someone who shut every
 *  category meant it, and gets it back that way. An unknown title (a renamed group) falls
 *  through to the last-export rule below rather than opening on nothing. */
const SECTION_KEY = 'gx.v2.exportSection';

/** Which group holds a format key, or null. */
const groupOf = (key: string): string | null => GROUPS.find((g) => g.keys.includes(key))?.title ?? null;

/** A segment of the subject / profile controls. Accent means "this one" (V3). */
const Segment: React.FC<{ on: boolean; title: string; onClick: () => void; children: React.ReactNode; data?: string }> = ({
  on,
  title,
  onClick,
  children,
  data,
}) => (
  <button
    type="button"
    className={`px-2.5 h-7 text-[13px] ${on ? 'bg-accent-400/15 text-accent-300' : 'text-fg-muted hover:text-fg'}`}
    title={title}
    onClick={onClick}
    data-gx-subject={data}
    data-on={on ? '' : undefined}
  >
    {children}
  </button>
);

/** THE CATEGORY BAND (owner, 2026-09-09: "a lighter strip behind the category names").
 *  A resting tint one step up from the floating surface, so the window reads as bands of
 *  formats under labelled strips rather than one column of similar-weight rows. Every
 *  category name in the window wears it — the accordion heads, Again, As an image — or the
 *  ones that are not accordion heads would read as a different kind of thing. */
const BAND = 'w-full flex items-center gap-2 h-7 px-2 rounded-lg bg-line/[0.06]';

/** THE EXTENSION COLUMN (owner, 2026-09-09: "there's a little column for the extension, we
 *  should make that a thing"). A fixed width on EVERY row of the window — formats, Again,
 *  the image — so the extensions start at one x and the download glyphs after them do too.
 *  Reserved even when a row has nothing to put in it, because a column that collapses on
 *  some rows is a hint, not a column. Sized for the longest the registry writes (`.idml`,
 *  `.json`) with room to spare; it truncates rather than pushing the glyph out of line. */
const EXT_COL = 'w-10 shrink-0 text-[11px] text-fg-dim truncate';

/** The Copy slot, held open on every row of the window whether or not it holds a button —
 *  the same reason `EXT_COL` is. A row that drops it is 28 px wider, and everything to its
 *  left, the extension column included, shifts with it. */
const COPY_SLOT = 'w-7 h-7 shrink-0';

/** THE NOTE STRIP (owner, 2026-09-10). Every open category ends in a reserved line of this
 *  height, empty until a row that has something to say is hovered — so the note appears in
 *  space that was already there and NOTHING moves: not the rows above it, not the categories
 *  below it, and not the window. The old notice lived inside the row and pushed everything
 *  under it down the moment it rendered. */
const NOTE_STRIP = 'h-4 px-1 text-[11px] leading-4 text-fg-muted truncate';

/** What a lossy bundle costs, in as few words as it takes (owner, 2026-09-10 — the line
 *  used to read "2 of 12 use more than 40 colour stops, so they export simplified. Most apps
 *  cap stops similarly"). The count is what you need; the lecture is not. */
const lossyNote = (n: number, stops: number): string => `${n} gradient${n === 1 ? '' : 's'} reduced to ${stops} colour stops`;

/** The label with its extension REMOVED, because the column carries it now: the registry
 *  writes "Adobe swatches .ase" and "Fractint .map" for hosts that show a bare list (the old
 *  shell's Extras `<select>`, where "Fractint" alone would be worse), so this is a display
 *  decision local to this window rather than a rename in `exportFormats.ts`. Labels that
 *  never carried one — "CSS variables", "Hex list (256)", "Paint.NET" — pass through. */
const labelWithoutExt = (label: string, ext: string): string => {
  const needle = `.${ext}`.toLowerCase();
  const i = label.toLowerCase().indexOf(needle);
  if (i < 0) return label;
  // Only when it stands on its own: ".ai" inside a hypothetical ".aiff" is not this label's
  // extension. Written with indexOf rather than a RegExp built from a TEMPLATE LITERAL: the
  // first cut was, and an escape like the one for whitespace collapses in the template
  // before the RegExp ever sees it, so the pattern matched nothing and every design-app row
  // kept saying its extension twice. It read correctly and did nothing.
  const after = label[i + needle.length];
  if (after && /[a-z0-9]/i.test(after)) return label;
  return `${label.slice(0, i).trimEnd()} ${label.slice(i + needle.length).trimStart()}`.trim() || label;
};

/** An accordion header: what the section is for, how much is in it, and a chevron. */
const SectionHead: React.FC<{ title: string; note?: string; open: boolean; onClick: () => void }> = ({ title, note, open, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    data-gx-section={title}
    data-open={open ? '' : undefined}
    className={`${BAND} hover:bg-line/[0.12] transition-colors`}
  >
    <ZoneLabel className="flex-1 text-left">{title}</ZoneLabel>
    {note && <span className="text-[13px] text-fg-dim tabular-nums">{note}</span>}
    <Icon name={open ? 'chevronDown' : 'chevronRight'} size={14} />
  </button>
);

export const ExportMenu: React.FC<{
  ramp: RGB[];
  name: string;
  onClose: () => void;
  positionClass?: string;
  /** The gradient's output colour profile and its setter (C.15: an export concern, so it
   *  lives here rather than on the strip). */
  colorSpace?: 'srgb' | 'linear' | 'aces_inverse';
  onColorSpace?: (id: 'srgb' | 'linear' | 'aces_inverse') => void;
  /** Export a SET instead of the working gradient (the set rail's chip menu). `ramp` and
   *  `name` are then unused for the output; `name` still titles the window. */
  set?: Favient[];
  /** The swatch row as composed on the hero — what the SWATCHES subject exports for a
   *  single gradient, verbatim. Empty (a set, or a hero with no palette) means the subject
   *  falls back to a count. */
  palette?: RGB[];
}> = ({
  ramp,
  name,
  onClose,
  positionClass = 'absolute right-4 top-12 z-40',
  colorSpace,
  onColorSpace,
  set,
  palette = [],
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const phone = useIsPhone();
  const isSet = !!set;
  // The window's ceiling is MEASURED, not a fraction of the viewport. Both call sites
  // position it absolutely inside a container the page has already pushed down (the hero's
  // hangs at top-[56px], the set's at top-10 of the GROUND, which starts below the hero), so
  // a flat `max-h-[70vh]` is a ceiling on the wrong number: measured 2026-09-09 with the set
  // window at y=345 in a 930 px viewport, 70vh let it run 66 px past the bottom edge with no
  // way to reach the last rows. Height only — the top never moves, so this cannot feed back.
  const [maxH, setMaxH] = useState<number>(() => (typeof window === 'undefined' ? 600 : Math.round(window.innerHeight * 0.7)));
  useEffect(() => {
    const measure = () => {
      const top = ref.current?.getBoundingClientRect().top ?? 0;
      setMaxH(Math.max(200, Math.round(window.innerHeight - top - 16)));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  const [subject, setSubject] = useState<ExportSubject>('ramp');
  // A set's swatch count starts at the hero's own palette size when there is one, so the
  // two subjects agree on what "a palette" means for this person until they say otherwise.
  const [count, setCount] = useState(() => clampCount(palette.length || 7));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.setTimeout(() => document.addEventListener('pointerdown', onDown, true), 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [onClose]);

  // AGAIN — the last few exports. A SET export is deliberately never recorded as a recent
  // (`exportActions.ts`), so these are the working gradient's and the block only belongs in
  // the working gradient's window.
  const recents = useRecentExports();
  const again = isSet ? [] : recents;

  // WHICH SECTION OPENS FIRST is the window's only memory, and it costs nothing because the
  // recents already carry it: the group holding your last export. With no history, the first
  // group — so the window never opens as a column of closed headers with nothing to read.
  const [open, setOpen] = useState<string | null>(() => {
    const stored = safeLocalGet(SECTION_KEY);
    if (stored === '') return null; // a remembered close
    if (stored && (stored === SETTINGS_SECTION || GROUPS.some((g) => g.title === stored))) return stored;
    const last = recents.find((a) => a.kind !== 'png') as { key: string } | undefined;
    return (last && groupOf(last.key)) || GROUPS[0].title;
  });
  const toggle = (title: string) =>
    setOpen((o) => {
      const next = o === title ? null : title;
      safeLocalSet(SECTION_KEY, next ?? '');
      return next;
    });
  /** What the open category's note strip is showing, or null. One at a time, because one
   *  category is open at a time and one row is hovered at a time. */
  const [notice, setNotice] = useState<string | null>(null);
  const [settings, setSettings] = useState<ExportSettings>(readSettings);
  const saveSettings = (next: ExportSettings) => {
    setSettings(next);
    safeLocalSet(SETTINGS_KEY, JSON.stringify(next));
  };

  const swatches = subject === 'swatches';
  // For one gradient the row on the hero is the palette, verbatim. For a set the stepper is.
  const n = isSet ? count : palette.length;

  const runOpts = { budget: settings.budget ?? undefined, pngW: settings.pngW, pngH: settings.pngH };
  const copy = (f: ExportFormatDef) => runExport({ kind: 'copy', key: f.key, subject }, ramp, name, palette, runOpts);
  const download = (f: ExportFormatDef) =>
    set
      ? runSetExport(f.key, set, name, subject, count, settings.budget ?? undefined)
      : runExport({ kind: 'download', key: f.key, subject }, ramp, name, palette, runOpts);
  const image = () => (set ? void runSetImage(set, name, subject, count) : runExport({ kind: 'png', subject }, ramp, name, palette, runOpts));

  const formats = formatsFor(subject);
  // The sections that have anything in them under THIS subject. Switching to Swatches
  // empties "For fractal + 3D apps" outright, so the open section can vanish under the
  // pointer; the effect below re-homes the accordion rather than leaving it on nothing.
  const sections = useMemo(() => {
    const known = new Set(GROUPS.flatMap((g) => g.keys));
    const out = GROUPS.map((g) => ({
      title: g.title,
      formats: g.keys.map((k) => formats.find((f) => f.key === k)).filter((f): f is ExportFormatDef => !!f),
    })).filter((g) => g.formats.length > 0);
    const rest = formats.filter((f) => !known.has(f.key));
    if (rest.length) out.push({ title: 'More', formats: rest });
    return out;
  }, [formats]);
  // Re-home the accordion only when the OPEN SECTION HAS GONE (switching to Swatches empties
  // "For fractal + 3D apps" outright, so it can vanish under the pointer). `open === null` is
  // a deliberate close and must be left alone: without that guard, clicking the open header
  // closed it and this immediately re-opened the FIRST section, so a section could never be
  // shut. Measured 2026-09-09 — and neither smoke caught it, because the section they close
  // first happens to be the one this would re-open.
  useEffect(() => {
    setNotice(null);
  }, [open, subject]);
  useEffect(() => {
    if (open === null || open === SETTINGS_SECTION) return;
    if (!sections.some((x) => x.title === open)) setOpen(sections[0]?.title ?? null);
  }, [sections, open]);

  const row = (f: ExportFormatDef) => {
    // A set in a format that BUNDLES is one file; in any other format it is one file per
    // gradient inside a .zip. Which formats bundle depends on the subject: .ai/.idml/.ugr
    // group gradients, .ase groups swatch lists. Say which on the button, so the download
    // is not a surprise.
    const bundles = isSet && !!(swatches ? f.collectionSwatches : f.collection);
    const lossy = isSet && bundles ? setLossyCount(set!, f.key, subject, settings.budget ?? undefined) : 0;
    return (
      <div
        key={f.key}
        data-gx-format={f.key}
        data-gx-lossy={lossy > 0 ? lossy : undefined}
        onPointerEnter={() => setNotice(lossy > 0 ? lossyNote(lossy, stopBudgetOf(f.key, settings.budget ?? undefined) ?? AI_STOP_LIMIT) : null)}
        onPointerLeave={() => setNotice(null)}
      >
        <div className="flex items-center gap-1">
          {/* THE ROW IS THE DOWNLOAD. It carries the glyph and the extension it will write, so
              the action is stated rather than hidden behind a whole-row click nobody expects
              — and one action per row is what let the two labelled buttons go. */}
          <button
            type="button"
            onClick={() => download(f)}
            data-gx-download={f.key}
            title={
              isSet
                ? bundles
                  ? `All ${set!.length} in one .${f.ext}`
                  : `${set!.length} files in a .zip`
                : `Download .${f.ext}${swatches ? ` — ${n} swatches` : ''}`
            }
            className="flex-1 min-w-0 flex items-center gap-2 h-7 px-1 rounded-lg text-left hover:bg-line/10 transition-colors group"
          >
            <span className="flex-1 min-w-0 truncate text-[13px] text-fg">
              {labelWithoutExt((swatches && f.swatchLabel) || f.label, f.ext)}
            </span>
            {/* For a set the column says what LANDS, which is not always this format's own
                extension: a format that bundles writes one file, everything else a .zip. */}
            <span className={EXT_COL}>{isSet && !bundles ? '.zip' : `.${f.ext}`}</span>
            <span className="text-fg-dim group-hover:text-fg">
              <Icon name="download" size={14} />
            </span>
          </button>
          {/* Copy only where there IS a text form: never a binary format, never a set (which
              has no single thing to put on the clipboard). The SLOT is held open either way,
              or a binary row would be wider than its neighbours and its extension column
              would sit 28 px further right than theirs. */}
          {!isSet && !f.binary ? (
            <button
              type="button"
              onClick={() => copy(f)}
              data-gx-copy={f.key}
              title={`Copy ${(swatches && f.swatchLabel) || f.label} to the clipboard`}
              aria-label={`Copy ${(swatches && f.swatchLabel) || f.label}`}
              className={COPY_SLOT + ' grid place-items-center rounded-lg text-fg-muted hover:text-fg hover:bg-line/10 transition-colors'}
            >
              <CopyGlyph size={14} />
            </button>
          ) : (
            <span className={COPY_SLOT} />
          )}
        </div>
      </div>
    );
  };

  const step = (d: number) => setCount((c) => clampCount(c + d));

  return (
    // `[&>*]:shrink-0` is load-bearing, not tidiness: this is a flex COLUMN that scrolls,
    // so once the content is taller than max-h the default `flex-shrink: 1` squashes every
    // child instead of scrolling. Measured 2026-09-09: the subject segments came out 2 px
    // tall (their two borders) with the buttons clipped by their own `overflow-hidden`,
    // and the group headers below painted over where they should have been.
    <Floating
      ref={ref}
      /* PHONE (Phase F): a full-screen SHEET, and `positionClass` is deliberately ignored —
         both hosts (the hero's `right-2.5 top-[56px]`, the ground's `left-6 top-10`) put a
         360 px window off both axes at 390, and the answer is the same whichever opened it.
         `fixed` inside the safe area, its own scroll, the × already at the top right. The
         one thing kept from the desktop window is `[&>*]:shrink-0`, which is what stops a
         scrolling flex column squashing its children instead of scrolling (see below). */
      className={`${phone ? 'fixed left-0 right-0 z-40 rounded-none border-x-0' : `${positionClass} w-[360px]`} overflow-y-auto p-4 flex flex-col gap-3 [&>*]:shrink-0`}
      style={phone ? { top: 'env(safe-area-inset-top)', bottom: 'env(safe-area-inset-bottom)' } : { maxHeight: maxH }}
      data-gx-export
    >
      <div className="flex items-center">
        <b className="text-[13px] text-fg">
          Export “{name}”{isSet && <span className="font-normal text-fg-muted"> · {set!.length} gradient{set!.length === 1 ? '' : 's'}</span>}
        </b>
        <button className="ml-auto text-fg-muted hover:text-fg" onClick={onClose} title="Close (Esc)">
          <Icon name="close" />
        </button>
      </div>

      {/* THE SUBJECT (§8b item 5): which face of the gradient is exported.
          PHONE: `flex-wrap`, so a long "Swatches · 12" drops to its own line rather than
          pushing the pill past the sheet's edge. */}
      <div className={`inline-flex self-start border border-line/20 rounded-lg overflow-hidden ${phone ? 'flex-wrap max-w-full' : ''}`} data-gx-export-subject>
        <Segment on={!swatches} title="The gradient itself — a continuous ramp" onClick={() => setSubject('ramp')} data="ramp">
          Ramp
        </Segment>
        <Segment
          on={swatches}
          title={isSet ? 'Each gradient as a palette of colours' : 'The palette you laid out on the hero'}
          onClick={() => setSubject('swatches')}
          data="swatches"
        >
          Swatches{!isSet && palette.length > 0 && <span className="text-fg-muted"> · {palette.length}</span>}
        </Segment>
      </div>

      {swatches && isSet && (
        <div className={`flex items-center gap-2 ${phone ? 'flex-wrap' : ''}`}>
          <ZoneLabel className="flex-1">Swatches per gradient</ZoneLabel>
          <div className="inline-flex items-center border border-line/20 rounded-lg overflow-hidden" data-gx-swatch-count>
            <button
              type="button"
              className="px-2 h-7 text-[13px] text-fg-muted hover:text-fg disabled:opacity-40"
              onClick={() => step(-1)}
              disabled={count <= PALETTE_MIN}
              title="One fewer"
            >
              −
            </button>
            <span className="px-2 text-[13px] font-mono text-fg tabular-nums">{count}</span>
            <button
              type="button"
              className="px-2 h-7 text-[13px] text-fg-muted hover:text-fg disabled:opacity-40"
              onClick={() => step(1)}
              disabled={count >= PALETTE_MAX}
              title="One more"
            >
              +
            </button>
          </div>
        </div>
      )}
      {swatches && !isSet && (
        <div className="text-[13px] text-fg-muted -mt-1">
          {palette.length
            ? `The ${palette.length} swatches on the hero, as you laid them out. Change them there.`
            : 'This gradient has no swatch row yet — add one on the hero.'}
        </div>
      )}

      {again.length > 0 && (
        <div data-gx-export-again>
          <div className={BAND}>
            <ZoneLabel className="flex-1">Again</ZoneLabel>
          </div>
          <div className="pt-1 px-1">
          {again.map((a) => (
            <div key={exportActionLabel(a)} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => runExport(a, ramp, name, palette, runOpts)}
                className="flex-1 min-w-0 flex items-center gap-2 h-7 px-1 rounded-lg text-left text-[13px] text-fg hover:bg-line/10 transition-colors group"
              >
                <span className="flex-1 min-w-0 truncate">{exportActionLabel(a)}</span>
                {/* Nothing to say — an Again row already names its own format — but both
                    columns are held open so the row lines up with every other one. */}
                <span className={EXT_COL} />
                <span className="text-fg-dim group-hover:text-fg">
                  {a.kind === 'copy' ? <CopyGlyph size={14} /> : <Icon name="download" size={14} />}
                </span>
              </button>
              <span className={COPY_SLOT} />
            </div>
          ))}
          </div>
        </div>
      )}

      {sections.map((sec) => (
        <div key={sec.title}>
          <SectionHead title={sec.title} note={String(sec.formats.length)} open={open === sec.title} onClick={() => toggle(sec.title)} />
          {open === sec.title && (
            <div className="pt-1 px-1">
              {sec.formats.map(row)}
              <div className={NOTE_STRIP} data-gx-note>
                {notice}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* SETTINGS (owner, 2026-09-10: "we can merge the stop budget into output profile and
          name it 'settings'"). What the profile category was, plus the number every reducing
          format used to decide privately. The profile belongs to the working DOCUMENT, so it
          is gradient-only; the stop budget matters more on a SET, which is where the lossy
          note lives — so the category itself shows for both and its contents do not. */}
      <div>
        <SectionHead
          title={SETTINGS_SECTION}
          note={settings.budget ? `${settings.budget} stops` : PROFILES.find((p) => p.id === colorSpace)?.label}
          open={open === SETTINGS_SECTION}
          onClick={() => toggle(SETTINGS_SECTION)}
        />
        {open === SETTINGS_SECTION && (
          <div className="pt-1 px-1 flex flex-col gap-2" data-gx-settings>
            {!isSet && colorSpace && onColorSpace && (
              <div className="flex items-center gap-2">
                <ZoneLabel className="flex-1">Output profile</ZoneLabel>
                <div className="inline-flex border border-line/20 rounded-lg overflow-hidden" data-gx-output-profile>
                  {PROFILES.map((p) => (
                    <Segment key={p.id} on={colorSpace === p.id} title={p.title} onClick={() => onColorSpace(p.id)}>
                      {p.label}
                    </Segment>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <ZoneLabel className="flex-1">Colour stops</ZoneLabel>
              <NumField
                value={settings.budget}
                onChange={(budget) => saveSettings({ ...settings, budget })}
                placeholder="Auto"
                min={2}
                max={256}
                ariaLabel="Colour stops"
                title="How many stops the formats that reduce may write. Blank leaves each format its own."
              />
            </div>
            <div className="text-[11px] leading-snug text-fg-muted" data-gx-budget-note>
              {settings.budget
                ? `.ai .idml .ase .grd .svg .ugr write up to ${settings.budget} stops.`
                : `Blank = each format’s own: 40 for .ai, .idml, .ase and .grd, 32 for .svg, 64 for .ugr.`}
            </div>
          </div>
        )}
      </div>
      {/* The image stays OPEN: one row, and the thing most people came for. */}
      <div>
        <div className={BAND}>
          <ZoneLabel className="flex-1">As an image</ZoneLabel>
        </div>
        <div className="pt-1 px-1">
          <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={image}
            data-gx-image
            title="Download a PNG"
            className="flex-1 min-w-0 flex items-center gap-2 h-7 px-1 rounded-lg text-left hover:bg-line/10 transition-colors group"
          >
            <span className="flex-1 min-w-0 truncate text-[13px] text-fg">
              {swatches ? 'Swatch sheet' : isSet ? 'Contact sheet' : 'PNG strip (1024 × 64)'}
            </span>
            <span className={EXT_COL}>.png</span>
            <span className="text-fg-dim group-hover:text-fg">
              <Icon name="download" size={14} />
            </span>
          </button>
          <span className={COPY_SLOT} />
          </div>
          {/* THE STRIP'S SIZE, editable (owner, 2026-09-10: "the 1024 x 64 comment turn into
              two textfields"). It was a parenthesis in the row's label stating a number
              nobody could change. Only the strip has one — a contact sheet lays itself out
              from the set's count, a swatch sheet from the palette's. */}
          {!swatches && !isSet ? (
            <div className={`flex items-center gap-1.5 px-1 pt-1.5 ${phone ? 'flex-wrap' : ''}`} data-gx-png-size>
              <NumField
                value={settings.pngW}
                onChange={(pngW) => saveSettings({ ...settings, pngW: pngW ?? DEFAULT_SETTINGS.pngW })}
                ariaLabel="PNG width"
                title="Width in pixels"
              />
              <span className="text-[13px] text-fg-dim">×</span>
              <NumField
                value={settings.pngH}
                onChange={(pngH) => saveSettings({ ...settings, pngH: pngH ?? DEFAULT_SETTINGS.pngH })}
                ariaLabel="PNG height"
                title="Height in pixels"
              />
              <span className="flex-1 text-[11px] leading-snug text-fg-muted">For a full-size image use Wallpaper.</span>
            </div>
          ) : (
            <div className="text-[11px] leading-snug text-fg-muted px-1 pt-1">
              {swatches
                ? isSet
                  ? 'Every palette as labelled chips, one row per gradient.'
                  : 'The palette as labelled chips, hex included.'
                : 'A grid of the whole set, names included.'}
            </div>
          )}
        </div>
      </div>
    </Floating>
  );
};

export default ExportMenu;
