
import * as THREE from 'three';

export interface AxisConfig {
    label: string;
    color: string;
    text: string;
    border: string;
    hoverBg: string;
    accent: string;
}

export const AXIS_CONFIG: AxisConfig[] = [
    { label: 'X', color: 'bg-red-500', text: 'text-red-400', border: 'group-focus-within:border-red-500/50', hoverBg: 'hover:bg-red-500/20', accent: '#ef4444' },
    { label: 'Y', color: 'bg-green-500', text: 'text-green-400', border: 'group-focus-within:border-green-500/50', hoverBg: 'hover:bg-green-500/20', accent: '#22c55e' },
    { label: 'Z', color: 'bg-blue-500', text: 'text-blue-400', border: 'group-focus-within:border-blue-500/50', hoverBg: 'hover:bg-blue-500/20', accent: '#3b82f6' },
    { label: 'W', color: 'bg-purple-500', text: 'text-purple-400', border: 'group-focus-within:border-purple-500/50', hoverBg: 'hover:bg-purple-500/20', accent: '#a855f7' }
];

export interface VectorAxisCellProps {
    axisIndex: number;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    onUpdate: (val: number) => void;
    onDragStart: () => void;
    onDragEnd: () => void;
    disabled?: boolean;
    highlight?: boolean;
    // New unified properties
    mapping?: import('../inputs').ValueMapping;
    mapTextInput?: boolean;
    liveValue?: number;
    defaultValue?: number;
    hardMin?: number;
    hardMax?: number;
    // Custom label override
    customLabel?: string;
}

export interface DualAxisPadProps {
    primaryAxis: 'x' | 'y' | 'z';
    secondaryAxis: 'x' | 'y' | 'z';
    primaryIndex: number;
    secondaryIndex: number;
    primaryValue: number;
    secondaryValue: number;
    min: number;
    max: number;
    step: number;
    onUpdate: (primary: number, secondary: number) => void;
    onDragStart: () => void;
    onDragEnd: () => void;
    disabled?: boolean;
    onHover: (isHovering: boolean) => void;
}

export interface BaseVectorInputProps {
    label?: string;
    value: THREE.Vector2 | THREE.Vector3 | THREE.Vector4;
    onChange: (val: THREE.Vector2 | THREE.Vector3 | THREE.Vector4) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    convertRadToDeg?: boolean;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    headerRight?: React.ReactNode;
    showDualAxisPads?: boolean;
    
    // New unified system props
    /** Input mode for specialized handling */
    mode?: 'normal' | 'rotation' | 'translation' | 'scale' | 'direction' | 'toggle' | 'mixed' | 'axes';
    /** Allow user to toggle between modes */
    modeToggleable?: boolean;
    /** Show animated live value indicator */
    showLiveIndicator?: boolean;
    /** Live values for animation (if different from current value) */
    liveValue?: THREE.Vector2 | THREE.Vector3 | THREE.Vector4;
    /** Default values for reset functionality */
    defaultValue?: THREE.Vector2 | THREE.Vector3 | THREE.Vector4;
    /** Hard minimum values (clamped) */
    hardMin?: number;
    /** Hard maximum values (clamped) */
    hardMax?: number;
    /** Per-axis minimum values */
    axisMin?: { x?: number; y?: number; z?: number; w?: number };
    /** Per-axis maximum values */
    axisMax?: { x?: number; y?: number; z?: number; w?: number };
    /** Per-axis step values */
    axisStep?: { x?: number; y?: number; z?: number; w?: number };
    /** Allow axis linking (e.g., for uniform scale) */
    linkable?: boolean;
    /** Display scale mode — 'pi' shows values in π units, 'degrees' keeps internal degrees but displays π */
    scale?: 'linear' | 'log' | 'pi' | 'degrees';
}

export interface ConnectedVectorInputProps extends Omit<BaseVectorInputProps, 'onDragStart' | 'onDragEnd' | 'headerRight'> {
    interactionMode?: 'param' | 'camera';
    trackKeys?: string[];
    trackLabels?: string[];
}

// Utility to format floats nicely for UI
export const formatDisplay = (val: number) => {
    if (val === 0) return "0";
    if (Math.abs(val) < 1e-9) return "0";
    return parseFloat(val.toFixed(8)).toString();
};
