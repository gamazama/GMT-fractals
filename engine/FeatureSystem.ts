
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
    estCompileMs?: number; // Estimated compile time contribution when this option is selected
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
    parentId?: string;
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
    format?: (value: number) => string;
    options?: ParamOption[];
    layout?: 'full' | 'half' | 'embedded';
    parentId?: string;
    condition?: ParamCondition | ParamCondition[];
    composeFrom?: string[];
    textureSettings?: TextureConfig;
    /** Vector input interaction mode (e.g. 'angle') */
    mode?: string;
    /** Whether vector components can be linked */
    linkable?: boolean;
    
    // Links to other parameters (e.g., an image param linking to its color profile param)
    linkedParams?: {
        colorSpace?: string;
    };

    // Reference to another parameter whose value should be used as this param's max
    dynamicMaxRef?: string;

    /** Dynamic config overrides computed from slice state. Returned fields merge over static config.
     *  Use for params whose label, range, mode, etc. change based on other state (e.g. interlace
     *  params that mirror the selected secondary formula's parameter definitions). */
    dynamicConfig?: (sliceState: any) => Partial<Pick<ParamConfig,
        'label' | 'min' | 'max' | 'step' | 'mode' | 'scale' | 'linkable' | 'options' | 'description'
    >> | undefined;

    /** Dynamic visibility computed from slice state. Return false to hide. Checked after `condition`. */
    dynamicVisible?: (sliceState: any) => boolean;

    /**
     * Called inside the standard setter when this param's value changes.
     * Returns additional state updates to merge alongside the primary change.
     * Runs before CONFIG event emission, so extra updates are included in the same compile trigger.
     */
    onSet?: (newValue: any, currentSliceState: any) => Record<string, any>;

    // 'uniform' (Default): Updates a GLSL uniform (Instant)
    // 'compile': Triggers a shader rebuild (Slow)
    onUpdate?: 'uniform' | 'compile';

    // Estimated compile time contribution in ms when this param is enabled/active.
    // For boolean params: cost when true. For dropdowns: use ParamOption.estCompileMs instead.
    estCompileMs?: number;
}

export interface FeatureTabConfig {
    label: string;
    iconId?: string;
    componentId: string;
    order: number;
    condition?: ParamCondition | ParamCondition[];
    /** Target dock for automatic panel placement via
     *  `applyDefaultPanelLayout()`. If omitted, the panel is not
     *  auto-placed — the app must call `movePanel()` itself (useful
     *  for custom layouts or conditionally-shown panels). */
    dock?: 'left' | 'right' | 'float';
    /** If multiple features are auto-placed into the same dock,
     *  the one marked `defaultActive: true` is selected as the
     *  active tab. If none are marked, the lowest-order panel wins. */
    defaultActive?: boolean;
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


export interface GroupConfig {
    label: string;
    collapsible?: boolean;
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
    // groups: optional metadata for UI groups (collapsible sections, labels)
    groups?: Record<string, GroupConfig>;
    state?: any;       // Extra state not covered by params (e.g. arrays, complex objects)
    actions?: Record<string, (state: any, payload: any) => Partial<any>>;

    // --- UI Configuration ---
    tabConfig?: FeatureTabConfig;           // Registers a panel tab for this feature
    viewportConfig?: FeatureViewportConfig; // Registers a viewport overlay component
    menuConfig?: FeatureMenuConfig;         // Adds a top-level on/off toggle in the system menu
    menuItems?: FeatureMenuItem[];          // Adds sub-items to the system menu
    interactionConfig?: FeatureInteractionConfig;
    customUI?: CustomUIConfig[];            // Inserts a named React component into the auto-generated panel

    // --- Compilable Section UI ---
    // panelConfig: describes how to render this feature as a compilable section with compile/runtime split.
    // Used by CompilableFeatureSection component. If absent, feature uses default AutoFeaturePanel rendering.
    panelConfig?: {
        compileParam: string;               // compile gate param (onUpdate: 'compile')
        runtimeToggleParam?: string;        // runtime on/off param (uniform-backed, instant toggle)
        compileSettingsParams?: string[];    // compile-time params to show in settings sub-section
        runtimeGroup?: string;              // groupFilter for runtime params
        runtimeExcludeParams?: string[];    // params to hide from runtime section
        label?: string;                     // section label (falls back to feature name)
        compileMessage?: string;            // "Compiling X..." message
        helpId?: string;                    // data-help-id for context help
    };

    // --- Engine Integration ---
    // engineConfig: declares a master enable/disable toggle for ShaderFactory to conditionally skip injection.
    // mode 'compile' = toggling triggers a full shader rebuild; 'runtime' = handled in-shader via uniforms.
    engineConfig?: FeatureEngineConfig;

    // extraUniforms: complex uniforms (arrays, structs) that aren't 1:1 with a param entry
    extraUniforms?: UniformDefinition[];

