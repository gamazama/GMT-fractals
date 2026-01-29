
import React from 'react';

export interface HelpSection {
    id: string;
    title: string;
    content: string; // Markdown-like text
    category: 'General' | 'Formulas' | 'Parameters' | 'UI' | 'Timeline' | 'Graph' | 'Animation' | 'Lighting' | 'Rendering' | 'Coloring' | 'Export' | 'Effects' | 'Audio';
    parentId?: string; // ID of the parent topic for tree view nesting
}

export interface ContextMenuItem {
    label?: string; // Optional if using element
    action?: () => void; // Optional for sliders/elements
    icon?: React.ReactNode;
    danger?: boolean;
    checked?: boolean;
    isHeader?: boolean;
    disabled?: boolean;
    keepOpen?: boolean;
    
    // Slider Extension (Legacy Snapshot Mode)
    type?: 'slider';
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    onChange?: (val: number) => void;

    // React Component Extension (Live Mode)
    // Allows passing a component that manages its own state subscriptions
    element?: React.ReactNode;
}

export interface HelpState {
    visible: boolean;
    activeTopicId: string | null;
}

export interface ContextMenuState {
    visible: boolean;
    x: number;
    y: number;
    items: ContextMenuItem[];
    targetHelpId: string | null;
}
