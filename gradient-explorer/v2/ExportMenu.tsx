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
 * The doing lives in `exportActions.ts` (`runExport`, `runSetExport`, `runSetImage`),
 * shared with the hero's hover flyout of recent exports, so the two surfaces cannot drift.
 * This file is only the full window. It hangs off the hero BAND, not the card — the card
 * clips its children (2026-09-07).
 */

import React, { useEffect, useRef, useState } from 'react';
import { formatsFor, type ExportFormatDef, type ExportSubject } from '../../palette/core/exportFormats';
import { runExport, runSetExport, runSetImage, setLossyCount } from './exportActions';
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

  const swatches = subject === 'swatches';
  // For one gradient the row on the hero is the palette, verbatim. For a set the stepper is.
  const n = isSet ? count : palette.length;

  const copy = (f: ExportFormatDef) => runExport({ kind: 'copy', key: f.key, subject }, ramp, name, palette);
  const download = (f: ExportFormatDef) =>
    set ? runSetExport(f.key, set, name, subject, count) : runExport({ kind: 'download', key: f.key, subject }, ramp, name, palette);
  const image = () => (set ? void runSetImage(set, name, subject, count) : runExport({ kind: 'png', subject }, ramp, name, palette));

  const formats = formatsFor(subject);
  const known = new Set(GROUPS.flatMap((g) => g.keys));
  const rest = formats.filter((f) => !known.has(f.key));

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

      {GROUPS.map((g) => {
        const fs = g.keys.map((k) => formats.find((f) => f.key === k)).filter((f): f is ExportFormatDef => !!f);
        if (!fs.length) return null;
        return (
          <div key={g.title}>
            <ZoneLabel className="block mb-1">{g.title}</ZoneLabel>
            {fs.map(row)}
          </div>
        );
      })}
      {rest.length > 0 && (
        <div>
          <ZoneLabel className="block mb-1">More</ZoneLabel>
          {rest.map(row)}
        </div>
      )}
      {!isSet && colorSpace && onColorSpace && (
        <div>
          <ZoneLabel className="block mb-1">Output profile</ZoneLabel>
          <div className="inline-flex border border-line/20 rounded-lg overflow-hidden" data-gx-output-profile>
            {PROFILES.map((p) => (
              <Segment key={p.id} on={colorSpace === p.id} title={p.title} onClick={() => onColorSpace(p.id)}>
                {p.label}
              </Segment>
            ))}
          </div>
        </div>
      )}
      <div>
        <ZoneLabel className="block mb-1">As an image</ZoneLabel>
        <div className="flex items-center gap-2 py-0.5">
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
    </Floating>
  );
};

export default ExportMenu;
