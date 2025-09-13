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
const envHost = env.BLENDER_HOST || env.VITE_BLENDER_HOST || '127.0.0.1';
const envPort = Number(env.BLENDER_PORT || env.VITE_BLENDER_PORT || 9876);
const envBaseUrl = `http://${envHost}:${envPort}`;

const defaultConfig = {
  debug: false,

  // Blender MCP server connectivity
  mcp: {
    enabled: true, // enabled per request; override via runtime if needed
    baseUrl: envBaseUrl,
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
    defaultBboxCondition: null, // e.g., { x: 0.5, y: 1.8, z: 0.5 }
  },

  // PolyHaven integration settings (placeholders for future steps)
  polyHaven: {
    baseUrl: 'https://api.polyhaven.com',
    defaultResolution: '2k',
    defaultFormat: 'jpg', // jpg | png | exr (depending on endpoint support)
    cacheTextures: true,
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
