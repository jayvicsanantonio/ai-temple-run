# Blender Asset Manager (Unified)

Combines Hyper3D (generation/import), PolyHaven (textures), and the in-engine `AssetManager`
into a unified interface with caching, metadata, and a prioritized loading queue.

## Files

- `src/core/blenderAssetManager.js` — main module

## Features

- Registry: tracks asset metadata (`type`, `status`, `url`, `meta`, timestamps)
- Cache: reference-counted, disposes when released
- Progressive loader: prioritized queue for GLB loads
- Hyper3D helper: generate → poll → import → cache
- PolyHaven helper: download maps and apply PBR materials

## Usage

```js
// Constructed in index and exposed as `game.blenderAssets`

// Progressive GLB
await game.blenderAssets.enqueueGLB({
  url: '/models/temple_pillar.glb',
  name: 'pillarA',
  priority: 5,
});

// Hyper3D
const root = await game.blenderAssets.generateCharacterAndImport('stylized runner', {
  name: 'runner_h3d',
});

// PolyHaven
await game.blenderAssets.applyPolyHavenTextures(root, { id: 'mock-wood', types: ['albedo','normal','roughness'] });

// Cache
game.blenderAssets.retain('runner_h3d'); // prevent unload
// ... later
game.blenderAssets.release('runner_h3d'); // allow disposal when refCount hits 0
```

## Notes

- GLB loading is handled by Babylon’s `SceneLoader` via the project’s `AssetManager` wrapper.
- The queue is intentionally simple (priority sort + small concurrency) to keep overhead low.
- Three.js integration mentioned in the plan is replaced by Babylon’s loader in this repo.

