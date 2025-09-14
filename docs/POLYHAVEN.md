# PolyHaven Integration

Provides texture discovery, download (with caching), and application onto Babylon PBR materials.
Includes a simple atlas builder and a MOCK mode for offline workflows.

## Files

- `src/core/polyHavenIntegration.js` — Main integration class.
- `src/core/config.js` — PolyHaven configuration (`mode`, `baseUrl`, `cdnBaseUrl`, templates, defaults).

## Configuration

`src/core/config.js` keys under `polyHaven`:

- `mode`: `LIVE` | `MOCK` (default: `LIVE`)
- `baseUrl`: API base (default: `https://api.polyhaven.com`)
- `cdnBaseUrl`: CDN base for direct texture files (default: `https://dl.polyhaven.org`)
- `defaultResolution`: e.g., `2k`
- `defaultFormat`: e.g., `jpg`
- `templates.texture`: optional URL template
  - Example: `{cdnBase}/file/ph-assets/Textures/{resolution}/{id}/{id}_{type}.{format}`
- `apiPaths.search`: path for search endpoint (default: `/assets`)

You can override via `window.__TEMPLE_RUN_CONFIG__` in `index.html`.

## Usage

```js
import { PolyHavenIntegration } from '../core/polyHavenIntegration.js';

const poly = new PolyHavenIntegration(assetManager);
const results = await poly.searchTextures('wood');

// Download maps with built-in caching
const albedo = await poly.downloadTexture('wood_mock', { type: 'albedo' });
const normal = await poly.downloadTexture('wood_mock', { type: 'normal' });
const rough = await poly.downloadTexture('wood_mock', { type: 'roughness' });

// Apply to a mesh using PBR material
await poly.applyTextureToObject(mesh, {
  albedo,
  normal,
  roughness: rough,
});
```

## Atlas

`createTextureAtlas(urls, { grid })` packs the provided textures into a simple grid-based
atlas and returns `{ texture, mapping }`, where `mapping[url]` contains UV offset/scale
for each source.

## Notes

- In `LIVE` mode, URLs are constructed using the configured template or a generic fallback.
- In `MOCK` mode, procedural textures are generated to avoid network access.
- Roughness composition: if only a roughness map is available, a combined metallic-roughness
  texture is composed on a canvas and used by the PBR material.

