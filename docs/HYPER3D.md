# Hyper3D Integration

Implements text-to-3D character generation, job tracking, polling, and model import.

## Files

- `src/core/hyper3dIntegration.js` — Main integration class.
- `src/core/config.js` — Hyper3D config (mode, endpoints, subscription key, polling).

## Usage

```js
import { Hyper3DIntegration } from '../core/hyper3dIntegration.js';

const hyper3d = new Hyper3DIntegration(assetManager);
const { id } = await hyper3d.generateCharacterFromText('stylized runner with backpack', {
  bboxCondition: { x: 0.5, y: 1.8, z: 0.5 },
});

const { status } = await hyper3d.pollJobStatus(id);
if (status === 'Done') {
  const root = await hyper3d.importCompletedAsset(id, { name: 'runner_character' });
  // attach to player controller, etc.
}
```

## Configuration

Set values via `window.__TEMPLE_RUN_CONFIG__` (recommended) or by editing defaults in
`src/core/config.js`:

- `hyper3d.mode`: `MAIN_SITE` | `LOCAL` | `MOCK`
- `hyper3d.baseUrl`: Base URL for main site API
- `hyper3d.subscriptionKey`: API key for MAIN_SITE mode (do not commit real keys)
- `hyper3d.apiPaths`: `generate`, `jobs`, `assetUrlField`
- `hyper3d.polling`: `intervalMs`, `timeoutMs`
- `hyper3d.defaultBboxCondition`: default bbox if none provided

When `mode=MOCK`, jobs complete with a placeholder GLB URL and are suitable for local
workflow without network access.

## Status Mapping

Remote job statuses are normalized into: `In Progress`, `Done`, `Failed`.

## Import Validation & Fallback

`importCompletedAsset` validates successful GLB load and falls back to the procedural
player model (or a simple box) if load fails.
