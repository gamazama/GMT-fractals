
// Primary-ray single-scatter volumetric body.
// Injected into traceScene's march loop via builder.addVolumeLogic().
//
// Variables in scope: i, d, h, p, ro, rd, stochasticSeed (all from traceScene), accScatter
//
// Uniforms (from volumetric feature DDFS):
//   uVolDensity, uVolAnisotropy, uVolMaxLights,
//   uVolEmissive, uVolEmissiveFalloff, uVolStepJitter,
//   uVolScatterTint, uVolHeightFalloff, uVolHeightOrigin
//
// MEASURED COST PROFILE (2026-07-10, Mandelbulb 720p, RTX 2070, 3-point-light
// scene — protocol §2.6.3 of docs/policy/shader-compile-optimization.md):
// - Compile (cold gpu=): +1557ms with shadows compiled (+674ms with the stub —
//   the difference is the GetHardShadow inline in the light loop). No fxc
//   nested-loop pathology: the runtime-capped MAX_LIGHTS loop stays cheap.
// - FPS p50, steady-state: not-compiled 2.2ms · density@1-light 28.5ms ·
//   density@3-lights 74.6ms (linear in lights) · emissive-only 5.9ms ·
//   quality ladder 1/128→1/8 = 20.4→74.6ms; interaction clamp verified
//   (1/32 → 37.2ms during nav).
// - @invariant-adjacent gotcha: COMPILED-IN BUT RUNTIME-OFF COSTS ~2.2×
//   baseline (2.16→4.75ms) — and enabled-with-zero-density measures identical,
//   so it is REGISTER PRESSURE from this body inflating the trace loop's
//   allocation, not the uniform branch. No runtime toggle can recover it; the
//   panel's compile toggle (ptVolumetric off) is the only true off. Any future
//   fix means moving scatter OUT of the per-step march (second-pass segment
//   sampling) — an estimator redesign, not a branch tweak.

