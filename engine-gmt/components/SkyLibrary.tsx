import React, { useEffect, useRef, useState } from 'react';
import type { FeatureComponentProps } from '../../components/registry/ComponentRegistry';

/**
 * SkyLibrary — the Sky Image source's loader row + sky library.
 *
 * Owns the WHOLE image row for materials.envMapData (the param itself is
 * `hidden` — this replaces AutoFeaturePanel's generic image widget for the env
 * map): [Load Image | Skies ▾ | profile chip], with the library collapsed
 * behind the Skies button (owner spec — the sample list must not be
 * permanently open).
 *
 * Library contents:
 *  - Four BUNDLED sample skies (public/skies/*.hdr, ~1–1.7 MB each, fetched on
 *    pick). Selecting sets envMapData to the plain URL — the texture pipeline
 *    fetches http/path .hdr URLs and RGBE-parses them in the worker (the
 *    gallery-sky path), so saved scenes carry a short string, not base64.
 *  - USER skies: every custom upload is auto-saved to IndexedDB
 *    ('gmt-sky-library') and listed here with a delete button. Stored as
 *    dataURLs (HDRs are megabytes — IndexedDB, never localStorage). Scenes
 *    still embed the dataURL as before; the library is a local convenience
 *    shelf, not a new scene format.
 *
 * Registered as 'sky-library' (app-gmt/registerFeatures.ts); mounted by the
 * materials feature's customUI under Source = Sky Image.
 */

type UserSky = { id: string; name: string; data: string; colorSpace: number };

// ── Tiny IndexedDB shelf (no deps; first IDB use in the app) ────────────────
const DB_NAME = 'gmt-sky-library';
const STORE = 'skies';
// Skip persisting monster files (~18 MB binary as dataURL) — the sky still
// LOADS into the scene; it just doesn't join the local shelf.
const MAX_SAVE_CHARS = 24_000_000;

const openDb = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
});
const idbAll = async (): Promise<UserSky[]> => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const req = db.transaction(STORE).objectStore(STORE).getAll();
        req.onsuccess = () => resolve(req.result as UserSky[]);
        req.onerror = () => reject(req.error);
    });
};
const idbPut = async (sky: UserSky): Promise<void> => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(sky);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};
const idbDelete = async (id: string): Promise<void> => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

const SAMPLE_SKIES = [
    { id: 'sky-cloudy', label: 'Cloudy Sky' },
    { id: 'studio-natural', label: 'Natural Studio' },
    { id: 'studio-softbox', label: 'Softbox Studio' },
    { id: 'studio-window', label: 'Window Studio' },
] as const;

const PROFILE_LABELS: Record<number, string> = { 0: 'sRGB', 1: 'LIN', 2: 'ACES' };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Cheap active-check for megabyte dataURLs: length + prefix, no full compare.
const sameData = (a?: string | null, b?: string | null) =>
    !!a && !!b && a.length === b.length && a.slice(0, 64) === b.slice(0, 64);

