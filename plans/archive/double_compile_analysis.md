# Double Compile Issue Analysis and Hypothesis List

## Summary
We've implemented an MRT (Multiple Render Targets) solution to solve the physics probe GPU stall problem by rendering depth alongside color in a single pass. However, this has resulted in a doubling of shader compile time from ~12 seconds to ~24 seconds. The issue appears to be related to the shader being compiled twice for similar or identical configurations.

## Hypotheses

### Hypothesis 1: WebGLMultipleRenderTargets Shader Program Duplication (High Likelihood)
The `THREE.WebGLMultipleRenderTargets` class might be creating separate shader programs for each render target configuration, even though the shader code is identical. This could happen because:
- WebGL treats different render target setups as distinct program configurations
- The MRT extension might be causing shader recompilation when switching from single-target to multi-target rendering
- WebGLMultipleRenderTargets uses a different internal framebuffer structure that triggers recompilation

### Hypothesis 2: Main Material vs Display Material Shader Mismatch (Medium Likelihood)
The main material used for rendering to the MRT and the display material used for blitting to the screen might be:
- Using slightly different shader variants
- Having different uniform configurations
- Causing shader recompilation when the material is first used with different render target setups

### Hypothesis 3: Render Target Texture Format Differences (Medium Likelihood)
The textures in the MRT might have different formats, types, or filter settings that cause the GPU to recompile the shader:
- Color texture (RGBA, HalfFloat) vs Depth texture (RGBA, Float)
- Different min/mag filter settings (Linear vs Nearest)
- Texture wrap mode differences

### Hypothesis 4: Shader Compilation Timing Issue (Medium Likelihood)
The compilation sequence might be triggering a second compile due to:
- Renderer context not being fully initialized
- Material properties being modified after initial compile
- Asynchronous shader compilation causing race conditions

### Hypothesis 5: Display Material Uniform Updates Causing Recompile (Low Likelihood)
When the display material's `map` uniform is updated with the output texture from the MRT, this might be causing a shader recompilation because:
- The texture type or format is different from what was expected
- The uniform is being set after the material has been used
- Three.js detects a uniform type mismatch

### Hypothesis 6: React-Three-Fiber Render Cycle Issue (Low Likelihood)
The R3F render loop might be causing additional shader compilation by:
- Creating and destroying materials on each frame
- Changing material properties during the render cycle
- Not properly caching compiled shader programs

## Current Implementation Timeline
```
20:20:59.560 FractalEngine: Triggering GPU shader compilation
20:21:11.256 [Shader Compiled] Time: 11.712s
20:21:11.256 FractalEngine: performCompilation completed
20:21:11.273 App: Scene Ready - Syncing Camera/State...
20:21:11.274 FractalEngine: scheduleCompile called
20:21:11.274 FractalEngine: performCompilation started
20:21:11.274 FractalEngine: Resizing pipeline to 1560 x 724
20:21:11.274 FractalEngine: Updating materials
20:21:11.286 FractalEngine: Shader unchanged - skipping GPU compilation
20:21:11.286 [Shader Compiled] Time: 0.013s
20:21:11.287 FractalEngine: performCompilation completed
<------- THE SECOND COMPILE / 12 second STALL HAPPENS HERE, on the first frame that runs.
```

## Analysis Plan

### 1. Verify WebGLRenderTarget with count Parameter Fix (High Priority)
- Complete the refactor from WebGLMultipleRenderTargets to WebGLRenderTarget with count parameter
- Measure compile time to see if the issue is resolved
- Compare shader program counts in Chrome DevTools before and after refactor

### 2. Investigate Shader Program Creation (High Priority)
- Use Chrome DevTools to:
  - Check shader program count
  - See when and why programs are created/destroyed
  - Look for duplicate program creation
- Monitor the `WEBGL_debug_shaders` extension to see shader source variations

### 3. Analyze Display Material Usage (Medium Priority)
- Compare displayMaterial shader source with main material shader source
- Check if display material is causing recompilation
- Verify uniform configurations between materials

### 4. Test Render Target Configuration (Medium Priority)
- Test if using identical texture formats for both render targets affects compilation
- Experiment with different texture types and formats
- Check if texture settings (minFilter, magFilter, wrap) affect compilation

### 5. Debug Compilation Timing (Low Priority)
- Add detailed logging to track shader compilation phases
- Measure compilation duration for each material
- Look for any timing-related issues

## Fix Strategy

### Primary Fix: WebGLRenderTarget with count Parameter
The main fix we're implementing is to replace `THREE.WebGLMultipleRenderTargets` with `THREE.WebGLRenderTarget` using the `count` parameter. This should:
1. Create a single render target with multiple textures
2. Simplify the render target management
3. Reduce the likelihood of shader program duplication
4. Maintain compatibility with existing features

### Backup Fixes
1. If the primary fix fails, optimize the display material to use the same shader program
2. Modify the compilation sequence to ensure shaders are compiled once for all target configurations
3. Implement shader program caching to avoid recompilation
4. Optimize the MRT texture configurations to be identical

## Expected Outcome
After implementing the fix, the compile time should be reduced back to approximately 12 seconds, with only a single shader compilation happening during initialization.
