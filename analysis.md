# Compilation Flow Analysis and Fix

## Current Issue
The compile spinner appears but no compilation happens, resulting in a black screen. The shader compilation is never triggered, and there are no compile time logs.

## Root Cause
The compilation flow has become broken with the removal of redundant code. Let's trace what should happen:

1. `useAppStartup` calls `bootEngine()` after a delay
2. `bootEngine()` calls `engine.bootWithConfig()`
3. `bootWithConfig()` calls `scheduleCompile()`
4. `scheduleCompile()` calls `performCompilation()`
5. `performCompilation()` updates materials and renders once to trigger compilation

The problem seems to be in the render call - it's not actually triggering the shader compilation because:

1. The pipeline might not be properly initialized
2. The materials might not be properly configured
3. The render call might be failing silently

## Fix Plan

### 1. Restore compilation flow by removing premature render call
The render call in `performCompilation()` is problematic because:
- It might fail if the pipeline isn't properly sized
- It might not actually trigger shader compilation
- It complicates the compilation state management

### 2. Simplify compilation logic
Let's go back to basics - the materials.updateConfig() call should trigger shader compilation, and the compilation indicator should remain active until the first actual render happens.

### 3. Ensure pipeline is properly initialized
Make sure the pipeline is properly sized before any rendering happens.

## Implementation
<seed:tool_call>
</function>
</seed:tool_call>