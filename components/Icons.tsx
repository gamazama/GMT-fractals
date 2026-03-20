
import React from 'react';

//NOTE!!!
//THIS ICONS FILE IS FULL. TO AVOID REGRESSIONS, PLEASE CREATE or USE components/Icons2.tsx
// --- NAVIGATION & ARROWS ---
export const ChevronDown = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>;
export const ChevronUp = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>;
export const ChevronLeft = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>;
export const ChevronRight = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;
export const ArrowIcon = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;

// --- WINDOW & LAYOUT ---
export const UndockIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        <polyline points="15 3 21 3 21 9"></polyline>
        <line x1="10" x2="21" y2="3"></line>
    </svg>
);
export const DockIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="15" y1="3" x2="15" y2="21"></line>
    </svg>
);
export const FloatIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <path d="M15 9h-6v6h6z"></path>
    </svg>
);
export const FullscreenIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
);
export const ResizeHandleIcon = () => (
    <svg width="100%" height="100%" viewBox="0 0 10 10">
        <path d="M 6 10 L 10 6 L 10 10 Z" fill="currentColor" opacity="0.5" />
    </svg>
);
export const DragHandleIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="9" x2="20" y2="9"></line>
        <line x1="4" y1="15" x2="20" y2="15"></line>
    </svg>
);

// --- ACTIONS & STATUS ---
export const TrashIcon = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
export const CloseIcon = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
export const MenuIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>;
export const SaveIcon = () => <svg width="16" height="16" viewBox="0 0 512 512" fill="currentColor"><path d="M0,0v512h512V106.9l-6.5-7.3L412.4,6.5L405.1,0H0z M46.5,46.5h69.8v139.6h279.3V56.7l69.8,69.8v338.9h-46.5V256H93.1v209.5H46.5V46.5z M162.9,46.5H256V93h46.5V46.5H349v93.1H162.9V46.5z M139.6,302.5h232.7v162.9H139.6V302.5z" /></svg>;
export const LoadIcon = () => <svg width="16" height="16" viewBox="190 230 680 620" fill="currentColor"><path d="M257.3312 451.84V332.8c0-42.3936 34.2016-76.8 76.4416-76.8h107.8272c29.5936 0 56.5248 17.152 69.12 44.032l14.8992 31.6416a25.4976 25.4976 0 0 0 23.04 14.6944h192.8192c42.1888 0 76.4416 34.3552 76.4416 76.8v28.672a76.8 76.8 0 0 1 50.9952 88.064l-43.3152 217.6A76.544 76.544 0 0 1 750.6432 819.2H324.5568a76.544 76.544 0 0 1-74.9568-61.7472l-43.3152-217.6a76.8512 76.8512 0 0 1 51.0464-88.0128z m509.5936-3.84v-24.832c0-14.1312-11.4176-25.6-25.4464-25.6h-192.8192a76.4416 76.4416 0 0 1-69.12-44.032l-14.848-31.6928A25.4976 25.4976 0 0 0 441.6 307.2H333.7216a25.5488 25.5488 0 0 0-25.4976 25.6v115.2h458.6496z m-485.6832 51.2a25.6 25.6 0 0 0-24.9856 30.6176l43.3152 217.6c2.4064 11.9808 12.8512 20.5824 24.9856 20.5824h426.0864a25.4976 25.4976 0 0 0 24.9856-20.5824l43.3152-217.6a25.7024 25.7024 0 0 0-24.9856-30.6176H281.2416z" /></svg>;
export const InfoIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" cy="16" x2="12" y2="12" /><line x1="12" cy="8" x2="12.01" y2="8" /></svg>;
export const HelpIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
export const UndoIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10h10a5 5 0 0 1 5 5v2" /><path d="M7 6l-4 4 4 4" /></svg>;
export const RedoIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10h-10a5 5 0 0 0 -5 5v2" /><path d="M17 6l4 4 -4 4" /></svg>;
export const ResetIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>;
export const CheckIcon = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
export const UploadIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>;
export const DownloadIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
export const PlusIcon = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
export const CopyIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
export const AlertIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>;
export const SmartphoneRotateIcon = () => <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><path d="M12 18h.01"></path></svg>;
export const SpinnerIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);
export const CodeIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>;
export const SmileyIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>;
export const CubeIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
export const SelectAllIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 4" />
        <path d="M9 12l2 2 4-4" />
    </svg>
);
export const SquareIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>;
export const CircleIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>;
export const GearIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;

