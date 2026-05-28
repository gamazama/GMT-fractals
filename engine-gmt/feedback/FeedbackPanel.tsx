import React, { useEffect, useRef, useState } from 'react';
import { submitFeedback, FeedbackError, FeedbackCategory } from './FeedbackClient';
import { useAuthStore } from '../auth/authStore';
import { useEngineStore } from '../../store/engineStore';
import { stopNavKeys } from '../../components/ui';

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
            await submitFeedback({ category, message, contactEmail, includeScene });
            setDone(true);
        } catch (err) {
            if (err instanceof FeedbackError) setError(err.message);
            else setError(err instanceof Error ? err.message : 'Send failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col text-left" {...stopNavKeys()}>
            {done ? (
                <>
                    <p className="text-xs text-gray-300 leading-relaxed mb-1">
                        Thanks — your message is on its way. I read every report personally and
                        usually reply within a few days.
                    </p>
                    <p className="text-[11px] text-gray-500 italic mb-4">— Guy Zack</p>
                    <div className="flex justify-end">
                        <button
                            onClick={close}
                            className="px-3 py-1.5 text-xs font-bold rounded bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <p className="text-[10px] text-gray-400 leading-relaxed mb-4">
                        Bug reports, feature ideas, or questions — all welcome. Anonymous is fine,
                        but if you want a reply, include an email or sign in.
                    </p>

                    {/* Category */}
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">
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
                                        ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40'
                                        : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
                                }`}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                    <p className="text-[9px] text-gray-500 italic mb-3">
                        {CATEGORIES.find((c) => c.value === category)!.hint}
                    </p>

                    {/* Message */}
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">
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
                        className="w-full px-2 py-1.5 text-xs bg-black/30 text-gray-200 border border-white/10 rounded focus:outline-none focus:border-cyan-400/50 resize-none mb-1"
                    />
                    <p className="text-[9px] text-gray-500 text-right mb-3">
                        {message.length} / 4000
                    </p>

                    {/* Contact email */}
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">
                        Email for reply <span className="text-gray-600 font-normal normal-case">(optional)</span>
                    </label>
                    <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        disabled={submitting}
                        placeholder={profile ? `(default: your account email)` : 'you@example.com'}
                        className="w-full px-2 py-1.5 text-xs bg-black/30 text-gray-200 border border-white/10 rounded focus:outline-none focus:border-cyan-400/50 mb-3"
                    />

                    {/* Include scene */}
                    <label className="flex items-start gap-2 mb-4 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={includeScene}
                            onChange={(e) => setIncludeScene(e.target.checked)}
                            disabled={submitting}
                            className="mt-0.5 accent-cyan-400"
                        />
                        <div className="flex-1">
                            <div className="text-[11px] font-bold text-gray-300 group-hover:text-cyan-300 transition-colors">
                                Include current scene
                            </div>
                            <div className="text-[9px] text-gray-500 leading-snug">
                                Attaches a .gmf file of your scene (sky + heavy data stripped)
                                so I can reproduce what you're seeing.
                            </div>
                        </div>
                    </label>

                    {error && (
                        <div className="text-[11px] text-red-300 bg-red-500/10 border border-red-500/30 rounded px-2 py-1.5 mb-3">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={close}
                            disabled={submitting}
                            className="px-3 py-1.5 text-xs font-bold rounded text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={trySubmit}
                            disabled={submitting || !message.trim()}
                            className="px-3 py-1.5 text-xs font-bold rounded bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Sending…' : 'Send'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};
