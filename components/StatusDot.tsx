
import React from 'react';

type StatusDotVariant = 'active' | 'pending' | 'off' | 'instant';

interface StatusDotProps {
    status: StatusDotVariant;
    className?: string;
    title?: string;
}

const dotClasses: Record<StatusDotVariant, string> = {
    active:  'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.4)]',
    pending: 'bg-amber-500 animate-pulse shadow-[0_0_4px_rgba(245,158,11,0.4)]',
    off:     'bg-red-900',
    instant: 'bg-cyan-500 shadow-[0_0_4px_rgba(6,182,212,0.4)]',
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
