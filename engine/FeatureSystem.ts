
import { ShaderBuilder, RenderVariant } from './ShaderBuilder';
import type { ShaderConfig } from './ShaderConfig';
import * as THREE from 'three';
import { UniformDefinition } from './UniformSchema';

export type ParamType = 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'color' | 'boolean' | 'gradient' | 'image' | 'complex';
export type ScaleType = 'linear' | 'log' | 'square' | 'root' | 'pi';

export interface ParamCondition {
    param?: string;
    gt?: number;
    lt?: number;
    eq?: string | number | boolean;
    neq?: string | number | boolean;
    bool?: boolean;
    or?: ParamCondition[];
    and?: ParamCondition[];
}

export interface ParamOption {
    label: string;
    value: string | number | boolean;
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
    format?: (value: unknown) => string;
    options?: ParamOption[];    
    layout?: 'full' | 'half' | 'embedded';   
    parentId?: string;          
    condition?: ParamCondition | ParamCondition[]; 
    composeFrom?: string[]; 
    textureSettings?: TextureConfig;
    
    // Links to other parameters (e.g., an image param linking to its color profile param)
    linkedParams?: {
        colorSpace?: string;
    };

    // Reference to another parameter whose value should be used as this param's max
    dynamicMaxRef?: string;

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


export interface FeatureDefinition {
    // --- Identity ---
    id: string;
    shortId?: string;  // Compact alias used in URL state encoding
    name: string;
    category: string;

    // --- State & Parameters ---
    // params: auto-generates Zustand state slice, UI controls, and GLSL uniforms
    params: Record<string, ParamConfig>;
    state?: any;       // Extra state not covered by params (e.g. arrays, complex objects)
    actions?: Record<string, (state: any, payload: any) => Partial<any>>;

    // --- UI Configuration ---
    tabConfig?: FeatureTabConfig;           // Registers a panel tab for this feature
    viewportConfig?: FeatureViewportConfig; // Registers a viewport overlay component
    menuConfig?: FeatureMenuConfig;         // Adds a top-level on/off toggle in the system menu
    menuItems?: FeatureMenuItem[];          // Adds sub-items to the system menu
    interactionConfig?: FeatureInteractionConfig;
    customUI?: CustomUIConfig[];            // Inserts a named React component into the auto-generated panel

    // --- Engine Integration ---
    // engineConfig: declares a master enable/disable toggle for ShaderFactory to conditionally skip injection.
    // mode 'compile' = toggling triggers a full shader rebuild; 'runtime' = handled in-shader via uniforms.
    engineConfig?: FeatureEngineConfig;

    // extraUniforms: complex uniforms (arrays, structs) that aren't 1:1 with a param entry
    extraUniforms?: UniformDefinition[];

    // --- Shader Injection ---
    // inject(): injects GLSL into the RAYMARCHING shader (main render pass).
    // Consumed by engine/ShaderFactory.ts. Use for SDFs, lighting, material effects.
    inject?: (builder: ShaderBuilder, config: ShaderConfig, variant: RenderVariant) => void;

    // postShader: injects GLSL into the POST-PROCESS shader (screen-space pass after raymarching).
    // Consumed by shaders/chunks/post_process.ts. Use for UV warps, color corrections, overlays.
    postShader?: {
        uniforms?: string;
        functions?: string;
        main?: string;    // Color-space modification (runs before tone mapping)
        mainUV?: string;  // UV modification (runs before texture sample)
    };


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
        const defs: UniformDefinition[] = [];
        this.features.forEach(feat => {
            // 1. Param-linked Uniforms
            Object.values(feat.params).forEach(param => {
                if (param.uniform) {
                    let type: any = param.type;
                    let val = param.default;
                    if (type === 'color') type = 'vec3';
                    if (type === 'boolean') {
                        type = 'float';
                        val = val ? 1.0 : 0.0; // Convert boolean default to float
                    }
                    if (type === 'image' || type === 'gradient') {
                        type = 'sampler2D';
                        val = null; 
                    }
                    defs.push({ name: param.uniform, type: type, default: val });
                }
            });

            // 2. Extra Uniforms
            if (feat.extraUniforms) {
                defs.push(...feat.extraUniforms);
            }
        });
        return defs;
    }
}

export const featureRegistry = new FeatureRegistry();
