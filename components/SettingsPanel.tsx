import React, { useEffect, useMemo, useReducer, useState } from 'react';
import { FloatingPanel, Z } from './ui';
import { GhostButton } from './GhostButton';
import { CloseIcon } from './Icons';
import {
    useRegisteredSettings,
    type SettingDescriptor,
    type SettingValue,
} from '../store/settingsRegistry';
import { safeLocalGet, safeLocalKeys, safeLocalRemove } from '../store/safeLocalStorage';

/**
 * SettingsPanel — the generic user-preferences surface. A floating, draggable,
 * resizable window (not a blocking modal) so it stays open while you tweak the
 * live app (e.g. watch a colour scheme update behind it).
 *
 * Data-driven (no per-pref code here): renders a control per {@link SettingDescriptor}
 * registered in the settingsRegistry, organised into top-level TABS (`tab`, default
 * 'Interface') then sub-sections (`section`). The Files tab also hosts the raw
 * localStorage inspector. Each subsystem owns its pref's get/set.
 *
 * @invariant Engine-core (components/) — consumes the registry + safeLocal* guard +
 *   the FloatingPanel primitive; no app/domain imports. Apps register prefs + mount this.
 */
interface Props {
    open: boolean;
    onClose: () => void;
}

/** Preferred tab order; tabs not listed here are appended in registration order. */
const TAB_ORDER = ['Interface', 'Files', 'Hardware'];

const Toggle: React.FC<{ on: boolean; onClick: () => void }> = ({ on, onClick }) => (
    <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onClick}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${on ? 'bg-accent-600' : 'bg-line/15'}`}
    >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-fg transition-transform ${on ? 'translate-x-4' : ''}`} />
    </button>
);

const SettingRow: React.FC<{ d: SettingDescriptor; onChanged: () => void }> = ({ d, onChanged }) => {
    const ctrl = d.control;

    // Custom controls own their own layout + writes — render full-width.
    if (ctrl.kind === 'custom') {
        return (
            <div className="py-2">
                {d.label && <div className="text-[12px] text-fg-secondary mb-1.5">{d.label}</div>}
                {ctrl.render()}
                {d.description && <div className="text-[10px] text-fg-dim leading-snug mt-1">{d.description}</div>}
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
                    className="w-20 bg-surface-sunken border border-line/10 rounded px-2 py-1 text-[11px] text-fg-secondary outline-none focus:border-accent-500/50"
                />
                {ctrl.unit && <span className="text-[10px] text-fg-dim">{ctrl.unit}</span>}
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
            <GhostButton onClick={() => apply()} className="rounded px-3 py-1 text-[11px] text-fg-tertiary transition-colors shrink-0">
                {ctrl.buttonLabel}
            </GhostButton>
        );
    }

    return (
        <div className="flex items-center justify-between gap-4 py-2">
            <div className="min-w-0">
                <div className="text-[12px] text-fg-secondary">{d.label}</div>
                {d.description && <div className="text-[10px] text-fg-dim leading-snug mt-0.5">{d.description}</div>}
            </div>
            {control}
        </div>
    );
};

