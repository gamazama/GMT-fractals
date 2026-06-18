/**
 * AccountPanel — account settings modal for signed-in users.
 *
 * Two modes driven by authStore.status:
 *   - 'needs-profile' — first-time setup flow (force username pick).
 *                       Modal cannot be closed until profile is created.
 *   - 'authed'        — normal edit: display name, bio, sign-out, delete account.
 *
 * Mounts via authStore.isAccountPanelOpen; also auto-mounts when
 * status='needs-profile' regardless of open flag — there's no way to
 * proceed in the app without picking a username.
 */
import React, { useEffect, useState } from 'react';
import { getSupabase } from '../supabase';
import { useAuthStore } from './authStore';
import { Modal, Z, stopNavKeys } from '../../components/ui';
import { ErrorNote } from '../../components/ErrorNote';
import { GhostButton } from '../../components/GhostButton';

const USERNAME_RE = /^[a-z0-9](?:[a-z0-9_-]{1,22}[a-z0-9])?$/;
const RESERVED_USERNAMES = new Set([
    'admin', 'administrator', 'root', 'api', 'www', 'mod', 'moderator',
    'support', 'help', 'gmt', 'gmt-fractals', 'staff', 'official', 'system',
]);

export const AccountPanel: React.FC = () => {
    const status              = useAuthStore((s) => s.status);
    const user                = useAuthStore((s) => s.user);
    const profile             = useAuthStore((s) => s.profile);
    const isOpen              = useAuthStore((s) => s.isAccountPanelOpen);
    const closeAccountPanel   = useAuthStore((s) => s.closeAccountPanel);
    const refreshProfile      = useAuthStore((s) => s.refreshProfile);
    const authSignOut         = useAuthStore((s) => s.signOut);

    const setupMode = status === 'needs-profile';
    const visible = isOpen || setupMode;

    // Setup-mode state (only used when no profile yet)
    const [username, setUsername]             = useState('');
    const [setupDisplayName, setSetupDisplayName] = useState('');
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'reserved'>('idle');

    // Edit-mode state (only used when profile exists)
    const [editDisplayName, setEditDisplayName]       = useState('');
    const [editBio, setEditBio]                       = useState('');
    const [editWatermarkEnabled, setEditWatermark]    = useState(true);
    const [watermarkMode, setWatermarkMode]           = useState<'username' | 'platform' | 'custom'>('username');
    const [watermarkCustom, setWatermarkCustom]       = useState('');

    const [busy, setBusy]   = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Hydrate edit fields from profile when opening
    useEffect(() => {
        if (!visible) return;
        if (profile) {
            setEditDisplayName(profile.display_name);
            setEditBio(profile.bio ?? '');
            setEditWatermark(profile.watermark_enabled);
            // Hydrate watermark mode from existing text — NULL = default
            // username URL, the literal "gmt-fractals.com" = platform mode,
            // anything else = custom.
            const txt = profile.watermark_text;
            if (txt === null || txt === undefined) {
                setWatermarkMode('username');
                setWatermarkCustom('');
            } else if (txt === 'gmt-fractals.com') {
                setWatermarkMode('platform');
                setWatermarkCustom('');
            } else {
                setWatermarkMode('custom');
                setWatermarkCustom(txt);
            }
        }
        if (setupMode && user) {
            const emailLocal = (user.email ?? '').split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '');
            setUsername(emailLocal.slice(0, 24));
            setSetupDisplayName(user.user_metadata?.full_name ?? user.user_metadata?.name ?? '');
        }
        setError(null);
        setSaved(false);
        setConfirmDelete(false);
    }, [visible, profile, setupMode, user]);

    // Debounced username availability check (setup mode only)
    useEffect(() => {
        if (!setupMode || username.length === 0) {
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
    }, [username, setupMode]);

    if (!visible) return null;

    const createProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (usernameStatus !== 'available' || !user) return;
        setBusy(true);
        setError(null);
        try {
            const { error } = await getSupabase().from('profiles').insert({
                id: user.id,
                username: username.toLowerCase(),
                display_name: setupDisplayName.trim() || username.toLowerCase(),
            });
            if (error) throw error;
            await refreshProfile();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    };

    const saveEdits = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;
        setBusy(true);
        setError(null);
        setSaved(false);
        try {
            const { error } = await getSupabase()
                .from('profiles')
                .update({
                    display_name: editDisplayName.trim() || profile.username,
                    bio: editBio.trim().length > 0 ? editBio.trim() : null,
                    watermark_enabled: editWatermarkEnabled,
                    watermark_text:
                        watermarkMode === 'username' ? null
                        : watermarkMode === 'platform' ? 'gmt-fractals.com'
                        : (watermarkCustom.trim() || null),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', profile.id);
            if (error) throw error;
            await refreshProfile();
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    };

    const signOut = async () => {
        setBusy(true);
        try {
            // authSignOut guarantees the local session is cleared even if the
            // server-side revoke fails, so closing the panel here is always
            // safe — the device is signed out regardless of the network result.
            await authSignOut();
            closeAccountPanel();
        } finally {
            setBusy(false);
        }
    };

    const deleteAccount = async () => {
        if (!profile) return;
        setBusy(true);
        setError(null);
        try {
            // Delete the profile row. The "users delete own profile" RLS
            // policy gates this; .select('id') forces a return so an
            // RLS-blocked no-op surfaces as an error instead of pretending
            // success. The FK on gallery_items.user_id is on delete set null,
            // so the user's submissions stay (orphaned to user_id=null).
            // The auth.users row itself requires service_role to delete —
            // user can sign in again and ensureProfile would recreate.
            // Full account erasure is a post-launch Edge Function (plan 45 H4).
            const { data, error: pErr } = await getSupabase()
                .from('profiles')
                .delete()
                .eq('id', profile.id)
                .select('id');
            if (pErr) throw pErr;
            if (!data || data.length === 0) {
                throw new Error('Account deletion blocked. Check RLS: needs "users delete own profile" policy.');
            }
            await authSignOut();
            closeAccountPanel();
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

    return (
        <Modal
            onClose={closeAccountPanel}
            z={Z.overlayTop}
            dismissOnBackdrop={false}
            dismissOnEscape={!setupMode}
            backdropClassName="bg-black/70 backdrop-blur-sm"
            className=""
        >
            <div
                className="bg-gray-900 border border-white/10 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] w-[420px] max-h-[90vh] overflow-y-auto"
                {...stopNavKeys({ allowEscape: true })}
            >
                <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <h2 className="text-sm font-bold text-white">
                        {setupMode ? 'Pick a username' : 'Account'}
                    </h2>
                    {!setupMode && (
                        <button onClick={closeAccountPanel} className="text-gray-500 hover:text-white text-lg leading-none">&times;</button>
                    )}
                </header>

                {error && (
                    <ErrorNote className="m-4 p-3 text-[10px] text-red-300">{error}</ErrorNote>
                )}

                {setupMode && (
                    <form onSubmit={createProfile} className="p-4 space-y-3">
                        <div className="text-[10px] text-gray-400 leading-relaxed">
                            You're signed in as <span className="font-mono text-cyan-300">{user?.email}</span>.
                            Pick a username so your submissions can be attributed to you.
                        </div>

                        <div>
                            <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider flex items-center justify-between mb-1">
                                <span>Username <span className="text-red-400">*</span></span>
                                <span className="font-normal normal-case">{usernameMsg()}</span>
                            </label>
                            <input
                                type="text"
                                value={username}
                                autoFocus
                                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                                disabled={busy}
                                maxLength={24}
                                className="w-full bg-gray-950 border border-white/10 rounded px-2 py-1.5 text-xs text-white font-mono outline-none focus:border-cyan-500"
                                placeholder="alice_42"
                            />
                        </div>

                        <div>
                            <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Display name</label>
                            <input
                                type="text"
                                value={setupDisplayName}
                                onChange={(e) => setSetupDisplayName(e.target.value)}
                                disabled={busy}
                                maxLength={60}
                                className="w-full bg-gray-950 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                                placeholder={username || 'Optional'}
                            />
                            <div className="text-[9px] text-gray-600 mt-1">Optional — defaults to your username</div>
                        </div>

                        <button
                            type="submit"
                            disabled={busy || usernameStatus !== 'available'}
                            className="w-full py-2 rounded text-[11px] font-bold bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            {busy ? 'Creating profile…' : 'Continue'}
                        </button>

                        <button
                            type="button"
                            onClick={signOut}
                            disabled={busy}
                            className="w-full text-center text-[10px] text-gray-500 hover:text-white"
                        >
                            Cancel and sign out
                        </button>
                    </form>
                )}

                {!setupMode && profile && (
                    <div className="p-4 space-y-4">
                        <form onSubmit={saveEdits} className="space-y-3">
                            <div>
                                <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Email</label>
                                <div className="text-xs text-gray-400 font-mono">{user?.email}</div>
                            </div>

                            <div>
                                <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Username</label>
                                <div className="text-xs text-cyan-300 font-mono">@{profile.username}</div>
                                <div className="text-[9px] text-gray-600 mt-1">Cannot be changed</div>
                            </div>

                            <div>
                                <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Display name</label>
                                <input
                                    type="text"
                                    value={editDisplayName}
                                    onChange={(e) => setEditDisplayName(e.target.value)}
                                    disabled={busy}
                                    maxLength={60}
                                    className="w-full bg-gray-950 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                                />
                            </div>

                            <div>
                                <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Bio</label>
                                <textarea
                                    value={editBio}
                                    onChange={(e) => setEditBio(e.target.value)}
                                    disabled={busy}
                                    maxLength={280}
                                    rows={2}
                                    className="w-full bg-gray-950 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500 resize-none"
                                    placeholder="A line or two about yourself"
                                />
                            </div>

                            <div className="border-t border-white/5 pt-3">
                                <label className="flex items-start gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={editWatermarkEnabled}
                                        onChange={(e) => setEditWatermark(e.target.checked)}
                                        disabled={busy}
                                        className="accent-cyan-500 mt-0.5"
                                    />
                                    <div className="flex-1 -mt-0.5">
                                        <div className="text-[10px] text-gray-300">Bake author signature into gallery submissions</div>
                                        <div className="text-[9px] text-gray-600 mt-0.5 leading-relaxed">
                                            Adds a small line of text in the bottom corner of your submitted images. You can override per-submission in the Submit dialog.
                                        </div>
                                    </div>
                                </label>

                                {editWatermarkEnabled && (
                                    <div className="mt-3 ml-6 space-y-1.5">
                                        <WatermarkChoice
                                            checked={watermarkMode === 'username'}
                                            onSelect={() => setWatermarkMode('username')}
                                            label={`Your URL · gmt-fractals.com/u/@${profile.username}`}
                                            disabled={busy}
                                        />
                                        <WatermarkChoice
                                            checked={watermarkMode === 'platform'}
                                            onSelect={() => setWatermarkMode('platform')}
                                            label="Just the site · gmt-fractals.com"
                                            disabled={busy}
                                        />
                                        <WatermarkChoice
                                            checked={watermarkMode === 'custom'}
                                            onSelect={() => setWatermarkMode('custom')}
                                            label="Custom text"
                                            disabled={busy}
                                        />
                                        {watermarkMode === 'custom' && (
                                            <input
                                                type="text"
                                                value={watermarkCustom}
                                                onChange={(e) => setWatermarkCustom(e.target.value)}
                                                disabled={busy}
                                                maxLength={80}
                                                placeholder="e.g. © Alice 2026"
                                                className="w-full mt-1 bg-gray-950 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                                            />
                                        )}
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={busy}
                                className="w-full py-2 rounded text-[11px] font-bold bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40 disabled:opacity-30"
                            >
                                {busy ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
                            </button>
                        </form>

                        <div className="border-t border-white/5 pt-4 space-y-2">
                            <GhostButton
                                onClick={signOut}
                                disabled={busy}
                                className="w-full py-2 rounded text-[11px] font-bold text-gray-300"
                            >
                                Sign out
                            </GhostButton>

                            {!confirmDelete ? (
                                <button
                                    onClick={() => setConfirmDelete(true)}
                                    disabled={busy}
                                    className="w-full py-2 rounded text-[10px] text-red-400 hover:text-red-300"
                                >
                                    Delete account
                                </button>
                            ) : (
                                <ErrorNote className="p-3 space-y-2">
                                    <div className="text-[10px] text-red-300 leading-relaxed">
                                        This deletes your profile and removes your submissions from the gallery. Cannot be undone.
                                    </div>
                                    <div className="flex gap-2">
                                        <GhostButton
                                            onClick={() => setConfirmDelete(false)}
                                            disabled={busy}
                                            className="flex-1 py-1.5 rounded text-[10px] text-gray-300"
                                        >
                                            Cancel
                                        </GhostButton>
                                        <GhostButton
                                            variant="danger"
                                            onClick={deleteAccount}
                                            disabled={busy}
                                            className="flex-1 py-1.5 rounded text-[10px]"
                                        >
                                            Delete forever
                                        </GhostButton>
                                    </div>
                                </ErrorNote>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

const WatermarkChoice: React.FC<{
    checked: boolean;
    onSelect: () => void;
    label: string;
    disabled: boolean;
}> = ({ checked, onSelect, label, disabled }) => (
    <label className={`flex items-center gap-2 cursor-pointer select-none ${disabled ? 'opacity-50' : ''}`}>
        <input
            type="radio"
            checked={checked}
            onChange={onSelect}
            disabled={disabled}
            className="accent-cyan-500"
        />
        <span className="text-[10px] text-gray-300">{label}</span>
    </label>
);
