/**
 * AutoAssetGenerator
 *
 * Orchestrates asset generation via Blender MCP and wires results into the game.
 * - Generates character (Pikachu) and modular environment pieces
 * - Polls job status and loads returned GLBs via BlenderAssetManager
 * - Not opinionated about scene; uses callbacks for integration
 */

import { getConfig } from './config.js';

function proxify(url) {
  if (!url) return url;
  try {
    const u = new URL(url, window.location.origin);
    // If pointing at MCP localhost, route through dev proxy when available
    if (u.hostname === '127.0.0.1' || u.hostname === 'localhost') {
      const path = u.pathname + (u.search || '');
      return `/mcp${path}`;
    }
  } catch {
    // Non-absolute url; leave as is
  }
  return url;
}

export class AutoAssetGenerator {
  constructor(mcpManager, blenderExport, blenderAssets, polyHaven) {
    this.mcp = mcpManager;
    this.exporter = blenderExport;
    this.assets = blenderAssets;
    this.poly = polyHaven;
    this.cfg = getConfig();
  }

  async run({ onCharacterReady, onEnvironmentReady } = {}) {
    if (!this.mcp || !this.mcp.mcp?.enabled) return;
    // Fire character and environment in parallel (env can take longer)
    const tasks = [];
    if (this.cfg?.autoGenerate?.character?.enabled !== false) {
      tasks.push(
        this.generateCharacter()
          .then((res) => res && onCharacterReady && onCharacterReady(res.root, res.name))
          .catch((e) => console.warn('AutoGen character failed:', e))
      );
    }
    if (this.cfg?.autoGenerate?.environment?.enabled !== false) {
      tasks.push(
        this.generateEnvironment()
          .then((list) => list && onEnvironmentReady && onEnvironmentReady(list))
          .catch((e) => console.warn('AutoGen environment failed:', e))
      );
    }
    await Promise.allSettled(tasks);
  }

  async generateCharacter() {
    const name = (this.cfg?.autoGenerate?.character?.name || 'pikachu').toLowerCase();
    // Issue MCP command to import or generate + export GLB
    try {
      const payload = {
        name,
        source: {
          type: 'import_or_generate',
          // If you have a local file path, MCP may import it. Otherwise generate.
          generate: {
            provider: 'hyper3d',
            prompt:
              'A stylized Pikachu character, bright yellow, black-tipped ears, red cheeks, cute proportions, runner-friendly rig. Clean topology, PBR, game ready.',
            bbox_condition: { x: 0.6, y: 1.1, z: 0.4 },
          },
        },
        rig: { auto_rig: true, retarget: ['idle', 'run', 'jump', 'slide', 'death'] },
        cleanup: { decimate: 0.8, limit_bones: 64 },
        export: { format: 'glb', embed_textures: true, outputName: name },
      };
      const res = await this.mcp.request('/command', {
        method: 'POST',
        body: { command: 'scene.import_or_generate_character', payload },
      });
      const jobId = res?.jobId || res?.id;
      if (jobId) {
        const { job } = await this._pollJob(jobId);
        const url = proxify(
          job?.result?.url || job?.result?.glbUrl || job?.url || job?.downloadUrl
        );
        if (!url) return null;
        const root = await this.assets
          .enqueueGLB({ url, name: 'player_pikachu', priority: 10 })
          .catch(() => null);
        if (!root) return null;
        return { root, name: 'player_pikachu' };
      }
      // If MCP returns direct url
      const url = proxify(res?.result?.url || res?.url);
      if (url) {
        const root = await this.assets
          .enqueueGLB({ url, name: 'player_pikachu', priority: 10 })
          .catch(() => null);
        if (!root) return null;
        return { root, name: 'player_pikachu' };
      }
    } catch (e) {
      console.warn('MCP character command failed:', e);
    }
    return null;
  }

  async generateEnvironment() {
    try {
      const payload = {
        tile: { length: 20, width: 6, height: 0.5 },
        modules: [
          { name: 'bridge_stone', material: 'stone_cobble_moss' },
          { name: 'bridge_wood', material: 'wood_planks_worn' },
          { name: 'pillar', material: 'carved_stone' },
          { name: 'arch_gate', material: 'carved_stone' },
          { name: 'rope_vines', material: 'vines' },
          { name: 'skull_deco', material: 'bone' },
          { name: 'rock_deco', material: 'rock' },
          { name: 'water_plane', material: 'water' },
        ],
        textures: { provider: 'polyhaven', resolution: '2k', format: 'jpg' },
        export_each: { format: 'glb', embed_textures: true },
      };
      const res = await this.mcp.request('/command', {
        method: 'POST',
        body: { command: 'scene.build_temple_bridge_set', payload },
      });
      const jobId = res?.jobId || res?.id;
      let results = [];
      if (jobId) {
        const { job } = await this._pollJob(jobId);
        results = job?.result?.assets || job?.assets || [];
      } else {
        results = res?.result?.assets || res?.assets || [];
      }
      // Each result is expected { name, url }
      const loaded = [];
      for (const a of results) {
        const name = a.name || a.id;
        const url = proxify(a.url || a.glbUrl || a.downloadUrl);
        if (!name || !url) continue;
        const root = await this.assets.enqueueGLB({ url, name, priority: 5 }).catch(() => null);
        if (root) loaded.push({ name, root });
      }
      return loaded;
    } catch (e) {
      console.warn('MCP environment command failed:', e);
      return null;
    }
  }

  async _pollJob(jobId, { intervalMs = 2000, timeoutMs = 15 * 60 * 1000 } = {}) {
    const started = Date.now();
    return new Promise((resolve) => {
      const tick = async () => {
        try {
          const job = await this.mcp.request(`/jobs/${encodeURIComponent(jobId)}`);
          const status = String(job?.status || job?.state || 'In Progress').toLowerCase();
          if (status.includes('done') || status.includes('complete')) {
            resolve({ status: 'Done', job });
            return;
          }
          if (status.includes('fail') || status.includes('error')) {
            resolve({ status: 'Failed', job });
            return;
          }
        } catch {
          // ignore transient errors
        }
        if (Date.now() - started > timeoutMs) {
          resolve({ status: 'Failed', job: null });
          return;
        }
        setTimeout(tick, intervalMs);
      };
      setTimeout(tick, intervalMs);
    });
  }
}
