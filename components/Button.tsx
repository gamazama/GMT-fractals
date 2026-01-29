import React from 'react';
import { useFractalStore } from '../store/fractalStore';
import { collectHelpIds } from '../utils/helpUtils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    label?: string;
    active?: boolean;
    variant?: 'primary' | 'danger' | 'success' | 'warning';
    icon?: React.ReactNode;
    fullWidth?: boolean;
    toggled?: boolean; // Visual "pressed" state separate from active functional state if needed
}

export const Button: React.FC<ButtonProps> = ({ 
    label, active, variant = 'primary', icon, fullWidth, className, children, onClick, ...props 
}) => {
    const openGlobalMenu = useFractalStore(s => s.openContextMenu);

    const handleContextMenu = (e: React.MouseEvent) => {
        const ids = collectHelpIds(e.currentTarget);
        if (ids.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            openGlobalMenu(e.clientX, e.clientY, [], ids);
        }
    };

    let activeClass = 'bg-cyan-900 text-cyan-200 border-cyan-700 shadow-inner';
    if (variant === 'danger') activeClass = 'bg-red-900 text-red-200 border-red-700 shadow-inner';
    if (variant === 'success') activeClass = 'bg-green-900 text-green-200 border-green-700 shadow-inner';
    if (variant === 'warning') activeClass = 'bg-amber-900 text-amber-200 border-amber-700 shadow-inner';

    return (
        <button 
            className={`t-btn ${active ? activeClass : 't-btn-default'} ${fullWidth ? 'w-full' : 'flex-1'} ${className || ''}`}
            onClick={onClick}
            onContextMenu={handleContextMenu}
            {...props}
        >
            {icon}
            {label || children}
        </button>
    );
};

export default Button;