// --- TOOLS & OBJECTS ---
export const CameraIcon = () => <svg width="14" height="14" viewBox="0 0 512 512" fill="currentColor"><path d="M167.4,59.1l-6.2,8l-23.4,31.4h-19.7V78.8H39.4v19.7H0v354.5h512V98.5H374.2l-23.4-31.4l-6.2-8H167.4z M187.1,98.5h137.8l23.4,31.4l6.2,8h118.2v78.8H358.2c-20.5-35.2-58.7-59.1-102.2-59.1s-81.6,23.9-102.2,59.1H39.4v-78.8h118.2l6.2-8L187.1,98.5z M393.8,157.5v39.4h39.4v-39.4H393.8z M256,196.9c43.8,0,78.8,35,78.8,78.8s-35,78.8-78.8,78.8s-78.8-35-78.8-78.8S212.2,196.9,256,196.9z M39.4,256h100.3c-1.1,6.3-1.8,13.1-1.8,19.7c0,65,53.2,118.2,118.2,118.2s118.2-53.2,118.2-118.2c0-6.6-0.8-13.4-1.8-19.7h100.3v157.5H39.4V256z" /></svg>;
export const GizmoIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18" /><path d="M3 12h18" /><circle cx="12" cy="12" r="3" /></svg>;
export const ShadowIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>;
export const LayersIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>;
export const PathTraceIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l-5 9h10l-5 9" /><path d="M12 2v20" /></svg>;
export const CropIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M18 22V8a2 2 0 0 0-2-2H2" /></svg>;
export const CloseRegionIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>;
export const RenderGridIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><path d="M3 14h7v7H3z" fill="currentColor" stroke="none" /></svg>;
export const TimelineOpenIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/></svg>;
export const NetworkIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><path d="M10 7h4"/><path d="M17 10v4"/></svg>;

// --- LIGHTING & ANIMATION MARKERS ---
export const AnchorIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V8" /><path d="M5 12H2a10 10 0 0 0 20 0h-3" /><circle cx="12" cy="5" r="3" /></svg>;
export const UnanchoredIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 18V8" /><path d="M5 12H2a10 10 0 0 0 20 0h-3" /><circle cx="12" cy="5" r="3" /><line x1="3" y1="21" x2="21" y2="3" stroke="currentColor" opacity="0.9" /></svg>;

export type KeyStatus = 'none' | 'partial' | 'keyed' | 'dirty' | 'keyed-dirty';
export const KeyIcon = ({ status }: { status: KeyStatus }) => {
    // Colors based on status
    let strokeColor = 'currentColor';
    if (status === 'keyed' || status === 'partial') strokeColor = '#f59e0b';
    else if (status === 'dirty' || status === 'keyed-dirty') strokeColor = '#ef4444';
    
    // Fill
    const fillColor = (status === 'keyed' || status === 'keyed-dirty') ? strokeColor : 'none';
    
    return (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2.5">
            <path d="M12 2L2 12l10 10 10-10L12 2z" fill={fillColor} />
        </svg>
    );
};

