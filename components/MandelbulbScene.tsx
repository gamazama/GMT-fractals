
import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { engine } from '../engine/FractalEngine';
import { useFractalStore } from '../store/fractalStore';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';

interface MandelbulbSceneProps {
    onLoaded?: () => void;
    isInteracting?: boolean; // New prop from Navigation context
}

const MandelbulbScene: React.FC<MandelbulbSceneProps> = ({ onLoaded, isInteracting }) => {
  const { camera, size, gl } = useThree();
  const screenMeshRef = useRef<THREE.Mesh>(null);
  const [isCompiled, setIsCompiled] = useState(false);
  
  // Use store selector for reactivity
  const isExporting = useFractalStore(s => s.isExporting);

  useEffect(() => {
      engine.registerCamera(camera);
      engine.registerRenderer(gl);
  }, [camera, gl]);

  // Robust Compilation Sequence
  useEffect(() => {
      // Prevent running if already compiled or gl context missing
      if (!gl || isCompiled) return;

      // Ensure uniforms are initialized with correct size before compile
      engine.mainUniforms.uResolution.value.set(size.width, size.height);

      let isMounted = true;

      const performCompilation = async () => {
          // 1. WAIT FOR BOOT
          // We poll until the FractalEngine has generated its initial source code
          while (!engine.isBooted) {
              if (!isMounted) return;
              await new Promise(r => setTimeout(r, 50));
          }

          // 2. SIGNAL UI & YIELD
          // Explicitly tell the UI we are working, then yield to allow the spinner to paint.
          // This fixes the "Hang with no load screen" issue.
          FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, "Initializing GPU...");
          
          // Wait 2 frames to ensure the browser has painted the DOM updates
          await new Promise(r => requestAnimationFrame(() => setTimeout(r, 100)));
          
          if (!isMounted) return;

          const startTime = performance.now();
          const context = gl.getContext();
          
          // Check for extension support explicitly to avoid Three.js warnings
          const parallelExt = context.getExtension('KHR_parallel_shader_compile');
          const debugInfo = context.getExtension('WEBGL_debug_renderer_info');
          const rendererName = debugInfo ? context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown';

          try {
              // 3. COMPILE
              // Note: Even with compileAsync, the driver might block on the first draw.
              if (parallelExt) {
                  await gl.compileAsync(engine.mainScene, engine.mainCamera);
              } else {
                  gl.compile(engine.mainScene, engine.mainCamera);
              }

              // 4. FORCE LINK (The "Warmup Render")
              // Compiling isn't enough; we must draw to force the driver to link the program.
              // We render to a 1x1 target to minimize pixel shading cost, we just want pipeline validation.
              const dummyTarget = new THREE.WebGLRenderTarget(1, 1);
              gl.setRenderTarget(dummyTarget);
              gl.render(engine.mainScene, engine.mainCamera);
              gl.setRenderTarget(null);
              dummyTarget.dispose();
              
              // 5. FINISH
              const duration = (performance.now() - startTime) / 1000;
              console.log(`[Shader Compiled] GPU: ${rendererName} | Time: ${duration.toFixed(3)}s`);
              
              // Only emit compile time if it was significant (filters out cache hits/false starts)
              if (duration > 0.05) {
                  FractalEvents.emit(FRACTAL_EVENTS.COMPILE_TIME, duration);
              }
              
              FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, false);

              if (isMounted) {
                  setIsCompiled(true);
                  if (onLoaded) onLoaded();
              }

          } catch (err) {
              console.error("MandelbulbScene: Fatal Compilation Error", err);
              FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, false);
              // Fallback to allow app to continue (might show pink screen)
              if (isMounted) {
                  setIsCompiled(true);
                  if (onLoaded) onLoaded();
              }
          }
      };

      performCompilation();

      return () => {
          isMounted = false;
          FractalEvents.emit(FRACTAL_EVENTS.IS_COMPILING, false);
      };
      
  }, [gl, size]);

  useEffect(() => {
      engine.mainUniforms.uResolution.value.set(size.width, size.height);
      engine.pipeline.resize(size.width, size.height);
  }, [size]);

  useFrame((state, delta) => {
    if (!isCompiled) return;
    if (isExporting) return;

    // Engine render
    engine.render(gl);
    
    if (screenMeshRef.current) {
        engine.materials.displayMaterial.uniforms.map.value = engine.pipeline.getOutputTexture();
    }
  });

  return (
    <mesh 
        ref={screenMeshRef} 
        frustumCulled={false} 
        renderOrder={-1} 
        material={engine.materials.displayMaterial}
    >
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
};

export default MandelbulbScene;
