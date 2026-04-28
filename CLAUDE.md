# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Interactive 3D diamond visualization built with Three.js (v0.170.0). Pure vanilla ES6 modules with no build system, no package.json, and no bundler. Dependencies are loaded via CDN import maps in `index.html`.

## Development

**Run locally:** Serve the project root with any static file server (e.g. `npx serve .` or `python3 -m http.server`). No build step required.

**Debug mode:** Append `?debug=1` to the URL to enable lil-gui parameter controls and Stats.js FPS overlay. Debug UI is lazy-loaded only when this flag is set.

There are no tests, linting, or CI/CD configured.

## Architecture

The app follows a modular pattern where each file owns a single concern and exposes `create*()` / `dispose()` functions:

- **main.js** — Bootstrap, animation loop (`requestAnimationFrame`), visibility-change pause/resume. Exports `dispose()` for iframe re-mount cleanup.
- **scene.js** — Three.js renderer (WebGL, ACES Filmic tone mapping), orthographic camera, ambient + directional lighting, PMREM environment map, and grainient background rendering.
- **diamond.js** — Loads `diamond.glb` via GLTFLoader, applies `MeshPhysicalMaterial` (transmission, IOR 2.42 for diamond refraction), handles mouse-tracking rotation and optional CubeCamera dynamic reflections.
- **grainient.js** — Custom fragment shader for an animated gradient+grain background, rendered at half resolution to a render target then composited.
- **debug.js** — Conditional debug UI (lil-gui + Stats.js) with live parameter tweaking for all scene elements.
- **config.js** — Centralized default parameters for scene, camera, lights, and diamond material. All modules read from these exports.

## Key Patterns

- **Disposal is required**: Every module implements `dispose()` because the app may run inside an iframe that re-mounts. Always clean up Three.js resources (geometries, materials, textures, render targets).
- **Orthographic camera**: The project uses `OrthographicCamera`, not `PerspectiveCamera`. Resize logic recalculates frustum bounds, not FOV.
- **No npm/node**: All imports resolve through the browser import map to jsDelivr CDN URLs. Do not add `require()` or Node.js-style imports.
