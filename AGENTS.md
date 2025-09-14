# Temple Run - Web Edition: AI Agent Development Guidelines

This document provides a comprehensive guide for AI agents developing the "Temple Run - Web Edition" game. It covers project structure, development conventions, and asset creation guidelines.

## 1. Project Overview

This is a 3D endless runner game built with Babylon.js and Vite. The game features procedurally generated levels, a variety of obstacles, and a scoring system. The player controls a character who runs through a temple, avoiding obstacles and collecting coins.

### Key Technologies

*   **Game Engine:** Babylon.js
*   **Build Tool:** Vite
*   **Language:** JavaScript (ES6+)
*   **3D Graphics:** WebGL
*   **Physics:** Babylon.js built-in physics
*   **Audio:** Web Audio API
*   **Touch Controls:** Hammer.js

## 2. Project Structure & Module Organization

The project is organized into the following directories:

*   `public/`: Contains static assets like 3D models, textures, and UI elements.
*   `src/`: Contains the game's source code.
    *   `core/`: Core game logic, including the game loop, player controller, world manager, and more.
    *   `scenes/`: Babylon.js scene setup.
    *   `utils/`: Utility modules for input handling, performance monitoring, etc.
*   `docs/` — Specifications, roadmap, and completed tasks.
*   `index.html`: The main HTML file.
*   `style.css`: The main stylesheet.
*   `package.json`: Project metadata and dependencies.
*   `vite.config.js`: Vite configuration.

## 3. Build, Test, and Development Commands

**Installation:**

```bash
npm install
```

**Development:**

To start the development server, run:

```bash
npm run dev
```

This will start a Vite development server and open the game in your browser at `http://localhost:5173`.

**Production Build:**

To build the game for production, run:

```bash
npm run build
```

This will create a `dist` directory with the optimized and minified game files.

**Linting and Formatting:**

To lint the code, run:

```bash
npm run lint
```

To format the code, run:

```bash
npm run format
```

## 4. Development Conventions

### Coding Style & Naming Conventions

*   **Formatting:** 2-space indent, single quotes, semicolons, trailing commas (ES5), line width 100.
*   **Tools:** ESLint (`eslint:recommended` + Prettier) and Prettier (`.prettierrc`).
*   **Files:** Use camelCase in `src/` (e.g., `playerController.js`, `mainScene.js`).
*   **Modules:** ES modules only (`type: module`). Avoid default exports for multi-symbol modules.
*   Lint/format before pushing; CI and reviews expect a clean diff.

### Testing Guidelines

*   **Framework:** Not set. Recommended: Vitest for Vite projects.
*   **Location:** Colocate tests as `*.test.js` / `*.spec.js` or under `__tests__/` next to source.
*   **Coverage:** Target ≥80% statements/branches for new or modified code.
*   **Suggested setup:** `npm i -D vitest @vitest/coverage-v8` and add scripts: `"test": "vitest"`, `"test:coverage": "vitest --coverage"`.

### Commit & Pull Request Guidelines

*   **Commits:** Prefer Conventional Commits (e.g., `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
    *   Example: `feat(player): add lane-switch smoothing`
*   **Pull Requests** must include:
    *   Clear description and rationale; link issues (e.g., `Closes #123`).
    *   Screenshots/video for visual changes and steps to reproduce/test.
    *   Checklist: `npm run lint`, `npm run build`, and (if configured) tests passing.

### Configuration & Asset Management

*   **Configuration:** Game settings can be adjusted in the `src/core/` files.
*   **Asset Integration:** The `README.md` file explains how to add custom 3D models to the game.
*   **Blender Integration:** The project is designed to work with Blender MCP for asset creation.
*   **Performance:** The project includes a performance monitor and performance testing utilities.

## 5. Blender 3D Asset Creation

When creating 3D content in Blender, always start by checking if integrations are available:

1.  **Check Scene Info:** Before anything, always check the scene from `get_scene_info()`.
2.  **Verify Integrations:** Use the following tools to verify if the following integrations are enabled:
    *   **PolyHaven:** Use `get_polyhaven_status()` to verify its status.
        *   If enabled:
            *   For objects/models: Use `download_polyhaven_asset()` with `asset_type="models"`.
            *   For materials/textures: Use `download_polyhaven_asset()` with `asset_type="textures"`.
            *   For environment lighting: Use `download_polyhaven_asset()` with `asset_type="hdris"`.
    *   **Sketchfab:** Use `get_sketchfab_status()` to verify its status. Sketchfab is good for realistic models and has a wider variety than PolyHaven.
        *   If enabled:
            *   For objects/models: First search using `search_sketchfab_models()` with your query.
            *   Then download specific models using `download_sketchfab_model()` with the UID.
            *   Note that only downloadable models can be accessed, and the API key must be properly configured.
    *   **Hyper3D (Rodin):** Use `get_hyper3d_status()` to verify its status. Hyper3D Rodin is good at generating 3D models for single items.
        *   **Do not try to:**
            1.  Generate the whole scene with one shot.
            2.  Generate ground using Hyper3D.
            3.  Generate parts of the items separately and put them together afterwards.
        *   If enabled:
            1.  **Create the model generation task:**
                *   Use `generate_hyper3d_model_via_images()` if image(s) is/are given.
                *   Use `generate_hyper3d_model_via_text()` if generating 3D asset using text prompt.
                *   If the key type is `free_trial` and an insufficient balance error is returned, inform the user that the free trial key can only generate a limited number of models per day. They can choose to wait for another day, get their own API key from `hyper3d.ai`, or get a private API key from `fal.ai`.
            2.  **Poll the status:** Use `poll_rodin_job_status()` to check if the generation task has completed or failed.
            3.  **Import the asset:** Use `import_generated_asset()` to import the generated GLB model.
            4.  **Adjust the imported mesh:** After importing the asset, ALWAYS check the `world_bounding_box` of the imported mesh, and adjust the mesh's location, scale, and rotation so that the mesh is in the right spot.
            *   You can reuse assets previously generated by running python code to duplicate the object, without creating another generation task.

3.  **Check Bounding Box:** Always check the `world_bounding_box` for each item so that:
    *   Ensure that all objects that should not be clipping are not clipping.
    *   Items have the right spatial relationship.

4.  **Recommended Asset Source Priority:**
    *   For specific existing objects: First try Sketchfab, then PolyHaven.
    *   For generic objects/furniture: First try PolyHaven, then Sketchfab.
    *   For custom or unique items not available in libraries: Use Hyper3D Rodin.
    *   For environment lighting: Use PolyHaven HDRIs.
    *   For materials/textures: Use PolyHaven textures.

**Only fall back to scripting when:**

*   PolyHaven, Sketchfab, and Hyper3D are all disabled.
*   A simple primitive is explicitly requested.
*   No suitable asset exists in any of the libraries.
*   Hyper3D Rodin failed to generate the desired asset.
*   The task specifically requires a basic material/color.