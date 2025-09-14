/**
 * AssetOptimizer
 *
 * Manages Level of Detail (LOD) for meshes and basic material degradation
 * strategies. Uses Babylon's mesh simplification when available, and falls
 * back to cloning with reduced material complexity if not.
 */

import * as BABYLON from 'babylonjs';
import { getConfig } from './config.js';

export class AssetOptimizer {
  constructor(scene, overrides = {}) {
    this.scene = scene;
    this.cfg = { ...getConfig(), ...overrides };
    this.lodCfg = this.cfg.lod || {
      distances: [25, 60],
      ratios: [0.6, 0.3],
      useSimplifier: true,
    };
    this.distanceScale = 1.0;
  }

  setDistanceScale(scale) {
    this.distanceScale = Math.max(0.5, Math.min(3, scale || 1));
  }

  /**
   * Try to generate and attach LODs to a mesh. Safe to call multiple times.
   */
  tryApplyLODs(mesh, { force = false } = {}) {
    if (!mesh || mesh._lodApplied) return false;
    const dists = (this.lodCfg.distances || [25, 60]).map((d) => d * this.distanceScale);
    const ratios = this.lodCfg.ratios || [0.6, 0.3];
    const canSimplify =
      this.lodCfg.useSimplifier !== false &&
      typeof mesh.simplify === 'function' &&
      BABYLON.SimplificationSettings;

    if (canSimplify) {
      // Use Babylon simplifier API (generates LODs on the fly)
      const settings = dists.map(
        (dist, i) => new BABYLON.SimplificationSettings(ratios[i] || 0.4, dist, true)
      );
      try {
        mesh.simplify(settings, true, BABYLON.SimplificationType.QUADRATIC, () => {});
        mesh._lodApplied = true;
        return true;
      } catch {
        // fall through to clone-based LODs
      }
    }

    if (typeof mesh.addLODLevel !== 'function') return false;
    // Fallback: create clones and reduce material detail
    for (let i = 0; i < dists.length; i++) {
      const clone = mesh.clone(`${mesh.name || 'mesh'}_LOD${i + 1}`, null, true);
      if (clone) {
        this._degradeMaterial(clone.material);
        mesh.addLODLevel(dists[i], clone);
      }
    }
    // Final LOD: null to hide beyond last distance
    mesh.addLODLevel(dists[dists.length - 1] * 1.5, null);
    mesh._lodApplied = true;
    return true;
  }

  _degradeMaterial(mat) {
    if (!mat) return;
    if (mat.bumpTexture) mat.bumpTexture = null;
    if (mat.specularTexture) mat.specularTexture = null;
    if (mat.reflectionTexture) mat.reflectionTexture = null;
    if (mat.disableLighting !== undefined) mat.disableLighting = true;
    if (typeof mat.freeze === 'function') {
      try {
        mat.freeze();
      } catch {}
    }
  }
}
