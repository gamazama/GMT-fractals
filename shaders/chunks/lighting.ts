
import { LIGHTING_SHADOWS } from './lighting/shadows';
import { LIGHTING_ENV } from './lighting/env';
import { LIGHTING_PBR } from './lighting/pbr';
import { getShadingGLSL } from './lighting/shading';

export const LIGHTING = `
${LIGHTING_SHADOWS}
${LIGHTING_ENV}
${LIGHTING_PBR}
${getShadingGLSL(false)}
`;