    // --- Dependencies ---
    // dependsOn: feature IDs that must be registered (and injected) before this feature.
    // Used for satellite features that rely on uniforms/functions from another feature.
    // The registry enforces this order via topological sort in getAll().
    dependsOn?: string[];

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

/**
 * Thrown when `featureRegistry.register()` is called after the registry was
 * frozen (i.e. after `createEngineStore` ran). See docs/02_Feature_Registry.md.
 * Thrown in dev; downgraded to a console warning in prod to avoid crashing
 * shipped apps on a late-arriving plugin.
 */
export class FeatureRegistryFrozenError extends Error {
    constructor(featureId: string) {
        super(
            `Feature "${featureId}" registered after featureRegistry was frozen. ` +
            `All features must register BEFORE createEngineStore runs (i.e. before any ` +
            `module that touches useFractalStore / useEngineStore is imported). See ` +
            `docs/03_Plugin_Contract.md § boot-timeline.`
        );
        this.name = 'FeatureRegistryFrozenError';
    }
}

/**
 * Thrown when two different feature definitions share an id. Always thrown
 * in prod (data-loss risk — silent overwrite would lose the first feature's
 * state). In dev, HMR re-registration of the SAME def object is a no-op,
 * and re-registration with a DIFFERENT def object is allowed with a warning
 * (Vite HMR creates new def objects across reloads).
 */
export class DuplicateFeatureError extends Error {
    constructor(featureId: string) {
        super(
            `Duplicate feature id: "${featureId}". Feature ids must be unique — ` +
            `second registration rejected to prevent silent overwrite of the first ` +
            `feature's state slice.`
        );
        this.name = 'DuplicateFeatureError';
    }
}

class FeatureRegistry {
    private features = new Map<string, FeatureDefinition>();
    private sortedCache: FeatureDefinition[] | null = null;
    private frozen = false;

    public register(def: FeatureDefinition) {
        const existing = this.features.get(def.id);

        if (existing) {
            // Same def object — HMR or accidental double-import. No-op.
            if (existing === def) return;

            // Different def with same id.
            if (import.meta.env.DEV) {
                // Dev: assume HMR; replace with a loud warning so real conflicts
                // are still obvious in the console.
                console.warn(
                    `[FeatureRegistry] Replacing definition for "${def.id}". ` +
                    `If this is not HMR, it is a duplicate-id bug — see ` +
                    `docs/02_Feature_Registry.md.`
                );
                this.features.set(def.id, def);
                this.sortedCache = null;
                return;
            }
            // Prod: hard fail. Production has no HMR, so this is always a real conflict.
            throw new DuplicateFeatureError(def.id);
        }

        // New feature. Reject if registry was frozen.
        if (this.frozen) {
            const err = new FeatureRegistryFrozenError(def.id);
            if (import.meta.env.DEV) throw err;
            console.warn(`[FeatureRegistry] ${err.message}`);
            return;
        }

        // Validate dependencies exist (if any registered so far are referenced)
        if (def.dependsOn) {
            for (const dep of def.dependsOn) {
                if (!this.features.has(dep)) {
                    console.warn(`[FeatureRegistry] "${def.id}" depends on "${dep}" which is not yet registered. Ensure registration order is correct.`);
                }
            }
        }
        this.features.set(def.id, def);
        this.sortedCache = null; // Invalidate cache
    }

    /** Freeze the registry. Subsequent `register()` calls for NEW ids throw
     *  in dev and no-op (with warning) in prod. Called by the store during
     *  construction to lock the feature set before state slices are built. */
    public freeze() {
        this.frozen = true;
    }

    public isFrozen() {
        return this.frozen;
    }

    public get(id: string) { return this.features.get(id); }

    /** Returns all features in dependency-safe order (topological sort).
     *  Features without dependencies maintain their registration order.
     *  Throws if a dependency cycle is detected. */
    public getAll() {
        if (this.sortedCache) return this.sortedCache;
        this.sortedCache = this.topologicalSort();
        return this.sortedCache;
    }
    
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
            'cameraPos': 'cp', // Preset-format-only; absorbed into sceneOffset on load
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

    /** Stable topological sort — respects registration order except where
     *  dependsOn requires reordering. Features without dependencies keep
     *  their relative registration position. */
    private topologicalSort(): FeatureDefinition[] {
        const all = Array.from(this.features.values());
        const idToIndex = new Map<string, number>();
        all.forEach((f, i) => idToIndex.set(f.id, i));

        // Build adjacency: for each feature, which features must come before it
        const inDegree = new Map<string, number>();
        const dependents = new Map<string, string[]>(); // dep -> features that depend on it

        for (const f of all) {
            inDegree.set(f.id, 0);
            if (!dependents.has(f.id)) dependents.set(f.id, []);
        }

        for (const f of all) {
            if (f.dependsOn) {
                for (const dep of f.dependsOn) {
                    if (!this.features.has(dep)) continue; // Skip unknown deps (warned at register)
                    inDegree.set(f.id, (inDegree.get(f.id) || 0) + 1);
                    dependents.get(dep)!.push(f.id);
                }
            }
        }

        // Kahn's algorithm with stable ordering (prefer registration order)
        const queue: string[] = [];
        for (const f of all) {
            if (inDegree.get(f.id) === 0) queue.push(f.id);
        }

        const sorted: FeatureDefinition[] = [];
        while (queue.length > 0) {
            // Pick the feature with the lowest registration index (stable sort)
            queue.sort((a, b) => (idToIndex.get(a) || 0) - (idToIndex.get(b) || 0));
            const id = queue.shift()!;
            sorted.push(this.features.get(id)!);

            for (const depId of (dependents.get(id) || [])) {
                const deg = (inDegree.get(depId) || 1) - 1;
                inDegree.set(depId, deg);
                if (deg === 0) queue.push(depId);
            }
        }

        if (sorted.length !== all.length) {
            const missing = all.filter(f => !sorted.includes(f)).map(f => f.id);
            console.error(`[FeatureRegistry] Dependency cycle detected involving: ${missing.join(', ')}`);
            // Fallback: return registration order to avoid breaking the app
            return all;
        }

        return sorted;
    }
}

export const featureRegistry = new FeatureRegistry();