export const SettingsPanel: React.FC<Props> = ({ open, onClose }) => {
    const settings = useRegisteredSettings();
    const [tick, bump] = useReducer((n: number) => n + 1, 0);
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [confirmClear, setConfirmClear] = useState(false);

    // Re-read pref values when any pref signals an external change.
    useEffect(() => {
        const unsubs = settings.map((s) => s.subscribe?.(bump)).filter(Boolean) as Array<() => void>;
        return () => unsubs.forEach((u) => u());
    }, [settings]);

    // Group by tab → section, preserving registration order, then `order` within a
    // section. `when?` predicates gate visibility (re-evaluated via `tick`).
    const byTab = useMemo(() => {
        void tick;
        const m = new Map<string, Map<string, SettingDescriptor[]>>();
        for (const s of settings) {
            if (s.when && !s.when()) continue;
            const tab = s.tab ?? 'Interface';
            const sections = m.get(tab) ?? new Map<string, SettingDescriptor[]>();
            const arr = sections.get(s.section) ?? [];
            arr.push(s);
            sections.set(s.section, arr);
            m.set(tab, sections);
        }
        for (const sections of m.values()) {
            for (const arr of sections.values()) arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        }
        return m;
    }, [settings, tick]);

    // Tab list: preferred order first, then any extras. 'Files' always present
    // because it hosts the storage inspector.
    const tabs = useMemo(() => {
        const present = new Set(byTab.keys());
        present.add('Files');
        const ordered = TAB_ORDER.filter((t) => present.has(t));
        for (const t of present) if (!ordered.includes(t)) ordered.push(t);
        return ordered;
    }, [byTab]);

    const current = activeTab && tabs.includes(activeTab) ? activeTab : tabs[0];

    // Raw storage inspector — recomputed on each tick (after deletes / writes).
    const storageEntries = useMemo(() => {
        void tick;
        return safeLocalKeys().sort().map((k) => ({ key: k, value: safeLocalGet(k) ?? '' }));
    }, [tick]);

    if (!open) return null;

    const initialPos = typeof window !== 'undefined'
        ? { x: Math.max(20, window.innerWidth / 2 - 220), y: 64 }
        : { x: 200, y: 64 };

    const currentSections = byTab.get(current);

    return (
        <FloatingPanel
            z={Z.modal}
            initialPosition={initialPos}
            initialSize={{ width: 440, height: 560 }}
            minSize={{ width: 340, height: 280 }}
            draggable
            resizable
            dismissOnEscape
            onClose={onClose}
            showClose
            title="Settings"
            className="glass-panel flex flex-col overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
            bodyClassName="flex flex-col min-h-0 flex-1"
        >
            {/* Tab bar */}
            <div className="flex items-center gap-1 px-2 pt-2 shrink-0 border-b border-line/10 bg-surface-header/40">
                {tabs.map((t) => (
                    <button
                        key={t}
                        onClick={() => setActiveTab(t)}
                        className={`px-3 py-1.5 text-[11px] font-bold rounded-t transition-colors -mb-px border-b-2 ${
                            t === current
                                ? 'text-accent border-accent'
                                : 'text-fg-dim border-transparent hover:text-fg-tertiary'
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="overflow-y-auto overflow-x-hidden custom-scroll px-4 py-2 flex-1 min-h-0">
                {currentSections && [...currentSections.entries()].map(([section, items]) => (
                    <section key={section} className="py-2">
                        <div className="text-[10px] uppercase tracking-wider text-fg-dim font-bold mb-1">{section}</div>
                        <div className="divide-y divide-line/5">
                            {items.map((d) => <SettingRow key={d.id} d={d} onChanged={bump} />)}
                        </div>
                    </section>
                ))}

                {current === 'Files' && (
                    <section className="py-2">
                        <div className="text-[10px] uppercase tracking-wider text-fg-dim font-bold mb-1">Storage</div>
                        <div className="text-[10px] text-fg-dim mb-2 leading-snug">
                            All locally-stored keys for this app. Deleting one resets that option to its default.
                        </div>
                        <div className="max-h-72 overflow-y-auto custom-scroll divide-y divide-line/5 rounded border border-line/10 bg-surface-section">
                            {storageEntries.length === 0 && (
                                <div className="text-[10px] text-fg-faint px-2 py-2">empty</div>
                            )}
                            {storageEntries.map(({ key, value }) => (
                                <div key={key} className="flex items-center gap-2 px-2 py-1.5">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[10px] font-mono text-fg-tertiary truncate">{key}</div>
                                        <div className="text-[9px] font-mono text-fg-faint truncate">{value}</div>
                                    </div>
                                    <button
                                        onClick={() => { safeLocalRemove(key); bump(); }}
                                        title={`Delete ${key}`}
                                        className="p-1 rounded hover:bg-danger/20 text-fg-faint hover:text-danger transition-colors shrink-0"
                                    >
                                        <CloseIcon size={9} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end mt-2">
                            {confirmClear ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-danger">Delete all stored data?</span>
                                    <GhostButton onClick={() => setConfirmClear(false)} className="rounded px-2 py-1 text-[10px] text-fg-tertiary transition-colors">Cancel</GhostButton>
                                    <GhostButton
                                        variant="danger"
                                        onClick={() => { storageEntries.forEach(({ key }) => safeLocalRemove(key)); setConfirmClear(false); bump(); }}
                                        className="rounded px-2 py-1 text-[10px] transition-colors"
                                    >
                                        Clear all
                                    </GhostButton>
                                </div>
                            ) : (
                                <GhostButton onClick={() => setConfirmClear(true)} className="rounded px-2 py-1 text-[10px] text-fg-muted transition-colors">
                                    Clear all data…
                                </GhostButton>
                            )}
                        </div>
                    </section>
                )}

                {!currentSections && current !== 'Files' && (
                    <div className="text-[11px] text-fg-dim py-6 text-center">No preferences in this tab.</div>
                )}
            </div>
        </FloatingPanel>
    );
};

export default SettingsPanel;
