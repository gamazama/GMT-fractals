/**
 * VariantsMenu — the top-bar Variants popover (plans/ge-v2-design.md §5.6, ADR-0112).
 *
 * Global studio snapshots: click a slot to switch (one undo entry), "+ New" captures the
 * current state with the working output ramp as its thumbnail, shift-click a second slot
 * to reveal the tween slider. Dragging the tween previews `tweenRamp(A, B, t)` in the hero
 * through a plain setState (not undoable, not collected — like Follow); Bake commits it via
 * `use`, which is both.
 *
 * Known gap carried from the store: an image-carrying variant lands its image one decode
 * late and outside the switch's undo entry (see the store header).
 */

import React, { useState } from 'react';
import { useVariantsStore, type Variant } from '../../palette/store/variantsStore';
import { rampFromInts } from '../../palette/core/variantsCore';
import { tweenRamp } from '../../palette/core/rampTween';
import { fitRampToStops } from '../../palette/core/stopFit';
import { useWorkingStore, type WorkingDerived } from '../../palette/store/workingStore';
import { GradientStrip } from '../../palette/components/GradientStrip';
import { showToast } from '../../engine/store/toastStore';

interface Props {
  derived: WorkingDerived;
  onClose: () => void;
}

const btn = 'h-7 px-3 rounded-lg text-[12px] border border-line/20 text-fg hover:border-accent-400 hover:text-accent-300';

export const VariantsMenu: React.FC<Props> = ({ derived, onClose }) => {
  const variants = useVariantsStore((s) => s.variants);
  const activeId = useVariantsStore((s) => s.activeId);
  const [second, setSecond] = useState<string | null>(null);
  const [t, setT] = useState(0.5);
  const [renaming, setRenaming] = useState<string | null>(null);

  const a = variants.find((v) => v.id === activeId) ?? null;
  const b = variants.find((v) => v.id === second) ?? null;
  const tweenable = !!(a && b && a.ramp && b.ramp);

  const capture = () => {
    const v = useVariantsStore.getState().capture(undefined, derived.ramp ?? undefined);
    showToast(`Variant ${v.name} captured`);
  };
  const pick = (v: Variant, e: React.MouseEvent) => {
    if (e.shiftKey && v.id !== activeId) {
      setSecond(v.id === second ? null : v.id);
      return;
    }
    setSecond(null);
    useVariantsStore.getState().restore(v.id);
    showToast(`Variant ${v.name}`);
  };
  const previewTween = (value: number) => {
    setT(value);
    if (!tweenable) return;
    const ra = rampFromInts(a!.ramp);
    const rb = rampFromInts(b!.ramp);
    if (!ra || !rb) return;
    const ramp = tweenRamp(ra, rb, value);
    useWorkingStore.setState({
      input: { kind: 'gradient', config: fitRampToStops(ramp, { targetDE: 0.006, maxStops: 48 }), name: `${a!.name} ↔ ${b!.name}`, source: 'Variants' },
      bakedFrom: null,
      name: null,
    });
  };
  const bakeTween = () => {
    if (!tweenable) return;
    const ra = rampFromInts(a!.ramp);
    const rb = rampFromInts(b!.ramp);
    if (!ra || !rb) return;
    const ramp = tweenRamp(ra, rb, t);
    useWorkingStore.getState().use(fitRampToStops(ramp, { targetDE: 0.006, maxStops: 48 }), `${a!.name} ↔ ${b!.name} · ${Math.round(t * 100)}%`, 'Variants');
    setSecond(null);
    showToast('Tween baked into Working');
  };

  return (
    <div className="absolute right-4 top-12 z-30 w-[300px] bg-surface-dock border border-line/20 rounded-xl p-3.5 shadow-2xl" data-gx-selectable>
      <div className="flex items-center mb-2">
        <span className="text-[11px] uppercase tracking-wider text-fg-dim">Variants</span>
        <button className="ml-auto text-[12px] text-fg-dim hover:text-fg" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="flex flex-col gap-1.5 max-h-[50vh] overflow-y-auto custom-scroll">
        {variants.length === 0 && <div className="text-[12px] text-fg-dim">No variants yet. Capture the current state to come back to it later.</div>}
        {variants.map((v) => {
          const ramp = rampFromInts(v.ramp);
          const on = v.id === activeId;
          const isSecond = v.id === second;
          return (
            <div
              key={v.id}
              className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer ${
                on ? 'border-accent-400 bg-accent-400/10' : isSecond ? 'border-[#b78cff] bg-[#b78cff]/10' : 'border-line/10 hover:border-line/30'
              }`}
              onClick={(e) => pick(v, e)}
              title={on ? 'Active · shift-click another to tween' : 'Click to switch · shift-click to tween with the active one'}
            >
              <span className={`w-7 text-center font-semibold ${on ? 'text-accent-300' : isSecond ? 'text-[#b78cff]' : 'text-fg-muted'}`}>{v.name.slice(0, 3)}</span>
              <div className="flex-1 min-w-0">
                {ramp ? <GradientStrip ramp={ramp} height={22} className="w-full block" /> : <div className="h-[22px] rounded bg-surface-section" />}
              </div>
              {renaming === v.id ? (
                <input
                  autoFocus
                  className="w-16 h-6 bg-surface-section border border-line/20 rounded text-[12px] px-1 text-fg"
                  defaultValue={v.name}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    useVariantsStore.getState().rename(v.id, e.target.value);
                    setRenaming(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') setRenaming(null);
                  }}
                />
              ) : (
                <button
                  className="text-[11px] text-fg-dim hover:text-fg px-1"
                  title="Rename"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenaming(v.id);
                  }}
                >
                  ✎
                </button>
              )}
              <button
                className="text-[11px] text-fg-dim hover:text-fg px-1"
                title="Update this variant with the current state"
                onClick={(e) => {
                  e.stopPropagation();
                  useVariantsStore.getState().update(v.id, derived.ramp ?? undefined);
                  showToast(`Variant ${v.name} updated`);
                }}
              >
                ⟳
              </button>
              <button
                className="text-[11px] text-fg-dim hover:text-[#e5646c] px-1"
                title="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  useVariantsStore.getState().remove(v.id);
                  if (second === v.id) setSecond(null);
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-2.5">
        <button className={btn} onClick={capture} disabled={derived.empty} title="Snapshot the whole studio as a new variant">
          + New
        </button>
        <span className="text-[11px] text-fg-dim">click = switch · shift-click = tween</span>
      </div>
      {tweenable && (
        <div className="mt-3 pt-3 border-t border-line/10">
          <div className="flex items-center gap-2 text-[12px] text-fg-muted">
            <span className="w-7 text-center text-accent-300 font-semibold">{a!.name.slice(0, 3)}</span>
            <input type="range" min={0} max={100} value={Math.round(t * 100)} onChange={(e) => previewTween(Number(e.target.value) / 100)} className="flex-1" />
            <span className="w-7 text-center text-[#b78cff] font-semibold">{b!.name.slice(0, 3)}</span>
            <button className={btn} onClick={bakeTween}>
              Bake
            </button>
          </div>
          <div className="text-[11px] text-fg-dim mt-1">Drag to preview the blend in the hero (OKLab). Bake keeps it.</div>
        </div>
      )}
    </div>
  );
};
