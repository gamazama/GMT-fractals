/**
 * ActiveSnapshotFeatures — footer helper for <StateLibraryPanel> that
 * exposes the params being saved when a snapshot is active.
 *
 * The pattern: when the user selects a saved camera/view, they often
 * want to fine-tune the live state — the same fields the snapshot
 * captured. Rendering the relevant DDFS feature panel(s) inside the
 * library footer puts those editors right next to the list.
 *
 * Usage:
 *   <StateLibraryPanel
 *       ...
 *       footer={
 *           <ActiveSnapshotFeatures
 *               activeIdKey="activeViewId"
 *               featureIds={['julia']}
 *               label="Active View"
 *               onDeselect={() => selectView(null)}
 *           />
 *       }
 *   />
 *
 * Renders nothing when there's no active snapshot — the panel collapses
 * to just the list. Apps that need richer footers (camera position
 * read-out, composition guides, etc.) can wrap this or build their own.
 */

import React from 'react';
import { useEngineStore } from '../store/engineStore';
import { AutoFeaturePanel } from './AutoFeaturePanel';
import { SectionLabel } from './SectionLabel';

export interface ActiveSnapshotFeaturesProps {
    /** Field name on the store that holds the active snapshot id. */
    activeIdKey: string;
    /** DDFS feature ids whose params to render when active. */
    featureIds: string[];
    /** Header label. Defaults to 'Active'. */
    label?: string;
    /** Optional groupFilter applied to every featureId. */
    groupFilter?: string;
    /** Optional excludeParams applied to every featureId. */
    excludeParams?: string[];
    /** Optional whitelist applied to every featureId. */
    whitelistParams?: string[];
    /** Called when the user clicks the Deselect button. Hides the
     *  button when omitted. */
    onDeselect?: () => void;
    /** Free-camera label shown when no snapshot is active. Set to
     *  null to hide the section entirely while inactive. Default: hide. */
    inactiveLabel?: string | null;
}

export const ActiveSnapshotFeatures: React.FC<ActiveSnapshotFeaturesProps> = ({
    activeIdKey,
    featureIds,
    label = 'Active',
    groupFilter,
    excludeParams,
    whitelistParams,
    onDeselect,
    inactiveLabel = null,
}) => {
    const activeId = useEngineStore((s) => (s as any)[activeIdKey]);

    if (!activeId && inactiveLabel === null) return null;

    return (
        <div className="border-t border-white/10 bg-black/40 p-2 space-y-2">
            <div className="flex items-center justify-between">
                <SectionLabel>{activeId ? label : (inactiveLabel ?? '')}</SectionLabel>
                {activeId && onDeselect && (
                    <button
                        type="button"
                        onClick={onDeselect}
                        className="text-[9px] text-gray-500 hover:text-white px-2 py-0.5 rounded border border-white/10 hover:bg-white/5 transition-colors"
                    >
                        Deselect
                    </button>
                )}
            </div>

            {activeId && featureIds.map((fid) => (
                <div key={fid} className="bg-white/5 rounded p-1">
                    <AutoFeaturePanel
                        featureId={fid}
                        groupFilter={groupFilter}
                        excludeParams={excludeParams}
                        whitelistParams={whitelistParams}
                    />
                </div>
            ))}
        </div>
    );
};

export default ActiveSnapshotFeatures;
