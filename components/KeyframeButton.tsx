
import React from 'react';
import { KeyIcon, KeyStatus } from './Icons';

interface KeyframeButtonProps {
    status: KeyStatus;
    onClick: () => void;
    className?: string;
}

export const KeyframeButton: React.FC<KeyframeButtonProps> = ({ status, onClick, className = "" }) => {
    return (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            tabIndex={-1}
            className={`p-0.5 rounded hover:bg-line/10 transition-colors shrink-0 ${
                status === 'keyed' ? 'text-warn' :
                status === 'keyed-dirty' ? 'text-danger' :
                status === 'dirty' ? 'text-danger' :
                status === 'partial' ? 'text-warn hover:text-warn' :
                'text-fg-faint hover:text-warn'
            } ${className}`}
            title={
                status === 'none' ? "Add Keyframe" : 
                status === 'dirty' ? "Add Key (Value mismatch)" : 
                status === 'keyed-dirty' ? "Update Key (Value changed)" : 
                status === 'partial' ? "Add Key (Track exists)" : 
                "Remove Key"
            }
        >
            <KeyIcon status={status} />
        </button>
    );
};
