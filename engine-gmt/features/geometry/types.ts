
import type { ParamConfig } from '../../engine/FeatureSystem';

/** A pluggable fold operation for the hybrid box system */
export interface FoldDefinition {
    id: string;
    label: string;
    /** GLSL: must define `void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit)` */
    glsl: string;
    /** How rotation interacts with the fold.
     *  'wrap' (default): rotate z before fold, un-rotate after — correct for plane-reflection folds.
     *  'post': rotation applied after fold+sphereFold — correct for translation-based folds (Kali). */
    rotMode?: 'wrap' | 'post';
    /** Extra params this fold type needs (shown only when this fold is selected) */
    extraParams?: Record<string, ParamConfig>;
    /** Suggested default values for common hybrid params when this fold is selected */
    defaults?: Record<string, any>;
    /** When true, foldOperation handles scaling + offset + DR internally.
     *  formula_Hybrid will skip sphereFold and the outer scale/DR step. */
    selfContained?: boolean;
}
