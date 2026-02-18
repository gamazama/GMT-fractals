
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree, createPortal } from '@react-three/fiber';
import * as THREE from 'three';
import { engine } from '../engine/FractalEngine';
import { useFractalStore } from '../store/fractalStore';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';
import { tick as animationTick } from './AnimationSystem';
import { tick as lightGizmoTick } from '../features/lighting/LightGizmo';
import { tick as fpsCounterTick } from './topbar/FpsCounter';
import { tick as performanceMonitorTick } from './PerformanceMonitor';
import { tick as trackRowTick } from './timeline/TrackRow';

interface MandelbulbSceneProps {
    onLoaded?: () => void;
    isInteracting?: boolean;
}

const MandelbulbScene: React.FC<MandelbulbSceneProps> = ({ onLoaded }) => {
  const { camera, size, gl, scene: mainScene } = useThree();
  const [isCompiled, setIsCompiled] = useState(false);
  const isExporting = useFractalStore(s => s.isExporting);

  // --- STATIC HUD SCENE ---
  // We create a separate Scene + Ortho Camera to render the full-screen quad.
  // This ensures the fractal always fills the viewport, regardless of where the
  // main interactive camera (Orbit/Fly) moves.
  const hudScene = useMemo(() => new THREE.Scene(), []);
  const hudCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  const screenMeshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
      engine.registerCamera(camera);
      engine.registerRenderer(gl);
  }, [camera, gl]);

  // Compilation Sequence
  useEffect(() => {
      if (!gl || isCompiled) return;
      engine.mainUniforms.uResolution.value.set(size.width, size.height);
      engine.pipeline.resize(size.width, size.height);

      let isMounted = true;

      const performCompilation = async () => {
          while (!engine.isBooted) {
              if (!isMounted) return;
              await new Promise(r => setTimeout(r, 50));
          }

          // Wait for engine's internal compilation to complete
          while (engine.isCompiling) {
              if (!isMounted) return;
              await new Promise(r => setTimeout(r, 50));
          }

          // Now that engine compilation is complete, we're ready to render
          setIsCompiled(true);
          if (onLoaded) onLoaded();
      };

      performCompilation();

      return () => {
          isMounted = false;
      };
  }, [gl, size]);

  useEffect(() => {
      // Sync Resolution on Resize
      if (engine.mainUniforms.uResolution.value) {
           engine.mainUniforms.uResolution.value.set(size.width, size.height);
           engine.pipeline.resize(size.width, size.height);
           engine.resetAccumulation();
      }
  }, [size]);

  // --- RENDER LOOP ---
  // Priority 1: Runs BEFORE default R3F render
  useFrame((state, delta) => {
    if (!isCompiled) return;
    
    // When exporting, tick the video exporter and skip normal rendering
    if (isExporting) {
        engine.videoExporter.tick(gl);
        return;
    }

    // 1. Animation System Tick
    animationTick(delta);

    // 2. Update Engine Logic (Virtual Space, Smoothing)
    // This calculates where the camera should be in fractal space
    engine.update(camera, delta, state);

    // 3. Update Light Gizmos
    lightGizmoTick();

    // 4. Update FPS Counter
    fpsCounterTick();

    // 5. Update Performance Monitor
    performanceMonitorTick();

    // 6. Update Track Row Live Values
    trackRowTick();

    // 7. Compute Fractal (Render to internal FBOs)
    engine.compute(gl);
    
    // 8. Blit to Screen (Render HUD Scene)
    const outputTex = engine.pipeline.getOutputTexture();
    if (screenMeshRef.current && outputTex) {
        // Update display material with latest frame
        engine.materials.displayMaterial.uniforms.map.value = outputTex;
        
        // Manual Draw of the HUD Scene
        // We disable autoClear so R3F can draw Gizmos on top afterwards
        gl.autoClear = false;
        gl.clear();
        gl.render(hudScene, hudCamera);
        
        // Clear Depth so Gizmos don't z-fight with the background quad
        gl.clearDepth();
    }
  }, 1);

  // Return Portal: Renders the quad into our detached HUD scene
  return createPortal(
    <mesh 
        ref={screenMeshRef} 
        frustumCulled={false} 
        material={engine.materials.displayMaterial}
    >
      <planeGeometry args={[2, 2]} />
    </mesh>,
    hudScene
  );
};

export default MandelbulbScene;