export const VOLUMETRIC_SCATTER_BODY = `
#ifdef PT_VOLUMETRIC
{
    bool _hasDensity = uVolDensity > 0.001;
    bool _hasEmissive = uVolEmissive > 0.001;
    if (uVolEnabled > 0.5 && (_hasDensity || _hasEmissive)) {
        // Stochastic gate sampling rate. uVolQuality slider:
        //   0.0 = 1/128 sampling (super-cheap preview)
        //   1.0 = 1/8   sampling (final-render rate)
        // Mapping is exponential so each slider stop halves/doubles the
        // sampling rate. Both extremes are unbiased estimators (seg
        // compensates) — the converged image is identical at every slider
        // setting. Slider only trades per-frame cost vs frames-to-converge.
        // During interaction (uBlendFactor >= 0.99) we clamp to 1/32 max
        // so a high-quality slider position doesn't tank interactive FPS.
        // uVolStepJitter blends between fixed seed (persistent slicing)
        // and temporal seed (smooth accumulation).
        float _volSeed = mix(0.5, stochasticSeed, uVolStepJitter);
        // gateP = 1/128 * 16^volQuality  →  0→1/128, 0.5→1/32, 1.0→1/8
        float _gateP = exp2(-7.0 + 4.0 * uVolQuality);
        // Cap during interaction at 1/32 to keep nav frames cheap.
        if (uBlendFactor >= 0.99) _gateP = min(_gateP, 0.03125);
        if (fract(_volSeed * 7.43 + d * 1.0) < _gateP) {
            float _sigma = uVolDensity;

            // Height fog: modulate density by Y distance from origin
            if (uVolHeightFalloff > 0.001) {
                float _yWorld = (p + uCameraPosition + uSceneOffsetHigh + uSceneOffsetLow).y;
                _sigma *= exp(-uVolHeightFalloff * abs(_yWorld - uVolHeightOrigin));
            }

            float _sigmaEff = max(_sigma, 0.001);
            // Beer-Lambert transmittance from camera to this scatter point
            float _trans = exp(-_sigmaEff * d);
            if (_trans > 0.001) {
                // Energy compensation: seg = 1 / gateP. Steady = 8, interaction = 32.
                float _seg = 1.0 / _gateP;

                // --- DENSITY SCATTER (shadow rays — expensive) ---
                if (_hasDensity && _sigma > 0.001) {
                    // Zoom-aware fog-shadow precision (@see shadows.ts +
                    // docs/adr/0093): the scatter point sits at depth d along
                    // the primary ray, so its footprint eps mirrors the trace's
                    // finalEps there. Light-loop-invariant — hoisted.
                    float _epsPerDist = uPixelSizeBase * (uPixelThreshold / (uDetail / uInternalScale));
                    bool _orthoCam = uCamType > 0.5 && uCamType < 1.5;
                    float _surfEps = _orthoCam ? _epsPerDist : _epsPerDist * d;
                    float _epsRateBase = _orthoCam ? 0.0 : _epsPerDist;
                    float _jScale = min(h.x * 0.2, 0.35);
                    vec3 _jDir = normalize(vec3(
                        fract(stochasticSeed * 127.1 + d * 31.7) * 2.0 - 1.0,
                        fract(stochasticSeed *  37.3 + d * 47.1) * 2.0 - 1.0,
                        fract(stochasticSeed *  73.7 + d * 13.3) * 2.0 - 1.0
                    ));
                    int _volLightMax = int(uVolMaxLights);
                    for (int _li = 0; _li < MAX_LIGHTS; _li++) {
                        if (_li >= uLightCount || _li >= _volLightMax) break;
                        if (uLightIntensity[_li] < 0.01) continue;
                        // type 1 = Directional only; type 2 = Sphere falls through
                        // as a Point at the sphere center for volumetric scatter.
                        bool _dir = uLightType[_li] > 0.5 && uLightType[_li] < 1.5;
                        vec3  _lv  = _dir ? uLightDir[_li] : (uLightPos[_li] - p);
                        // Use the same DIR_LIGHT_DIST sentinel surface-shadow
                        // rays use in pbr.ts. The original 10000.0 was an
                        // outlier; this aligns with convention and lets the
                        // shadow loop's t > lightDist early-out fire at the
                        // expected scene-bound proxy distance for directional
                        // lights. Bench-invisible on point-light-only scenes.
                        float _ld  = _dir ? DIR_LIGHT_DIST : length(_lv);
                        if (!_dir && _ld < 0.001) continue;
                        vec3 _l = _dir ? normalize(_lv) : (_lv / _ld);
                        float _att = 1.0;
                        if (!_dir && uLightFalloff[_li] > 0.001) {
                            _att = uLightFalloffType[_li] < 0.5
                                ? 1.0 / (1.0 + uLightFalloff[_li] * _ld * _ld)
                                : 1.0 / (1.0 + uLightFalloff[_li] * _ld);
                        }
                        if (uLightIntensity[_li] * _att * _sigma * _trans * _seg < 1e-5) continue;
                        vec3 _l_shadow = normalize(_l + _jDir * _jScale);
                        // Origin offset in footprint units (was absolute 0.01 —
                        // same high-zoom killer as the surface-shadow bias).
                        float _sh = GetHardShadow(p + _l_shadow * max(h.x * 2.0, _surfEps * 2.0), _l_shadow, _ld,
                                                  _surfEps, _epsRateBase * dot(_l_shadow, rd));
                        if (_sh < 0.01) continue;
                        // Henyey-Greenstein phase
                        float _cosT  = dot(rd, -_l);
                        float _g     = uVolAnisotropy;
                        float _hgD   = max(0.0001, 1.0 + _g*_g - 2.0*_g*_cosT);
                        float _phase = (1.0 - _g*_g) / (4.0 * PI * pow(_hgD, 1.5));
                        accScatter += uLightColor[_li] * uLightIntensity[_li] * _att * _sigma * _phase * _sh * _trans * _seg * uVolScatterTint;
                    }
                }

                // --- SURFACE COLOR SCATTER (orbit trap lookup — cheap, independent) ---
                if (_hasEmissive) {
                    vec3 _pfrac = p + uCameraPosition + uSceneOffsetHigh + uSceneOffsetLow;
                    float _mapVal = getMappingValue(uColorMode, _pfrac, h, vec3(0.0, 1.0, 0.0), uColorScale);
                    float _t1Raw = _mapVal * uColorScale + uColorOffset
                                 + gmt_colorSpiral(_pfrac, uColorTwist, uColorTwistArms);
                    float _t1 = pow(abs(fract(mod(_t1Raw, 1.0))), uGradientBias);
                    vec3 _emitCol = textureLod0(uGradientTexture, vec2(_t1, 0.5)).rgb;
                    float _emitAtten = 1.0;
                    if (uVolEmissiveFalloff > 0.001) {
                        _emitAtten = exp(-uVolEmissiveFalloff * h.x);
                    }
                    accScatter += _emitCol * uVolEmissive * _sigmaEff * _trans * _seg * _emitAtten * uVolScatterTint;
                }
            }
        }
    }
}
#endif
`;
