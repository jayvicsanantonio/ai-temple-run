# Blender MCP Asset Generation (Offline Pipeline)

This project now keeps Blender MCP completely out of the runtime. Instead, we generate 3D assets ahead of time and save them under `public/assets/` for the game to consume.

## Prereqs

- Blender MCP running locally with HTTP endpoints:
  - `POST /command` — accepts `{ command, payload }`
  - `GET /jobs/:id` — returns `{ status, result }` until complete
- Optional: PolyHaven access on the MCP side for texturing

## Script

A Node script drives generation and downloads the GLB files into `public/assets/models/`.

- `scripts/generate-assets.mjs`
- NPM script: `npm run assets:generate`

Environment variables:

- `BLENDER_HOST` (default `127.0.0.1`)
- `BLENDER_PORT` (default `9876`)

## What it Generates

- Character: Rigged Pikachu (`pikachu.glb`) — only run this if you have rights to use Pikachu.
- Environment set: Modular pieces for temple/bridge theme (`bridge_stone.glb`, `bridge_wood.glb`, `pillar.glb`, `arch_gate.glb`, `rope_vines.glb`, `skull_deco.glb`, `rock_deco.glb`, `water_plane.glb`).

## Usage

1. Start your MCP server (listening on `http://localhost:9876`).
2. From repo root, run:

```
BLENDER_HOST=localhost BLENDER_PORT=9876 npm run assets:generate
```

3. Generated files will appear under:

- `public/assets/models/pikachu.glb`
- `public/assets/models/bridge_*.glb`, `pillar.glb`, etc.

4. Point the game to use these assets by setting config overrides in `index.html` if you want to swap them in at runtime (optional):

```html
<script>
  window.__TEMPLE_RUN_CONFIG__ = {
    gameAssets: {
      character: { mode: 'GLB', glbUrl: '/assets/models/pikachu.glb', name: 'player_glb' },
      obstacles: {
        list: [
          { name: 'bridge_stone', url: '/assets/models/bridge_stone.glb' },
          { name: 'bridge_wood',  url: '/assets/models/bridge_wood.glb' },
          { name: 'pillar',       url: '/assets/models/pillar.glb' },
          { name: 'arch_gate',    url: '/assets/models/arch_gate.glb' },
          { name: 'rope_vines',   url: '/assets/models/rope_vines.glb' },
          { name: 'skull_deco',   url: '/assets/models/skull_deco.glb' },
          { name: 'rock_deco',    url: '/assets/models/rock_deco.glb' }
        ]
      }
    }
  };
</script>
```

If you only want to keep assets on disk (no runtime swapping), skip step 4.

## Notes

- The app no longer connects to MCP by default. Asset generation is entirely offline via the script.
- If your MCP returns different shapes, adjust `scripts/generate-assets.mjs` accordingly.
- You can run the script in CI to pre-bake assets before deploying the site.

