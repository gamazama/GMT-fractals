import React from 'react';
import { useHelpContextMenu } from '../hooks/useHelpContextMenu';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    label?: string;
    active?: boolean;
    variant?: 'primary' | 'danger' | 'success' | 'warning';
    size?: 'default' | 'small';
    icon?: React.ReactNode;
    fullWidth?: boolean;
    toggled?: boolean; // Visual "pressed" state separate from active functional state if needed
}

export const Button: React.FC<ButtonProps> = ({
    label, active, variant = 'primary', size = 'default', icon, fullWidth, className, children, onClick, ...props
}) => {
    const handleContextMenu = useHelpContextMenu();

    let activeClass = 'bg-cyan-900 text-cyan-200 border-cyan-700 shadow-inner';
    if (variant === 'danger') activeClass = 'bg-red-900 text-red-200 border-red-700 shadow-inner';
    if (variant === 'success') activeClass = 'bg-green-900 text-green-200 border-green-700 shadow-inner';
    if (variant === 'warning') activeClass = 'bg-amber-900 text-amber-200 border-amber-700 shadow-inner';

    const sizeClass = size === 'small' ? 't-btn-sm' : 't-btn';

    return (
        <button
            className={`${sizeClass} ${active ? activeClass : 't-btn-default'} ${fullWidth ? 'w-full' : 'flex-1'} ${className || ''}`}
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