/**
 * Hyper3DIntegration
 *
 * Provides text-to-3D character generation, job tracking, polling, and
 * asset import into the game using the existing AssetManager.
 *
 * Modes:
 * - MAIN_SITE: Calls a remote Hyper3D API using a subscription key.
 * - LOCAL:     Placeholder for a local service (future extension).
 * - MOCK:      Generates fake jobs and completes them with a demo asset.
 */

import { getConfig } from './config.js';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export class Hyper3DIntegration {
  constructor(assetManager, overrides = {}) {
    this.assetManager = assetManager;
    this.cfg = { ...getConfig(), ...overrides };
    this.h3d = this.cfg.hyper3d || {};
    this.mode = this.h3d.mode || 'MAIN_SITE';
    this.jobs = new Map(); // jobId -> { id, status, prompt, bboxCondition, createdAt, result? }
    this._listeners = new Map();
  }

  on(event, callback) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const set = this._listeners.get(event);
    if (set) set.delete(callback);
  }

  _emit(event, payload) {
    const set = this._listeners.get(event);
    if (set) for (const cb of set) cb(payload);
  }

  /**
   * Initiates a text-to-3D generation job.
   * @param {string} prompt - Description of the character.
   * @param {object} [options]
   * @param {object|null} [options.bboxCondition] - E.g., { x: 0.5, y: 1.8, z: 0.5 }
   * @param {number} [options.seed]
   * @param {object} [options.metadata]
   * @returns {Promise<{id:string,status:string,createdAt:number}>}
   */
  async generateCharacterFromText(prompt, options = {}) {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt is required for character generation');
    }
    const { bboxCondition = this.h3d.defaultBboxCondition, seed, metadata } = options;

    if (this.mode === 'MOCK') {
      const id = uid();
      const job = {
        id,
        status: 'In Progress',
        prompt,
        bboxCondition: bboxCondition || null,
        createdAt: Date.now(),
        mode: this.mode,
      };
      this.jobs.set(id, job);
      // Simulate a completion with a placeholder GLB in public or remote
      setTimeout(() => {
        job.status = 'Done';
        job.result = {
          glbUrl: '/models/sample-character.glb', // place a real file later if available
        };
        this._emit('jobUpdate', { ...job });
      }, 1500);
      this._emit('jobUpdate', { ...job });
      return { id, status: job.status, createdAt: job.createdAt };
    }

    if (this.mode === 'MAIN_SITE') {
      const url = this._joinUrl(this.h3d.baseUrl, this.h3d.apiPaths?.generate || '/v1/generate');
      const headers = this._headers();
      const body = {
        prompt,
        ...(bboxCondition ? { bbox_condition: bboxCondition } : {}),
        ...(seed != null ? { seed } : {}),
        ...(metadata ? { metadata } : {}),
      };
      const res = await this._fetchJson(url, { method: 'POST', headers, body });
      const id = res?.jobId || res?.id || uid();
      const job = {
        id,
        status: 'In Progress',
        prompt,
        bboxCondition: bboxCondition || null,
        createdAt: Date.now(),
        mode: this.mode,
        remote: res || {},
      };
      this.jobs.set(id, job);
      this._emit('jobUpdate', { ...job });
      return { id, status: job.status, createdAt: job.createdAt };
    }

    // LOCAL or unknown: create a stubbed job for now
    const id = uid();
    const job = {
      id,
      status: 'In Progress',
      prompt,
      bboxCondition: bboxCondition || null,
      createdAt: Date.now(),
      mode: this.mode,
    };
    this.jobs.set(id, job);
    this._emit('jobUpdate', { ...job });
    return { id, status: job.status, createdAt: job.createdAt };
  }

  /**
   * Polls job status until completion or timeout.
   * @param {string} jobId
   * @param {object} [options]
   * @param {number} [options.intervalMs]
   * @param {number} [options.timeoutMs]
   * @returns {Promise<{status:string, job:any}>}
   */
  async pollJobStatus(jobId, options = {}) {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Unknown job: ${jobId}`);

    const intervalMs = options.intervalMs || this.h3d.polling?.intervalMs || 3000;
    const timeoutMs = options.timeoutMs || this.h3d.polling?.timeoutMs || 10 * 60 * 1000;

    if (job.status === 'Done' || job.status === 'Failed') return { status: job.status, job };

    if (this.mode === 'MOCK') {
      return new Promise((resolve, reject) => {
        const started = Date.now();
        const timer = setInterval(
          () => {
            const elapsed = Date.now() - started;
            const j = this.jobs.get(jobId);
            if (!j) {
              clearInterval(timer);
              reject(new Error('Job disappeared'));
              return;
            }
            if (j.status === 'Done' || j.status === 'Failed') {
              clearInterval(timer);
              resolve({ status: j.status, job: j });
              return;
            }
            if (elapsed > timeoutMs) {
              clearInterval(timer);
              j.status = 'Failed';
              this._emit('jobUpdate', { ...j });
              resolve({ status: 'Failed', job: j });
            }
          },
          Math.max(500, intervalMs)
        );
      });
    }

    if (this.mode === 'MAIN_SITE') {
      const statusUrl = this._joinUrl(
        this.h3d.baseUrl,
        `${this.h3d.apiPaths?.jobs || '/v1/jobs'}/${encodeURIComponent(jobId)}`
      );
      const headers = this._headers();
      const started = Date.now();
      return new Promise((resolve) => {
        const tick = async () => {
          try {
            const res = await this._fetchJson(statusUrl, { method: 'GET', headers });
            // status field mapping
            const remoteStatus = res?.status || res?.state || 'In Progress';
            job.status = this._mapStatus(remoteStatus);
            job.result = res;
            this._emit('jobUpdate', { ...job });

            if (job.status === 'Done' || job.status === 'Failed') {
              resolve({ status: job.status, job });
              return;
            }
          } catch {
            // ignore transient errors; keep polling until timeout
          }

          if (Date.now() - started > timeoutMs) {
            job.status = 'Failed';
            this._emit('jobUpdate', { ...job });
            resolve({ status: 'Failed', job });
            return;
          }

          setTimeout(tick, intervalMs);
        };

        setTimeout(tick, intervalMs);
      });
    }

    // LOCAL/Unknown: no remote to poll; mark failed after timeout
    return new Promise((resolve) => {
      setTimeout(() => {
        job.status = 'Failed';
        this._emit('jobUpdate', { ...job });
        resolve({ status: 'Failed', job });
      }, timeoutMs);
    });
  }

  /**
   * Imports the completed model into the AssetManager and validates.
   * Returns the loaded root mesh, or a placeholder on failure.
   * @param {string} jobId
   * @param {object} [options]
   * @param {string} [options.name] - Name prefix for the asset.
   */
  async importCompletedAsset(jobId, options = {}) {
    const name = options.name || `hyper3d_character_${jobId.slice(0, 8)}`;
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'Done') {
      return this._fallbackPlaceholder(name);
    }

    // Resolve GLB URL from result with known fields
    const url = this._extractGlbUrl(job.result);
    if (!url) {
      return this._fallbackPlaceholder(name);
    }

    try {
      const root = await this.assetManager.loadGLBModel(url, name);
      // Simple integrity check: ensure root is a node-like object
      if (!root || typeof root.setEnabled !== 'function') {
        return this._fallbackPlaceholder(name);
      }
      // Validate: store exists and is disabled by loader until used
      return root;
    } catch {
      return this._fallbackPlaceholder(name);
    }
  }

  // Helpers
  _headers() {
    const headers = { 'Content-Type': 'application/json' };
    const key = this.h3d.subscriptionKey;
    const headerName = this.h3d.subscriptionKeyHeader || 'x-subscription-key';
    if (key) headers[headerName] = key;
    return headers;
  }

  _joinUrl(base, path) {
    const b = (base || '').replace(/\/$/, '');
    const p = (path || '').startsWith('/') ? path : `/${path || ''}`;
    return `${b}${p}`;
  }

  async _fetchJson(url, { method = 'GET', headers, body } = {}) {
    const res = await fetch(url, {
      method,
      headers: headers || { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return res.json().catch(() => ({}));
  }

  _mapStatus(remoteStatus) {
    const s = String(remoteStatus).toLowerCase();
    if (s.includes('done') || s.includes('complete') || s === 'finished') return 'Done';
    if (s.includes('fail') || s === 'error') return 'Failed';
    return 'In Progress';
  }

  _extractGlbUrl(result) {
    if (!result) return '';
    // Common fields
    const fromConfigField = this.h3d.apiPaths?.assetUrlField;
    if (fromConfigField && result[fromConfigField]) return result[fromConfigField];
    return (
      result.glbUrl ||
      result.gltfUrl ||
      result.assetUrl ||
      (result.output && (result.output.glbUrl || result.output.assetUrl)) ||
      ''
    );
  }

  _fallbackPlaceholder(name) {
    // Try to clone the procedural player; otherwise make a simple box
    const clone = this.assetManager.getAsset('player');
    if (clone) {
      clone.name = name;
      return clone;
    }
    // As a last resort, dynamically create a small box as placeholder
    // Delayed import to avoid circular deps; Babylon is already bundled elsewhere
    // eslint-disable-next-line no-undef
    const BABYLON = window.BABYLON;
    if (BABYLON && this.assetManager.scene) {
      const box = BABYLON.MeshBuilder.CreateBox(name, { size: 1 }, this.assetManager.scene);
      box.position.y = 0.5;
      return box;
    }
    return null;
  }
}
