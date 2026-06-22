
import React from 'react';

type StatusDotVariant = 'active' | 'pending' | 'off' | 'instant';

interface StatusDotProps {
    status: StatusDotVariant;
    className?: string;
    title?: string;
}

const dotClasses: Record<StatusDotVariant, string> = {
    active:  'bg-ok-strong shadow-[0_0_4px_rgba(34,197,94,0.4)]',
    pending: 'bg-warn-strong animate-pulse shadow-[0_0_4px_rgba(245,158,11,0.4)]',
    off:     'bg-danger/40',
    instant: 'bg-accent-500 shadow-[0_0_4px_rgb(var(--accent-glow)/0.4)]',
};

export const StatusDot: React.FC<StatusDotProps> = ({ status, className = '', title }) => {
    return (
        <span
            className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${dotClasses[status]} ${className}`}
            title={title}
        />
    );
};

export default StatusDot;
