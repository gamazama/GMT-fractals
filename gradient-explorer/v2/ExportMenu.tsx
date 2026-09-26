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
 *     stepper and the hero's current layout rule places them (Even / Perceptual / Stops,
 *     named in the stepper's title; 2026-09-24 — it was always Even).
 *   • What else changes per subject is small and named inline: a set has no Copy (no single
 *     text form), gets a .zip where one gradient gets one file unless the format bundles
 *     (a set of ONE gets its member's own file, 2026-09-24),
 *     and gets no size fields on its GMT gradient PNG (a set keeps the automatic band layout).
 *     The Swatches subject ends in one row, the swatch sheet (labelled chips + hex).
 *   • THE LOSSY NOTICE is the same for one gradient and for a set, ramp side only (the
 *     swatches side reduces nothing): a format that flattens visible detail says how many
 *     gradients it reduced (one gradient: just "Reduced to N colour stops"), on hover, in the
 *     category's NOTE_STRIP, and in the text preview's header line, which keyboard focus and a
 *     phone's hold open where no hover reaches. A set warns on the
 *     formats that bundle it into one file; one gradient warns on every format that reduces
 *     it. Until 2026-09-13 only a set could warn (`lossy = isSet && bundles ? … : 0`), so a
 *     single complex gradient went to Illustrator simplified and silent — the old shell's
 *     Extras panels had said so (grep `aiReductionError`).
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
 *      not in the WINDOW, which is where someone who has done this before is looking. Since
 *      2026-09-14 it sits directly under the subject switch, above For GMT (owner: it had
 *      drifted below the GMT band), each row names its FORMAT with the extension in the column,
 *      and the list holds each action once (`exportActionId`) — it had shown ".css" twice.
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
 *      it back out here. A Copy confirms where it was clicked, as the picker's own copy
 *      button does: the glyph is a ✓ for a second, with no toast (2026-09-16, `copiedId`).
 *
 * THE TEXT PREVIEW (parity row O4, owner-approved 2026-09-23). Hover a row that writes text and
 * the text appears in a panel BESIDE the window — the exact string its Copy puts on the clipboard,
 * from `exportActions.exportText` (a set's bundle from `setExportText`), never built here. Nothing
 * is added to the row; binary rows show nothing. A phone holds the row instead (a bottom panel).
 * The whole design, and why a hold, is the comment above `previewProps`.
 *
 * SETTINGS is a section like the others with its value on the header ("N stops"): the stop
 * budget, a setting almost nobody touches. It held the output colour profile too until
 * 2026-09-24 (owner: removed — it changed no file here and a click on it baked the gradient).
 * It is Ramp only: nothing in it acts on swatches.
 *
 * WHAT IT REMEMBERS: the open section (`SECTION_KEY`), the subject (`SUBJECT_KEY`, 2026-09-24),
 * the stop budget and the GMT PNG's size (`exportActions.readExportSettings`), and the last
 * exports (Again). A SET's swatches follow the hero's layout rule (`rule`), and a set of ONE
 * downloads its member's own file rather than a .zip of one.
 *
 * LEAVING IT: Escape and a press outside go through the master `useDismiss`, so Escape is taken
 * through the shortcut registry and the shell's Esc chain leaves the tray face under the window
 * alone; the window's own opener toggles it rather than counting as outside. See the comment
 * above the two `useDismiss` calls.
 *
 * THE ORDER, top to bottom (2026-09-14): title · the Ramp | Swatches switch (and, under Swatches,
 * its one line or the set's stepper) · Again · For GMT (Ramp only) · "For other software" and the
 * format accordion (Web · Design apps · Fractal + 3D apps · Code + data — no "For" on each, owner
 * 2026-09-24) · Settings (Ramp only) · the swatch sheet (Swatches only).
 *
 * THE GMT GRADIENT FILE (ADR-0123 Decision 5 and its Update 2026-09-14). Under the Ramp subject a
 * band "For GMT" holds the Explorer's own save — ONE row, "GMT gradient" .png, for one gradient and
 * for a set alike (the .json row went; the loader still reads JSON). It writes the gradient itself
 * (config, name, credit, source; a set's groups), not the 256-step ramp, so it is the only row
 * here that comes back exactly. For ONE gradient the PNG's size sits under the row (`SizeField`,
 * `pngW` × `pngH`): the width snaps to a multiple of 256 so a metadata-stripped copy still reads
 * back exact colours, the height is free. The "As an image" section that held those fields is
 * gone — its PNG strip and the set's contact sheet are superseded by this file. Everything below
 * the band is an export to OTHER software, lossy by nature, under a caption that says so. The band
 * is deliberately not an accordion section (`data-gx-section`): it is always open, and a section
 * is a thing you choose between. Its row keeps the window's one row anatomy — label, `EXT_COL`,
 * glyph, `COPY_SLOT`. Not under Swatches: the file carries the gradient, not a palette laid out
 * from it.
 *
 * The doing lives in `exportActions.ts` (`runExport`, `runSetExport`, `runSetSwatchSheet`),
 * shared with the hero's hover flyout of recent exports, so the two surfaces cannot drift.
 * This file is only the full window. It hangs off the hero BAND, not the card — the card
 * clips its children (2026-09-07).
 *
 * PHONE (Phase F, 2026-09-10): a full-screen SHEET, and the `positionClass` the host passes
 * is ignored. Both hosts anchor a 360 px window in a corner and both ran it off the screen
 * at 390; where it came from does not change the answer, so the branch is here rather than
 * two `phone ?` strings at the call sites. `fixed` inside `env(safe-area-inset-*)`, its own
 * scroll, and the rows that carried fixed pairs — the subject segments, the swatch stepper,
 * the GMT PNG's W × H — wrap. The × stays where it was, at the top right.
 *
 * @see docs/adr/0115-the-shell-on-a-phone.md
 */

import type { GradientConfig } from '../../types';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { formatsFor, getExportFormat, type ExportFormatDef, type ExportSubject } from '../../palette/core/exportFormats';
import {
  runExport,
  runSetExport,
  runSetSwatchSheet,
  runSetGradientFile,
  setLossyCount,
  gradientLossyCount,
  useRecentExports,
  exportActionId,
  exportActionParts,
  labelWithoutExt,
  readExportSettings,
  writeExportSettings,
  exportText,
  setExportText,
  setIsLoneFile,
  type ExportAction,
  type ExportSettings,
} from './exportActions';
import { Layer } from '../../components/ui/Layer';
import { useDismiss } from '../../hooks/useDismiss';
import { GRADIENT_PNG_MAX_SINGLE_HEIGHT, GRADIENT_PNG_MAX_WIDTH, GRADIENT_PNG_MIN_WIDTH, clampGradientPngHeight, snapGradientPngWidth } from '../../palette/core/gradientPng';
import { AI_STOP_LIMIT, stopBudgetOf } from '../../palette/core/exportFormats';
import { PALETTE_MAX, PALETTE_MIN, clampCount, type PaletteRule } from '../../palette/core/paletteSample';
import { useWorkingStore } from '../../palette/store/workingStore';
import type { Favient } from '../../palette/store/favientsStore';
import type { RGB } from '../../palette/core/oklab';
import { rampToCss, swatchesToCss } from '../../palette/core/gradientCss';
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

/** The four format groups. Their heads are what each is FOR, without the word (owner,
 *  2026-09-24: five "For"s in a column read as one; the caption "For other software" above them
 *  already says it). `was` is the title a group had before, so a remembered open section
 *  (`SECTION_KEY`) written under the old name still opens. */
const GROUPS: { title: string; was: string; keys: string[] }[] = [
  { title: 'Web', was: 'For the web', keys: ['css', 'cssvars', 'svg', 'tw', 'tokens', 'hex', 'json', 'js'] },
  { title: 'Design apps', was: 'For design apps', keys: ['ase', 'grd', 'ai', 'idml', 'gpl', 'pdn'] },
  { title: 'Fractal + 3D apps', was: 'For fractal + 3D apps', keys: ['map', 'ggr', 'cpt', 'ugr', 'c4d', 'blender'] },
  { title: 'Code + data', was: 'For code + data', keys: ['csv', 'py'] },
];

/** The Settings section of the accordion — not a format group, but the same affordance, so it
 *  does not compete with the formats for attention. It holds the stop budget. The output colour
 *  profile it also held went on 2026-09-24 (owner): every format here writes sRGB whatever it
 *  said, it read "Linear" for every catalogue pick (the GMT seam's stamp, not a choice), and a
 *  click on it baked the gradient. */
const SETTINGS_SECTION = 'Settings';

/** The Settings category's values and the GMT PNG's size are remembered in `exportActions.ts`
 *  (`readExportSettings`), so the hero's flyout repeats an export with the same ones. */

/**
 * THE GMT GRADIENT PNG'S SIZE FIELD (owner, 2026-09-14). A DRAFT while typing and a COMMIT on blur
 * or Enter, because the value is SNAPPED: a width is a multiple of 256, and a field that snapped on
 * every keystroke would turn the "5" of "512" into 256 before the "12" arrived. The committed value
 * is what the field shows once it lets go, so a 1000 typed reads back as 1024 — the size you get is
 * the size you see. A click on the download row blurs the field first, so it exports what was typed.
 */
const SizeField: React.FC<{ value: number; commit: (raw: number) => void; ariaLabel: string; title: string; data: string }> = ({
  value,
  commit,
  ariaLabel,
  title,
  data,
}) => {
  const [draft, setDraft] = useState<string | null>(null);
  const done = () => {
    if (draft === null) return;
    const n = Number(draft.trim());
    setDraft(null);
    if (draft.trim() !== '' && Number.isFinite(n)) commit(n);
  };
  return (
    <input
      type="number"
      inputMode="numeric"
      value={draft ?? value}
      title={title}
      aria-label={ariaLabel}
      data-gx-png-size-field={data}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={done}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      className="w-16 h-7 px-1.5 rounded-lg border border-line/20 bg-transparent text-[13px] font-mono text-fg text-right outline-none focus:border-accent-400"
    />
  );
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
 *  category meant it, and gets it back that way. A group's old title (`was`) opens it under
 *  its new one; any other unknown title falls through to the last-export rule below rather
 *  than opening on nothing. */
const SECTION_KEY = 'gx.v2.exportSection';

/** WHICH SUBJECT the window opens on, remembered beside the section (owner, 2026-09-24): someone
 *  who only ever exports swatches should not switch to them every time. Anything but
 *  `'swatches'` reads as the Ramp, so a fresh profile opens where it always did. */
const SUBJECT_KEY = 'gx.v2.exportSubject';

/** The palette rules by name, for the set's swatch stepper — the hero's words (`PaletteRow`). */
const RULE_NAME: Record<PaletteRule, string> = { even: 'Even', perceptual: 'Perceptual', stops: 'Stops' };

/** ASK-4: when fewer than this many pixels are left below where the host put the window, a host
 *  that passes `liftTo` gets it lifted to that line instead (the set's window under its button
 *  would otherwise open short, with most of its rows behind a scroll). */
const LIFT_ROOM = 480;

/** Which group holds a format key, or null. */
const groupOf = (key: string): string | null => GROUPS.find((g) => g.keys.includes(key))?.title ?? null;

/**
 * THE SUBJECT SEGMENTS, each showing the thing it exports (owner, 2026-09-11: "Ramp |
 * Swatches - should be full width, and their backgrounds should be either the gradient or
 * the swatches").
 *
 * They were two text pills in an `inline-flex` at the left of the window. Full width and
 * painted, the choice stops being a word and becomes the two pictures you are choosing
 * between — the continuous ramp against the same colours cut into steps.
 *
 * A label over a gradient of unknown lightness needs a floor under it, not a colour that
 * happens to work — but a scrim over the WHOLE segment is a floor that eats the picture:
 * over `snowstorm` (near-white) both faces came out the same grey and the choice went back
 * to being two words. So the floor is a PILL behind the label only, and the gradient is
 * full-bleed around it. The one you are not using is dimmed instead, which is what makes
 * the chosen face read forward.
 */
const SubjectSegment: React.FC<{
    on: boolean;
    title: string;
    background?: string;
    onClick: () => void;
    data: string;
    children: React.ReactNode;
}> = ({ on, title, background, onClick, data, children }) => (
    <button
        type="button"
        className={`relative flex-1 min-w-0 h-11 grid place-items-center overflow-hidden transition-shadow ${on ? 'ring-2 ring-inset ring-accent-300' : ''}`}
        style={background ? { backgroundImage: background } : undefined}
        title={title}
        onClick={onClick}
        data-gx-subject={data}
        data-on={on ? '' : undefined}
    >
        {/* dim the face you are not using — the gradient itself stays untouched on the one
            you are, which is the whole point of painting them */}
        {background && <span aria-hidden className={`absolute inset-0 transition-colors ${on ? '' : 'bg-surface-raised/55'}`} />}
        {!background && on && <span aria-hidden className="absolute inset-0 bg-accent-400/15" />}
        <span
            className={`relative inline-flex items-center rounded-full transition-colors ${
                background
                    ? `px-2.5 py-[3px] ${on ? 'bg-black/65 text-white' : 'bg-black/45 text-white/80'}`
                    : on ? 'text-accent-300' : 'text-fg-muted'
            } text-[13px] ${on ? 'font-semibold' : ''}`}
        >
            {children}
        </span>
    </button>
);

/** THE CATEGORY BAND (owner, 2026-09-09: "a lighter strip behind the category names").
 *  A resting tint one step up from the floating surface, so the window reads as bands of
 *  formats under labelled strips rather than one column of similar-weight rows. Every
 *  category name in the window wears it — the accordion heads, Again, For GMT — or the
 *  ones that are not accordion heads would read as a different kind of thing. */
const BAND = 'w-full flex items-center gap-2 h-7 px-2 rounded-lg bg-line/[0.06]';

/** THE EXTENSION COLUMN (owner, 2026-09-09: "there's a little column for the extension, we
 *  should make that a thing"). A fixed width on EVERY row of the window — formats, Again,
 *  GMT gradient, the swatch sheet — so the extensions start at one x and the download glyphs
 *  after them do too.
 *  Reserved even when a row has nothing to put in it, because a column that collapses on
 *  some rows is a hint, not a column. Sized for the longest the registry writes (`.idml`,
 *  `.json`) with room to spare; it truncates rather than pushing the glyph out of line. */
const EXT_COL = 'w-10 shrink-0 text-[11px] text-fg-dim truncate';

/** What the extension column SHOWS: the last segment. The two DCC scripts land on disk as
 *  `.c4d.py` and `.blender.py` (distinct, so they cannot overwrite each other), which the
 *  column cut to ".blende…"; what they ARE is a .py, and the row's label already names the
 *  host. Display only — the downloaded file keeps its full name. Takes `ext` with or without
 *  its leading dot. */
const extShown = (ext: string): string => `.${ext.split('.').pop()}`;

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
 *  cap stops similarly"). The count is what you need; the lecture is not — and for ONE
 *  gradient there is no count to give ("1 gradient reduced…" said nothing), so it is just what
 *  happens to it (2026-09-24). */
const lossyNote = (isSet: boolean, n: number, stops: number): string =>
  isSet ? `${n} gradient${n === 1 ? '' : 's'} reduced to ${stops} colour stops` : `Reduced to ${stops} colour stops`;

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

/**
 * WHAT A PREVIEW IS OF. `one`: an export of the working gradient (a format row or an Again row),
 * built by `exportText` from the same action and options its Copy / Download use. `set`: the one
 * file a set bundles into, built by `setExportText`. `id` names the ROW that asked (`format:` /
 * `again:` + the action's id), so the smoke can tell which row the panel belongs to.
 */
type PreviewReq =
  | { kind: 'one'; id: string; action: ExportAction; label: string; ext: string; note?: string | null }
  | { kind: 'set'; id: string; key: string; label: string; ext: string; note?: string | null };

/** The preview's display cap. Measured 2026-09-23 over the registry for ONE gradient: the longest
 *  text is .ggr, ~26,300 characters on 259 lines, so no single-gradient preview is ever cut — the
 *  cap is for SETS (200 gradients as .ai is 1.6 M characters). Cut at a line, never mid-line
 *  unless the first line alone is over the cap. */
const PREVIEW_MAX_LINES = 400;
const PREVIEW_MAX_CHARS = 40_000;
const previewSlice = (text: string): { shown: string; more: string | null } => {
  const lines = text.split('\n');
  if (text.length <= PREVIEW_MAX_CHARS && lines.length <= PREVIEW_MAX_LINES) return { shown: text, more: null };
  let k = 0;
  let chars = 0;
  while (k < lines.length && k < PREVIEW_MAX_LINES && chars + lines[k].length + (k ? 1 : 0) <= PREVIEW_MAX_CHARS) {
    chars += lines[k].length + (k ? 1 : 0);
    k++;
  }
  if (k === 0) return { shown: text.slice(0, PREVIEW_MAX_CHARS), more: `${(text.length - PREVIEW_MAX_CHARS).toLocaleString('en')} more characters` };
  const rest = lines.length - k;
  return { shown: lines.slice(0, k).join('\n'), more: `${rest.toLocaleString('en')} more line${rest === 1 ? '' : 's'}` };
};

/** Hover intent: a preview OPENS after this (so a pointer crossing the list does not flash one
 *  beside the window) and, once one is up, moving to another row switches at once. It CLOSES
 *  this long after the pointer leaves, which is what lets the pointer cross the window's padding
 *  into the panel to scroll it. */
const PREVIEW_OPEN_MS = 120;
const PREVIEW_CLOSE_MS = 220;
/** A touch held this long on a row shows its text instead of downloading (no hover on a phone). */
const LONG_PRESS_MS = 450;
/** The panel beside the window: at most this wide, at least `PREVIEW_MIN_W` or it goes below. */
const PREVIEW_MAX_W = 440;
const PREVIEW_MIN_W = 240;
const PREVIEW_GAP = 8;

export const ExportMenu: React.FC<{
  ramp: RGB[];
  name: string;
  onClose: () => void;
  positionClass?: string;
  /**
   * A viewport y to LIFT the window's top to when fewer than `LIFT_ROOM` px are left below
   * where `positionClass` put it (ASK-4, owner 2026-09-24: the set's window opens under its own
   * button, and at the hero window's line when the room below the rail is short). A desk only;
   * never lower than where the host put it. Absent → the window stays where it was put.
   */
  liftTo?: number;
  /**
   * How a SET lays out each member's swatches: the hero's current rule (Even / Perceptual /
   * Stops, owner 2026-09-24 — it was always Even). Absent → read live from the working store,
   * which is where the hero keeps it. Unused for one gradient (its row is already laid out).
   */
  rule?: PaletteRule;
  /** Export a SET instead of the working gradient (the set rail's chip menu). `ramp` and
   *  `name` are then unused for the output; `name` still titles the window. */
  set?: Favient[];
  /** The swatch row as composed on the hero — what the SWATCHES subject exports for a
   *  single gradient, verbatim. Empty (a set, or a hero with no palette) means the subject
   *  falls back to a count. */
  palette?: RGB[];
  /** The working gradient's catalogue origin + its config: an unmodified catalogue gradient's
   *  export name carries its credit (`exportActions.ts`). Unused for a set — each member's own. */
  origin?: unknown;
  config?: GradientConfig | null;
  /** The working gradient's provenance line, carried by the GMT gradient file. Unused for a set. */
  source?: string;
}> = ({
  ramp,
  name,
  onClose,
  positionClass = 'absolute right-4 top-12 z-40',
  liftTo,
  set,
  palette = [],
  origin,
  config,
  source,
  rule: ruleProp,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const phone = useIsPhone();
  const isSet = !!set;
  const storeRule = useWorkingStore((s) => s.rule);
  const rule = ruleProp ?? storeRule;
  // The window's ceiling is MEASURED, not a fraction of the viewport. Both call sites
  // position it absolutely inside a container the page has already pushed down (the hero's
  // hangs at top-[56px], the set's at top-10 of the GROUND, which starts below the hero), so
  // a flat `max-h-[70vh]` is a ceiling on the wrong number: measured 2026-09-09 with the set
  // window at y=345 in a 930 px viewport, 70vh let it run 66 px past the bottom edge with no
  // way to reach the last rows.
  // THE LIFT (ASK-4): with `liftTo` and less than `LIFT_ROOM` below where the host put it, the
  // window is drawn `lift` px higher (a transform, so the host's layout is untouched). The top
  // the host gave is recovered by taking the DRAWN lift back off — read from the element
  // (`data-gx-lift`), never from the last value computed: under StrictMode the effect runs twice
  // before the first lift is painted, and subtracting a lift that is not on screen yet applied
  // it twice (measured 2026-09-24: the set's window at top −137 instead of 104 at 1280×720).
  const [maxH, setMaxH] = useState<number>(() => (typeof window === 'undefined' ? 600 : Math.round(window.innerHeight * 0.7)));
  const [lift, setLift] = useState(0);
  const liftNow = useRef({ liftTo });
  liftNow.current.liftTo = liftTo;
  // Before paint, so a lifted window never shows a frame where the host put it.
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current;
      const drawn = Number(el?.dataset.gxLift ?? 0) || 0;
      const placed = (el?.getBoundingClientRect().top ?? 0) - drawn;
      const to = liftNow.current.liftTo;
      const l = !phone && to !== undefined && to < placed && window.innerHeight - placed - 16 < LIFT_ROOM ? Math.round(to - placed) : 0;
      setLift(l);
      setMaxH(Math.max(200, Math.round(window.innerHeight - (placed + l) - 16)));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [phone]);
  const [subject, setSubjectState] = useState<ExportSubject>(() => (safeLocalGet(SUBJECT_KEY) === 'swatches' ? 'swatches' : 'ramp'));
  const setSubject = (next: ExportSubject) => {
    setSubjectState(next);
    safeLocalSet(SUBJECT_KEY, next);
  };
  // A set's swatch count starts at the hero's own palette size when there is one, so the
  // two subjects agree on what "a palette" means for this person until they say otherwise.
  const [count, setCount] = useState(() => clampCount(palette.length || 7));

  // THE TEXT PREVIEW's state (see `previewProps` below for the whole story). Declared up here
  // because the window's Escape and click-away listeners consult it: the panel is portalled, so
  // a press inside it is OUTSIDE `ref` and would otherwise close the window it belongs to.
  const previewRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<{ req: PreviewReq; pinned: boolean; beside: React.CSSProperties | null } | null>(null);
  const previewNow = useRef(preview);
  previewNow.current = preview;

  /*
   * LEAVING (the Esc order, 2026-09-24). Escape and the click-away go through the master
   * `useDismiss` (hooks/useDismiss.ts), not a private `keydown`. Its Escape rides the shortcut
   * registry, which marks the key `defaultPrevented` — and that is what the shell's Esc chain
   * (grep `Esc order (Phase C` in GradientExplorerV2App) stands down for. Before this the
   * window's own listener sat BEHIND the shell's on `window`, and was torn down and re-added
   * mid-dispatch because its effect keyed on the host's inline `onClose`: one Esc with Export
   * open over a tray face closed (and baked) the FACE and left the window up. `useDismiss`
   * holds `onClose` in a ref, so it subscribes once.
   *
   * Two calls, because the two ways out differ by one thing: Escape takes a preview held open
   * by a long press first (the window on the next Escape), a press outside closes the window
   * outright, as it always did. The OPENER is not "outside": a press on this window's own
   * button would close it and the click after it would open it again, reset — so the lit
   * button could never shut it. Each window names its own opener (the hero's Export button,
   * or the rail's export-the-ground button), so the other one still closes it.
   *
   * THE DRAFT IS KEPT. The GMT PNG's `SizeField` commits on blur, and the click-away used to
   * close the window before any blur reached it, so a typed width was silently dropped. Both
   * ways out blur whatever has focus in the window first (`flushDraft`).
   *
   * FOCUS. The window takes focus when it opens and, when it is left with Escape or its ×,
   * hands it back to whatever had it (the button that opened it). A press outside leaves focus
   * to the press.
   */
  // Read while RENDERING, before this window exists to take focus: an effect would read it a
  // second time under StrictMode's re-run, by when the window itself holds it.
  const [opener] = useState<HTMLElement | null>(() => {
    const a = typeof document === 'undefined' ? null : document.activeElement;
    return a instanceof HTMLElement && a !== document.body ? a : null;
  });
  const restoreFocus = useRef(false);
  const flushDraft = () => {
    const a = document.activeElement;
    if (a instanceof HTMLElement && ref.current?.contains(a)) a.blur();
  };
  const closeWindow = (restore: boolean) => {
    flushDraft();
    restoreFocus.current = restore;
    onClose();
  };
  useDismiss([ref, previewRef], {
    onClose: () => closeWindow(false),
    escape: false,
    capture: true,
    ignore: isSet ? '[data-gx-export-ground]' : '[data-gx-export-opener]',
  });
  useDismiss(ref, {
    // a preview held open by a long press closes first; the window on the next Escape
    onClose: () => (previewNow.current?.pinned ? setPreview(null) : closeWindow(true)),
    outside: false,
  });
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    return () => {
      // Runs once the window's nodes are gone, so focus that was inside it is on <body> by now;
      // anything else means the person has already put it somewhere, and it stays there.
      const now = document.activeElement;
      if (restoreFocus.current && opener?.isConnected && (!now || now === document.body)) opener.focus({ preventScroll: true });
    };
  }, [opener]);

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
    const renamed = stored ? GROUPS.find((g) => g.was === stored) : undefined;
    if (renamed) return renamed.title;
    const last = recents.find((a) => a.kind === 'copy' || a.kind === 'download') as { key: string } | undefined;
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
  const [settings, setSettings] = useState<ExportSettings>(readExportSettings);
  const saveSettings = (next: ExportSettings) => {
    setSettings(next);
    writeExportSettings(next);
  };

  const swatches = subject === 'swatches';
  /**
   * What each subject LOOKS like. For a single gradient both come from what is in hand: the
   * ramp continuous, and the hero's own palette cut into steps. For a SET there is no one
   * ramp or palette, so the segments stay plain text — painting one gradient's colours on a
   * button that exports sixty would be a picture of the wrong thing.
   */
  const rampBg = useMemo(() => (isSet ? undefined : rampToCss(ramp)), [isSet, ramp]);
  const swatchBg = useMemo(
    () => (isSet ? undefined : swatchesToCss(palette)),
    [isSet, palette],
  );
  // For one gradient the row on the hero is the palette, verbatim. For a set the stepper is.
  const n = isSet ? count : palette.length;

  /**
   * A COPY CONFIRMS ON ITS OWN ROW (§10, 2026-09-09 second pass: "the colour picker's own copy
   * button flips to a tick for a second"). The glyph of the row that copied becomes the picker's
   * ✓ for the picker's second (`useClipboardCopy(1000)` there). Keyed by the ROW that was
   * clicked (`format:` / `again:` + `exportActionId`), not the action alone: the copy also
   * lands in Again, and a row appearing there already ticked would confirm a click nobody made
   * on it. The "Copied" toast is not shown as well (`confirmsCopy`); a failure still toasts.
   */
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (copiedTimer.current !== null) clearTimeout(copiedTimer.current); }, []);
  const confirmCopy = (done: Promise<boolean> | undefined, id: string) => {
    void done?.then((ok) => {
      if (!ok) return;
      if (copiedTimer.current !== null) clearTimeout(copiedTimer.current);
      setCopiedId(id);
      copiedTimer.current = setTimeout(() => { setCopiedId(null); copiedTimer.current = null; }, 1000);
    });
  };

  const runOpts = { budget: settings.budget ?? undefined, pngW: settings.pngW, pngH: settings.pngH, origin, config, source, confirmsCopy: true };
  // The GMT gradient file is PNG only in the UI (ADR-0123 Update 2026-09-14); the loader still reads
  // the JSON, and `runGradientFile(…, 'json')` still writes it for code and tests.
  const saveFile = () => (set ? runSetGradientFile('png', set, name) : runExport({ kind: 'gmt', file: 'png' }, ramp, name, palette, runOpts));
  const copy = (f: ExportFormatDef) => {
    const a = { kind: 'copy', key: f.key, subject } as const;
    confirmCopy(runExport(a, ramp, name, palette, runOpts), `format:${exportActionId(a)}`);
  };
  const download = (f: ExportFormatDef) =>
    set
      ? runSetExport(f.key, set, name, subject, count, settings.budget ?? undefined, rule)
      : runExport({ kind: 'download', key: f.key, subject }, ramp, name, palette, runOpts);
  const swatchSheet = () => (set ? void runSetSwatchSheet(set, name, count, rule) : runExport({ kind: 'png', subject: 'swatches' }, ramp, name, palette, runOpts));

  /*
   * THE TEXT PREVIEW (parity row O4, owner-approved 2026-09-23). The first shell showed a text
   * format's output before you took it (its Extras panels' `showPreview`); this window copied and
   * downloaded blind. The row stays ONE ACTION — nothing is added to it — and the text appears
   * where there was nothing: BESIDE the window on a desktop, on whichever side has room, level
   * with its top. Hover a row (its Copy included) and, after `PREVIEW_OPEN_MS`, the panel shows
   * the text; move to another text row and it switches at once; a binary row, the GMT gradient
   * PNG and the swatch sheet have no text and clear it. `PREVIEW_CLOSE_MS` of grace on leaving
   * lets the pointer cross into the panel to scroll or select in it.
   *
   * THE TEXT IS NOT BUILT HERE. It is `exportText` — the function `runExport`'s Copy writes to
   * the clipboard — called with the same action and the same `runOpts`, so the stop-budget
   * override and the catalogue credit in the name are in the preview because they are in the
   * copy. A set's is `setExportText`, the one file `runSetExport` downloads for a format that
   * bundles (.ugr, .ai, the two DCC scripts); a set in any other format is a .zip, and a .zip
   * has no text. Guard: `npm run smoke:ge-hero` [5d], `npm run smoke:ge-phone` [5b].
   *
   * A PHONE HAS NO HOVER, so a row HELD for `LONG_PRESS_MS` shows its text instead of
   * downloading (the release's click is swallowed), in a panel along the bottom of the sheet
   * with a × — the least intrusive choice: no control is added to any row, and a hold is the
   * gesture a phone already uses for "tell me about this" (Android raises `contextmenu` for it,
   * which is taken as the same thing). The open category's reserved note line, empty on a phone
   * because nothing hovers there, says so once. Any touch screen gets the hold; only a phone
   * gets the bottom panel.
   */
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const press = useRef<{ timer: ReturnType<typeof setTimeout> | null; x: number; y: number; touch: boolean; fired: boolean }>({
    timer: null,
    x: 0,
    y: 0,
    touch: false,
    fired: false,
  });
  const clearPreviewTimers = () => {
    if (openTimer.current !== null) clearTimeout(openTimer.current);
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    if (press.current.timer !== null) clearTimeout(press.current.timer);
    openTimer.current = closeTimer.current = press.current.timer = null;
  };
  useEffect(() => clearPreviewTimers, []);
  /** Where the panel goes on a desktop: beside the window, on the side with more room, its top
   *  level with the window's. Null → the bottom panel (a phone, or no side wide enough). */
  const besideWindow = (): React.CSSProperties | null => {
    const el = ref.current;
    if (phone || !el) return null;
    const r = el.getBoundingClientRect();
    const leftRoom = r.left - PREVIEW_GAP - 8;
    const rightRoom = window.innerWidth - r.right - PREVIEW_GAP - 8;
    const onLeft = leftRoom >= rightRoom;
    const width = Math.min(PREVIEW_MAX_W, onLeft ? leftRoom : rightRoom);
    if (width < PREVIEW_MIN_W) return null;
    const top = Math.max(8, Math.round(r.top));
    return { top, left: Math.round(onLeft ? r.left - PREVIEW_GAP - width : r.right + PREVIEW_GAP), width, maxHeight: Math.max(160, window.innerHeight - top - 8) };
  };
  const showPreview = (req: PreviewReq, pinned: boolean) => {
    clearPreviewTimers();
    setPreview({ req, pinned, beside: besideWindow() });
  };
  const hoverPreview = (req: PreviewReq | null) => {
    const cur = previewNow.current;
    if (cur?.pinned) return; // a held preview stays until its × (or Escape)
    if (!req) {
      clearPreviewTimers();
      if (cur) setPreview(null);
      return;
    }
    if (cur) {
      if (closeTimer.current !== null) clearTimeout(closeTimer.current);
      closeTimer.current = null;
      if (cur.req.id !== req.id) showPreview(req, false);
      return;
    }
    if (openTimer.current !== null) clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => showPreview(req, false), PREVIEW_OPEN_MS);
  };
  const leavePreview = () => {
    if (openTimer.current !== null) clearTimeout(openTimer.current);
    openTimer.current = null;
    if (!previewNow.current || previewNow.current.pinned) return;
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      if (!previewNow.current?.pinned) setPreview(null);
    }, PREVIEW_CLOSE_MS);
  };
  const keepPreview = () => {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const closePreview = () => {
    clearPreviewTimers();
    press.current.fired = false;
    setPreview(null);
  };
  const cancelPress = () => {
    if (press.current.timer !== null) clearTimeout(press.current.timer);
    press.current.timer = null;
  };
  /**
   * A row's preview wiring: hover (a mouse or a pen — a touch has no hover and its enter/leave
   * would flash the panel on every tap), keyboard focus (`:focus-visible` only, so a click does
   * not open one), and the long press. `req` null is a row with no text: hovering it clears.
   */
  const previewProps = (req: PreviewReq | null) => ({
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType !== 'touch') hoverPreview(req);
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType !== 'touch') leavePreview();
    },
    onFocus: (e: React.FocusEvent) => {
      if (!(e.target as HTMLElement).matches?.(':focus-visible') || previewNow.current?.pinned) return;
      if (req) showPreview(req, false);
      else if (previewNow.current) closePreview();
    },
    onBlur: leavePreview,
    onPointerDown: (e: React.PointerEvent) => {
      press.current.fired = false;
      press.current.touch = e.pointerType !== 'mouse';
      cancelPress();
      if (!req || e.pointerType === 'mouse') return;
      press.current.x = e.clientX;
      press.current.y = e.clientY;
      press.current.timer = setTimeout(() => {
        press.current.timer = null;
        press.current.fired = true;
        showPreview(req, true);
      }, LONG_PRESS_MS);
    },
    onPointerMove: (e: React.PointerEvent) => {
      // a finger that moves is scrolling the sheet, not holding a row
      if (press.current.timer !== null && Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > 10) cancelPress();
    },
    onPointerUp: cancelPress,
    onPointerCancel: cancelPress,
    onContextMenu: (e: React.MouseEvent) => {
      // Android raises `contextmenu` for a long press: the same gesture, so the same answer —
      // and never the browser's own menu over a row. A mouse's right click is left alone.
      if (!req || !press.current.touch) return;
      e.preventDefault();
      if (!press.current.fired) {
        cancelPress();
        press.current.fired = true;
        showPreview(req, true);
      }
    },
    onClickCapture: (e: React.MouseEvent) => {
      // the release of a hold that showed the text is not also a download or a copy
      if (!press.current.fired) return;
      press.current.fired = false;
      e.preventDefault();
      e.stopPropagation();
    },
    // a hold must not select the label or raise iOS's callout
    style: phone ? ({ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' } as React.CSSProperties) : undefined,
  });
  /** A format row's preview, or null when the row writes no text. `note` is the row's lossy
   *  note, carried into the panel's header line: the note strip only fills on HOVER, so keyboard
   *  focus and a phone's hold — which open this panel — would otherwise never say it. */
  const formatPreview = (f: ExportFormatDef, note: string | null = null): PreviewReq | null => {
    if (f.binary) return null;
    const label = labelWithoutExt((swatches && f.swatchLabel) || f.label, f.ext);
    // a set previews the ONE file it lands as: a bundle, or a set of one's own member file
    if (isSet) return (f.collection && !swatches) || setIsLoneFile(f.key, set!, subject) ? { kind: 'set', id: `format:${f.key}`, key: f.key, label, ext: extShown(f.ext), note } : null;
    const action: ExportAction = { kind: 'copy', key: f.key, subject };
    return { kind: 'one', id: `format:${exportActionId(action)}`, action, label, ext: extShown(f.ext), note };
  };
  /** An Again row's preview: its own action, so it previews what that one click will do. */
  const againPreview = (a: ExportAction): PreviewReq | null => {
    if (a.kind !== 'copy' && a.kind !== 'download') return null;
    const f = getExportFormat(a.key);
    if (!f || f.binary) return null;
    return { kind: 'one', id: `again:${exportActionId(a)}`, action: a, label: exportActionParts(a).format, ext: extShown(f.ext) };
  };
  // The text, from the functions that write it. A set's bundle is cached per format for as long
  // as what it depends on holds still: sixty gradients as .ai is a quarter of a second, and a
  // pointer going up and down the list must not pay it each time.
  const setTextCache = useMemo(() => new Map<string, string | null>(), [set, subject, count, settings.budget, rule]);
  const previewText = useMemo(() => {
    if (!preview) return null;
    const r = preview.req;
    if (r.kind === 'set') {
      if (!set) return null;
      if (!setTextCache.has(r.key)) setTextCache.set(r.key, setExportText(r.key, set, subject, count, settings.budget ?? undefined, rule));
      return setTextCache.get(r.key) ?? null;
    }
    return exportText(r.action, ramp, name, palette, runOpts);
    // `runOpts` is rebuilt every render; these are what it is made of
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview?.req, set, setTextCache, subject, count, settings.budget, ramp, name, palette, origin, config]);
  const previewShown = useMemo(() => (previewText === null ? null : previewSlice(previewText)), [previewText]);

  const formats = formatsFor(subject);
  // One gradient's lossy count per format, measured once per ramp / subject / budget rather
  // than once per row per render (the reduction search is not free, and a hover re-renders).
  const singleLossy = useMemo(() => {
    const out = new Map<string, number>();
    if (isSet) return out;
    // `formatsFor` is a pure function of the subject, called here so the memo keys on the
    // subject rather than on an array that may be fresh every render
    for (const f of formatsFor(subject)) out.set(f.key, gradientLossyCount(ramp, name, f.key, subject, settings.budget ?? undefined));
    return out;
  }, [isSet, ramp, name, subject, settings.budget]);
  // The sections that have anything in them under THIS subject. Switching to Swatches
  // empties "Fractal + 3D apps" outright, so the open section can vanish under the
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
  // "Fractal + 3D apps" outright, so it can vanish under the pointer). `open === null` is
  // a deliberate close and must be left alone: without that guard, clicking the open header
  // closed it and this immediately re-opened the FIRST section, so a section could never be
  // shut. Measured 2026-09-09 — and neither smoke caught it, because the section they close
  // first happens to be the one this would re-open.
  useEffect(() => {
    setNotice(null);
    setPreview(null);
  }, [open, subject]);
  useEffect(() => {
    // Settings is not in `sections`, and it has gone only under Swatches, which hides it
    if (open === null || (open === SETTINGS_SECTION && !swatches)) return;
    if (!sections.some((x) => x.title === open)) setOpen(sections[0]?.title ?? null);
  }, [sections, open, swatches]);

  const row = (f: ExportFormatDef) => {
    // A set in a format that BUNDLES is one file; in any other format it is one file per
    // gradient inside a .zip — except a set of ONE, which is that member's own file (owner,
    // 2026-09-24: not a .zip of one). Which formats bundle depends on the subject: .ai/.idml/.ugr
    // group gradients, .ase groups swatch lists. Say which on the button, so the download
    // is not a surprise.
    const bundles = isSet && !!(swatches ? f.collectionSwatches : f.collection);
    const lone = isSet && setIsLoneFile(f.key, set!, subject);
    const lossy = isSet ? (bundles || lone ? setLossyCount(set!, f.key, subject, settings.budget ?? undefined) : 0) : singleLossy.get(f.key) ?? 0;
    const note = lossy > 0 ? lossyNote(isSet, lossy, stopBudgetOf(f.key, settings.budget ?? undefined) ?? AI_STOP_LIMIT) : null;
    const pv = previewProps(formatPreview(f, note));
    return (
      <div
        key={f.key}
        data-gx-format={f.key}
        data-gx-lossy={lossy > 0 ? lossy : undefined}
        {...pv}
        onPointerEnter={(e) => {
          setNotice(note);
          pv.onPointerEnter(e);
        }}
        onPointerLeave={(e) => {
          setNotice(null);
          pv.onPointerLeave(e);
        }}
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
                  : lone
                    ? `Download .${f.ext}${swatches && rule !== 'stops' ? ` — ${count} swatches` : ''}`
                    : `${set!.length} files in a .zip`
                : `Download .${f.ext}${swatches ? ` — ${n} swatches` : ''}`
            }
            className="flex-1 min-w-0 flex items-center gap-2 h-7 px-1 rounded-lg text-left hover:bg-line/10 transition-colors group"
          >
            <span className="flex-1 min-w-0 truncate text-[13px] text-fg">
              {labelWithoutExt((swatches && f.swatchLabel) || f.label, f.ext)}
            </span>
            {/* For a set the column says what LANDS, which is not always this format's own
                extension: a format that bundles writes one file, a set of one its member's
                file, everything else a .zip. */}
            <span className={EXT_COL}>{isSet && !bundles && !lone ? '.zip' : extShown(f.ext)}</span>
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
              data-gx-copied={copiedId === `format:${exportActionId({ kind: 'copy', key: f.key, subject })}` ? '' : undefined}
              title={`Copy ${(swatches && f.swatchLabel) || f.label} to the clipboard`}
              aria-label={`Copy ${(swatches && f.swatchLabel) || f.label}`}
              className={COPY_SLOT + ' grid place-items-center rounded-lg text-[12px] text-fg-muted hover:text-fg hover:bg-line/10 transition-colors'}
            >
              {copiedId === `format:${exportActionId({ kind: 'copy', key: f.key, subject })}` ? '✓' : <CopyGlyph size={14} />}
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
      className={`${phone ? 'fixed left-0 right-0 z-40 rounded-none border-x-0' : `${positionClass} w-[360px]`} overflow-y-auto p-4 flex flex-col gap-3 [&>*]:shrink-0 outline-none`}
      style={phone ? { top: 'env(safe-area-inset-top)', bottom: 'env(safe-area-inset-bottom)' } : { maxHeight: maxH, ...(lift ? { transform: `translateY(${lift}px)` } : null) }}
      data-gx-export
      data-gx-lift={phone ? 0 : lift}
      role="dialog"
      aria-label="Export"
      tabIndex={-1}
    >
      <div className="flex items-center">
        <b className="text-[13px] text-fg">
          Export “{name}”{isSet && <span className="font-normal text-fg-muted"> · {set!.length} gradient{set!.length === 1 ? '' : 's'}</span>}
        </b>
        {/* The hit box is the sheet's only way out on a phone (no Esc there), so it is a finger's
            size there; on a desk it is the window's `COPY_SLOT` square. Negative margins pull
            each box back over the padding and the gap around it, so the header line keeps its
            height and nothing under it moves. */}
        <button
          type="button"
          className={`ml-auto grid place-items-center rounded-lg text-fg-muted hover:text-fg ${phone ? 'w-10 h-10 -my-2.5 -mr-2' : 'w-7 h-7 -my-1 -mr-1.5'}`}
          onClick={() => closeWindow(true)}
          title="Close (Esc)"
          aria-label="Close"
        >
          <Icon name="close" />
        </button>
      </div>

      {/* THE SUBJECT (§8b item 5): which face of the gradient is exported.
          PHONE: `flex-wrap`, so a long "Swatches · 12" drops to its own line rather than
          pushing the pill past the sheet's edge. */}
      <div className="flex w-full border border-line/20 rounded-lg overflow-hidden" data-gx-export-subject>
        <SubjectSegment on={!swatches} title="The gradient itself — a continuous ramp" background={rampBg} onClick={() => setSubject('ramp')} data="ramp">
          Ramp
        </SubjectSegment>
        <SubjectSegment
          on={swatches}
          title={isSet ? 'Each gradient as a palette of colours' : 'The palette you laid out on the hero'}
          background={swatchBg}
          onClick={() => setSubject('swatches')}
          data="swatches"
        >
          Swatches{!isSet && palette.length > 0 && <span className="opacity-70"> · {palette.length}</span>}
        </SubjectSegment>
      </div>

      {swatches && isSet && (
        <div className={`flex items-center gap-2 ${phone ? 'flex-wrap' : ''}`}>
          <ZoneLabel className="flex-1">Swatches per gradient</ZoneLabel>
          {/* The hero's layout rule places them (owner, 2026-09-24), and the title names it:
              the set has no switch of its own, so this is where the rule is said. */}
          <div
            className="inline-flex items-center border border-line/20 rounded-lg overflow-hidden"
            data-gx-swatch-count
            data-gx-swatch-rule={rule}
            title={
              rule === 'stops'
                ? `One per stop, Stops — ${count}, Even, where a gradient has none`
                : `${count} per gradient, ${RULE_NAME[rule]}`
            }
          >
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

      {/* AGAIN, AT THE TOP (owner, 2026-09-14) — under the subject switch and its one line, above
          everything else, because it is the shortest path for someone who has done this before.
          One row per action (`exportActionId`; the recents hold no repeats), each naming its
          FORMAT with the extension in the column, so CSS linear-gradient and CSS variables never
          read as one .css twice. The glyph says Copy or Download. */}
      {again.length > 0 && (
        <div data-gx-export-again>
          <div className={BAND}>
            <ZoneLabel className="flex-1">Again</ZoneLabel>
          </div>
          <div className="pt-1 px-1">
          {again.map((a) => {
            const p = exportActionParts(a);
            return (
              <div key={exportActionId(a)} className="flex items-center gap-1" {...previewProps(againPreview(a))}>
                <button
                  type="button"
                  onClick={() => confirmCopy(runExport(a, ramp, name, palette, runOpts), `again:${exportActionId(a)}`)}
                  data-gx-again={exportActionId(a)}
                  data-gx-copied={copiedId === `again:${exportActionId(a)}` ? '' : undefined}
                  title={`${p.verb} ${p.format}`}
                  className="flex-1 min-w-0 flex items-center gap-2 h-7 px-1 rounded-lg text-left text-[13px] text-fg hover:bg-line/10 transition-colors group"
                >
                  <span className="flex-1 min-w-0 truncate">{p.format}</span>
                  {/* A Copy writes no file, so its column is empty — but held open, so the row
                      lines up with every other one. */}
                  <span className={EXT_COL}>{p.ext ? extShown(p.ext) : ''}</span>
                  <span className="text-fg-dim group-hover:text-fg">
                    {a.kind !== 'copy' ? <Icon name="download" size={14} /> : copiedId === `again:${exportActionId(a)}` ? '✓' : <CopyGlyph size={14} />}
                  </span>
                </button>
                <span className={COPY_SLOT} />
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* THE GMT GRADIENT FILE — the Explorer's save (ADR-0123). Ramp subject only. ONE row, the
          PNG (owner, 2026-09-14: the .json row went; the loader still reads JSON). For one
          gradient its SIZE sits under it — the fields the removed "As an image" strip had — and
          the export honours them: the width snaps to a multiple of 256 so a stripped copy still
          reads back exact colours; the height is free. A set keeps the automatic band layout. */}
      {!swatches && (
        <div data-gx-export-gmt>
          <div className={BAND}>
            <ZoneLabel className="flex-1">For GMT</ZoneLabel>
          </div>
          <div className="pt-1 px-1">
            {/* a PNG: no text to preview, so hovering it clears one */}
            <div className="flex items-center gap-1" {...previewProps(null)}>
              <button
                type="button"
                onClick={saveFile}
                data-gx-gmtfile="png"
                title={isSet ? `All ${set!.length} in one .png` : `Download .png — ${settings.pngW} × ${settings.pngH}`}
                className="flex-1 min-w-0 flex items-center gap-2 h-7 px-1 rounded-lg text-left hover:bg-line/10 transition-colors group"
              >
                <span className="flex-1 min-w-0 truncate text-[13px] text-fg">GMT gradient</span>
                <span className={EXT_COL}>.png</span>
                <span className="text-fg-dim group-hover:text-fg">
                  <Icon name="download" size={14} />
                </span>
              </button>
              <span className={COPY_SLOT} />
            </div>
            {!isSet && (
              <div className={`flex items-center gap-1.5 px-1 pt-1.5 ${phone ? 'flex-wrap' : ''}`} data-gx-png-size>
                <SizeField
                  value={settings.pngW}
                  commit={(w) => saveSettings({ ...settings, pngW: snapGradientPngWidth(w) })}
                  ariaLabel="PNG width"
                  title={`Width in pixels — a multiple of 256 (${GRADIENT_PNG_MIN_WIDTH}–${GRADIENT_PNG_MAX_WIDTH}), so every colour is whole pixel columns`}
                  data="w"
                />
                <span className="text-[13px] text-fg-dim">×</span>
                <SizeField
                  value={settings.pngH}
                  commit={(h) => saveSettings({ ...settings, pngH: clampGradientPngHeight(h) })}
                  ariaLabel="PNG height"
                  title={`Height in pixels (1–${GRADIENT_PNG_MAX_SINGLE_HEIGHT})`}
                  data="h"
                />
                <span className="flex-1 text-[11px] leading-snug text-fg-muted">Width snaps to 256s. For a full-size image use Wallpaper.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* What follows writes for OTHER software, and is lossy by nature — said once, here. */}
      {!swatches && (
        <div className="px-2 -mb-2 text-[11px] text-fg-dim" data-gx-export-other>
          For other software
        </div>
      )}
      {sections.map((sec) => (
        <div key={sec.title}>
          <SectionHead title={sec.title} note={String(sec.formats.length)} open={open === sec.title} onClick={() => toggle(sec.title)} />
          {open === sec.title && (
            <div className="pt-1 px-1">
              {sec.formats.map(row)}
              <div className={NOTE_STRIP} data-gx-note>
                {/* on a phone nothing hovers, so the line is free to say how the text is seen */}
                {notice ?? (phone && sec.formats.some((f) => formatPreview(f)) ? 'Hold a format to see its text' : null)}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* SETTINGS (owner, 2026-09-10: "we can merge the stop budget into output profile and
          name it 'settings'"): the number every reducing format used to decide privately, which
          matters most on a SET, where the lossy note lives. The output profile it was merged
          with went on 2026-09-24 (owner; see `SETTINGS_SECTION`), so the header says "N stops"
          or nothing.
          RAMP ONLY (2026-09-24): under Swatches the budget does nothing — the swatches side
          reduces nothing — and a control that controls nothing does not belong in the window. */}
      {!swatches && (
      <div>
        <SectionHead
          title={SETTINGS_SECTION}
          note={settings.budget ? `${settings.budget} stops` : undefined}
          open={open === SETTINGS_SECTION}
          onClick={() => toggle(SETTINGS_SECTION)}
        />
        {open === SETTINGS_SECTION && (
          <div className="pt-1 px-1 flex flex-col gap-2" data-gx-settings>
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
      )}
      {/* THE SWATCH SHEET — Swatches subject only, one row, no header of its own (owner,
          2026-09-14). The "As an image" section it sat in is gone: its PNG strip and the set's
          contact sheet are superseded by the GMT gradient PNG, which draws the ramp and reads
          back. The swatch sheet is a different product — labelled chips with hex — and nothing
          else makes an image of a palette, so it stays. */}
      {swatches && (
        <div className="px-1">
          <div className="flex items-center gap-1" {...previewProps(null)}>
            <button
              type="button"
              onClick={swatchSheet}
              data-gx-image
              title={isSet ? 'Every palette as labelled chips, one row per gradient' : 'The palette as labelled chips, hex included'}
              className="flex-1 min-w-0 flex items-center gap-2 h-7 px-1 rounded-lg text-left hover:bg-line/10 transition-colors group"
            >
              <span className="flex-1 min-w-0 truncate text-[13px] text-fg">Swatch sheet</span>
              <span className={EXT_COL}>.png</span>
              <span className="text-fg-dim group-hover:text-fg">
                <Icon name="download" size={14} />
              </span>
            </button>
            <span className={COPY_SLOT} />
          </div>
        </div>
      )}
      {/* THE TEXT PREVIEW — a portal (`<Layer tier="tooltip">`, ADR-0082), so it is no child of
          this scrolling window and nothing in the window moves when it appears. Beside the
          window on a desktop; along the bottom of the sheet on a phone. */}
      {preview && previewShown && (
        <Layer
          tier="tooltip"
          ref={previewRef}
          data-gx-export-preview={preview.req.id}
          data-gx-preview-pinned={preview.pinned ? '' : undefined}
          style={preview.beside ? { top: preview.beside.top, left: preview.beside.left, width: preview.beside.width } : { left: 0, right: 0, bottom: 0 }}
          onPointerEnter={keepPreview}
          onPointerLeave={(e) => {
            if (e.pointerType !== 'touch') leavePreview();
          }}
        >
          <Floating
            className={`flex flex-col overflow-hidden ${preview.beside ? '' : 'rounded-b-none border-x-0 border-b-0'}`}
            style={preview.beside ? { maxHeight: preview.beside.maxHeight } : { maxHeight: '50vh', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex items-center gap-2 h-8 pl-3 pr-1.5 shrink-0 border-b border-line/10">
              <span className="flex-1 min-w-0 truncate text-[11px] text-fg-muted">
                {preview.req.label}
                {preview.req.note && <span data-gx-preview-note> · {preview.req.note}</span>}
              </span>
              <span className="shrink-0 text-[11px] text-fg-dim">{preview.req.ext}</span>
              {(preview.pinned || !preview.beside) && (
                <button
                  type="button"
                  onClick={closePreview}
                  data-gx-preview-close
                  title="Close (Esc)"
                  aria-label="Close the preview"
                  className="w-7 h-7 grid place-items-center rounded-lg text-fg-muted hover:text-fg hover:bg-line/10"
                >
                  <Icon name="close" size={14} />
                </button>
              )}
            </div>
            {/* exactly the text, nothing around it: the smoke reads `textContent` against the clipboard */}
            <pre data-gx-preview-text className="flex-1 min-h-0 overflow-auto m-0 px-3 py-2 font-mono text-[11px] leading-[1.45] text-fg whitespace-pre">{previewShown.shown}</pre>
            {previewShown.more && (
              <div data-gx-preview-more className="shrink-0 h-6 px-3 leading-6 text-[11px] text-fg-dim border-t border-line/10 truncate">
                … {previewShown.more}
              </div>
            )}
          </Floating>
        </Layer>
      )}
    </Floating>
  );
};

export default ExportMenu;
