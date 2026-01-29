
import { UNIFORM_SCHEMA } from '../../engine/UniformSchema';

const generateUniformsGLSL = () => {
    let glsl = `precision highp float;\nprecision highp int;\n\n`;
    
    UNIFORM_SCHEMA.forEach(u => {
        if (u.arraySize) {
            glsl += `uniform ${u.type} ${u.name}[${u.arraySize}];\n`;
        } else {
            glsl += `uniform ${u.type} ${u.name};\n`;
        }
    });
    
    glsl += `\nin vec2 vUv;\n`; // GLSL 3: 'in' instead of 'varying'
    return glsl;
};

export const UNIFORMS = generateUniformsGLSL();
