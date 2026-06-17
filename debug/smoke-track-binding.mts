/**
 * Unit-style smoke for `deriveTrackBinding` + `readLiveVec`.
 *
 * Runs the helper through every shape AutoFeaturePanel renders:
 *   scalar, vec2, vec3, vec4, composeFrom-override.
 *
 * No browser — just imports the helper via tsx. Keeps the DDFS track
 * naming convention covered by a fast, deterministic smoke so any
 * regression in the UNDERSCORE format shows up before it hits the UI.
 */
import { deriveTrackBinding, readLiveVec } from '../engine/animation/trackBinding';
import * as THREE from 'three';

const eq = (a: unknown, b: unknown) =>
    JSON.stringify(a) === JSON.stringify(b);

function assert(cond: boolean, label: string): void {
    if (!cond) throw new Error(`✗ ${label}`);
    console.log(`  ✓ ${label}`);
}

function main() {
    // ── Scalar ────────────────────────────────────────────────────────
    const scalar = deriveTrackBinding({ featureId: 'julia', paramKey: 'power', label: 'Power', axes: [] });
    assert(eq(scalar.trackKeys, ['julia.power']), 'scalar trackKeys = [featureId.paramKey]');
    assert(eq(scalar.trackLabels, ['Power']), 'scalar trackLabels = [label]');

    // ── Vec2 ──────────────────────────────────────────────────────────
    const vec2 = deriveTrackBinding({ featureId: 'julia', paramKey: 'juliaC', label: 'Julia c', axes: ['x', 'y'] });
    assert(eq(vec2.trackKeys, ['julia.juliaC_x', 'julia.juliaC_y']), 'vec2 trackKeys use UNDERSCORE form');
    assert(eq(vec2.trackLabels, ['Julia c X', 'Julia c Y']), 'vec2 trackLabels capitalize axis');

    // ── Vec3 ──────────────────────────────────────────────────────────
    const vec3 = deriveTrackBinding({ featureId: 'camera', paramKey: 'target', label: 'Target', axes: ['x', 'y', 'z'] });
    assert(eq(vec3.trackKeys, ['camera.target_x', 'camera.target_y', 'camera.target_z']), 'vec3 trackKeys extend to _z');
    assert(eq(vec3.trackLabels, ['Target X', 'Target Y', 'Target Z']), 'vec3 trackLabels');

    // ── Vec4 ──────────────────────────────────────────────────────────
    const vec4 = deriveTrackBinding({ featureId: 'f', paramKey: 'p', label: 'P', axes: ['x', 'y', 'z', 'w'] });
    assert(eq(vec4.trackKeys, ['f.p_x', 'f.p_y', 'f.p_z', 'f.p_w']), 'vec4 trackKeys extend to _w');

    // ── composeFrom override — used by GMT's orbit camera widget ─────
    const compose = deriveTrackBinding({
        featureId: 'camera',
        paramKey: 'orbit',
        label: 'Orbit',
        axes: ['x', 'y', 'z'],
        composeFrom: ['orbitTheta', 'orbitPhi', 'distance'],
    });
    assert(
        eq(compose.trackKeys, ['camera.orbitTheta', 'camera.orbitPhi', 'camera.distance']),
        'composeFrom emits scalar-param track ids directly',
    );
    assert(compose.trackLabels === undefined, 'composeFrom leaves trackLabels undefined for downstream fallback');

    // ── readLiveVec: absent ───────────────────────────────────────────
    const absent = readLiveVec({}, vec2);
    assert(absent === undefined, 'readLiveVec returns undefined when no axis is modulated');

    // ── readLiveVec: one axis present ─────────────────────────────────
    const partial = readLiveVec({ 'julia.juliaC_x': 0.5 }, vec2);
    assert(partial instanceof THREE.Vector2, 'readLiveVec returns Vector2 for 2-axis binding');
    if (partial instanceof THREE.Vector2) {
        assert(partial.x === 0.5 && partial.y === 0, 'absent axis fills with 0');
    }

    // ── readLiveVec: vec3, all present ────────────────────────────────
    const full = readLiveVec(
        { 'camera.target_x': 1, 'camera.target_y': 2, 'camera.target_z': 3 },
        vec3,
    );
    assert(full instanceof THREE.Vector3, 'readLiveVec returns Vector3 for 3-axis binding');
    if (full instanceof THREE.Vector3) {
        assert(full.x === 1 && full.y === 2 && full.z === 3, 'all axes carry through');
    }

    console.log(`\n✓ trackBinding helper covers scalar, vec2/3/4, composeFrom, and live-mod read`);
}

main();