export const SkyLibrary: React.FC<FeatureComponentProps> = ({ featureId, sliceState, actions }) => {
    const setter = (actions as Record<string, (u: Record<string, unknown>) => void>)[`set${cap(featureId)}`];
    const current: string | null = sliceState?.envMapData ?? null;
    const colorSpace: number = sliceState?.envMapColorSpace ?? 0;

    const [open, setOpen] = useState(false);
    const [userSkies, setUserSkies] = useState<UserSky[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        idbAll().then(setUserSkies).catch(() => setUserSkies([]));
    }, []);

    const applySky = (data: string, cs: number) =>
        setter?.({ envMapData: data, useEnvMap: true, envMapColorSpace: cs });

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // HDR/EXR payloads are linear; plain images default to sRGB. The chip
        // stays live for overrides.
        const cs = /\.(hdr|exr)$/i.test(file.name) ? 1 : 0;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const data = ev.target?.result as string;
            if (!data) return;
            applySky(data, cs);
            // Auto-save to the local shelf (owner spec). Oversize skies still
            // load — they just don't persist.
            if (data.length <= MAX_SAVE_CHARS) {
                const sky: UserSky = { id: `user-${Date.now()}`, name: file.name.replace(/\.[^.]+$/, ''), data, colorSpace: cs };
                try {
                    await idbPut(sky);
                    setUserSkies((prev) => [...prev, sky]);
                } catch (err) {
                    console.warn('[SkyLibrary] could not persist sky:', err);
                }
            } else {
                console.warn('[SkyLibrary] sky too large to persist locally (loads anyway):', file.name);
            }
        };
        reader.readAsDataURL(file);
        e.target.value = ''; // allow re-selecting the same file
    };

    const removeSky = (id: string) => {
        idbDelete(id).catch(() => {});
        setUserSkies((prev) => prev.filter((s) => s.id !== id));
    };

    const cycleProfile = () => setter?.({ envMapColorSpace: (colorSpace + 1) % 3 });

    return (
        <div className="pb-1">
            {/* Loader row: [Load Image | Skies toggle | profile chip] */}
            <div className="flex items-stretch bg-surface-header border border-line/5 overflow-hidden">
                <input ref={fileRef} type="file" accept="image/*,.hdr,.exr" onChange={handleFile} className="hidden" />
                <button
                    onClick={() => fileRef.current?.click()}
                    className="flex-1 bg-accent-900/40 hover:bg-accent-800/60 text-accent-300 py-2 text-xs font-bold transition-colors"
                >
                    {current ? 'Replace Texture' : 'Load Image'}
                </button>
                <button
                    onClick={() => setOpen((o) => !o)}
                    title="Sample + saved skies"
                    className={`px-2.5 text-[10px] font-bold border-l border-line/10 transition-colors ${open ? 'bg-accent-800/60 text-accent-200' : 'bg-surface-header text-fg-dim hover:text-fg hover:bg-line/10'}`}
                >
                    Skies {open ? '▴' : '▾'}
                </button>
                <div
                    onClick={cycleProfile}
                    title="Input Color Profile: sRGB / Linear / ACES"
                    className="flex items-center px-1.5 text-[8px] font-bold text-fg-dim bg-surface/50 border-l border-line/10 cursor-pointer hover:text-fg hover:bg-accent-900/80 transition-colors select-none"
                >
                    {PROFILE_LABELS[colorSpace] ?? 'sRGB'}
                </div>
            </div>

            {/* Library — collapsed behind the Skies button */}
            {open && (
                <div className="mt-1 px-0.5">
                    <div className="text-[8px] text-fg-faint mb-1">Sample skies</div>
                    <div className="grid grid-cols-4 gap-1">
                        {SAMPLE_SKIES.map((s) => {
                            const url = `/skies/${s.id}.hdr`;
                            const active = current === url;
                            return (
                                <button
                                    key={s.id}
                                    title={s.label}
                                    onClick={() => applySky(url, 1)}
                                    className={`relative rounded overflow-hidden border transition-all hover:scale-105 active:scale-95 ${active ? 'border-accent-400 shadow-[0_0_5px_rgb(var(--accent-glow))]' : 'border-line/10 hover:border-line/40'}`}
                                >
                                    <img src={`/skies/${s.id}.thumb.jpg`} alt={s.label} draggable={false} className="w-full h-7 object-cover select-none" />
                                </button>
                            );
                        })}
                    </div>
                    {userSkies.length > 0 && (
                        <>
                            <div className="text-[8px] text-fg-faint mt-2 mb-1">My skies</div>
                            <div className="flex flex-col gap-0.5">
                                {userSkies.map((s) => {
                                    const active = sameData(current, s.data);
                                    return (
                                        <div key={s.id} className={`flex items-center rounded border transition-colors ${active ? 'border-accent-400 bg-accent-900/20' : 'border-line/10 hover:border-line/30'}`}>
                                            <button
                                                onClick={() => applySky(s.data, s.colorSpace)}
                                                className="flex-1 text-left px-2 py-1 text-[9px] text-fg-muted hover:text-fg truncate"
                                                title={s.name}
                                            >
                                                {s.name}
                                            </button>
                                            <button
                                                onClick={() => removeSky(s.id)}
                                                title="Remove from library"
                                                className="px-1.5 text-[9px] text-fg-faint hover:text-danger"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default SkyLibrary;
