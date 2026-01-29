
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
            className={`p-0.5 rounded hover:bg-white/10 transition-colors shrink-0 ${
                status === 'keyed' ? 'text-amber-400' :
                status === 'keyed-dirty' ? 'text-red-500' :
                status === 'dirty' ? 'text-red-500' :
                status === 'partial' ? 'text-orange-500 hover:text-amber-300' :
                'text-gray-600 hover:text-amber-200'
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
