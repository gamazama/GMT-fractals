# GMT Documentation - Master Index

## 🎯 Introduction to GMT

**GMT (Fractal Explorer)** is a professional-grade, real-time 3D fractal engineering tool running entirely in the browser. It combines high-performance GPU Raymarching with a reactive, data-driven UI to render complex mathematical structures (Mandelbulbs, Mandelboxes, IFS) with photorealistic lighting, Path Tracing, and infinite zoom capabilities.

This documentation system provides comprehensive information for developers working on GMT. Whether you're fixing bugs, adding features, or understanding the architecture, this index will guide you to the right resources.

## 📚 Documentation Overview

The GMT documentation is organized into several complementary systems:

1. **Technical Documentation** (this folder): Detailed architecture, rendering, and implementation guides
2. **In-App Help System** (`data/help/`): User-facing documentation accessible from the application
3. **README.md**: Project overview, quick start, and high-level documentation
4. **CLAUDE.md**: Condensed architecture overview and instructions for AI sessions

## 📖 Technical Documentation - Table of Contents

### Core Architecture
| File | Purpose | Key Topics |
|------|---------|-------------|
| [01_System_Architecture.md](01_System_Architecture.md) | **Foundation** | Engine-Bridge pattern, DDFS, render loop, state management |
| [02_Rendering_Internals.md](02_Rendering_Internals.md) | **Raymarching** | SDF, Cook-Torrance PBR, reflection tracing, path tracing, fog system, precision math, accumulation, bucket rendering |
| [03_Modular_System.md](03_Modular_System.md) | **Modular Graph Builder** | Node graph → GLSL compiler, JIT code generation, uniform flattening |
| [04_Animation_Engine.md](04_Animation_Engine.md) | **Timeline** | Keyframes, interpolation, unified camera, offline rendering |
| [05_Data_and_Export.md](05_Data_and_Export.md) | **I/O System** | Video export, presets, GMF format, storage strategies |
| [06_Troubleshooting_and_Quirks.md](06_Troubleshooting_and_Quirks.md) | **Debug Guide** | WebGL issues, export problems, precision artifacts |
| [07_Code_Health.md](07_Code_Health.md) | **Maintenance** | Technical debt, refactor status, optimization opportunities |
| [08_File_Structure.md](08_File_Structure.md) | **Reference** | Complete file map with responsibilities |

### Fragmentarium Importer & Formulas
| File | Purpose |
|------|---------|
| [21_Frag_Importer_Current_Status.md](21_Frag_Importer_Current_Status.md) | **⚠️ START HERE — current status and known issues** |
| [22_Frag_to_Native_Formula_Conversion.md](22_Frag_to_Native_Formula_Conversion.md) | Guide: converting .frag formulas to native GMT .ts formulas |
| [23_Formula_Audit.md](23_Formula_Audit.md) | Formula correctness audit: naming, descriptions, params, DE |
| [24_Formula_Interlace_System.md](24_Formula_Interlace_System.md) | Interlace architecture, preambleVars contract, quirks, improvement suggestions |
| [25_Formula_Dev_Reference.md](25_Formula_Dev_Reference.md) | **Unified formula writing reference**: full API surface, shader fields, parameters, GLSL built-ins, quirks & gotchas, templates |
| [26_Formula_Workshop_V4_Plan.md](26_Formula_Workshop_V4_Plan.md) | **V4 rewrite plan** \u2014 self-contained SDE first, verification harness, Fragmentarium as spec reference |
| [26b_Fragmentarium_Spec.md](26b_Fragmentarium_Spec.md) | **Fragmentarium `.frag` format spec** \u2014 canonical directives, annotations, render-model classification; drives V4 Stage 2 |
| [27_Shader_Testing_Suite.md](27_Shader_Testing_Suite.md) | **GLSL shader verification harness** \u2014 Playwright-driven, real ShaderFactory path, 6 gates. Usable beyond the importer |
| [research/v4-rethink-prompt.md](research/v4-rethink-prompt.md) | Self-contained prompt for a fresh session to rethink V4 architecture |
| [research/hybrid-formula-architecture-comparison.md](research/hybrid-formula-architecture-comparison.md) | **How Mandelbulber2 / Fragmentarium / Fraktaler architect hybrid formulas** — confirms GMT's per-iter contract is mainstream; retires Strategy I; points at N-formula sequences as the real gap |

### Archive
Historical design docs, completed reports, and superseded references are in [`docs/archive/`](archive/). See [`archive/README.md`](archive/README.md) for a categorized index.

### Changelog
| File | Purpose |
|------|---------|
| [CHANGELOG_DEV.md](CHANGELOG_DEV.md) | Development changelog for current dev branch (v0.9.1) |

## 🚀 Getting Started

### For New Contributors
1. Start with [README.md](../README.md) - Quick start and project overview
2. Read [01_System_Architecture.md](01_System_Architecture.md) - Understand the core engine pattern
3. Check [08_File_Structure.md](08_File_Structure.md) - Navigate the codebase
4. Review [07_Code_Health.md](07_Code_Health.md) - Know the current state of the code

### For Feature Development
1. Read [01_System_Architecture.md](01_System_Architecture.md) §2 - Learn about DDFS (Data-Driven Feature System)
2. Check existing patterns in `engine/FeatureSystem.ts` and `features/` folder
3. Follow the DDFS implementation pattern (documented in architecture guide §2.2e for reference features)
4. For modular graph nodes, see [03_Modular_System.md](03_Modular_System.md)
5. Test with both Direct and Path Tracing modes

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
- **Modular Graph Builder**: [03_Modular_System.md](03_Modular_System.md#1-the-compiler-graphcompiler.ts)
- **Animation Engine**: [04_Animation_Engine.md](04_Animation_Engine.md)

### Key Files & Locations
| Concept | File |
|---------|------|
| Main Engine Loop | `engine/FractalEngine.ts` |
| Feature Definitions | `engine/FeatureSystem.ts` |
| Store & State | `store/fractalStore.ts` |
| Shader Assembly | `engine/ShaderFactory.ts` |
| Animation Timeline | `engine/AnimationEngine.ts` |
| Video Export | `engine/worker/WorkerExporter.ts` |
| Auto-Generated UI | `components/AutoFeaturePanel.tsx` |
| Compilable Feature UI | `components/CompilableFeatureSection.tsx` |

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
4. **Check CLAUDE.md** for AI session context

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
5. Try the "Fastest" or "Preview" viewport quality preset to isolate GPU-related issues

## 📚 Additional Resources

- **GitHub Repository**: [https://github.com/gamazama/GMT-fractals](https://github.com/gamazama/GMT-fractals)
- **License**: [GPL-3.0 License](../LICENSE)
- **Package Dependencies**: [package.json](../package.json)

---

*Last updated: April 2026 (v0.9.1 — mesh export VDB, formula interlace, polyhedra formulas)*
