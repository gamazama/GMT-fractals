# GMT Documentation - Master Index

## 🎯 Introduction to GMT

**GMT (GPU Mandelbulb Tracer)** is a professional-grade, real-time 3D fractal engineering tool running entirely in the browser. It combines high-performance GPU Raymarching with a reactive, data-driven UI to render complex mathematical structures (Mandelbulbs, Mandelboxes, IFS) with photorealistic lighting, Path Tracing, and infinite zoom capabilities.

This documentation system provides comprehensive information for developers working on GMT. Whether you're fixing bugs, adding features, or understanding the architecture, this index will guide you to the right resources.

## 📚 Documentation Overview

The GMT documentation is organized into several complementary systems:

1. **Technical Documentation** (this folder): Detailed architecture, rendering, and implementation guides
2. **In-App Help System** (`data/help/`): User-facing documentation accessible from the application
3. **README.md**: Project overview, quick start, and high-level documentation
4. **Context Files** (`context.md`, `context2.md`): Condensed architecture overviews for AI sessions

## 📖 Technical Documentation - Table of Contents

### Core Architecture
| File | Purpose | Key Topics |
|------|---------|-------------|
| [01_System_Architecture.md](01_System_Architecture.md) | **Foundation** | Engine-Bridge pattern, DDFS, render loop, state management |
| [02_Rendering_Internals.md](02_Rendering_Internals.md) | **Raymarching** | SDF, path tracing, precision math, accumulation, bucket rendering (4K-10K support) |
| [03_Modular_System.md](03_Modular_System.md) | **Node Graph** | Graph compiler, JIT GLSL generation, uniform flattening |
| [04_Animation_Engine.md](04_Animation_Engine.md) | **Timeline** | Keyframes, interpolation, unified camera, offline rendering |
| [05_Data_and_Export.md](05_Data_and_Export.md) | **I/O System** | Video export, presets, GMF format, storage strategies |
| [06_Troubleshooting_and_Quirks.md](06_Troubleshooting_and_Quirks.md) | **Debug Guide** | WebGL issues, export problems, precision artifacts |
| [07_Code_Health.md](07_Code_Health.md) | **Maintenance** | Technical debt, refactor status, optimization opportunities |
| [08_File_Structure.md](08_File_Structure.md) | **Reference** | Complete file map with responsibilities |

### Specialized Reports
| File | Purpose |
|------|---------|
| [09_Mapping_Modes_Report.md](09_Mapping_Modes_Report.md) | Analysis of coloring mapping modes |
| [10_Shader_Architecture_Refactor.md](10_Shader_Architecture_Refactor.md) | Shader composition and injection patterns |

## 🚀 Getting Started

### For New Contributors
1. Start with [README.md](../README.md) - Quick start and project overview
2. Read [01_System_Architecture.md](01_System_Architecture.md) - Understand the core engine pattern
3. Check [08_File_Structure.md](08_File_Structure.md) - Navigate the codebase
4. Review [07_Code_Health.md](07_Code_Health.md) - Know the current state of the code

### For Feature Development
1. Read [01_System_Architecture.md](01_System_Architecture.md) - Learn about DDFS
2. Check existing patterns in `engine/FeatureSystem.ts` and `features/` folder
3. Follow the DDFS implementation pattern (documented in architecture guide)
4. Test with both Direct and Path Tracing modes

### For Bug Fixes
1. Identify the system involved (UI, Engine, or Bridge)
2. Check [06_Troubleshooting_and_Quirks.md](06_Troubleshooting_and_Quirks.md) for known issues
3. Use [08_File_Structure.md](08_File_Structure.md) to locate relevant files
4. Document the fix in the appropriate guide if it reveals new patterns

## 🔗 Cross-Reference Guide

