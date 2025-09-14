# Blender GLB Export Pipeline

This module orchestrates GLB export and texture compression by talking to the Blender MCP server.
The heavy lifting (decimation/LOD, animation baking, embedding materials, and KTX2/Basis) is done
server-side. The game calls these endpoints and can load the resulting GLB at runtime.

## Files

- `src/core/blenderExportIntegration.js` — High-level export/compression API.
- `src/utils/textureCompression.js` — Runtime detection and KTX2 transcoder config helpers.
- `src/core/config.js` — Default export/compression settings under `export`.

## API (Client → MCP)

- `POST /export/glb`
  - Body: `{ objects: string[], embedMaterials: boolean, preserveAnimations: boolean, lodLevels: {name,ratio}[], compressTextures: boolean, outputName: string }`
  - Returns: `{ jobId, status }`

- `GET /jobs/:id`
  - Returns job status and (when ready) a downloadable `{ result: { url } }`.

- `POST /textures/compress`
  - Body: `{ inputUrl: string, profile: 'auto'|'mobile'|'desktop', quality: number }`
  - Returns: `{ jobId, status }`

These routes are conventions; implement them on the MCP side or adjust in `blenderExportIntegration` if they differ.

## Usage

```js
import { BlenderExportIntegration } from '../core/blenderExportIntegration.js';

const exp = new BlenderExportIntegration(mcpManager, assetManager);
const { id } = await exp.exportAsGLB({
  objects: ['PlayerRig'],
  lodLevels: [
    { name: 'LOD0', ratio: 1 },
    { name: 'LOD1', ratio: 0.6 },
  ],
  compressTextures: true,
  outputName: 'runner_v1',
});

const { status, job } = await exp.pollJobStatus(id);
if (status === 'Done' && job?.result?.url) {
  const root = await exp.loadExportedModel(job.result, { name: 'runner_v1' });
}
```

## Runtime Compression Support

Use `detectCompressedTextureSupport(engine)` to tailor choices, and
`configureKTX2Transcoder({ jsURL, wasmURL })` to point Babylon at your transcoder files
if you plan to load KTX2 textures at runtime.

## Configuration

`config.export` defaults:

- `defaultLOD`: `[{name:'LOD0',ratio:1},{name:'LOD1',ratio:0.6},{name:'LOD2',ratio:0.35}]`
- `embedMaterials`: true
- `preserveAnimations`: true
- `compressTextures`: false
- `compressionProfile`: `auto`
- `compressionQuality`: 0.8

Override via `window.__TEMPLE_RUN_CONFIG__` as needed.

