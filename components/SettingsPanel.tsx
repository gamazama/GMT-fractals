import React, { useEffect, useMemo, useReducer, useState } from 'react';
import { Modal, Z } from './ui';
import { GhostButton } from './GhostButton';
import { CloseIcon } from './Icons';
import {
    useRegisteredSettings,
    type SettingDescriptor,
    type SettingValue,
} from '../store/settingsRegistry';
import { safeLocalGet, safeLocalKeys, safeLocalRemove } from '../store/safeLocalStorage';

/**
 * SettingsPanel — the generic user-preferences surface.
 *
 * Two parts, both data-driven (no per-pref code here):
 *  • Preferences — renders a control per {@link SettingDescriptor} registered in the
 *    settingsRegistry, grouped by `section`. Each subsystem owns its pref's get/set.
 *  • Storage — the raw localStorage inspector: every stored key + value, with per-key
 *    delete and a guarded "Clear all". This is the literal "reveal all the options".
 *
 * @invariant Engine-core (components/) — consumes the registry + safeLocal* guard +
 *   the Modal primitive; no app/domain imports. Apps register prefs + mount this.
 */
interface Props {
    open: boolean;
    onClose: () => void;
}

const Toggle: React.FC<{ on: boolean; onClick: () => void }> = ({ on, onClick }) => (
    <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onClick}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${on ? 'bg-cyan-600' : 'bg-white/15'}`}
    >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${on ? 'translate-x-4' : ''}`} />
    </button>
);

