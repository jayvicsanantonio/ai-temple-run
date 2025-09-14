/**
 * BlenderAssetManager
 *
 * Unifies Hyper3D (generation/import) and PolyHaven (textures) with the
 * in-engine AssetManager. Provides:
 * - Centralized asset metadata registry and reference counting cache
 * - Prioritized, progressive loading queue for GLB assets
 * - Simple unload/dispose helpers
 * - Validation for loaded assets
 */

import { getConfig } from './config.js';
import * as BABYLON from 'babylonjs';

export class BlenderAssetManager {
  constructor(scene, assetManager, _unused = {}, overrides = {}) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.hyper3d = null;
    this.polyHaven = null;
    this.cfg = { ...getConfig(), ...overrides };

    // name -> { name, type, url?, status, createdAt, updatedAt, meta }
    this.registry = new Map();

    // name -> { root, refCount, dispose: fn }
    this.cache = new Map();

    // prioritized queue: highest priority first
    this.queue = [];
    this._processing = false;
    this._concurrency = 2;
    this._inflight = 0;
  }

  // ---------- Registry / Cache ----------
  _now() {
    return Date.now();
  }

  _ensureReg(name, init = {}) {
    if (!this.registry.has(name)) {
      this.registry.set(name, {
        name,
        type: init.type || 'generic',
        status: init.status || 'pending',
        createdAt: this._now(),
        updatedAt: this._now(),
        url: init.url || '',
        meta: init.meta || {},
      });
    }
    return this.registry.get(name);
  }

  setMeta(name, meta) {
    const rec = this._ensureReg(name);
    rec.meta = { ...(rec.meta || {}), ...(meta || {}) };
    rec.updatedAt = this._now();
  }

  retain(name) {
    const c = this.cache.get(name);
    if (c) c.refCount += 1;
  }

  release(name) {
    const c = this.cache.get(name);
    if (!c) return;
    c.refCount = Math.max(0, (c.refCount || 0) - 1);
    if (c.refCount === 0) {
      try {
        if (typeof c.dispose === 'function') c.dispose();
        if (c.root && typeof c.root.dispose === 'function') c.root.dispose(false, true);
      } catch {
        // ignore
      }
      this.cache.delete(name);
      const rec = this.registry.get(name);
      if (rec) {
        rec.status = 'unloaded';
        rec.updatedAt = this._now();
      }
    }
  }

  validate(name) {
    const c = this.cache.get(name);
    return !!(c && c.root && typeof c.root.setEnabled === 'function');
  }

  // ---------- Progressive Loading Queue ----------
  enqueueGLB({ url, name, priority = 0, validate = true }) {
    const rec = this._ensureReg(name, { type: 'glb', url, status: 'queued' });
    const task = {
      id: `${name}:${this._now()}`,
      name,
      priority,
      action: async () => {
        rec.status = 'loading';
        rec.updatedAt = this._now();
        let root = null;
        try {
          root = await this.assetManager.loadGLBModelWithRetry(url, name, {
            retries: 3,
            initialDelayMs: 500,
            factor: 1.8,
            jitter: 0.25,
            fallbackPlaceholder: true,
          });
        } catch (err) {
          // loadGLBModelWithRetry throws only when fallback disabled; mark as failed
          rec.status = 'failed';
          rec.updatedAt = this._now();
          throw err;
        }
        this.cache.set(name, {
          root,
          refCount: 1,
          dispose: () => {
            try {
              if (root && typeof root.dispose === 'function') root.dispose(false, true);
            } catch {}
          },
        });
        if (validate && !this.validate(name)) {
          rec.status = 'failed';
        } else {
          rec.status = 'ready';
        }
        rec.updatedAt = this._now();
        // Optional material/UV validation
        try {
          const report = this.validateMaterials(this.cache.get(name)?.root);
          if (report) rec.meta.validation = report;
        } catch {}
        return root;
      },
      resolve: null,
      reject: null,
    };
    const p = new Promise((resolve, reject) => {
      task.resolve = resolve;
      task.reject = reject;
    });
    this.queue.push(task);
    this._kick();
    return p;
  }

  async _kick() {
    if (this._processing) return;
    this._processing = true;
    try {
      while (this.queue.length && this._inflight < this._concurrency) {
        // pick highest priority task
        this.queue.sort((a, b) => b.priority - a.priority);
        const task = this.queue.shift();
        this._inflight += 1;
        task
          .action()
          .then((res) => task.resolve(res))
          .catch((err) => task.reject(err))
          .finally(() => {
            this._inflight -= 1;
            setTimeout(() => this._kick(), 0);
          });
      }
    } finally {
      this._processing = false;
      if (this.queue.length) setTimeout(() => this._kick(), 0);
    }
  }

  // ---------- Hyper3D Helpers ----------
  async generateCharacterAndImport(prompt, { name, bboxCondition, seed, metadata } = {}) {
    if (!this.hyper3d) throw new Error('Hyper3D is not configured');
    const gen = await this.hyper3d.generateCharacterFromText(prompt, {
      bboxCondition,
      seed,
      metadata,
    });
    const jobId = gen.id;
    const finalName = name || `hyper3d_${jobId.slice(0, 8)}`;
    this._ensureReg(finalName, { type: 'hyper3d', status: 'generating', meta: { jobId } });
    const { status, job } = await this.hyper3d.pollJobStatus(jobId);
    if (status !== 'Done') {
      const rec = this.registry.get(finalName);
      rec.status = 'failed';
      rec.updatedAt = this._now();
      return null;
    }
    const root = await this.hyper3d.importCompletedAsset(jobId, { name: finalName });
    if (root) {
      this.cache.set(finalName, {
        root,
        refCount: 1,
        dispose: () => {
          try {
            if (root && typeof root.dispose === 'function') root.dispose(false, true);
          } catch {}
        },
      });
      const rec = this.registry.get(finalName);
      rec.status = 'ready';
      rec.meta = { ...(rec.meta || {}), job };
      rec.updatedAt = this._now();
      try {
        const report = this.validateMaterials(root);
        if (report) rec.meta.validation = report;
      } catch {}
      return root;
    }
    const rec = this.registry.get(finalName);
    rec.status = 'failed';
    rec.updatedAt = this._now();
    return null;
  }

  // ---------- PolyHaven Helpers ----------
  async applyPolyHavenTextures(mesh, { id, types = ['albedo', 'normal', 'roughness'] } = {}) {
    if (!this.polyHaven) throw new Error('PolyHaven is not configured');
    const maps = {};
    for (const t of types) {
      try {
        maps[this.polyHaven.normalizeType(t)] = await this.polyHaven.downloadTexture(id, {
          type: t,
        });
      } catch {
        // ignore individual failures
      }
    }
    return this.polyHaven.applyTextureToObject(mesh, maps, { materialName: `${id}_mat` });
  }

  // ---------- Validation ----------
  validateMaterials(root) {
    if (!root || !BABYLON || !root.getChildMeshes) return null;
    const meshes = root.getChildMeshes ? root.getChildMeshes(true) : [];
    let missingUV = 0;
    let missingMat = 0;
    for (const m of meshes) {
      if (!m.material) missingMat += 1;
      const hasUV = !!m.getVerticesData && !!m.getVerticesData(BABYLON.VertexBuffer.UVKind);
      if (!hasUV) missingUV += 1;
    }
    return { checked: meshes.length, missingUV, missingMat };
  }
}
