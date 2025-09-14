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

## App Config Examples

You can configure the runtime asset pipeline via `window.__TEMPLE_RUN_CONFIG__` in `index.html`.
Examples:

```html
<script>
  window.__TEMPLE_RUN_CONFIG__ = {
    gameAssets: {
      character: {
        mode: 'GLB',
        glbUrl: '/models/player.glb',
        name: 'player_glb'
      },
      obstacles: {
        list: [
          { name: 'logPrefab', url: '/models/log.glb' },
          { name: 'spikePrefab', url: '/models/spike.glb' }
        ]
      }
    }
  };
</script>
```

Hyper3D character generation:

```html
<script>
  window.__TEMPLE_RUN_CONFIG__ = {
    hyper3d: {
      mode: 'MAIN_SITE',
      baseUrl: 'https://your-hyper3d-endpoint',
      subscriptionKey: '...'
    },
    gameAssets: {
      character: {
        mode: 'HYPER3D',
        prompt: 'stylized runner with backpack',
        name: 'player_h3d'
      }
    }
  };
  // Do not commit real keys; inject locally only.
  // Assets are loaded directly from public/assets; no MCP runtime needed.
</script>
```

## Runtime Toggle

The HUD includes a small debug section where you can switch the character asset mode at runtime
between PROCEDURAL, GLB (with URL), and HYPER3D (with prompt). Click Apply to swap the model.

## Notes

- GLB loading is handled by Babylon’s `SceneLoader` via the project’s `AssetManager` wrapper.
- The queue is intentionally simple (priority sort + small concurrency) to keep overhead low.
- Three.js integration mentioned in the plan is replaced by Babylon’s loader in this repo.
