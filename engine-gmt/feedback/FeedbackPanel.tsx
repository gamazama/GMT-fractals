import React, { useEffect, useRef, useState } from 'react';
import { submitFeedback, FeedbackError, FeedbackCategory, getFeedbackAttachments, type FeedbackFile } from './FeedbackClient';
import { useAuthStore } from '../auth/authStore';
import { useEngineStore } from '../../store/engineStore';
import { stopNavKeys } from '../../components/ui';
import { ErrorNote } from '../../components/ErrorNote';

const CATEGORIES: { value: FeedbackCategory; label: string; hint: string }[] = [
    { value: 'bug',     label: 'Bug report',     hint: 'Something is broken or behaving unexpectedly' },
    { value: 'feature', label: 'Feature request', hint: 'An idea or capability you would like to see' },
    { value: 'support', label: 'Support',        hint: 'You need help getting something to work' },
];

/**
 * Feedback form, rendered as a dockable panel ('panel-feedback' in the
 * manifest). Window chrome (title, close, drag) is supplied by DraggableWindow
 * when floating, or the dock when docked — this component is just the form.
 * It remounts each time the panel opens (the floating panel unmounts on close),
 * so component state starts fresh without an explicit reset.
 */
export const FeedbackPanel: React.FC = () => {
    const profile = useAuthStore((s) => s.profile);
    const togglePanel = useEngineStore((s) => s.togglePanel);

    const [category, setCategory]         = useState<FeedbackCategory>('bug');
    const [message, setMessage]           = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [includeScene, setIncludeScene] = useState(true);

    const [submitting, setSubmitting]     = useState(false);
    const [error, setError]               = useState<string | null>(null);
    const [done, setDone]                 = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    // What this app offers to attach (configureFeedback) — GMT's scene unless the app
    // declared its own. ONE option is the checkbox (GMT's form, unchanged); SEVERAL are a
    // one-of choice with None, still sending one file; none hides the row.
    const [options] = useState(getFeedbackAttachments);
    const attachment = options.length === 1 ? options[0] : null;
    const multi = options.length > 1;
    const [choice, setChoice]             = useState<string | null>(multi ? (options[0].id ?? null) : null);
    // A captureOnSelect option's file, built when chosen — the thumbnail is what is sent.
    const [prepared, setPrepared]         = useState<{ id: string; file: FeedbackFile | null } | null>(null);
    const [preparing, setPreparing]       = useState(false);
    const chosen = multi ? options.find((o) => o.id === choice) ?? null : null;

    const choose = (id: string | null) => {
        setChoice(id);
        setError(null);
        const opt = options.find((o) => o.id === id);
        if (!opt?.captureOnSelect || !id) return;
        if (prepared?.id === id) return;
        setPreparing(true);
        Promise.resolve()
            .then(() => opt.capture())
            .then((file) => setPrepared({ id, file }))
            .catch((err) => {
                setPrepared(null);
                setChoice(null);
                setError(err instanceof Error ? err.message : 'Could not prepare the attachment');
            })
            .finally(() => setPreparing(false));
    };

    useEffect(() => {
        const t = setTimeout(() => textareaRef.current?.focus(), 50);
        return () => clearTimeout(t);
    }, []);

    const close = () => {
        if (submitting) return;
        togglePanel('Feedback', false);
    };

    const trySubmit = async () => {
        setError(null);
        if (!message.trim()) {
            setError('Please write a message.');
            return;
        }
        setSubmitting(true);
        try {
            if (multi) {
                await submitFeedback({
                    category, message, contactEmail,
                    includeScene: !!chosen,
                    attachmentId: chosen?.id,
                    preparedAttachment: chosen?.captureOnSelect ? (prepared && prepared.id === chosen.id ? prepared.file : null) : undefined,
                });
            } else {
                await submitFeedback({ category, message, contactEmail, includeScene: includeScene && !!attachment });
            }
            setDone(true);
        } catch (err) {
            if (err instanceof FeedbackError) setError(err.message);
            else setError(err instanceof Error ? err.message : 'Send failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col text-left p-4" {...stopNavKeys()}>
            {done ? (
                <>
                    <p className="text-xs text-fg-tertiary leading-relaxed mb-1">
                        Thanks — your message is on its way. I read every report personally and
                        usually reply within a few days.
                    </p>
                    <p className="text-[11px] text-fg-dim italic mb-4">— Guy Zack</p>
                    <div className="flex justify-end">
                        <button
                            onClick={close}
                            className="px-3 py-1.5 text-xs font-bold rounded bg-accent-500/20 text-cyan-200 hover:bg-accent-500/30 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <p className="text-[10px] text-fg-muted leading-relaxed mb-4">
                        Bug reports, feature ideas, or questions — all welcome. Anonymous is fine,
                        but if you want a reply, include an email or sign in.
                    </p>

                    {/* Category */}
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-fg-muted mb-1">
                        What kind of feedback?
                    </label>
                    <div className="grid grid-cols-3 gap-1 mb-1">
                        {CATEGORIES.map((c) => (
                            <button
                                key={c.value}
                                onClick={() => setCategory(c.value)}
                                disabled={submitting}
                                className={`px-2 py-1.5 text-[11px] font-bold rounded transition-colors ${
                                    category === c.value
                                        ? 'bg-accent-500/25 text-cyan-200 border border-accent-400/40'
                                        : 'bg-line/5 text-fg-muted border border-transparent hover:bg-line/10'
                                }`}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                    <p className="text-[9px] text-fg-dim italic mb-3">
                        {CATEGORIES.find((c) => c.value === category)!.hint}
                    </p>

                    {/* Message */}
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-fg-muted mb-1">
                        Message
                    </label>
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        disabled={submitting}
                        rows={6}
                        maxLength={4000}
                        placeholder={
                            category === 'bug'
                                ? 'What did you expect? What happened instead? Steps to reproduce?'
                                : category === 'feature'
                                ? 'What would you like to see, and why?'
                                : 'What are you trying to do?'
                        }
                        className="w-full px-2 py-1.5 text-xs bg-surface-sunken text-fg-secondary border border-line/10 rounded focus:outline-none focus:border-accent-400/50 resize-none mb-1"
                    />
                    <p className="text-[9px] text-fg-dim text-right mb-3">
                        {message.length} / 4000
                    </p>

                    {/* Contact email */}
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-fg-muted mb-1">
                        Email for reply <span className="text-fg-faint font-normal normal-case">(optional)</span>
                    </label>
                    <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        disabled={submitting}
                        placeholder={profile ? `(default: your account email)` : 'you@example.com'}
                        className="w-full px-2 py-1.5 text-xs bg-surface-sunken text-fg-secondary border border-line/10 rounded focus:outline-none focus:border-accent-400/50 mb-3"
                    />

                    {/* The app's attachment (GMT: include scene) */}
                    {attachment && (
                    <label className="flex items-start gap-2 mb-4 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={includeScene}
                            onChange={(e) => setIncludeScene(e.target.checked)}
                            disabled={submitting}
                            className="mt-0.5 accent-cyan-400"
                        />
                        <div className="flex-1">
                            <div className="text-[11px] font-bold text-fg-tertiary group-hover:text-accent-300 transition-colors">
                                {attachment.label}
                            </div>
                            <div className="text-[9px] text-fg-dim leading-snug">
                                {attachment.hint}
                            </div>
                        </div>
                    </label>
                    )}

                    {/* Several options (an app's choice): one of them, or none */}
                    {multi && (
                    <div className="mb-4" data-feedback-attachments="">
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-fg-muted mb-1">
                            Attach
                        </label>
                        <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: `repeat(${options.length + 1}, minmax(0, 1fr))` }}>
                            {[{ id: null as string | null, label: 'Nothing' }, ...options.map((o) => ({ id: o.id ?? null, label: o.label }))].map((o) => (
                                <button
                                    key={o.id ?? 'none'}
                                    type="button"
                                    onClick={() => choose(o.id)}
                                    disabled={submitting}
                                    aria-pressed={choice === o.id}
                                    data-feedback-attachment={o.id ?? 'none'}
                                    className={`px-2 py-1.5 text-[11px] font-bold rounded transition-colors ${
                                        choice === o.id
                                            ? 'bg-accent-500/25 text-cyan-200 border border-accent-400/40'
                                            : 'bg-line/5 text-fg-muted border border-transparent hover:bg-line/10'
                                    }`}
                                >
                                    {o.label}
                                </button>
                            ))}
                        </div>
                        {chosen && <p className="text-[9px] text-fg-dim italic mb-2">{chosen.hint}</p>}
                        {chosen?.captureOnSelect && (
                            preparing ? (
                                <p className="text-[10px] text-fg-muted" data-feedback-preparing="">Preparing…</p>
                            ) : prepared && prepared.id === chosen.id && prepared.file?.preview ? (
                                <img
                                    src={prepared.file.preview}
                                    alt="What will be attached"
                                    data-feedback-preview=""
                                    className="max-h-28 max-w-full rounded border border-line/15"
                                />
                            ) : null
                        )}
                    </div>
                    )}

                    {error && (
                        <ErrorNote className="text-[11px] text-danger px-2 py-1.5 mb-3">
                            {error}
                        </ErrorNote>
                    )}

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={close}
                            disabled={submitting}
                            className="px-3 py-1.5 text-xs font-bold rounded text-fg-muted hover:text-fg hover:bg-line/5 transition-colors disabled:opacity-40"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={trySubmit}
                            disabled={submitting || preparing || !message.trim()}
                            className="px-3 py-1.5 text-xs font-bold rounded bg-accent-500/20 text-cyan-200 hover:bg-accent-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Sending…' : 'Send'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};
