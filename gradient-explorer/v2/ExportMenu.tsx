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
 * formats you will never use. It is a format CATALOGUE presented as a menu of actions. Two
 * things fix that and neither removes a format:
 *
 *   1. AGAIN — the last few exports, at the top, one click each. The app already recorded
 *      them (`exportActions.ts`, shown on the Export icon's hover flyout); they were simply
 *      not in the WINDOW, which is where someone who has done this before is looking.
 *   2. The four group headers already say what each group is FOR, so they became the choice:
 *      closed by default, one open at a time, and the one that opens is the one holding your
 *      last export. Twenty visible rows become two to eight.
 *
 * The output profile is a section like the others with its value on the header — a setting
 * almost nobody touches, previously sitting between the formats and the image row at full
 * weight. The image row stays open: it is one row and it is what most people came for.
 *
 * The doing lives in `exportActions.ts` (`runExport`, `runSetExport`, `runSetImage`),
 * shared with the hero's hover flyout of recent exports, so the two surfaces cannot drift.
 * This file is only the full window. It hangs off the hero BAND, not the card — the card
 * clips its children (2026-09-07).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formatsFor, type ExportFormatDef, type ExportSubject } from '../../palette/core/exportFormats';
import { runExport, runSetExport, runSetImage, setLossyCount, useRecentExports, exportActionLabel } from './exportActions';
import { AI_STOP_LIMIT } from '../../palette/core/exportFormats';
import { PALETTE_MAX, PALETTE_MIN, clampCount } from '../../palette/core/paletteSample';
import type { Favient } from '../../palette/store/favientsStore';
import type { RGB } from '../../palette/core/oklab';
import { Floating } from './ui/Floating';
import { Act } from './ui/Act';
import { Icon } from './ui/Icon';
import { ZoneLabel } from './ui/ZoneLabel';

