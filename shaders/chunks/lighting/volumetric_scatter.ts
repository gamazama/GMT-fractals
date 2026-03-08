
// Primary-ray single-scatter volumetric body.
// Injected into traceScene's march loop via builder.addVolumeLogic().
//
// Stochastic sampling: gates on ray DISTANCE d (spatial, decoupled from DE iteration structure).
// K=1.0: ~1 shadow ray per 8 world units, _seg=8.0. Cheap in open space/sky regions.
//
// Shadow jitter: shadow ray direction is perturbed proportional to h.x (DE distance).
//   Near surface (h.x small) → hard shadows (correct for close geometry).
//   Open sky (h.x large)     → soft shadows (blurs fractal silhouette via temporal accumulation).
//   This eliminates the iteration-count banding visible in the background sky.
//
// Variables in scope: i, d, h, p, ro, rd, stochasticSeed (all from traceScene), accScatter
//
// Emissive scatter: uses getMappingValue + uGradientTexture (Layer 1) at each scatter point.
// h.yzw orbit trap data is already in scope from map() — no extra DE calls.
// getMappingValue and textureLod0 are available because COLORING is assembled before traceScene.

export const VOLUMETRIC_SCATTER_BODY = `
#ifdef PT_VOLUMETRIC
if (uFogDensity > 0.001) {
    // Spatial stochastic gate: K=1.0, P=0.125 → _seg = 1/(1.0*0.125) = 8.0 world units/sample
    if (fract(stochasticSeed * 7.43 + d * 1.0) < 0.125) {
        float _sigma = uFogDensity;
        // Beer-Lambert: transmittance from camera to this scatter point
        float _trans = exp(-_sigma * d);
        if (_trans > 0.001) {
            float _seg = 8.0;
            // Shadow jitter: proportional to DE distance.
            // In open space h.x is large → more jitter → fractal silhouette blurs over frames.
            float _jScale = min(h.x * 0.2, 0.35);
            vec3 _jDir = normalize(vec3(
                fract(stochasticSeed * 127.1 + d * 31.7) * 2.0 - 1.0,
                fract(stochasticSeed *  37.3 + d * 47.1) * 2.0 - 1.0,
                fract(stochasticSeed *  73.7 + d * 13.3) * 2.0 - 1.0
            ));
            for (int _li = 0; _li < MAX_LIGHTS; _li++) {
                if (_li >= uLightCount) break;
                if (uLightIntensity[_li] < 0.01) continue;
                bool _dir = uLightType[_li] > 0.5;
                vec3  _lv  = _dir ? -uLightDir[_li] : (uLightPos[_li] - p);
                float _ld  = _dir ? 10000.0 : length(_lv);
                if (!_dir && _ld < 0.001) continue;
                vec3 _l = _dir ? normalize(_lv) : (_lv / _ld);
                // Early-out: skip shadow ray if contribution is negligible
                float _att = 1.0;
                if (!_dir && uLightFalloff[_li] > 0.001) {
                    _att = uLightFalloffType[_li] < 0.5
                        ? 1.0 / (1.0 + uLightFalloff[_li] * _ld * _ld)
                        : 1.0 / (1.0 + uLightFalloff[_li] * _ld);
                }
                if (uLightIntensity[_li] * _att * _sigma * _trans * _seg < 1e-5) continue;
                // Shadow ray with jitter (same _jDir for all lights in this sample for efficiency)
                vec3 _l_shadow = normalize(_l + _jDir * _jScale);
                float _sh = GetHardShadow(p + _l_shadow * max(h.x * 2.0, 0.01), _l_shadow, _ld);
                if (_sh < 0.01) continue;
                // Henyey-Greenstein phase (using original _l, not jittered direction)
                float _cosT  = dot(rd, -_l);
                float _g     = uPTFogG;
                float _hgD   = max(0.0001, 1.0 + _g*_g - 2.0*_g*_cosT);
                float _phase = (1.0 - _g*_g) / (4.0 * 3.14159 * pow(_hgD, 1.5));
                // Accumulate
                accScatter += uLightColor[_li] * uLightIntensity[_li] * _att * _sigma * _phase * _sh * _trans * _seg;
            }
            // Emissive scatter from surface Layer 1 color field.
            // getMappingValue evaluates the orbit trap coloring at this volume position.
            // No shadow ray or proximity gate — the color field is meaningful throughout the volume.
            if (uFogEmissiveStrength > 0.001) {
                vec3 _pfrac = p + uCameraPosition + uSceneOffsetHigh + uSceneOffsetLow;
                float _mapVal = getMappingValue(uColorMode, _pfrac, h, vec3(0.0, 1.0, 0.0), uColorScale);
                float _distFrac = length(_pfrac);
                float _t1Raw = _mapVal * uColorScale + uColorOffset + _distFrac * uColorTwist;
                float _t1 = pow(abs(fract(mod(_t1Raw, 1.0))), uGradientBias);
                vec3 _emitCol = textureLod0(uGradientTexture, vec2(_t1, 0.5)).rgb;
                accScatter += _emitCol * uFogEmissiveStrength * _sigma * _trans * _seg * 0.07958;
            }
        }
    }
}
#endif
`;
