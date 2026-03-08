/**
 * Shared types for the unified input system
 */

import { ValueMapping } from './primitives/FormatUtils';

// ============================================================================
// Base Draggable Number Props
// ============================================================================

export interface DraggableNumberProps {
    /** Current value */
    value: number;
    /** Called when value changes */
    onChange: (v: number) => void;
    /** Called when drag starts (for undo history) */
    onDragStart?: () => void;
    /** Called when drag ends (for undo history) */
    onDragEnd?: () => void;
    
    /** Step size for quantization */
    step?: number;
    /** Base sensitivity multiplier (default: 1) */
    sensitivity?: number;
    
    /** Soft min for UI display (not enforced) */
    min?: number;
    /** Soft max for UI display (not enforced) */
    max?: number;
    /** Hard min - values are clamped to this */
    hardMin?: number;
    /** Hard max - values are clamped to this */
    hardMax?: number;
    
    /** Value mapping for display (pi units, log scale, etc.) */
    mapping?: ValueMapping;
    /** Override the formatted display text */
    format?: (v: number) => string;
    /** Whether to apply mapping to text input values (default: true) */
    mapTextInput?: boolean;
    
    /** Disabled state */
    disabled?: boolean;
    /** Visual highlight state */
    highlight?: boolean;
    /** Live value for animated indicator */
    liveValue?: number;
    /** Default value for reset functionality */
    defaultValue?: number;
}

// ============================================================================
// Scalar Input Props (Full Featured Single Value)
// ============================================================================

export interface ScalarInputProps extends DraggableNumberProps {
    /** Label text */
    label?: string;
    /** Additional content after label */
    labelSuffix?: React.ReactNode;
    /** Content for the right side of header (e.g., keyframe button) */
    headerRight?: React.ReactNode;
    
    /** Show the range track visualization */
    showTrack?: boolean;
    /** Position of the track: 'inline' (compact) or 'below' (full slider) */
    trackPosition?: 'inline' | 'below';
    /** Height of the track in pixels (default: 20) */
    trackHeight?: number;
    
    /** Default value for reset functionality */
    defaultValue?: number;
    /** Called when reset to default */
    onReset?: () => void;
    
    /** Context menu handler */
    onContextMenu?: (e: React.MouseEvent) => void;
    /** Help ID for help system */
    dataHelpId?: string;
    
    /** Visual variant */
    variant?: 'full' | 'compact' | 'minimal';
    /** Additional CSS class */
    className?: string;
    
    /** Override text display (for custom formatting like "0.5π") */
    overrideText?: string;
    /** Show live value indicator */
    showLiveIndicator?: boolean;
}

// ============================================================================
// Vector Input Props
// ============================================================================

export interface VectorInputProps {
    /** Current value (Vector2 or Vector3) */
    value: { x: number; y: number; z?: number };
    /** Called when value changes */
    onChange: (v: { x: number; y: number; z?: number }) => void;
    
    /** Input mode */
    mode?: 'translation' | 'rotation' | 'scale' | 'normal';
    /** Allow user to toggle between modes */
    modeToggleable?: boolean;
    
    /** Per-axis configuration */
    axes?: {
        x?: Partial<ScalarInputProps>;
        y?: Partial<ScalarInputProps>;
        z?: Partial<ScalarInputProps>;
    };
    
    /** Shared configuration for all axes */
    axisConfig?: Partial<ScalarInputProps>;
    
    /** Show dual axis pads between sliders */
    showDualAxisPads?: boolean;
    /** Show rotation gizmo visualization */
    showRotationGizmo?: boolean;
    
    /** Label for the entire input */
    label?: string;
    /** Disabled state */
    disabled?: boolean;
    
    /** Animation track keys for keyframe recording */
    trackKeys?: [string, string, string?];
    /** Animation track labels */
    trackLabels?: [string, string, string?];
    
    /** Interaction mode for undo history */
    interactionMode?: 'param' | 'camera';
    
    /** Content for header right (overrides default keyframe button) */
    headerRight?: React.ReactNode;
    
    /** Context menu handler */
    onContextMenu?: (e: React.MouseEvent) => void;
    /** Help ID for help system */
    dataHelpId?: string;
}

// ============================================================================
// Axis Configuration
// ============================================================================

export interface AxisConfig {
    label: string;
    color: string;
    text: string;
    border: string;
    hoverBg: string;
    accent: string;
}

export const AXIS_CONFIG: AxisConfig[] = [
    { 
        label: 'X', 
        color: 'bg-red-500', 
        text: 'text-red-400', 
        border: 'group-focus-within:border-red-500/50', 
        hoverBg: 'hover:bg-red-500/20', 
        accent: '#ef4444' 
    },
    { 
        label: 'Y', 
        color: 'bg-green-500', 
        text: 'text-green-400', 
        border: 'group-focus-within:border-green-500/50', 
        hoverBg: 'hover:bg-green-500/20', 
        accent: '#22c55e' 
    },
    { 
        label: 'Z', 
        color: 'bg-blue-500', 
        text: 'text-blue-400', 
        border: 'group-focus-within:border-blue-500/50', 
        hoverBg: 'hover:bg-blue-500/20', 
        accent: '#3b82f6' 
    }
];

// ============================================================================
// Drag State Types
// ============================================================================

export interface DragState {
    isDragging: boolean;
    startX: number;
    startValue: number;
    hasMoved: boolean;
    lastShift: boolean;
    lastAlt: boolean;
}

export interface EditState {
    isEditing: boolean;
    inputValue: string;
}

// ============================================================================
// Custom Mapping Types (Legacy compatibility)
// ============================================================================

export interface CustomMapping {
    min: number;
    max: number;
    toSlider: (val: number) => number;
    fromSlider: (val: number) => number;
}
