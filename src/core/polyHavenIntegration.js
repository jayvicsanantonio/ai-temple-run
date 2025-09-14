/**
 * PolyHavenIntegration
 *
 * Handles texture discovery, download (with caching), and application
 * to Babylon.js materials/meshes. Includes a simple texture atlas utility
 * and a fallback MOCK mode for offline development.
 */

import * as BABYLON from 'babylonjs';
import { getConfig } from './config.js';

const TYPE_ALIASES = {
  diffuse: 'albedo',
  albedo: 'albedo',
  color: 'albedo',
  basecolor: 'albedo',
  normal: 'normal',
  rough: 'roughness',
  roughness: 'roughness',
  metal: 'metallic',
  metallic: 'metallic',
  ao: 'occlusion',
  ambientocclusion: 'occlusion',
};

function keyFor(id, type, resolution, format) {
  return `${id}:${type}:${resolution}:${format}`;
}

async function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export class PolyHavenIntegration {
  constructor(assetManager, overrides = {}) {
    this.assetManager = assetManager;
    this.scene = assetManager?.scene;
    this.cfg = { ...getConfig(), ...overrides };
    this.ph = this.cfg.polyHaven || {};
    this.cache = new Map(); // key -> Promise<{texture: BABYLON.BaseTexture, url: string}>
  }

  normalizeType(type) {
    const t = String(type || '').toLowerCase();
    return TYPE_ALIASES[t] || t;
  }

  // --- Search ---
  async searchTextures(category, { limit = 20 } = {}) {
    if (this.ph.mode === 'MOCK') {
      return [
        { id: 'mock-wood', name: 'Mock Wood', categories: ['wood'], previewUrl: '' },
        { id: 'mock-stone', name: 'Mock Stone', categories: ['stone'], previewUrl: '' },
      ]
        .filter((x) => !category || x.categories.includes(category))
        .slice(0, limit);
    }

    const base = this.ph.baseUrl?.replace(/\/$/, '') || 'https://api.polyhaven.com';
    const searchPath = this.ph.apiPaths?.search || '/assets';
    const url = `${base}${searchPath}?category=${encodeURIComponent(category || '')}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      // Coerce to a minimal array
      if (Array.isArray(data)) {
        return data.slice(0, limit).map((a) => ({
          id: a.id || a.name || a.slug,
          name: a.name || a.id || 'asset',
          categories: a.categories || [],
          previewUrl: a.preview?.small || a.preview_url || '',
        }));
      }
      // If object keyed by id
      return Object.keys(data)
        .map((k) => data[k])
        .map((a) => ({
          id: a.id || a.name || a.slug || k,
          name: a.name || a.id || 'asset',
          categories: a.categories || [],
          previewUrl: a.preview?.small || a.preview_url || '',
        }))
        .slice(0, limit);
    } catch {
      return [];
    }
  }

  // --- Download (with caching) ---
  async downloadTexture(id, { type = 'albedo', resolution, format } = {}) {
    const t = this.normalizeType(type);
    const resn = resolution || this.ph.defaultResolution || '2k';
    const fmt = format || this.ph.defaultFormat || 'jpg';
    const key = keyFor(id, t, resn, fmt);

    if (this.cache.has(key)) return this.cache.get(key);

    const p = (async () => {
      if (this.ph.mode === 'MOCK') {
        const texture = this._makeMockTexture(`${id}-${t}`, t);
        return { texture, url: '' };
      }
      const url = this._buildTextureUrl(id, t, resn, fmt);
      const texture = new BABYLON.Texture(url, this.scene, true, false);
      return { texture, url };
    })();

    this.cache.set(key, p);
    return p;
  }

  _buildTextureUrl(id, type, resolution, format) {
    // Prefer config template if provided
    const template = this.ph.templates?.texture;
    if (template) {
      return template
        .replaceAll('{cdnBase}', (this.ph.cdnBaseUrl || '').replace(/\/$/, ''))
        .replaceAll('{id}', id)
        .replaceAll('{type}', type)
        .replaceAll('{resolution}', resolution)
        .replaceAll('{format}', format);
    }
    // Generic fallback (may need adjustment per PolyHaven scheme)
    const cdn = (this.ph.cdnBaseUrl || 'https://dl.polyhaven.org').replace(/\/$/, '');
    // Attempt a common naming pattern: <id>_<suffix> where suffix maps from type
    const suffixMap = {
      albedo: 'diff',
      normal: 'nor',
      roughness: 'rough',
      metallic: 'metal',
      occlusion: 'ao',
    };
    const suffix = suffixMap[type] || type;
    // Example path guess:
    return `${cdn}/file/ph-assets/Textures/${resolution}/${id}/${id}_${suffix}.${format}`;
  }

  // --- Apply to object ---
  /**
   * Applies textures to a mesh/material using PBR material.
   * Supported map types: albedo/diffuse, normal, roughness (composed), metallic, occlusion.
   */
  async applyTextureToObject(target, maps, { materialName = 'polyhaven_mat' } = {}) {
    const scene = this.scene;
    const material = new BABYLON.PBRMaterial(materialName, scene);
    material.roughness = 0.8;
    material.metallic = 0.0;

    if (maps.albedo) material.albedoTexture = maps.albedo.texture || maps.albedo;
    if (maps.normal) material.bumpTexture = maps.normal.texture || maps.normal;

    // Compose metallic-roughness texture if we have roughness (and optional metallic)
    if (maps.roughness && !maps.metallic) {
      const mrTex = await this._composeMetallicRoughnessTexture(
        maps.roughness.url || maps.roughness.texture?.url || null,
        { roughnessTexture: maps.roughness.texture || null }
      );
      if (mrTex) material.metallicTexture = mrTex;
    }
    if (maps.metallic && maps.roughness) {
      // If both exist, try compose from two sources
      const mrTex = await this._composeMetallicRoughnessTexture(maps.roughness.url || null, {
        roughnessTexture: maps.roughness.texture || null,
        metallicTexture: maps.metallic.texture || null,
      });
      if (mrTex) material.metallicTexture = mrTex;
    }

    // Apply to target
    if (target && target.material !== undefined) {
      target.material = material;
    }
    return material;
  }

  // Create a combined metallic-roughness texture from provided sources
  async _composeMetallicRoughnessTexture(roughnessUrl, { roughnessTexture, metallicTexture } = {}) {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      let w = 512;
      let h = 512;
      if (roughnessUrl) {
        const img = await loadImage(roughnessUrl);
        w = img.width;
        h = img.height;
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
      } else if (roughnessTexture) {
        // If we only have a Babylon texture, fallback to a flat roughness
        canvas.width = w;
        canvas.height = h;
        ctx.fillStyle = 'rgb(204,204,204)'; // ~0.8 roughness
        ctx.fillRect(0, 0, w, h);
      }

      const roughData = ctx.getImageData(0, 0, w, h);
      const out = ctx.createImageData(w, h);
      const metallicDefault = 0; // non-metal by default

      for (let i = 0; i < roughData.data.length; i += 4) {
        const r = roughData.data[i];
        const g = roughData.data[i + 1];
        const b = roughData.data[i + 2];
        const a = 255;
        // Use green channel as roughness if available; else average
        const rough = g || Math.round((r + g + b) / 3);
        const metal = metallicTexture ? metallicDefault : metallicDefault; // placeholder, could sample if available

        // Pack: R=occlusion(0), G=roughness, B=metallic, A=1
        out.data[i] = 0;
        out.data[i + 1] = rough;
        out.data[i + 2] = metal;
        out.data[i + 3] = a;
      }
      ctx.putImageData(out, 0, 0);
      const dataURL = canvas.toDataURL('image/png');
      const tex = new BABYLON.Texture(dataURL, this.scene, true, false);
      return tex;
    } catch {
      return null;
    }
  }

  // Simple mock texture generator
  _makeMockTexture(name, type) {
    const size = 512;
    const dt = new BABYLON.DynamicTexture(
      `mock_${name}`,
      { width: size, height: size },
      this.scene
    );
    const ctx = dt.getContext();
    ctx.fillStyle = type === 'normal' ? '#8080ff' : type === 'albedo' ? '#7f5a3a' : '#cccccc';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#00000020';
    for (let x = 0; x < size; x += 32) {
      for (let y = 0; y < size; y += 32) {
        ctx.fillRect(x, y, 16, 16);
      }
    }
    dt.update();
    // Prefer using the dynamic texture directly on materials
    return dt;
  }

  // Naive texture atlas builder (grid pack)
  async createTextureAtlas(urls, { grid = 2 } = {}) {
    const imgs = await Promise.all(urls.map((u) => loadImage(u)));
    const size = 1024;
    const cell = Math.floor(size / grid);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    let i = 0;
    const mapping = {};
    for (const img of imgs) {
      const gx = i % grid;
      const gy = Math.floor(i / grid);
      const x = gx * cell;
      const y = gy * cell;
      ctx.drawImage(img, x, y, cell, cell);
      mapping[urls[i]] = {
        uOffset: gx / grid,
        vOffset: gy / grid,
        uScale: 1 / grid,
        vScale: 1 / grid,
      };
      i += 1;
    }
    const dataURL = canvas.toDataURL('image/png');
    const texture = new BABYLON.Texture(dataURL, this.scene, true, false);
    return { texture, mapping };
  }
}
