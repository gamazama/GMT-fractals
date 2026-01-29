
import { GradientStop } from '../types';
import * as THREE from 'three';

export const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

export const rgbToHex = (r: number | {r:number, g:number, b:number}, g?: number, b?: number): string => {
  if (typeof r === 'object') {
    g = r.g;
    b = r.b;
    r = r.r;
  }
  return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g!) << 8) + Math.round(b!)).toString(16).slice(1).toUpperCase();
};

export const rgbToHsv = ({r, g, b}: {r: number, g: number, b: number}) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;

  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, v: v * 100 };
};

export const hsvToRgb = (h: number, s: number, v: number) => {
  h /= 360; s /= 100; v /= 100;
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return { r: r * 255, g: g * 255, b: b * 255 };
};

export const lerpRGB = (c1: {r:number, g:number, b:number}, c2: {r:number, g:number, b:number}, t: number) => {
  return {
    r: c1.r + (c2.r - c1.r) * t,
    g: c1.g + (c2.g - c1.g) * t,
    b: c1.b + (c2.b - c1.b) * t
  };
};

// Helper to generate CSS gradient string for the UI editor
// Accepts an optional bias parameter to visualize how the shader distorts the gradient (Global View Gamma)
export const getGradientCssString = (stops: GradientStop[], viewGamma: number = 1.0): string => {
  if (!stops || stops.length === 0) return 'linear-gradient(90deg, #000 0%, #fff 100%)';
  
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const parts: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];
      
      // Apply Global View Gamma to the position
      // Shader Logic: t = pow(input, bias) -> Input = pow(t, 1/bias)
      let pos = Math.pow(s.position, 1.0 / viewGamma);
      pos = Math.max(0, Math.min(1, pos)) * 100;
      
      parts.push(`${s.color} ${pos.toFixed(2)}%`);

      if (i < sorted.length - 1) {
          const next = sorted[i + 1];
          const segmentBias = s.bias ?? 0.5;
          const interpolation = s.interpolation || 'linear';

          if (interpolation === 'step') {
               // Step interpolation with bias
               // Bias 0.5 -> Step at 50%. Bias 0.25 -> Step later? No, check math below.
               // Shader: t_biased = pow(t, log(bias)/log(0.5))
               // Step happens when t_biased >= 0.5
               // Threshold T = 0.5 ^ (log(0.5) / log(bias))
               
               let switchT = 0.5;
               if (Math.abs(segmentBias - 0.5) > 0.001) {
                   // If bias is 0.25 (handle left), switchT is ~0.707 (right)
                   // If bias is 0.75 (handle right), switchT is ~0.18 (left)
                   // This assumes 'bias' represents the handle position as a ratio of the segment
                   switchT = Math.pow(0.5, Math.log(0.5) / Math.log(segmentBias));
               }
               
               // Calculate absolute position of switch
               const absSwitchPos = s.position + (next.position - s.position) * switchT;
               
               // Apply global view gamma
               let viewSwitchPos = Math.pow(absSwitchPos, 1.0 / viewGamma) * 100;
               viewSwitchPos = Math.max(0, Math.min(100, viewSwitchPos));

               parts.push(`${s.color} ${viewSwitchPos.toFixed(2)}%`);
               parts.push(`${next.color} ${viewSwitchPos.toFixed(2)}%`);
          } 
          else {
              // Linear/Smooth/Cubic -> Use CSS Hint for Bias approximation
              if (Math.abs(segmentBias - 0.5) > 0.001) {
                  // Hint position H such that color is 50/50 mix at H
                  const tMid = Math.pow(0.5, Math.log(0.5) / Math.log(segmentBias));
                  
                  // Absolute position
                  const absHintPos = s.position + (next.position - s.position) * tMid;
                  
                  // Apply global view gamma
                  let viewHintPos = Math.pow(absHintPos, 1.0 / viewGamma) * 100;
                  viewHintPos = Math.max(0, Math.min(100, viewHintPos));
                  
                  parts.push(`${viewHintPos.toFixed(2)}%`);
              }
          }
      }
  }
  
  return `linear-gradient(90deg, ${parts.join(', ')})`;
};

// --- Texture Generation for Shader ---
// Generates a Uint8Array representing the gradient 256x1
export const generateGradientTextureBuffer = (stops: GradientStop[]): Uint8Array => {
  const width = 256;
  const data = new Uint8Array(width * 4);
  
  // Safety check to prevent crash if stops is undefined
  if (!stops || !Array.isArray(stops) || stops.length === 0) {
      // Return a default black-to-white gradient
      for (let i = 0; i < width; i++) {
        const v = Math.floor((i / 255) * 255);
        data[i * 4] = v;
        data[i * 4 + 1] = v;
        data[i * 4 + 2] = v;
        data[i * 4 + 3] = 255;
      }
      return data;
  }

  const sorted = [...stops].sort((a, b) => a.position - b.position);

  const getColorAt = (pos: number): {r:number, g:number, b:number} => {
    if (pos <= sorted[0].position) return hexToRgb(sorted[0].color) || {r:0,g:0,b:0};
    if (pos >= sorted[sorted.length-1].position) return hexToRgb(sorted[sorted.length-1].color) || {r:0,g:0,b:0};

    for (let i = 0; i < sorted.length - 1; i++) {
      if (pos >= sorted[i].position && pos <= sorted[i+1].position) {
        const s1 = sorted[i];
        const s2 = sorted[i+1];
        
        // Calculate T (0 to 1) between stops
        let t = (pos - s1.position) / (s2.position - s1.position);
        
        // Apply Bias
        const bias = s1.bias ?? 0.5;
        if (bias !== 0.5) {
           // Simple bias function: pow(t, log(0.5) / log(bias))
           const exponent = Math.log(bias) / Math.log(0.5);
           t = Math.pow(t, exponent);
        }

        const mode = s1.interpolation || 'linear';
        if (mode === 'step') {
            t = t < 0.5 ? 0 : 1; 
        } else if (mode === 'smooth' || mode === 'cubic') {
            t = t * t * (3 - 2 * t);
        }

        const c1 = hexToRgb(s1.color) || {r:0,g:0,b:0};
        const c2 = hexToRgb(s2.color) || {r:0,g:0,b:0};
        return lerpRGB(c1, c2, t);
      }
    }
    return {r:0,g:0,b:0};
  };

  for (let i = 0; i < width; i++) {
    const t = i / (width - 1);
    const col = getColorAt(t);
    data[i * 4] = col.r;
    data[i * 4 + 1] = col.g;
    data[i * 4 + 2] = col.b;
    data[i * 4 + 3] = 255; // Alpha
  }
  
  return data;
};
