/**
 * BlenderExportIntegration
 *
 * Bridges the game and the Blender MCP server to export GLB files with
 * options like LOD, animation preservation, and embedded materials.
 * Also exposes texture compression requests (e.g., KTX2/Basis) as stubs
 * that call server endpoints. This module focuses on orchestration; the
 * actual export/compression logic runs on the MCP server.
 */

import { getConfig } from './config.js';

export class BlenderExportIntegration {
  constructor(mcpManager, assetManager, overrides = {}) {
    this.mcp = mcpManager;
    this.assetManager = assetManager;
    this.cfg = { ...getConfig(), ...overrides };
    this.jobs = new Map(); // jobId -> job record
  }

  /**
   * Request a GLB export from the MCP server.
   * @param {object} options
   * @param {string[]} [options.objects] - Named scene objects/collections to export
   * @param {boolean} [options.embedMaterials=true]
   * @param {boolean} [options.preserveAnimations=true]
   * @param {Array<{name:string, ratio:number}>} [options.lodLevels] - e.g., [{name:'LOD0',ratio:1},{name:'LOD1',ratio:0.6}]
   * @param {boolean} [options.compressTextures=false] - Request server-side KTX2/Basis
   * @param {string} [options.outputName] - Suggested output name
   * @returns {Promise<{id:string,status:string}>
   */
  async exportAsGLB(options = {}) {
    const body = {
      objects: options.objects || [],
      embedMaterials: options.embedMaterials !== false,
      preserveAnimations: options.preserveAnimations !== false,
      lodLevels: Array.isArray(options.lodLevels) ? options.lodLevels : [],
      compressTextures: !!options.compressTextures,
      outputName: options.outputName || 'export',
    };

    // If MCP disabled or unreachable, create a MOCK job that returns a sample GLB path
    if (!this.mcp || !this.mcp.mcp?.enabled) {
      const id = `mock-${Date.now()}`;
      const job = {
        id,
        status: 'Done',
        result: {
          url: '/models/sample-export.glb',
        },
        createdAt: Date.now(),
        mock: true,
      };
      this.jobs.set(id, job);
      return { id, status: 'Done' };
    }

    // Live request to MCP server
    const res = await this.mcp.request('/export/glb', { method: 'POST', body });
    const id = res?.jobId || res?.id || String(Date.now());
    const job = {
      id,
      status: res?.status || 'In Progress',
      createdAt: Date.now(),
      options: body,
      remote: res,
    };
    this.jobs.set(id, job);
    return { id, status: job.status };
  }

  /**
   * Poll job status for MCP export/compress jobs.
   */
  async pollJobStatus(jobId, { intervalMs = 3000, timeoutMs = 10 * 60 * 1000 } = {}) {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Unknown job: ${jobId}`);
    if (!this.mcp || !this.mcp.mcp?.enabled || job.mock) {
      return { status: job.status || 'Done', job };
    }

    const started = Date.now();
    return new Promise((resolve) => {
      const tick = async () => {
        try {
          const res = await this.mcp.request(`/jobs/${encodeURIComponent(jobId)}`);
          const remoteStatus = String(res?.status || 'In Progress').toLowerCase();
          job.status =
            remoteStatus.includes('done') || remoteStatus.includes('complete')
              ? 'Done'
              : remoteStatus.includes('fail')
                ? 'Failed'
                : 'In Progress';
          job.result = res?.result || job.result;
          this.jobs.set(jobId, job);

          if (job.status === 'Done' || job.status === 'Failed') {
            resolve({ status: job.status, job });
            return;
          }
        } catch {
          // ignore transient errors
        }

        if (Date.now() - started > timeoutMs) {
          job.status = 'Failed';
          resolve({ status: 'Failed', job });
          return;
        }
        setTimeout(tick, intervalMs);
      };
      setTimeout(tick, intervalMs);
    });
  }

  /**
   * Request server-side texture compression (KTX2/Basis).
   * Can be used standalone or as part of export.
   * @param {object} options
   * @param {string} options.inputUrl - GLB/GLTF or image folder
   * @param {'auto'|'mobile'|'desktop'} [options.profile='auto']
   * @param {number} [options.quality=0.8]
   * @returns {Promise<{id:string,status:string}>}
   */
  async compressTextures(options = {}) {
    if (!this.mcp || !this.mcp.mcp?.enabled) {
      const id = `mockc-${Date.now()}`;
      this.jobs.set(id, { id, status: 'Done', result: { url: options.inputUrl }, mock: true });
      return { id, status: 'Done' };
    }
    const body = {
      inputUrl: options.inputUrl,
      profile: options.profile || 'auto',
      quality: options.quality ?? 0.8,
    };
    const res = await this.mcp.request('/textures/compress', { method: 'POST', body });
    const id = res?.jobId || res?.id || String(Date.now());
    this.jobs.set(id, { id, status: res?.status || 'In Progress', options: body, remote: res });
    return { id, status: this.jobs.get(id).status };
  }

  /**
   * Convenience to load an exported GLB into the running scene via AssetManager.
   */
  async loadExportedModel(result, { name = 'exported_model' } = {}) {
    const url = result?.url || result?.downloadUrl || result?.glbUrl;
    if (!url) return null;
    try {
      const root = await this.assetManager.loadGLBModel(url, name);
      return root;
    } catch {
      return null;
    }
  }
}
