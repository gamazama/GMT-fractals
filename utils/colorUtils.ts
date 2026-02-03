
import { GradientStop, GradientConfig, ColorSpaceMode } from '../types';
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

// Bias Helper: Maps t [0,1] such that input 'bias' maps to 0.5 output
const applyBias = (t: number, bias: number) => {
    if (Math.abs(bias - 0.5) < 0.001) return t;
    const safeBias = Math.max(0.001, Math.min(0.999, bias));
    const k = Math.log(0.5) / Math.log(safeBias);
    return Math.pow(t, k);
};

export const getGradientCssString = (input: GradientStop[] | GradientConfig | undefined, viewGamma: number = 1.0): string => {
  let stops: GradientStop[];

  if (!input) return 'linear-gradient(90deg, #000 0%, #fff 100%)';
  
  if (Array.isArray(input)) {
      stops = input;
  } else if (input && Array.isArray((input as GradientConfig).stops)) {
      stops = (input as GradientConfig).stops;
  } else {
      // Fallback for malformed data
      return 'linear-gradient(90deg, #000 0%, #fff 100%)';
  }

  if (!stops || stops.length === 0) return 'linear-gradient(90deg, #000 0%, #fff 100%)';
  
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const parts: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];
      
      let pos = Math.pow(s.position, 1.0 / viewGamma);
      pos = Math.max(0, Math.min(1, pos)) * 100;
      
      parts.push(`${s.color} ${pos.toFixed(2)}%`);

      if (i < sorted.length - 1) {
          const next = sorted[i + 1];
          const segmentBias = s.bias ?? 0.5;
          const interpolation = s.interpolation || 'linear';

          if (interpolation === 'step') {
               let switchT = segmentBias; 
               const absSwitchPos = s.position + (next.position - s.position) * switchT;
               let viewSwitchPos = Math.pow(absSwitchPos, 1.0 / viewGamma) * 100;
               viewSwitchPos = Math.max(0, Math.min(100, viewSwitchPos));

               parts.push(`${s.color} ${viewSwitchPos.toFixed(2)}%`);
               parts.push(`${next.color} ${viewSwitchPos.toFixed(2)}%`);
          } 
          else {
              if (Math.abs(segmentBias - 0.5) > 0.001) {
                  const absHintPos = s.position + (next.position - s.position) * segmentBias;
                  let viewHintPos = Math.pow(absHintPos, 1.0 / viewGamma) * 100;
                  viewHintPos = Math.max(0, Math.min(100, viewHintPos));
                  parts.push(`${viewHintPos.toFixed(2)}%`);
              }
          }
      }
  }
  
  return `linear-gradient(90deg, ${parts.join(', ')})`;
};

const sRGBToLinear = (c: number) => Math.pow(c / 255.0, 2.2) * 255.0;

const inverseACES = (c: number) => {
    const y = c / 255.0;
    if (y >= 0.99) return 255.0;
    const x = (Math.sqrt(-10127*y*y + 13702*y + 9) + 59*y - 3) / (502 - 486*y);
    return Math.max(0, x) * 255.0;
};

// Generates a Uint8Array representing the gradient 256x1
// Polymorphic: Accepts legacy array OR new object
export const generateGradientTextureBuffer = (input: GradientStop[] | GradientConfig): Uint8Array => {
  const width = 256;
  const data = new Uint8Array(width * 4);
  
  let stops: GradientStop[];
  let colorSpace: ColorSpaceMode = 'srgb';

  // Polymorphic Handling
  if (Array.isArray(input)) {
      stops = input;
  } else if (input && Array.isArray(input.stops)) {
      stops = input.stops;
      colorSpace = input.colorSpace || 'srgb';
  } else {
      // Fallback
      return data;
  }
  
  if (stops.length === 0) {
      for (let i = 0; i < width; i++) {
        const v = Math.floor((i / 255) * 255);
        data[i * 4] = v; data[i * 4 + 1] = v; data[i * 4 + 2] = v; data[i * 4 + 3] = 255;
      }
      return data;
  }

  const sorted = [...stops].sort((a, b) => a.position - b.position);

  const getColorAt = (pos: number): {r:number, g:number, b:number} => {
    let rawColor = {r:0, g:0, b:0};
    
    if (pos <= sorted[0].position) {
        rawColor = hexToRgb(sorted[0].color) || {r:0,g:0,b:0};
    } else if (pos >= sorted[sorted.length-1].position) {
        rawColor = hexToRgb(sorted[sorted.length-1].color) || {r:0,g:0,b:0};
    } else {
        for (let i = 0; i < sorted.length - 1; i++) {
            if (pos >= sorted[i].position && pos <= sorted[i+1].position) {
                const s1 = sorted[i];
                const s2 = sorted[i+1];
                
                let t = (pos - s1.position) / (s2.position - s1.position);
                const bias = s1.bias ?? 0.5;
                if (Math.abs(bias - 0.5) > 0.001) {
                    t = applyBias(t, bias);
                }

                const mode = s1.interpolation || 'linear';
                if (mode === 'step') {
                    t = t < 0.5 ? 0 : 1; 
                } else if (mode === 'smooth' || mode === 'cubic') {
                    t = t * t * (3 - 2 * t);
                }

                const c1 = hexToRgb(s1.color) || {r:0,g:0,b:0};
                const c2 = hexToRgb(s2.color) || {r:0,g:0,b:0};
                rawColor = lerpRGB(c1, c2, t);
                break;
            }
        }
    }
    
    // Apply Output Transform based on stored profile
    if (colorSpace === 'linear') {
        return {
            r: sRGBToLinear(rawColor.r),
            g: sRGBToLinear(rawColor.g),
            b: sRGBToLinear(rawColor.b)
        };
    } else if (colorSpace === 'aces_inverse') {
        return {
            r: inverseACES(rawColor.r),
            g: inverseACES(rawColor.g),
            b: inverseACES(rawColor.b)
        };
    }
    
    return rawColor;
  };

  for (let i = 0; i < width; i++) {
    const t = i / (width - 1);
    const col = getColorAt(t);
    data[i * 4] = col.r;
    data[i * 4 + 1] = col.g;
    data[i * 4 + 2] = col.b;
    data[i * 4 + 3] = 255; 
  }
  
  return data;
};
