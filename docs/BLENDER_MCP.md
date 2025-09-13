# Blender MCP Integration

This project includes a minimal browser client to talk to a Blender MCP server.
It establishes the foundation required by Task 1 and will be extended by later tasks
for Hyper3D generation, PolyHaven textures, and GLB export.

## Files

- `src/core/config.js` — Centralized configuration with runtime overrides.
- `src/core/blenderMCPManager.js` — Connection, health checks, requests, and reconnection.

## Configuration

MCP is enabled by default and will attempt to connect using the following environment variables
if provided. These are exposed to the app via Vite:

- `BLENDER_HOST` — Host address for Blender socket server (default: `127.0.0.1`)
- `BLENDER_PORT` — Port number for Blender socket server (default: `9876`)

You can set them in your shell or in a `.env` file. Example `.env`:

```
BLENDER_HOST=localhost
BLENDER_PORT=9876
```

Alternatively, you can override at runtime by defining a global before the app loads (e.g., in `index.html`):

```html
<script>
  window.__TEMPLE_RUN_CONFIG__ = {
    debug: true,
    mcp: {
      enabled: true,
      baseUrl: 'http://localhost:9876',
      connectOnStart: true,
    },
    hyper3d: {
      // Set your real values later; do not commit secrets
      mode: 'MAIN_SITE',
      baseUrl: 'https://your-hyper3d-endpoint',
      subscriptionKey: '',
    },
    polyHaven: {
      baseUrl: 'https://api.polyhaven.com',
      defaultResolution: '2k',
      defaultFormat: 'jpg',
    },
  };
  // Secrets should be injected via env or local-only overrides, never committed.
  // Consider loading from a local JSON not checked into git.
  // window.__TEMPLE_RUN_CONFIG__ = await (await fetch('/config.local.json')).json();
  // (Only if you host that file locally.)
</script>
```

## Usage

`BlenderMCPManager` performs a health check on connect and keeps a heartbeat. If the
server becomes unavailable, it automatically tries to reconnect with exponential backoff.

Basic example (already wired in `src/index.js` when enabled):

```js
import { BlenderMCPManager } from './core/blenderMCPManager.js';
import { getConfig } from './core/config.js';

const cfg = getConfig();
const mcp = new BlenderMCPManager(cfg);
mcp.on('status', (s) => console.log('MCP status:', s));
mcp.connect();

// Later
// const caps = await mcp.queryCapabilities();
// const result = await mcp.sendCommand('your.command', { foo: 'bar' });
```

## Error Handling

- Throws `BlenderMCPError` for HTTP or health-check failures.
- Marks status `error` and schedules reconnection automatically.
- Emits `status` events on state changes.

## Next Steps

- Add Hyper3D job flows and polling (Task 2).
- PolyHaven search and texture downloads (Task 3).
- GLB export pipeline from Blender (Task 4).
