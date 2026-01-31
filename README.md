
# GMT - GPU Mandelbulb Tracer

**GMT** is a professional-grade, real-time 3D fractal engineering tool running entirely in the browser. It combines high-performance GPU Raymarching with a reactive, data-driven UI to render complex mathematical structures (Mandelbulbs, Mandelboxes, IFS) with photorealistic lighting, Path Tracing, and infinite zoom capabilities.

## 🌟 Key Features

*   **Hybrid Render Engine:**
    *   **Direct Mode:** 60FPS real-time raymarching with soft shadows and ambient occlusion.
    *   **Path Tracer:** Physically-based Monte Carlo rendering with Global Illumination (GI) and emissive materials.
*   **High Zoom:** Uses a custom "Split-Float" precision system to exceed standard WebGL limits ($10^{15}$ zoom factor).
*   **Modular Builder:** A node-based graph editor to construct custom fractal formulas (JIT Compiled to GLSL).
*   **Animation Studio:** Full keyframe timeline with Bezier curves, Dope Sheet, and Graph Editor.
*   **Video Export:** Offline rendering pipeline supporting 4K+ resolution and high-bitrate WebM export (using WebCodecs).
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

We maintain detailed documentation for contributors:

1.  **[System Architecture](docs/01_System_Architecture.md)**: The "Engine-Bridge" pattern and Data-Driven Feature System (DDFS).
2.  **[Rendering Internals](docs/02_Rendering_Internals.md)**: Raymarching loop, precision math, and Path Tracing integration.
3.  **[Modular System](docs/03_Modular_System.md)**: How the Node Graph compiles to raw GLSL.
4.  **[Animation Engine](docs/04_Animation_Engine.md)**: The sequencer, interpolation logic, and unified camera system.
5.  **[Data & Export](docs/05_Data_and_Export.md)**: Video encoding pipeline, GMF format, and Presets.
6.  **[Troubleshooting](docs/06_Troubleshooting_and_Quirks.md)**: Common pitfalls, GLSL limits, and browser-specific quirks.
7.  **[Code Health](docs/07_Code_Health.md)**: Current refactor status and known debt.
8.  **[File Map](docs/08_File_Structure.md)**: Comprehensive list of files and responsibilities.

## 🛠️ Technology Stack

*   **Core:** React 18, TypeScript, Vite.
*   **3D/WebGL:** Three.js, React-Three-Fiber (R3F), Drei.
*   **State:** Zustand (with `subscribeWithSelector`).
*   **Compute:** Raw GLSL Fragment Shaders (Custom `ShaderMaterial`).
*   **Video:** `webm-muxer`, Native WebCodecs API.

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

**GPL-2.0 License**

Copyright (c) 2024 Guy Zack

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
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
