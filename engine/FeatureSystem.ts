
import { StateCreator } from 'zustand';
import * as THREE from 'three';
import React from 'react';
import { ShaderBuilder, RenderVariant } from './ShaderBuilder';

export type ParamType = 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'color' | 'boolean' | 'gradient' | 'image' | 'complex';
export type ScaleType = 'linear' | 'log' | 'square' | 'root' | 'pi';

export interface ParamCondition {
    param?: string; 
    gt?: number;   
    lt?: number;   
    eq?: any;      
    neq?: any;     
    bool?: boolean; 
    or?: ParamCondition[];
}

export interface ParamOption {
    label: string;
    value: any;
}

export interface TextureConfig {
    mapping?: THREE.Mapping;
    wrapS?: THREE.Wrapping;
    wrapT?: THREE.Wrapping;
    minFilter?: THREE.MinificationTextureFilter;
    magFilter?: THREE.MagnificationTextureFilter;
    generateMipmaps?: boolean;
}

export interface CustomUIConfig {
    componentId: string; 
    group?: string;      
    props?: Record<string, any>; 
    condition?: ParamCondition | ParamCondition[];
}

export interface ParamConfig {
    type: ParamType;
    default: any;
    label: string;
    shortId?: string; 
    uniform?: string;
    min?: number;
    max?: number;
    step?: number;
    group?: string;
    description?: string;
    hidden?: boolean; 
    noReset?: boolean; 
    confirmation?: string;      
    isAdvanced?: boolean;       
    isCollapsible?: boolean;    
    ui?: 'slider' | 'knob' | 'numeric' | 'checkbox'; 
    scale?: ScaleType;          
    format?: (value: any) => string; 
    options?: ParamOption[];    
    layout?: 'full' | 'half' | 'embedded';   
    parentId?: string;          
    condition?: ParamCondition | ParamCondition[]; 
    composeFrom?: string[]; 
    textureSettings?: TextureConfig;
    
    // 'uniform' (Default): Updates a GLSL uniform (Instant)
    // 'compile': Triggers a shader rebuild (Slow)
    onUpdate?: 'uniform' | 'compile';
}

export interface FeatureTabConfig {
    label: string;
    iconId?: string; 
    componentId: string;
    order: number; 
    condition?: ParamCondition | ParamCondition[]; 
}

export interface FeatureViewportConfig {
    componentId: string;
    renderOrder?: number;
    type?: 'scene' | 'dom'; 
}

export interface FeatureMenuConfig {
    label: string;
    toggleParam: string; 
    condition?: ParamCondition | ParamCondition[];
    advancedOnly?: boolean; 
}

export interface FeatureMenuItem {
    label: string;
    toggleParam: string; 
    icon?: string; 
    advancedOnly?: boolean;
}

export interface FeatureInteractionConfig {
    blockCamera?: boolean; 
    activeParam?: string;  
}

export interface FeatureEngineConfig {
    toggleParam: string;      
    mode: 'compile' | 'runtime'; 
    label: string;            
    description?: string;     
    groupFilter?: string;     
}

// NEW: Robust Shader Library Definition
export interface FeatureShaderLibrary {
    code: string; 
    defineTrigger: string;
    stubs?: string;
    uniforms?: string;
}

export interface FeatureDefinition {
    id: string;
    shortId?: string; 
    name: string;
    category: string;
    params: Record<string, ParamConfig>;
    state?: any;
    tabConfig?: FeatureTabConfig;
    viewportConfig?: FeatureViewportConfig;
    actions?: Record<string, (state: any, payload: any) => Partial<any>>;
    menuConfig?: FeatureMenuConfig;
    menuItems?: FeatureMenuItem[];
    interactionConfig?: FeatureInteractionConfig;
    engineConfig?: FeatureEngineConfig;
    customUI?: CustomUIConfig[]; 
    
    // Updated: Inject now receives the global config to access root properties like 'formula'
    inject?: (builder: ShaderBuilder, config: any, variant: RenderVariant) => void;

    // Legacy Generator (Deprecated)
    shaderGenerator?: (state: any, globalConfig?: any) => string | any;
    
    // Legacy Static (Deprecated)
    shader?: {
        uniforms?: string;
        functions?: string;
        main?: string;       
        mainUV?: string;     
        mainHeader?: string; 
        material?: string;
        volumeFunctions?: string; 
        volumeBody?: string;      
        volumeFinalize?: string;  
    };

    shaderLibrary?: FeatureShaderLibrary;
}

class FeatureRegistry {
    private features = new Map<string, FeatureDefinition>();

    public register(def: FeatureDefinition) {
        this.features.set(def.id, def);
    }

    public get(id: string) { return this.features.get(id); }
    public getAll() { return Array.from(this.features.values()); }
    
    public getTabs() {
        return Array.from(this.features.values())
            .filter(f => f.tabConfig)
            .map(f => ({ id: f.id, ...f.tabConfig! }))
            .sort((a, b) => a.order - b.order);
    }

    public getViewportOverlays() {
        return Array.from(this.features.values())
            .filter(f => f.viewportConfig)
            .map(f => ({ id: f.id, ...f.viewportConfig! }));
    }
    
    public getMenuFeatures() {
        return Array.from(this.features.values())
            .filter(f => f.menuConfig)
            .map(f => ({ id: f.id, ...f.menuConfig! }));
    }

    public getExtraMenuItems() {
        const items: (FeatureMenuItem & { featureId: string })[] = [];
        this.features.forEach(f => {
            if (f.menuItems) {
                f.menuItems.forEach(item => items.push({ ...item, featureId: f.id }));
            }
        });
        return items;
    }
    
    public getEngineFeatures() {
        return Array.from(this.features.values())
            .filter(f => !!f.engineConfig);
    }

    public getDictionary() {
        const dict: any = {
            'formula': 'f',
            'cameraPos': 'cp',
            'cameraRot': 'cr',
            'sceneOffset': 'so',
            'targetDistance': 'td',
            'animations': 'an',
            'sequence': 'sq',
            'features': {
                _alias: 'p',
                children: {}
            }
        };

        this.features.forEach(feat => {
            const featAlias = feat.shortId || feat.id;
            const paramMap: any = {};
            
            Object.entries(feat.params).forEach(([key, config]) => {
                if (config.shortId) {
                    paramMap[key] = config.shortId;
                }
            });

            dict.features.children[feat.id] = {
                _alias: featAlias,
                children: paramMap
            };
        });

        return dict;
    }

    public getUniformDefinitions() {
        const defs: any[] = [];
        this.features.forEach(feat => {
            Object.values(feat.params).forEach(param => {
                if (param.uniform) {
                    let type: string = param.type;
                    let val = param.default;
                    if (type === 'color') type = 'vec3';
                    if (type === 'boolean') type = 'float';
                    if (type === 'image' || type === 'gradient') {
                        type = 'sampler2D';
                        val = null; 
                    }
                    defs.push({ name: param.uniform, type: type, default: val });
                }
            });
        });
        return defs;
    }
}

export const featureRegistry = new FeatureRegistry();