export const LinkIcon = ({ active }: { active?: boolean }) => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={active ? "#22d3ee" : "#666"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>;
export const BrokenIcon = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13l-4 4" /><path d="M14 11l4 -4" /></svg>;
export const LogicIcon = ({ active }: { active?: boolean }) => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={active ? "#f59e0b" : "#666"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>;
export const FolderIcon = ({ open }: { open: boolean }) => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? 'rotate-90' : ''}`}><path d="M9 18l6-6-6-6" /></svg>;

// --- RANDOMIZATION ---
export const DiceIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 8h.01"></path><path d="M8 8h.01"></path><path d="M8 16h.01"></path><path d="M16 16h.01"></path><path d="M12 12h.01"></path></svg>;
export const ShuffleIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>;

// --- TIMELINE ---
export const PlayIcon = () => <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>;
export const PauseIcon = () => <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>;
export const StopIcon = () => <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>;
export const RecordIcon = ({ active }: { active: boolean }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" stroke={active ? "none" : "currentColor"} fill={active ? "#ef4444" : "none"} />
    </svg>
);
export const CameraKeyIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
    </svg>
);
export const CurveIcon = ({ active }: { active: boolean }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={active ? "#22d3ee" : "currentColor"} strokeWidth="2">
        <path d="M3 18C3 18 6 5 12 12C18 19 21 5 21 5" />
    </svg>
);
export const BarsIcon = ({ active }: { active: boolean }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={active ? "#22d3ee" : "currentColor"} strokeWidth="2">
        <rect x="3" y="8" width="6" height="8" />
        <rect x="15" y="8" width="6" height="8" />
    </svg>
);
export const CheckeredFlagIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <path d="M4 22v-7" />
        <path d="M8 4v10" />
        <path d="M12 5v10" />
        <path d="M16 4v10" />
        <path d="M4 8h16" />
        <path d="M4 12h16" />
    </svg>
);
export const BakeIcon = ({ active }: { active: boolean }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
);

export const LoopIcon = ({ mode }: { mode: 'Loop' | 'Once' | 'PingPong' }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {mode === 'Loop' || mode === 'PingPong' ? (
             <path d="M17 2l4 4-4 4 M3 11v-1a4 4 0 0 1 4-4h14 M7 22l-4-4 4-4 M21 13v1a4 4 0 0 1-4 4H3" />
        ) : (
             <path d="M5 12h14 M12 5l7 7-7 7" />
        )}
    </svg>
);

export const WaveRecordIcon = ({ active, arming }: { active: boolean, arming: boolean }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12h18" strokeOpacity={active || arming ? 0.3 : 0.2} />
        <path d="M3 12 Q 6 2, 9 12 T 15 12 T 21 12" stroke={active ? "#ef4444" : (arming ? "#fca5a5" : "currentColor")} />
        {arming && !active && <circle cx="12" cy="12" r="3" fill="#fca5a5" stroke="none" />}
    </svg>
);

// Graph Editor Specific
export const FitIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 14 10 14 10 20"></polyline>
        <polyline points="20 10 14 10 14 4"></polyline>
        <line x1="14" y1="10" x2="21" y2="3"></line>
        <line x1="3" y1="21" x2="10" y2="14"></line>
    </svg>
);

export const FitSelectionIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>
    </svg>
);

export const MagnetIcon = ({ active }: { active: boolean }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M6 3v18M18 3v18M4 9h16M4 15h16" strokeOpacity={active ? 1 : 0.5} />
    </svg>
);

export const NormIcon = ({ active }: { active: boolean }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={active ? "#22d3ee" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="20" x2="20" y2="20"></line>
        <line x1="4" y1="4" x2="20" y2="4"></line>
        <polyline points="4 14 8 10 12 14 16 10 20 14"></polyline>
    </svg>
);

export const FilterIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <path d="M4 12h16" />
        <path d="M12 4v16" />
        <path d="M16 16l-4 4-4-4" />
    </svg>
);

export const MagicIcon = ({ active }: { active?: boolean }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={active ? "#22d3ee" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 13l-7-7-7 7" />
        <path d="M5 19l7-7 7 7" />
        <path d="M12 5l2-2 2 2-2 2-2-2z" fill={active ? "#22d3ee" : "none"} stroke="none" />
        <path d="M12 5l-2-2-2 2 2 2 2-2z" fill={active ? "#22d3ee" : "none"} stroke="none" />
    </svg>
);

export const WaveIcon = ({ active }: { active?: boolean }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={active ? "#22d3ee" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 7-7 7 7 7 7 3-7 7-7" />
    </svg>
);

export const EyeIcon = ({ active }: { active: boolean }) => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={active ? 'text-gray-200' : 'text-gray-600'}>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>
);