const SettingRow: React.FC<{ d: SettingDescriptor; onChanged: () => void }> = ({ d, onChanged }) => {
    const ctrl = d.control;

    // Custom controls own their own layout + writes — render full-width.
    if (ctrl.kind === 'custom') {
        return (
            <div className="py-2">
                {d.label && <div className="text-[12px] text-gray-200 mb-1.5">{d.label}</div>}
                {ctrl.render()}
            </div>
        );
    }

    const value = ctrl.kind === 'action' ? undefined : d.get?.();
    const apply = (v?: SettingValue) => { d.set?.(v); onChanged(); };

    let control: React.ReactNode = null;
    if (ctrl.kind === 'boolean') {
        control = <Toggle on={!!value} onClick={() => apply(!value)} />;
    } else if (ctrl.kind === 'number') {
        control = (
            <div className="flex items-center gap-1 shrink-0">
                <input
                    type="number"
                    value={typeof value === 'number' ? value : 0}
                    min={ctrl.min}
                    max={ctrl.max}
                    step={ctrl.step ?? 1}
                    onChange={(e) => apply(Number(e.target.value))}
                    className="w-20 bg-black/40 border border-white/10 rounded px-2 py-1 text-[11px] text-gray-200 outline-none focus:border-cyan-500/50"
                />
                {ctrl.unit && <span className="text-[10px] text-gray-500">{ctrl.unit}</span>}
            </div>
        );
    } else if (ctrl.kind === 'enum') {
        control = (
            <select
                value={String(value ?? '')}
                onChange={(e) => apply(e.target.value)}
                className="t-select w-36 shrink-0"
            >
                {ctrl.options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        );
    } else {
        control = (
            <GhostButton onClick={() => apply()} className="rounded px-3 py-1 text-[11px] text-gray-300 transition-colors shrink-0">
                {ctrl.buttonLabel}
            </GhostButton>
        );
    }

    return (
        <div className="flex items-center justify-between gap-4 py-2">
            <div className="min-w-0">
                <div className="text-[12px] text-gray-200">{d.label}</div>
                {d.description && <div className="text-[10px] text-gray-500 leading-snug mt-0.5">{d.description}</div>}
            </div>
            {control}
        </div>
    );
};

export const SettingsPanel: React.FC<Props> = ({ open, onClose }) => {
    const settings = useRegisteredSettings();
    const [tick, bump] = useReducer((n: number) => n + 1, 0);
    const [showStorage, setShowStorage] = useState(false);
    const [confirmClear, setConfirmClear] = useState(false);

    // Re-read pref values when any pref signals an external change.
    useEffect(() => {
        const unsubs = settings.map((s) => s.subscribe?.(bump)).filter(Boolean) as Array<() => void>;
        return () => unsubs.forEach((u) => u());
    }, [settings]);

    // Group by section, preserving registration order, then `order` within a section.
    const sections = useMemo(() => {
        const bySection = new Map<string, SettingDescriptor[]>();
        for (const s of settings) {
            const arr = bySection.get(s.section) ?? [];
            arr.push(s);
            bySection.set(s.section, arr);
        }
        for (const arr of bySection.values()) arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        return [...bySection.entries()];
    }, [settings]);

    // Raw storage inspector — recomputed on each tick (after deletes / writes).
    const storageEntries = useMemo(() => {
        void tick;
        return safeLocalKeys().sort().map((k) => ({ key: k, value: safeLocalGet(k) ?? '' }));
    }, [tick, showStorage]);

    if (!open) return null;

    return (
        <Modal onClose={onClose} z={Z.modal} backdropClassName="bg-black/70 backdrop-blur-sm">
            <div
                className="bg-gray-900 border border-white/10 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] w-[460px] max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                    <h2 className="text-sm font-bold text-white">Settings</h2>
                    <button onClick={onClose} title="Close" className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                        <CloseIcon />
                    </button>
                </header>

                <div className="overflow-y-auto px-4 py-2">
                    {sections.length === 0 && (
                        <div className="text-[11px] text-gray-500 py-4 text-center">No preferences registered.</div>
                    )}
                    {sections.map(([section, items]) => (
                        <section key={section} className="py-2">
                            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">{section}</div>
                            <div className="divide-y divide-white/5">
                                {items.map((d) => <SettingRow key={d.id} d={d} onChanged={bump} />)}
                            </div>
                        </section>
                    ))}

                    {/* Advanced: raw localStorage inspector */}
                    <section className="py-2 border-t border-white/10 mt-2">
                        <button
                            onClick={() => setShowStorage((v) => !v)}
                            className="w-full flex items-center justify-between text-[10px] uppercase tracking-wider text-gray-500 font-bold py-1 hover:text-gray-300 transition-colors"
                        >
                            <span>Storage ({storageEntries.length})</span>
                            <span>{showStorage ? '−' : '+'}</span>
                        </button>
                        {showStorage && (
                            <div className="mt-1">
                                <div className="text-[10px] text-gray-500 mb-2 leading-snug">
                                    All locally-stored keys for this app. Deleting one resets that option to its default.
                                </div>
                                <div className="max-h-52 overflow-y-auto divide-y divide-white/5 rounded border border-white/10 bg-black/30">
                                    {storageEntries.length === 0 && (
                                        <div className="text-[10px] text-gray-600 px-2 py-2">empty</div>
                                    )}
                                    {storageEntries.map(({ key, value }) => (
                                        <div key={key} className="flex items-center gap-2 px-2 py-1.5">
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[10px] font-mono text-gray-300 truncate">{key}</div>
                                                <div className="text-[9px] font-mono text-gray-600 truncate">{value}</div>
                                            </div>
                                            <button
                                                onClick={() => { safeLocalRemove(key); bump(); }}
                                                title={`Delete ${key}`}
                                                className="p-1 rounded hover:bg-red-500/20 text-gray-600 hover:text-red-300 transition-colors shrink-0"
                                            >
                                                <CloseIcon size={9} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-end mt-2">
                                    {confirmClear ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-red-300">Delete all stored data?</span>
                                            <GhostButton onClick={() => setConfirmClear(false)} className="rounded px-2 py-1 text-[10px] text-gray-300 transition-colors">Cancel</GhostButton>
                                            <button
                                                onClick={() => { storageEntries.forEach(({ key }) => safeLocalRemove(key)); setConfirmClear(false); bump(); }}
                                                className="rounded px-2 py-1 text-[10px] bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500/40 transition-colors"
                                            >
                                                Clear all
                                            </button>
                                        </div>
                                    ) : (
                                        <GhostButton onClick={() => setConfirmClear(true)} className="rounded px-2 py-1 text-[10px] text-gray-400 transition-colors">
                                            Clear all data…
                                        </GhostButton>
                                    )}
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </Modal>
    );
};

export default SettingsPanel;
