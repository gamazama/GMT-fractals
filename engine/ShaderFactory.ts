/**
 * ShaderFactory — generic shader assembly entry point.
 *
 * Iterates the feature registry, lets each feature inject into a
 * ShaderBuilder, then returns the final GLSL string. The engine itself
 * has no knowledge of render modes (PathTracing/Direct), render quality
 * tiers, or other pipeline variants — those are plugin concerns.
 *
 * Apps that need variant-specific shaders (e.g. a raymarching plugin
 * producing Main/Physics/Histogram/Mesh variants) instantiate
 * ShaderFactory themselves with the desired variant.
 */

import { featureRegistry } from './FeatureSystem';
import { ShaderBuilder, RenderVariant } from './ShaderBuilder';
import type { ShaderConfig } from './ShaderConfig';
export type { ShaderConfig } from './ShaderConfig';

export class ShaderFactory {

    public static generateFragmentShader(config: ShaderConfig, variant: RenderVariant = 'Main'): string {
        const builder = new ShaderBuilder(variant);

        // Let each registered feature inject its GLSL contributions.
        // Features inject via the generic primitives (addDefine/addUniform/
        // addFunction/addPreamble/addHeader) or the section escape hatch
        // (addSection(name, code)) for pipeline-specific stages.
        for (const feat of featureRegistry.getAll()) {
            if (feat.inject) {
                feat.inject(builder, config, variant);
            }
        }

        return builder.buildFragment();
    }
}
