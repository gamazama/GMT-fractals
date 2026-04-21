import React, { useEffect, useRef, useState } from 'react';
import { isSubmitEnabled, submitCooldownRemainingSec, submitPreset, SubmitMeta } from '../submit';
import type { SavedState } from '../savedState';

interface Props {
  open: boolean;
  canvas: HTMLCanvasElement | null;
  state: SavedState | null;
  onClose: () => void;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'ok'; id: string }
  | { kind: 'error'; message: string };

/**
 * Modal that lets the user send the current scene to the gmt-gallery-backend
 * submissions queue. Disabled cleanly (with a message) if the endpoint hasn't
 * been configured yet — see `constants.ts :: PRESET_SUBMIT_ENDPOINT`.
 */
export const SubmitPresetModal: React.FC<Props> = ({ open, canvas, state, onClose }) => {
  const [name, setName] = useState('');
  const [author, setAuthor] = useState('');
  const [notes, setNotes] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Render a preview thumbnail when the modal opens.
  useEffect(() => {
    if (!open || !canvas) { setPreviewUrl(null); return; }
    let objectUrl: string | null = null;
    canvas.toBlob(b => {
      if (!b) return;
      objectUrl = URL.createObjectURL(b);
      setPreviewUrl(objectUrl);
    }, 'image/png');
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [open, canvas]);

  // Reset form + status when the modal closes.
  useEffect(() => {
    if (!open) {
      setStatus({ kind: 'idle' });
      setAccepted(false);
    }
  }, [open]);

  // Escape key dismisses.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const enabled = isSubmitEnabled();
  const remaining = submitCooldownRemainingSec();
  const canSubmit = enabled && accepted && name.trim().length > 0 && status.kind !== 'sending' && remaining === 0;

  const doSubmit = async () => {
    if (!canvas || !state) return;
    setStatus({ kind: 'sending' });
    const meta: SubmitMeta = {
      name: name.trim(),
      author: author.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    const res = await submitPreset(canvas, state, meta);
    if (res.ok) setStatus({ kind: 'ok', id: res.id });
    else setStatus({ kind: 'error', message: res.message });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={rootRef}
        className="w-[480px] max-w-full rounded-lg border border-white/10 bg-[#0b0b0d] shadow-2xl text-gray-200 text-xs overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Submit preset</div>
            <div className="text-[10px] text-gray-500">Share the current scene with the curator</div>
          </div>
          <button type="button" onClick={onClose}
                  className="text-gray-500 hover:text-gray-200 text-sm px-1 leading-none" title="Close (Esc)">×</button>
        </div>

        {!enabled && (
          <div className="mx-4 mt-3 mb-0 px-3 py-2 text-[10px] text-amber-200 bg-amber-500/10 border border-amber-400/20 rounded">
            Submissions aren't enabled in this build yet. In the meantime, use the Save icon in the
            top bar to export a PNG and send it directly.
          </div>
        )}

        <div className="p-4 flex gap-3">
          {/* Preview */}
          <div className="w-[180px] shrink-0">
            <div className="aspect-square rounded border border-white/10 bg-black/60 overflow-hidden flex items-center justify-center">
              {previewUrl
                ? <img src={previewUrl} alt="preset preview" className="w-full h-full object-cover" />
                : <span className="text-[10px] text-gray-500">rendering preview…</span>}
            </div>
            <div className="text-[9px] text-gray-500 mt-1 leading-snug">
              The preview above, plus the scene's JSON state, are what gets submitted.
            </div>
          </div>

          {/* Form */}
          <div className="flex-1 flex flex-col gap-2">
            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-400">Name <span className="text-red-400">*</span></span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 60))}
                disabled={!enabled}
                placeholder="e.g. Ember Tide"
                className="bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-400/60 disabled:opacity-50"
              />
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-400">Author (optional)</span>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value.slice(0, 60))}
                disabled={!enabled}
                placeholder="alias or handle"
                className="bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-400/60 disabled:opacity-50"
              />
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-400">Notes (optional)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                disabled={!enabled}
                rows={3}
                placeholder="What's interesting about this preset? (≤ 500 chars)"
                className="bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-[11px] resize-none focus:outline-none focus:border-cyan-400/60 disabled:opacity-50"
              />
              <span className="text-[9px] text-gray-500 text-right">{notes.length} / 500</span>
            </label>

            <label className="flex items-start gap-2 mt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                disabled={!enabled}
                className="mt-0.5 accent-cyan-500"
              />
              <span className="text-[10px] text-gray-400 leading-snug">
                I understand this preset (image + parameters + my alias if provided) may be
                reviewed, edited, and republished as part of the built-in preset library.
              </span>
            </label>
          </div>
        </div>

        {status.kind === 'ok' && (
          <div className="mx-4 mb-3 px-3 py-2 text-[11px] text-emerald-200 bg-emerald-500/10 border border-emerald-400/20 rounded">
            Thanks! Your preset is in the queue. <span className="text-[10px] text-emerald-400/70">(id: {status.id})</span>
          </div>
        )}
        {status.kind === 'error' && (
          <div className="mx-4 mb-3 px-3 py-2 text-[11px] text-red-300 bg-red-500/10 border border-red-400/20 rounded">
            {status.message}
          </div>
        )}

        <div className="px-4 py-3 border-t border-white/5 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose}
                  className="px-3 py-1.5 text-[11px] rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/10">Cancel</button>
          <button type="button" onClick={doSubmit} disabled={!canSubmit}
                  className={
                    'px-3 py-1.5 text-[11px] rounded border transition-colors ' +
                    (canSubmit
                      ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-100 hover:bg-cyan-500/30'
                      : 'bg-white/[0.04] border-white/10 text-gray-500 cursor-not-allowed')
                  }>
            {status.kind === 'sending' ? 'Sending…' :
             remaining > 0 ? `Wait ${Math.ceil(remaining)}s` :
             'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};
