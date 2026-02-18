# GMT - GPU Mandelbulb Tracer

**GMT** is a professional-grade, real-time 3D fractal engineering tool running entirely in the browser. It combines high-performance GPU Raymarching with a reactive, data-driven UI to render complex mathematical structures (Mandelbulbs, Mandelboxes, IFS) with photorealistic lighting, Path Tracing, and infinite zoom capabilities.

## 🌟 Key Features

*   **Hybrid Render Engine:**
    *   **Direct Mode:** 60FPS real-time raymarching with soft shadows, reflections, and ambient occlusion.
    *   **Path Tracer:** Physically-based Monte Carlo rendering with Global Illumination (GI) and emissive materials.
*   **High Zoom:** Uses a custom "Split-Float" precision system to exceed standard WebGL limits ($10^{15}$ zoom factor).
*   **Modular Builder:** A node-based graph editor to construct custom fractal formulas (JIT Compiled to GLSL).
*   **Animation Studio:** Full keyframe timeline with Bezier curves, Dope Sheet, and Graph Editor.
*   **Video Export:** Offline rendering pipeline supporting 4K+ resolution and high-bitrate WebM/MP4 export (using WebCodecs).
*   **Environment Features:**
    *   **Water Plane:** Infinite ocean with procedural waves.
    *   **Volumetrics:** Atmospheric fog and glow.
*   **Data-Driven Architecture:** Features are defined in a registry, automatically generating UI, State, and Shaders.

## 🚀 Quick Start

### Prerequisites
*   Node.js (v18+)
*   npm or yarn

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` (or the port shown in your terminal).

## 🗺️ Documentation

GMT has a comprehensive documentation system. **Start with [DOCS_INDEX.md](docs/DOCS_INDEX.md)** for a complete overview and table of contents.

### Documentation System Structure

1.  **[DOCS_INDEX.md](docs/DOCS_INDEX.md)**: **Central Entry Point** - Master index with quick reference, cross-referenced guides, and documentation guidelines
2.  **Technical Documentation**: Detailed architecture, rendering, and implementation guides (in `docs/` folder)
3.  **In-App Help System**: User-facing documentation accessible from the application (`data/help/`)
4.  **README.md**: This file - Project overview, quick start, and high-level documentation
5.  **Context Files**: Condensed architecture overviews for AI sessions (`docs/context.md`, `docs/context2.md`)

### Key Technical Guides (available via DOCS_INDEX)
- **System Architecture**: Engine-Bridge pattern, Data-Driven Feature System (DDFS)
- **Rendering Internals**: Raymarching, precision math, path tracing
- **Modular System**: Node graph to GLSL compilation
- **Animation Engine**: Timeline, keyframes, interpolation
- **Data & Export**: Video export, GMF format, presets
- **Troubleshooting**: WebGL issues, precision artifacts, browser quirks
- **Code Health**: Technical debt, refactor status
- **File Structure**: Complete file map and responsibilities

## 🛠️ Technology Stack

*   **Core:** React 18, TypeScript, Vite.
*   **3D/WebGL:** Three.js, React-Three-Fiber (R3F), Drei.
*   **State:** Zustand (with `subscribeWithSelector`).
*   **Compute:** Raw GLSL Fragment Shaders (Custom `ShaderMaterial`).
*   **Video:** `mediabunny` (Custom Wrapper around WebCodecs).

## 📂 Directory Structure

*   **`components/`**: React UI (Panels, Timeline, Viewport).
    *   `components/panels/`: Feature-specific control panels.
    *   `components/registry/`: Dynamic component loader.
*   **`engine/`**: The imperative WebGL core (Runs outside React render cycle).
    *   `FractalEngine.ts`: The Singleton managing the render loop.
    *   `ShaderFactory.ts`: Assembles GLSL chunks dynamically.
    *   `RenderPipeline.ts`: Manages resolution, accumulation, and buckets.
*   **`features/`**: **DDFS Modules**. Each folder contains the State, Config, and UI definition for a feature (e.g., `lighting`, `coloring`).
*   **`formulas/`**: Fractal math definitions (Mandelbulb, Menger, etc.).
*   **`shaders/`**: Static GLSL chunks.
*   **`store/`**: Zustand store slices.
*   **`utils/`**: Math helpers, Graph algorithms, Encoders.

## 📜 License

**GPL-3.0 License**

Copyright (c) 2024 Guy Zack

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

## 🤝 Contributing

Contributions are welcome! Please read the technical documentation in `/docs` before submitting a Pull Request.
1.  Fork the repo.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

Contributions are welcome! Please read the technical documentation in `/docs` before submitting a Pull Request.
1.  Fork the repo.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

Contributions are welcome! Please read the technical documentation in `/docs` before submitting a Pull Request.
1.  Fork the repo.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.
5.  Open a Pull Request.
## 🤝 Contributing

Contributions are welcome! Please read the technical documentation in `/docs` before submitting a Pull Request.
1.  Fork the repo.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