const GROUPS: { title: string; keys: string[] }[] = [
  { title: 'For the web', keys: ['css', 'cssvars', 'svg', 'tw', 'tokens', 'hex', 'json', 'js'] },
  { title: 'For design apps', keys: ['ase', 'grd', 'ai', 'idml', 'gpl', 'pdn'] },
  { title: 'For fractal + 3D apps', keys: ['map', 'ggr', 'cpt', 'ugr'] },
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
const PROFILE_SECTION = 'Output profile';

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
    const last = recents.find((a) => a.kind !== 'png') as { key: string } | undefined;
    return (last && groupOf(last.key)) || GROUPS[0].title;
  });
  const toggle = (title: string) => setOpen((o) => (o === title ? null : title));

  const swatches = subject === 'swatches';
  // For one gradient the row on the hero is the palette, verbatim. For a set the stepper is.
  const n = isSet ? count : palette.length;

  const copy = (f: ExportFormatDef) => runExport({ kind: 'copy', key: f.key, subject }, ramp, name, palette);
  const download = (f: ExportFormatDef) =>
    set ? runSetExport(f.key, set, name, subject, count) : runExport({ kind: 'download', key: f.key, subject }, ramp, name, palette);
  const image = () => (set ? void runSetImage(set, name, subject, count) : runExport({ kind: 'png', subject }, ramp, name, palette));

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
  useEffect(() => {
    if (open === PROFILE_SECTION) return;
    if (!sections.some((x) => x.title === open)) setOpen(sections[0]?.title ?? null);
  }, [sections, open]);

  const row = (f: ExportFormatDef) => {
    // A set in a format that BUNDLES is one file; in any other format it is one file per
    // gradient inside a .zip. Which formats bundle depends on the subject: .ai/.idml/.ugr
    // group gradients, .ase groups swatch lists. Say which on the button, so the download
    // is not a surprise.
    const bundles = isSet && !!(swatches ? f.collectionSwatches : f.collection);
    const lossy = isSet && bundles ? setLossyCount(set!, f.key, subject) : 0;
    return (
      <div key={f.key} className="py-0.5" data-gx-format={f.key}>
        <div className="flex items-center gap-2">
          <span className="flex-1 text-[13px] text-fg">{(swatches && f.swatchLabel) || f.label}</span>
          {!isSet && !f.binary && (
            <Act onClick={() => copy(f)} title="Copy to the clipboard">
              Copy
            </Act>
          )}
          <Act
            onClick={() => download(f)}
            title={
              isSet
                ? bundles
                  ? `All ${set!.length} in one .${f.ext}`
                  : `${set!.length} files in a .zip`
                : `Download .${f.ext}${swatches ? ` — ${n} swatches` : ''}`
            }
          >
            {isSet && !bundles ? '.zip' : 'Download'}
          </Act>
        </div>
        {lossy > 0 && (
          <div className="text-[11px] leading-snug text-fg-muted pr-1">
            {lossy} of {set!.length} use more than {AI_STOP_LIMIT} colour stops, so they export simplified. Most apps cap stops similarly.
          </div>
        )}
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
      className={`${positionClass} w-[360px] overflow-y-auto p-4 flex flex-col gap-3 [&>*]:shrink-0`}
      style={{ maxHeight: maxH }}
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

      {/* THE SUBJECT (§8b item 5): which face of the gradient is exported. */}
      <div className="inline-flex self-start border border-line/20 rounded-lg overflow-hidden" data-gx-export-subject>
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
        <div className="flex items-center gap-2">
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
            <button
              key={exportActionLabel(a)}
              type="button"
              onClick={() => runExport(a, ramp, name, palette)}
              className="w-full flex items-center h-7 rounded-lg text-left text-[13px] text-fg hover:bg-line/10 transition-colors"
            >
              <span className="flex-1 min-w-0 truncate">{exportActionLabel(a)}</span>
            </button>
          ))}
          </div>
        </div>
      )}

      {sections.map((sec) => (
        <div key={sec.title}>
          <SectionHead title={sec.title} note={String(sec.formats.length)} open={open === sec.title} onClick={() => toggle(sec.title)} />
          {open === sec.title && <div className="pt-1 px-1">{sec.formats.map(row)}</div>}
        </div>
      ))}

      {!isSet && colorSpace && onColorSpace && (
        <div>
          <SectionHead
            title={PROFILE_SECTION}
            note={PROFILES.find((p) => p.id === colorSpace)?.label}
            open={open === PROFILE_SECTION}
            onClick={() => toggle(PROFILE_SECTION)}
          />
          {open === PROFILE_SECTION && (
            <div className="pt-1 inline-flex border border-line/20 rounded-lg overflow-hidden" data-gx-output-profile>
              {PROFILES.map((p) => (
                <Segment key={p.id} on={colorSpace === p.id} title={p.title} onClick={() => onColorSpace(p.id)}>
                  {p.label}
                </Segment>
              ))}
            </div>
          )}
        </div>
      )}
      {/* The image stays OPEN: one row, and the thing most people came for. */}
      <div>
        <div className={BAND}>
          <ZoneLabel className="flex-1">As an image</ZoneLabel>
        </div>
        <div className="pt-1 px-1">
          <div className="flex items-center gap-2 py-0.5" data-gx-image>
            <span className="flex-1 text-[13px] text-fg">
              {swatches ? 'Swatch sheet' : isSet ? 'Contact sheet' : 'PNG strip (1024 × 64)'}
            </span>
            <Act onClick={image}>Download</Act>
          </div>
          <div className="text-[13px] text-fg-muted mt-1">
          {swatches
            ? isSet
              ? 'Every palette as labelled chips, one row per gradient.'
              : 'The palette as labelled chips, hex included.'
            : isSet
              ? 'A grid of the whole set, names included.'
              : 'For a full-size image use Wallpaper.'}
          </div>
        </div>
      </div>
    </Floating>
  );
};

export default ExportMenu;