### Architecture Concepts
- **Engine-Bridge Pattern**: [01_System_Architecture.md](01_System_Architecture.md#1-the-engine-bridge-pattern)
- **Data-Driven Feature System (DDFS)**: [01_System_Architecture.md](01_System_Architecture.md#2-data-driven-feature-system-ddfs)
- **Virtual Space (Infinite Zoom)**: [02_Rendering_Internals.md](02_Rendering_Internals.md#1-coordinate-precision-the-treadmill)
- **Temporal Super Sampling**: [02_Rendering_Internals.md](02_Rendering_Internals.md#3-the-pipeline-renderpipelinets)
- **Graph Compiler**: [03_Modular_System.md](03_Modular_System.md#1-the-compiler-graphcompiler.ts)
- **Animation Engine**: [04_Animation_Engine.md](04_Animation_Engine.md)

### Key Files & Locations
| Concept | File |
|---------|------|
| Main Engine Loop | `engine/FractalEngine.ts` |
| Feature Definitions | `engine/FeatureSystem.ts` |
| Store & State | `store/fractalStore.ts` |
| Shader Assembly | `engine/ShaderFactory.ts` |
| Animation Timeline | `engine/AnimationEngine.ts` |
| Video Export | `engine/VideoExporter.ts` |
| Auto-Generated UI | `components/AutoFeaturePanel.tsx` |

### User Documentation
The in-app help system is located in `data/help/`. Topics include:
- Formula library and usage
- Rendering techniques (Direct vs Path Trace)
- Lighting and materials
- Animation and keyframing
- Scene configuration
- UI controls and shortcuts

## 📝 Documentation Guidelines

### How to Use This System
1. **Start with the README** for project overview and quick start
2. **Use the Table of Contents** to find relevant technical guides
3. **Follow cross-references** between different documentation types
4. **Check context files** for AI session overviews

### Updating Documentation
When making changes to GMT:
1. If you struggle to understand a code section - document it
2. If you discover an undocumented pattern - add it
3. If you fix a bug with non-obvious causes - document the fix
4. If you add a new feature or system - write comprehensive docs
5. Keep documentation in sync with code changes

### Documentation Style
- Use clear, technical language
- Include file paths with backticks: `engine/FractalEngine.ts`
- Use code blocks for examples
- Add "Rule:" prefixes for important guidelines
- Include "Why:" explanations for non-obvious decisions
- Cross-reference related sections

## 🎯 Quick Reference Cards

### Critical Rules
1. **Never bind React state directly in render loops** - use the bridge pattern
2. **Use DDFS for state management** - don't create manual slices
3. **Let the system auto-generate UI** - use AutoFeaturePanel when possible
4. **Read docs before making changes** - prevent unnecessary bugs
5. **Update documentation after changes** - keep the system useful

### Performance Tips
- Use `textureLod0` helper for texture lookups in raymarching loops
- Set `uEncodeOutput = 1.0` for sRGB gamma during video export
- Use CPU distance probe to avoid GPU stalls on low-end devices
- Lower "Max Steps" and "Ray Detail" to fix TDR crashes

### Debugging Checklist
1. Check browser console for WebGL errors
2. Use Shader Debugger (`components/ShaderDebugger.tsx`)
3. Check State Debugger for feature parameter values
4. Use Performance Monitor to identify bottlenecks
5. Try "Lite Mode" to isolate GPU-related issues

## 📚 Additional Resources

- **GitHub Repository**: [https://github.com/d3x0r/GMT](https://github.com/d3x0r/GMT)
- **License**: [GPL-3.0 License](../LICENSE)
- **Package Dependencies**: [package.json](../package.json)

---

*Last updated: February 2026*

## 11. Recent Changes Summary

### 2026-02-24 Fixes
| Category | Change | Files |
|----------|--------|-------|
| **Video Export** | Bitrate auto-scales with resolution (40 Mbps base for 1080p) | `data/constants.ts`, `components/timeline/RenderPopup.tsx` |
| **Video Export** | Viewport state restoration after render | `engine/VideoExporter.ts` |
| **Sliders** | Removed log scaling from roughness, AO intensity, AO spread | `features/materials.ts`, `features/ao/index.ts` |
| **Sliders** | Increased precision (min 0.001, step 0.001) for roughness and AO spread | `features/materials.ts`, `features/ao/index.ts` |
| **Graph Editor** | Fixed browser drag-to-copy interference | `components/panels/flow/FlowEditor.tsx` |
| **Quality Panel** | Max Ray Steps dynamically limited by Hard Loop Cap | `engine/FeatureSystem.ts`, `components/AutoFeaturePanel.tsx`, `features/quality.ts` |
| **Quality Panel** | Overstep Fix visible without advanced mode | `features/quality.ts` |
| **Quality Panel** | Manual Distance only shows when Manual probe selected | `features/quality.ts` |
