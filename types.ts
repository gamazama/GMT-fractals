
import type React from 'react';

export * from './types/common';
export * from './types/graphics';
export * from './types/animation';
export * from './types/graph';
export * from './types/fractal';
export * from './types/store';

// Explicitly extend the JSX namespace to include React Three Fiber elements.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Core
      mesh: any;
      group: any;
      primitive: any;
      
      // Geometry
      planeGeometry: any;
      boxGeometry: any;
      sphereGeometry: any;
      torusGeometry: any;
      icosahedronGeometry: any;
      ringGeometry: any;
      
      // Materials
      shaderMaterial: any;
      meshBasicMaterial: any;
      spriteMaterial: any;
      
      // Lights
      pointLight: any;
      ambientLight: any;
      directionalLight: any;
      
      // Others
      sprite: any;
      color: any;
      fog: any;

      // Allow any other element (HTML/SVG) to prevent type errors
      [elemName: string]: any;
    }
  }
  
  // Augment React.JSX namespace for newer React types (v18+)
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        mesh: any;
        group: any;
        primitive: any;
        planeGeometry: any;
        boxGeometry: any;
        sphereGeometry: any;
        torusGeometry: any;
        icosahedronGeometry: any;
        ringGeometry: any;
        shaderMaterial: any;
        meshBasicMaterial: any;
        spriteMaterial: any;
        pointLight: any;
        ambientLight: any;
        directionalLight: any;
        sprite: any;
        color: any;
        fog: any;

        // Allow any other element (HTML/SVG) to prevent type errors
        [elemName: string]: any;
      }
    }
  }
}
