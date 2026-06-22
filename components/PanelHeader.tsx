
import React from 'react';

interface PanelHeaderProps {
    label: string;
    icon?: React.ReactNode;
    rightContent?: React.ReactNode;
    className?: string;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({ label, icon, rightContent, className = '' }) => {
    return (
        <div className={`flex items-center justify-between px-3 py-2 bg-surface-section border-b border-line/5 ${className}`}>
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-[10px] font-bold text-fg-tertiary">{label}</span>
            </div>
            {rightContent && <div className="flex items-center gap-2">{rightContent}</div>}
        </div>
    );
};

export default PanelHeader;
