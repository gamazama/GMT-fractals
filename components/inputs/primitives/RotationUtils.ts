/**
 * Rotation utilities for converting between user-friendly inputs and shader-performant outputs
 * 
 * User Input → Internal Representation → Shader Values
 * Azimuth/Pitch → Direction Vector (normalized) → sin/cos rotation
 */

/**
 * Convert azimuth/pitch angles to a normalized direction vector
 * Azimuth: 0 to 2π (rotation around Y axis, 0 = +Z, π/2 = +X)
 * Pitch: -π/2 to +π/2 (rotation up/down from horizontal, 0 = horizontal, π/2 = straight up)
 */
export const sphericalToDirection = (azimuth: number, pitch: number): { x: number; y: number; z: number } => {
    const cosPitch = Math.cos(pitch);
    return {
        x: cosPitch * Math.sin(azimuth),
        y: Math.sin(pitch),
        z: cosPitch * Math.cos(azimuth)
    };
};

/**
 * Convert a direction vector to azimuth/pitch angles
 * Returns azimuth in range [0, 2π), pitch in range [-π/2, π/2]
 */
export const directionToSpherical = (x: number, y: number, z: number): { azimuth: number; pitch: number } => {
    const len = Math.sqrt(x * x + y * y + z * z);
    if (len < 0.0001) {
        return { azimuth: 0, pitch: 0 };
    }
    
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;
    
    // Azimuth: angle in XZ plane from +Z towards +X
    const azimuth = Math.atan2(nx, nz);
    
    // Pitch: angle from XZ plane up to Y
    const pitch = Math.asin(Math.max(-1, Math.min(1, ny)));
    
    return { azimuth, pitch };
};

/**
 * Format azimuth for display (in π units)
 */
export const formatAzimuth = (azimuth: number): string => {
    // Normalize to [0, 2π)
    let normalized = azimuth % (2 * Math.PI);
    if (normalized < 0) normalized += 2 * Math.PI;
    
    const piVal = normalized / Math.PI;
    if (Math.abs(piVal) < 0.01) return '0';
    if (Math.abs(piVal - 1) < 0.01) return 'π';
    if (Math.abs(piVal - 2) < 0.01) return '2π';
    if (Math.abs(piVal - 0.5) < 0.01) return 'π/2';
    if (Math.abs(piVal - 1.5) < 0.01) return '3π/2';
    return `${piVal.toFixed(2)}π`;
};

/**
 * Format pitch for display (in π units)
 */
export const formatPitch = (pitch: number): string => {
    const piVal = pitch / Math.PI;
    if (Math.abs(piVal) < 0.01) return '0';
    if (Math.abs(piVal - 0.5) < 0.01) return 'π/2';
    if (Math.abs(piVal + 0.5) < 0.01) return '-π/2';
    if (Math.abs(piVal - 0.25) < 0.01) return 'π/4';
    if (Math.abs(piVal + 0.25) < 0.01) return '-π/4';
    return `${piVal.toFixed(2)}π`;
};

/**
 * Parse angle input that may contain π notation
 */
export const parseAngleInput = (input: string): number | null => {
    const cleaned = input.trim().toLowerCase().replace(/\s/g, '');
    
    // Handle π notation
    if (cleaned.includes('π') || cleaned.includes('pi')) {
        const numPart = cleaned.replace(/[πpi]/g, '');
        let coeff = 1;
        
        if (numPart) {
            if (numPart.includes('/')) {
                const [num, denom] = numPart.split('/').map(n => parseFloat(n) || 1);
                coeff = num / denom;
            } else {
                coeff = parseFloat(numPart);
            }
        }
        
        if (isNaN(coeff)) return null;
        const sign = cleaned.startsWith('-') ? -1 : 1;
        return sign * Math.abs(coeff) * Math.PI;
    }
    
    // Plain number (assumed to be in radians)
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
};

/**
 * Calculate rotation matrix components for shader
 * Given a direction vector and angle, returns sin and cos of the angle
 * The shader will use Rodrigues' rotation formula
 */
export const calculateRotationComponents = (direction: { x: number; y: number; z: number }, angle: number) => {
    // Normalize the direction vector
    const len = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
    const normalized = len > 0.0001 ? {
        x: direction.x / len,
        y: direction.y / len,
        z: direction.z / len
    } : { x: 0, y: 0, z: 1 };
    
    return {
        axisX: normalized.x,
        axisY: normalized.y,
        axisZ: normalized.z,
        sinAngle: Math.sin(angle),
        cosAngle: Math.cos(angle)
    };
};

export interface RotationDirection {
    azimuth: number;  // Horizontal rotation (0 to 2π)
    pitch: number;    // Vertical rotation (-π/2 to π/2)
    angle: number;    // Rotation amount around the direction
}

/**
 * Convert rotation direction to a vec3 that can be sent to the shader
 * The shader will interpret this as a normalized axis + angle
 */
export const rotationToVec3 = (azimuth: number, pitch: number, angle: number): { x: number; y: number; z: number } => {
    // Encode: x = azimuth, y = pitch, z = angle
    // Shader can extract direction and apply rotation
    return { x: azimuth, y: pitch, z: angle };
};

/**
 * Convert a vec3 back to rotation direction components
 */
export const vec3ToRotation = (v: { x: number; y: number; z: number }): RotationDirection => {
    return {
        azimuth: v.x,
        pitch: v.y,
        angle: v.z
    };
};
