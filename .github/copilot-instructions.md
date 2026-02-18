# Copilot instructions for GMT (developer-facing)

This file tells AI coding agents how this repository is structured and where to make safe, effective changes.

High-level architecture
- React UI (TypeScript + Vite): everything under [components](components) and the root `App.tsx` drives layout and mounts the engine.
- Imperative WebGL engine: lives in [engine](engine). It runs outside React's render cycle (singleton pattern).
- Data-Driven Feature System (DDFS): feature modules under [features](features) declare state, UI metadata and shader snippets; they are registered and assembled into GLSL at runtime.

Key integration points (must-read before editing)
- `EngineBridge` mounts once and binds the Zustand store to the engine: [components/EngineBridge.tsx](components/EngineBridge.tsx#L1-L40).
- Store ↔ Engine binding and subscriptions: [store/fractalStore.ts](store/fractalStore.ts).
- Shader assembly: [engine/ShaderFactory.ts](engine/ShaderFactory.ts) + `shaders/chunks`.
- Render lifecycle and accumulation logic: [engine/RenderPipeline.ts](engine/RenderPipeline.ts#L1-L200).

Developer workflows (how to run / build)
- Install: `npm install` (Node 18+).
- Development: `npm run dev` — starts the local server (see `server/server.js`) and opens the Vite app (default port shown in terminal).
- Build: `npm run build` (uses `vite build`). Preview/prod served via `npm run preview` or `npm start` which runs the Node server.

Project-specific conventions and patterns
- Separation of concerns: UI state lives in Zustand (`store/`); rendering, accumulation, and GPU resources live in `engine/` and must not be managed by React components.
- Single-root engine init: only mount `EngineBridge` once (root `App.tsx`) — other components should interact via the store or `FractalEvents`.
- Features are self-describing: add a new feature under `features/` with a state slice, UI registration, and shader fragments; registries will auto-wire the UI and shaders.
- Shaders are built from small GLSL chunks — avoid editing large generated shader blobs; change or add chunks in `shaders/chunks` and update `ShaderFactory.ts`.
- Rendering conventions: `RenderPipeline` uses ping-pong `WebGLRenderTarget`s, accumulation, and a convergence probe — be careful when changing buffer precision or target lifecycle.

Safe edit rules for AI agents
- If changing runtime engine behavior, update both the store bindings and engine singleton. See `bindStoreToEngine` in [store/fractalStore.ts](store/fractalStore.ts).
- When modifying shader inputs (uniforms), update `UniformNames.ts` and the places that populate `engine.mainUniforms` (search for `mainUniforms`).
- For UI changes, prefer adding components under `features/*` and register them via the DDFS system so they appear in the dynamic Panel Router.
- Avoid introducing global mutable state outside the engine singleton and store; prefer explicit bindings/events (`FractalEvents`).

Notes about tests and debugging
- There are no formal unit tests in the repo; validate changes by asking the user to `npm run dev` and exercising the UI.

References
- docs: [docs/*.md)

If any of these areas are unclear, tell me which file or behavior you want more detail on and I will expand this guide accordingly.
