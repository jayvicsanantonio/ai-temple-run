/**
 * Global configuration for integrations and feature flags.
 *
 * Notes:
 * - Do NOT hardcode secrets. Use runtime overrides instead.
 * - You can override any value by defining `window.__TEMPLE_RUN_CONFIG__`
 *   before the app loads (e.g., via an inline script tag in `index.html`).
 */

// Read env from Vite (vite.config.js exposes BLENDER_* to import.meta.env)
const env = typeof import.meta !== 'undefined' ? import.meta.env || {} : {};
const envHost = env.BLENDER_HOST || env.VITE_BLENDER_HOST || 'localhost';
const envPort = Number(env.BLENDER_PORT || env.VITE_BLENDER_PORT || 9876);
const envBaseUrl = `http://${envHost}:${envPort}`;
const isDev = !!(env && env.DEV);

const defaultConfig = {
  debug: false,

  // Blender MCP server connectivity
  mcp: {
    enabled: true, // enabled per request; override via runtime if needed
    // In dev, prefer the Vite proxy at /mcp to avoid CORS
    baseUrl: isDev ? '/mcp' : envBaseUrl,
    healthEndpoint: '/health',
    connectOnStart: true,
    requestTimeoutMs: 8000,
    heartbeatIntervalMs: 10000,
    retry: {
      maxRetries: 5,
      initialDelayMs: 500,
      maxDelayMs: 6000,
      factor: 1.8,
      jitter: 0.25,
    },
  },

  // Hyper3D integration settings (placeholders for future steps)
  hyper3d: {
    mode: 'MAIN_SITE', // MAIN_SITE | LOCAL | MOCK
    baseUrl: 'https://api.hyper3d.local', // placeholder; override in runtime config
    subscriptionKey: '', // never commit real keys
    subscriptionKeyHeader: 'x-subscription-key',
    defaultBboxCondition: null, // e.g., { x: 0.5, y: 1.8, z: 0.5 }
    apiPaths: {
      generate: '/v1/generate',
      jobs: '/v1/jobs',
      assetUrlField: 'glbUrl',
    },
    polling: {
      intervalMs: 3000,
      timeoutMs: 10 * 60 * 1000,
    },
  },

  // PolyHaven integration settings (placeholders for future steps)
  polyHaven: {
    mode: 'LIVE', // LIVE | MOCK
    baseUrl: 'https://api.polyhaven.com',
    cdnBaseUrl: 'https://dl.polyhaven.org',
    defaultResolution: '2k',
    defaultFormat: 'jpg', // jpg | png | exr (depending on endpoint support)
    cacheTextures: true,
    templates: {
      // Optional override for texture URLs
      // texture: '{cdnBase}/file/ph-assets/Textures/{resolution}/{id}/{id}_{type}.{format}',
    },
    apiPaths: {
      search: '/assets',
    },
  },

  // Export and compression settings
  export: {
    defaultLOD: [
      { name: 'LOD0', ratio: 1 },
      { name: 'LOD1', ratio: 0.6 },
      { name: 'LOD2', ratio: 0.35 },
    ],
    embedMaterials: true,
    preserveAnimations: true,
    compressTextures: false,
    compressionProfile: 'auto', // auto | mobile | desktop
    compressionQuality: 0.8,
  },

  // Physics settings
  physics: {
    engine: 'SIMPLE', // AUTO | AMMO | CANNON | SIMPLE
    gravity: -20,
    lateralAccel: 40,
    lateralMaxSpeed: 12,
    jumpImpulse: 9,
    friction: 8,
  },

  // LOD settings
  lod: {
    distances: [25, 60],
    ratios: [0.6, 0.3],
    useSimplifier: true,
  },

  // Performance monitor settings
  performance: {
    targetFps: 60,
    lowerFps: 45,
    upperFps: 75,
    adjustStep: 0.05,
    minScale: 0.6,
    maxScale: 2.0,
  },

  // Game asset pipeline controls
  gameAssets: {
    character: {
      mode: 'PROCEDURAL', // PROCEDURAL | GLB | HYPER3D | AUTO
      glbUrl: '',
      prompt: 'stylized runner',
      name: 'player_h3d',
    },
    obstacles: {
      list: [
        // { name: 'logPrefab', url: '/models/log.glb' }
      ],
    },
  },
};

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function deepMerge(target, source) {
  const out = { ...target };
  if (!isPlainObject(source)) return out;
  for (const [key, value] of Object.entries(source)) {
    if (isPlainObject(value) && isPlainObject(out[key])) {
      out[key] = deepMerge(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Returns the merged configuration, applying any runtime overrides found on `window`.
 */
export function getConfig() {
  // Allow users to attach overrides before app loads
  // Example:
  //   <script>
  //     window.__TEMPLE_RUN_CONFIG__ = { mcp: { enabled: true, baseUrl: 'http://localhost:9000' } };
  //   </script>
  const overrides = typeof window !== 'undefined' ? window.__TEMPLE_RUN_CONFIG__ : undefined;
  if (overrides && defaultConfig.debug) {
    console.log('[Config] Applying runtime overrides');
  }
  return deepMerge(defaultConfig, overrides || {});
}

export { defaultConfig };
