/**
 * PerformanceMonitor
 *
 * Tracks FPS, physics update time, and rough texture/mesh memory estimates.
 * Can drive automatic LOD distance scaling via AssetOptimizer to maintain
 * a target framerate window.
 */

import { getConfig } from './config.js';

export class PerformanceMonitor {
  constructor(engine, scene, assetOptimizer, overrides = {}, physics = null) {
    this.engine = engine;
    this.scene = scene;
    this.optimizer = assetOptimizer;
    this.physics = physics;
    this.cfg = { ...getConfig(), ...overrides };
    this.perfCfg = this.cfg.performance || {
      targetFps: 60,
      lowerFps: 45,
      upperFps: 75,
      adjustStep: 0.05,
      minScale: 0.6,
      maxScale: 2.0,
    };
    this.history = [];
    this.maxHistory = 60;
    this.physicsTimes = [];
  }

  recordFrame() {
    const fps = typeof this.engine.getFps === 'function' ? this.engine.getFps() : 0;
    this.history.push(fps);
    if (this.history.length > this.maxHistory) this.history.shift();
  }

  recordPhysicsTime(dt, durationMs) {
    this.physicsTimes.push(durationMs);
    if (this.physicsTimes.length > this.maxHistory) this.physicsTimes.shift();
  }

  getAverages() {
    const fpsAvg = this.history.length
      ? this.history.reduce((a, b) => a + b, 0) / this.history.length
      : 0;
    const physAvg = this.physicsTimes.length
      ? this.physicsTimes.reduce((a, b) => a + b, 0) / this.physicsTimes.length
      : 0;
    return { fps: fpsAvg, physicsMs: physAvg };
  }

  // very rough texture memory estimate in MB
  estimateTextureMemoryMB() {
    const textures = this.scene && this.scene.textures ? this.scene.textures : [];
    let bytes = 0;
    for (const t of textures) {
      const w = t.getSize?.().width || t._texture?.width || 0;
      const h = t.getSize?.().height || t._texture?.height || 0;
      const bpp = 4; // assume RGBA8
      bytes += w * h * bpp;
    }
    return bytes / (1024 * 1024);
  }

  meshCount() {
    return this.scene && this.scene.meshes ? this.scene.meshes.length : 0;
  }

  update() {
    this.recordFrame();
    if (!this.optimizer) return;
    const { fps } = this.getAverages();
    const { lowerFps, upperFps, adjustStep, minScale, maxScale } = this.perfCfg;
    let scale = this.optimizer.distanceScale;
    if (fps > 0 && fps < lowerFps) {
      scale = Math.min(maxScale, scale + adjustStep);
    } else if (fps > upperFps) {
      scale = Math.max(minScale, scale - adjustStep);
    }
    if (scale !== this.optimizer.distanceScale) {
      this.optimizer.setDistanceScale(scale);
    }

    // Physics accuracy scaling
    if (this.physics) {
      let acc = 1.0;
      if (fps > 0 && fps < lowerFps * 0.75) acc = 0.65;
      else if (fps > 0 && fps < lowerFps) acc = 0.8;
      else acc = 1.0;
      this.physics.setAccuracyScale?.(acc);
    }
  }
}
