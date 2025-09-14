/**
 * Debug Visualization Module
 * Enhanced debug tools for performance monitoring and visual debugging
 */

import * as BABYLON from 'babylonjs';

export class DebugVisualization {
  constructor(scene, game) {
    this.scene = scene;
    this.game = game;
    this.enabled = false;
    this.panels = {};
    this.overlays = {};
    this.visualizers = {};

    // Performance tracking
    this.performanceMetrics = {
      fps: 0,
      frameTime: 0,
      memoryUsage: 0,
      drawCalls: 0,
      triangles: 0
    };

    // Debug materials
    this.materials = this.createDebugMaterials();

    // UI elements
    this.debugUI = null;
  }

  /**
   * Initialize debug visualization system
   */
  init() {
    this.createDebugUI();
    this.setupPerformanceMonitoring();
    this.createVisualizers();

    // Listen for debug toggle
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F3') {
        this.toggle();
      } else if (e.key === 'F4') {
        this.togglePerformanceOverlay();
      }
    });
  }

  /**
   * Create debug materials for different visualization types
   */
  createDebugMaterials() {
    return {
      collider: this.createMaterial('collider', new BABYLON.Color3(1, 0, 0), 0.3),
      lod: this.createMaterial('lod', new BABYLON.Color3(0, 1, 0), 0.2),
      bounds: this.createMaterial('bounds', new BABYLON.Color3(0, 0, 1), 0.15),
      grid: this.createMaterial('grid', new BABYLON.Color3(0.5, 0.5, 0.5), 0.1, true),
      performance: this.createMaterial('performance', new BABYLON.Color3(1, 1, 0), 0.8)
    };
  }

  /**
   * Create a debug material
   */
  createMaterial(name, color, alpha, wireframe = false) {
    const mat = new BABYLON.StandardMaterial(`debug_${name}`, this.scene);
    mat.diffuseColor = color;
    mat.alpha = alpha;
    mat.wireframe = wireframe;
    mat.disableLighting = true;
    return mat;
  }

  /**
   * Create debug UI overlay
   */
  createDebugUI() {
    // Create HTML overlay for debug information
    const overlay = document.createElement('div');
    overlay.id = 'debug-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 10px;
      border-radius: 5px;
      z-index: 1000;
      max-width: 300px;
      display: none;
    `;

    document.body.appendChild(overlay);
    this.debugUI = overlay;

    // Create panels
    this.createDebugPanels();
  }

  /**
   * Create individual debug panels
   */
  createDebugPanels() {
    this.panels = {
      performance: this.createPanel('Performance', [
        'FPS', 'Frame Time', 'Memory', 'Draw Calls', 'Triangles'
      ]),
      assets: this.createPanel('Assets', [
        'Total Assets', 'Loaded', 'Failed', 'LOD Instances'
      ]),
      gameplay: this.createPanel('Gameplay', [
        'Score', 'Distance', 'Speed', 'Obstacles', 'Coins'
      ]),
      system: this.createPanel('System', [
        'Browser', 'WebGL Version', 'Platform'
      ])
    };
  }

  /**
   * Create a debug panel
   */
  createPanel(title, fields) {
    const panel = document.createElement('div');
    panel.className = 'debug-panel';
    panel.style.marginBottom = '10px';

    const header = document.createElement('h4');
    header.textContent = title;
    header.style.cssText = 'margin: 0 0 5px 0; color: #ffff00; font-size: 14px;';
    panel.appendChild(header);

    const content = document.createElement('div');
    content.className = 'debug-content';

    fields.forEach(field => {
      const line = document.createElement('div');
      line.id = `debug-${field.toLowerCase().replace(/\s+/g, '-')}`;
      line.innerHTML = `${field}: <span>--</span>`;
      content.appendChild(line);
    });

    panel.appendChild(content);
    this.debugUI.appendChild(panel);

    return { panel, content };
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    let frameCount = 0;
    let lastTime = performance.now();

    this.scene.registerBeforeRender(() => {
      if (!this.enabled) return;

      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;

      frameCount++;

      // Update metrics every 60 frames (~1 second at 60fps)
      if (frameCount % 60 === 0) {
        this.performanceMetrics.fps = Math.round(1000 / deltaTime);
        this.performanceMetrics.frameTime = Math.round(deltaTime * 100) / 100;

        // Get engine statistics
        if (this.scene.getEngine) {
          const engine = this.scene.getEngine();
          this.performanceMetrics.drawCalls = engine.drawCallsCount || 0;
          this.performanceMetrics.triangles = engine.verticesCount || 0;
        }

        // Estimate memory usage
        this.performanceMetrics.memoryUsage = this.getMemoryUsage();

        this.updatePerformanceDisplay();
      }

      lastTime = currentTime;
    });
  }

  /**
   * Estimate memory usage
   */
  getMemoryUsage() {
    if (performance.memory) {
      return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
    }
    return 0;
  }

  /**
   * Create 3D visualizers
   */
  createVisualizers() {
    // Performance heatmap
    this.visualizers.performanceHeatmap = this.createPerformanceHeatmap();

    // Asset loading indicator
    this.visualizers.assetIndicator = this.createAssetLoadingIndicator();

    // LOD visualization
    this.visualizers.lodIndicator = this.createLODIndicator();
  }

  /**
   * Create performance heatmap visualization
   */
  createPerformanceHeatmap() {
    const heatmap = new BABYLON.TransformNode('performanceHeatmap', this.scene);

    // Create grid of performance indicators
    for (let x = -5; x <= 5; x += 2) {
      for (let z = 0; z <= 20; z += 4) {
        const indicator = BABYLON.MeshBuilder.CreateSphere(
          `perf_indicator_${x}_${z}`,
          { diameter: 0.5 },
          this.scene
        );
        indicator.position.set(x, 0.5, z);
        indicator.material = this.materials.performance;
        indicator.parent = heatmap;
        indicator.isVisible = false;
      }
    }

    return heatmap;
  }

  /**
   * Create asset loading indicator
   */
  createAssetLoadingIndicator() {
    const indicator = BABYLON.MeshBuilder.CreateSphere(
      'assetLoadingIndicator',
      { diameter: 1 },
      this.scene
    );
    indicator.position.set(0, 5, 0);
    indicator.material = this.materials.lod;
    indicator.isVisible = false;

    return indicator;
  }

  /**
   * Create LOD level indicator
   */
  createLODIndicator() {
    const indicator = BABYLON.MeshBuilder.CreateBox(
      'lodIndicator',
      { width: 0.5, height: 2, depth: 0.1 },
      this.scene
    );
    indicator.position.set(3, 1, 5);
    indicator.material = this.materials.lod;
    indicator.isVisible = false;

    return indicator;
  }

  /**
   * Toggle debug visualization
   */
  toggle() {
    this.enabled = !this.enabled;
    this.debugUI.style.display = this.enabled ? 'block' : 'none';

    // Toggle 3D visualizers
    Object.values(this.visualizers).forEach(viz => {
      if (viz && viz.isVisible !== undefined) {
        viz.isVisible = this.enabled;
      }
    });

    console.log(`Debug visualization: ${this.enabled ? 'ON' : 'OFF'}`);

    if (this.enabled) {
      this.update();
    }
  }

  /**
   * Toggle performance overlay specifically
   */
  togglePerformanceOverlay() {
    const perfPanel = this.panels.performance;
    if (perfPanel) {
      const isVisible = perfPanel.panel.style.display !== 'none';
      perfPanel.panel.style.display = isVisible ? 'none' : 'block';
    }
  }

  /**
   * Main update function for debug information
   */
  update() {
    if (!this.enabled) return;

    this.updateAssetInfo();
    this.updateGameplayInfo();
    this.updateSystemInfo();
    this.updateVisualizers();
  }

  /**
   * Update performance display
   */
  updatePerformanceDisplay() {
    this.updateField('fps', `${this.performanceMetrics.fps} fps`);
    this.updateField('frame-time', `${this.performanceMetrics.frameTime} ms`);
    this.updateField('memory', `${this.performanceMetrics.memoryUsage} MB`);
    this.updateField('draw-calls', this.performanceMetrics.drawCalls);
    this.updateField('triangles', this.formatNumber(this.performanceMetrics.triangles));
  }

  /**
   * Update asset information
   */
  updateAssetInfo() {
    if (this.game.assetManager) {
      const health = this.game.assetManager.getAssetHealth();
      const lodStats = this.game.assetManager.getLODStats();

      this.updateField('total-assets', health.totalAssets);
      this.updateField('loaded', `${health.loadedAssets} (${Math.round(health.healthPercentage)}%)`);
      this.updateField('failed', health.totalAssets - health.loadedAssets);
      this.updateField('lod-instances', lodStats.totalInstances);
    }
  }

  /**
   * Update gameplay information
   */
  updateGameplayInfo() {
    if (this.game) {
      this.updateField('score', this.formatNumber(this.game.score || 0));
      this.updateField('distance', `${Math.round(this.game.distanceTraveled || 0)}m`);
      this.updateField('speed', `${Math.round(this.game.gameSpeed * 100)}%`);

      if (this.game.obstacleManager) {
        const obstacleStats = this.game.obstacleManager.getPerformanceStats?.();
        if (obstacleStats) {
          this.updateField('obstacles', obstacleStats.activeObstacles);
        }
      }

      if (this.game.coinManager) {
        this.updateField('coins', this.game.coinManager.getCollectedCoins?.() || 0);
      }
    }
  }

  /**
   * Update system information
   */
  updateSystemInfo() {
    this.updateField('browser', this.getBrowserInfo());
    this.updateField('webgl-version', this.getWebGLVersion());
    this.updateField('platform', navigator.platform);
  }

  /**
   * Update 3D visualizers
   */
  updateVisualizers() {
    // Update performance heatmap colors based on FPS
    if (this.visualizers.performanceHeatmap) {
      const children = this.visualizers.performanceHeatmap.getChildren();
      const fps = this.performanceMetrics.fps;
      const color = this.getFPSColor(fps);

      children.forEach(child => {
        if (child.material) {
          child.material.diffuseColor = color;
        }
      });
    }

    // Update asset loading indicator
    if (this.visualizers.assetIndicator && this.game.assetManager) {
      const health = this.game.assetManager.getAssetHealth();
      const rotation = (health.healthPercentage / 100) * Math.PI * 2;
      this.visualizers.assetIndicator.rotation.y = rotation;
    }

    // Update LOD indicator
    if (this.visualizers.lodIndicator && this.game.assetManager) {
      const lodStats = this.game.assetManager.getLODStats();
      const scale = Math.max(0.1, lodStats.visible / Math.max(1, lodStats.totalInstances));
      this.visualizers.lodIndicator.scaling.y = scale;
    }
  }

  /**
   * Update a debug field
   */
  updateField(fieldId, value) {
    const element = document.getElementById(`debug-${fieldId}`);
    if (element) {
      const span = element.querySelector('span');
      if (span) {
        span.textContent = value;
      }
    }
  }

  /**
   * Get FPS-based color for performance visualization
   */
  getFPSColor(fps) {
    if (fps >= 50) return new BABYLON.Color3(0, 1, 0); // Green - Good
    if (fps >= 30) return new BABYLON.Color3(1, 1, 0); // Yellow - OK
    return new BABYLON.Color3(1, 0, 0); // Red - Poor
  }

  /**
   * Get browser information
   */
  getBrowserInfo() {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  /**
   * Get WebGL version
   */
  getWebGLVersion() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return 'None';

    const version = gl.getParameter(gl.VERSION);
    return version.includes('WebGL 2.0') ? 'WebGL 2.0' : 'WebGL 1.0';
  }

  /**
   * Format large numbers with commas
   */
  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * Show debug information for a specific object
   */
  showObjectInfo(object, position) {
    const info = document.createElement('div');
    info.className = 'object-debug-info';
    info.style.cssText = `
      position: absolute;
      left: ${position.x}px;
      top: ${position.y}px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 5px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 10px;
      z-index: 1001;
      pointer-events: none;
    `;

    info.innerHTML = `
      <div>Name: ${object.name}</div>
      <div>Type: ${object.constructor.name}</div>
      <div>Position: ${object.position?.x.toFixed(2)}, ${object.position?.y.toFixed(2)}, ${object.position?.z.toFixed(2)}</div>
      <div>Enabled: ${object.isEnabled()}</div>
      ${object.material ? `<div>Material: ${object.material.name}</div>` : ''}
      ${object.getTotalVertices ? `<div>Vertices: ${object.getTotalVertices()}</div>` : ''}
    `;

    document.body.appendChild(info);

    // Remove after 3 seconds
    setTimeout(() => {
      if (info.parentNode) {
        info.parentNode.removeChild(info);
      }
    }, 3000);
  }

  /**
   * Export debug information
   */
  exportDebugInfo() {
    const debugData = {
      timestamp: new Date().toISOString(),
      performance: this.performanceMetrics,
      assets: this.game.assetManager ? this.game.assetManager.getAssetHealth() : null,
      lod: this.game.assetManager ? this.game.assetManager.getLODStats() : null,
      obstacles: this.game.obstacleManager ? this.game.obstacleManager.getPerformanceStats?.() : null,
      system: {
        browser: this.getBrowserInfo(),
        webgl: this.getWebGLVersion(),
        platform: navigator.platform,
        userAgent: navigator.userAgent
      }
    };

    const dataStr = JSON.stringify(debugData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `temple-run-debug-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  /**
   * Cleanup debug visualization
   */
  dispose() {
    if (this.debugUI && this.debugUI.parentNode) {
      this.debugUI.parentNode.removeChild(this.debugUI);
    }

    Object.values(this.visualizers).forEach(viz => {
      if (viz && viz.dispose) {
        viz.dispose();
      }
    });

    Object.values(this.materials).forEach(mat => {
      if (mat && mat.dispose) {
        mat.dispose();
      }
    });
  }
}