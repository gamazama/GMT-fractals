/**
 * AuthOverlay — sign-in / sign-up / forgot-password modal.
 *
 * Three states (tab-driven):
 *   - 'signin'  — email + password, "forgot password?" link, Google OAuth
 *   - 'signup'  — email + password + username + display_name, Google OAuth
 *   - 'forgot'  — email-only, triggers Supabase password reset email
 *
 * After signup, transitions to a 'check-email' confirmation screen until
 * the user verifies their inbox; the authStore subscription picks up the
 * verified session automatically when they click the link.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getSupabase } from '../supabase';
import { useAuthStore } from './authStore';

type Mode = 'signin' | 'signup' | 'forgot' | 'check-email' | 'reset-sent';

const USERNAME_RE = /^[a-z0-9](?:[a-z0-9_-]{1,22}[a-z0-9])?$/;
const RESERVED_USERNAMES = new Set([
    'admin', 'administrator', 'root', 'api', 'www', 'mod', 'moderator',
    'support', 'help', 'gmt', 'gmt-fractals', 'staff', 'official', 'system',
]);

interface Props {
    open: boolean;
    onClose: () => void;
}

export const AuthOverlay: React.FC<Props> = ({ open, onClose }) => {
    const [mode, setMode]               = useState<Mode>('signin');
    const [email, setEmail]             = useState('');
    const [password, setPassword]       = useState('');
    const [username, setUsername]       = useState('');
    const [displayName, setDisplayName] = useState('');
    const [busy, setBusy]               = useState(false);
    const [error, setError]             = useState<string | null>(null);

    // Live username availability check
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'reserved'>('idle');
    const usernameRef = useRef<HTMLInputElement>(null);

    // Reset on open
    useEffect(() => {
        if (!open) return;
        setMode('signin');
        setEmail('');
        setPassword('');
        setUsername('');
        setDisplayName('');
        setError(null);
        setBusy(false);
        setUsernameStatus('idle');
    }, [open]);

    // ESC closes — capture-phase so global shortcuts don't fire while modal is open
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [open, onClose]);

    // Debounced username availability check
    useEffect(() => {
        if (mode !== 'signup' || username.length === 0) {
            setUsernameStatus('idle');
            return;
        }
        if (RESERVED_USERNAMES.has(username.toLowerCase())) {
            setUsernameStatus('reserved');
            return;
        }
        if (!USERNAME_RE.test(username)) {
            setUsernameStatus('invalid');
            return;
        }
        setUsernameStatus('checking');
        const handle = setTimeout(async () => {
            try {
                const { data } = await getSupabase()
                    .from('profiles')
                    .select('id')
                    .eq('username', username.toLowerCase())
                    .maybeSingle();
                setUsernameStatus(data ? 'taken' : 'available');
            } catch {
                setUsernameStatus('idle');
            }
        }, 350);
        return () => clearTimeout(handle);
    }, [username, mode]);

    if (!open) return null;

    const signIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const { error } = await getSupabase().auth.signInWithPassword({ email, password });
            if (error) throw error;
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    };

    const signUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (usernameStatus !== 'available') {
            setError('Pick an available username first');
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const { error } = await getSupabase().auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: username.toLowerCase(),
                        display_name: displayName.trim() || username.toLowerCase(),
                    },
                    emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
                },
            });
            if (error) throw error;
            setMode('check-email');
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    };

    const signInWithGoogle = async () => {
        setBusy(true);
        setError(null);
        try {
            const { error } = await getSupabase().auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
            });
            if (error) throw error;
            // Redirect happens; nothing else to do here.
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setBusy(false);
        }
    };

    const sendPasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}${window.location.pathname}?reset=true`,
            });
            if (error) throw error;
            setMode('reset-sent');
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    };

    const usernameMsg = () => {
        switch (usernameStatus) {
            case 'checking':  return <span className="text-gray-500">checking…</span>;
            case 'available': return <span className="text-green-400">available</span>;
            case 'taken':     return <span className="text-red-400">taken</span>;
            case 'invalid':   return <span className="text-red-400">3–24 chars, a–z 0–9 _ -</span>;
            case 'reserved':  return <span className="text-red-400">reserved name</span>;
            default:          return null;
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onKeyDown={(e) => e.stopPropagation()}
            onKeyUp={(e) => e.stopPropagation()}
            onKeyPress={(e) => e.stopPropagation()}
        >
            <div className="bg-gray-900 border border-white/10 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] w-[400px] max-h-[90vh] overflow-y-auto">
                <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <h2 className="text-sm font-bold text-white">
                        {mode === 'signin' && 'Sign in to GMT'}
                        {mode === 'signup' && 'Create account'}
                        {mode === 'forgot' && 'Reset password'}
                        {mode === 'check-email' && 'Check your inbox'}
                        {mode === 'reset-sent' && 'Reset link sent'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">&times;</button>
                </header>

                {error && (
                    <div className="m-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-[10px] text-red-300">{error}</div>
                )}

                {mode === 'check-email' && (
                    <div className="p-6 text-center space-y-3">
                        <div className="text-xs text-gray-300 leading-relaxed">
                            We sent a confirmation link to <span className="font-mono text-cyan-300">{email}</span>.
                        </div>
                        <div className="text-[10px] text-gray-500">
                            Click the link to verify your address, then you can sign in.
                        </div>
                        <button
                            onClick={() => setMode('signin')}
                            className="mt-2 text-[10px] text-cyan-300 hover:text-cyan-200"
                        >
                            Back to sign in
                        </button>
                    </div>
                )}

                {mode === 'reset-sent' && (
                    <div className="p-6 text-center space-y-3">
                        <div className="text-xs text-gray-300 leading-relaxed">
                            If <span className="font-mono text-cyan-300">{email}</span> has an account, a password reset link is on its way.
                        </div>
                        <button onClick={() => setMode('signin')} className="mt-2 text-[10px] text-cyan-300 hover:text-cyan-200">
                            Back to sign in
                        </button>
                    </div>
                )}

                {mode === 'signin' && (
                    <form onSubmit={signIn} className="p-4 space-y-3">
                        <LabelledInput label="Email"    type="email"    value={email}    onChange={setEmail}    autoFocus />
                        <LabelledInput label="Password" type="password" value={password} onChange={setPassword} />

                        <div className="flex items-center justify-between text-[10px] pt-1">
                            <button type="button" onClick={() => setMode('forgot')} className="text-cyan-300 hover:text-cyan-200">
                                Forgot password?
                            </button>
                            <button type="button" onClick={() => setMode('signup')} className="text-gray-400 hover:text-white">
                                Create account
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={busy || !email || !password}
                            className="w-full py-2 rounded text-[11px] font-bold bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            {busy ? 'Signing in…' : 'Sign in'}
                        </button>

                        <Divider />

                        <GoogleButton onClick={signInWithGoogle} busy={busy} />
                    </form>
                )}

                {mode === 'signup' && (
                    <form onSubmit={signUp} className="p-4 space-y-3">
                        <LabelledInput label="Email"    type="email"    value={email}    onChange={setEmail}    autoFocus />
                        <LabelledInput label="Password" type="password" value={password} onChange={setPassword} hint="At least 6 characters" />

                        <div>
                            <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider flex items-center justify-between mb-1">
                                <span>Username <span className="text-red-400">*</span></span>
                                <span className="font-normal normal-case text-[9px]">{usernameMsg()}</span>
                            </label>
                            <input
                                ref={usernameRef}
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                                disabled={busy}
                                maxLength={24}
                                className="w-full bg-gray-950 border border-white/10 rounded px-2 py-1.5 text-xs text-white font-mono outline-none focus:border-cyan-500"
                                placeholder="alice_42"
                            />
                        </div>

                        <LabelledInput
                            label="Display name"
                            value={displayName}
                            onChange={setDisplayName}
                            hint={`Optional — defaults to "${username || 'your username'}"`}
                            maxLength={60}
                        />

                        <div className="text-[9px] text-gray-600 leading-relaxed pt-1">
                            By creating an account you agree to be a good citizen of the gallery. Spam, harassment, and copyrighted content get accounts banned.
                        </div>

                        <button
                            type="submit"
                            disabled={busy || !email || !password || usernameStatus !== 'available'}
                            className="w-full py-2 rounded text-[11px] font-bold bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            {busy ? 'Creating account…' : 'Create account'}
                        </button>

                        <button type="button" onClick={() => setMode('signin')} className="w-full text-center text-[10px] text-gray-400 hover:text-white">
                            Already have an account? Sign in
                        </button>

                        <Divider />

                        <GoogleButton onClick={signInWithGoogle} busy={busy} />
                    </form>
                )}

                {mode === 'forgot' && (
                    <form onSubmit={sendPasswordReset} className="p-4 space-y-3">
                        <LabelledInput label="Email" type="email" value={email} onChange={setEmail} autoFocus />
                        <div className="text-[10px] text-gray-500 leading-relaxed">
                            We'll email you a link to reset your password.
                        </div>
                        <button
                            type="submit"
                            disabled={busy || !email}
                            className="w-full py-2 rounded text-[11px] font-bold bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            {busy ? 'Sending…' : 'Send reset link'}
                        </button>
                        <button type="button" onClick={() => setMode('signin')} className="w-full text-center text-[10px] text-gray-400 hover:text-white">
                            Back to sign in
                        </button>
                    </form>
                )}
            </div>
        </div>,
        document.body,
    );
};

// ── helpers ────────────────────────────────────────────────────────────

const LabelledInput: React.FC<{
    label: string;
    type?: string;
    value: string;
    onChange: (v: string) => void;
    autoFocus?: boolean;
    hint?: string;
    maxLength?: number;
}> = ({ label, type = 'text', value, onChange, autoFocus, hint, maxLength }) => (
    <div>
        <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
            {label}
        </label>
        <input
            type={type}
            value={value}
            autoFocus={autoFocus}
            maxLength={maxLength}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-gray-950 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
        />
        {hint && <div className="text-[9px] text-gray-600 mt-1">{hint}</div>}
    </div>
);

const Divider: React.FC = () => (
    <div className="flex items-center gap-2 text-[9px] text-gray-700 my-1">
        <div className="flex-1 border-t border-white/5" />
        <span>or</span>
        <div className="flex-1 border-t border-white/5" />
    </div>
);

const GoogleButton: React.FC<{ onClick: () => void; busy: boolean }> = ({ onClick, busy }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="w-full py-2 rounded text-[11px] font-bold bg-white/[0.04] hover:bg-white/[0.08] text-gray-200 border border-white/10 flex items-center justify-center gap-2 disabled:opacity-30"
    >
        <svg width="14" height="14" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8a12 12 0 1 1 8-21l5.7-5.7A20 20 0 1 0 24 44a20 20 0 0 0 19.6-23.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.4 19 12 24 12a12 12 0 0 1 8 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.8-2 13.3-5.2l-6.1-5.2A12 12 0 0 1 12.7 28l-6.6 5.1A20 20 0 0 0 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.1 5.2C42 36 44 30.5 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>
        Continue with Google
    </button>
);
