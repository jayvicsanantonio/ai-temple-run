# Repository Guidelines

## Project Structure & Module Organization
- `src/` — Game source code.
  - `core/` (game loop, managers, effects, audio)
  - `scenes/` (scene setup)
  - `utils/` (inputs and helpers)
  - `index.js` (entry), `style.css` (module styles)
- `public/` — Static assets served by Vite (`models/`, `textures/`, `ui/`).
- `docs/` — Specifications, roadmap, and completed tasks.
- Root: `index.html`, `style.css`, `package.json`.

## Build, Test, and Development Commands
- `npm run dev` — Start Vite dev server (default: http://localhost:5173).
- `npm run build` — Production build to `dist/`.
- `npm run preview` — Preview the production build locally.
- `npm run lint` — Lint `src/**/*.js` with ESLint.
- `npm run format` — Format `src/**/*.js` with Prettier.
Note: A test runner is not configured yet; see Testing Guidelines.

## Coding Style & Naming Conventions
- Formatting: 2‑space indent, single quotes, semicolons, trailing commas (ES5), line width 100.
- Tools: ESLint (`eslint:recommended` + Prettier) and Prettier (`.prettierrc`).
- Files: use camelCase in `src/` (e.g., `playerController.js`, `mainScene.js`).
- Modules: ES modules only (`type: module`). Avoid default exports for multi‑symbol modules.
- Lint/format before pushing; CI and reviews expect a clean diff.

## Testing Guidelines
- Framework: Not set. Recommended: Vitest for Vite projects.
- Location: colocate tests as `*.test.js` / `*.spec.js` or under `__tests__/` next to source.
- Coverage: target ≥80% statements/branches for new or modified code.
- Suggested setup: `npm i -D vitest @vitest/coverage-v8` and add scripts: `"test": "vitest"`, `"test:coverage": "vitest --coverage"`.

## Commit & Pull Request Guidelines
- Commits: Prefer Conventional Commits (e.g., `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
  - Example: `feat(player): add lane-switch smoothing`
- Pull Requests must include:
  - Clear description and rationale; link issues (e.g., `Closes #123`).
  - Screenshots/video for visual changes and steps to reproduce/test.
  - Checklist: `npm run lint`, `npm run build`, and (if configured) tests passing.

## Security & Configuration Tips
- Do not commit secrets. Keep large binaries out of git; place 3D assets under `public/models/`.
- Validate asset paths via the `assetManager` and prefer relative URLs under `public/`.
- Avoid verbose logging in production code paths; keep `console` for debugging behind guards.
