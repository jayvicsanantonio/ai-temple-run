/**
 * Performance Monitor Utility
 * Tracks loading times, memory usage, and rendering performance
 */

export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      assetLoadTimes: [],
      memoryUsage: [],
      frameRates: [],
      lodStats: []
    };

    this.startTime = null;
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.isMonitoring = false;
  }

  /**
   * Start performance monitoring
   */
  start() {
    this.isMonitoring = true;
    this.startTime = performance.now();

    // Start monitoring frame rate
    this.monitorFrameRate();

    // Monitor memory usage if available
    if (performance.memory) {
      this.monitorMemory();
    }

    console.log('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stop() {
    this.isMonitoring = false;
    console.log('Performance monitoring stopped');
    return this.getReport();
  }

  /**
   * Log asset loading time
   */
  logAssetLoad(assetName, startTime, endTime) {
    const loadTime = endTime - startTime;
    this.metrics.assetLoadTimes.push({
      asset: assetName,
      loadTime: loadTime,
      timestamp: Date.now()
    });

    console.log(`Asset ${assetName} loaded in ${loadTime.toFixed(2)}ms`);
  }

  /**
   * Log LOD statistics
   */
  logLODStats(stats) {
    this.metrics.lodStats.push({
      ...stats,
      timestamp: Date.now()
    });
  }

  /**
   * Monitor frame rate
   */
  monitorFrameRate() {
    if (!this.isMonitoring) return;

    const currentTime = performance.now();

    if (this.lastFrameTime > 0) {
      const frameTime = currentTime - this.lastFrameTime;
      const fps = 1000 / frameTime;

      this.metrics.frameRates.push({
        fps: fps,
        frameTime: frameTime,
        timestamp: currentTime
      });

      // Keep only last 100 frame samples
      if (this.metrics.frameRates.length > 100) {
        this.metrics.frameRates.shift();
      }
    }

    this.lastFrameTime = currentTime;
    this.frameCount++;

    // Continue monitoring
    requestAnimationFrame(() => this.monitorFrameRate());
  }

  /**
   * Monitor memory usage
   */
  monitorMemory() {
    if (!this.isMonitoring || !performance.memory) return;

    const memInfo = {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit,
      timestamp: Date.now()
    };

    this.metrics.memoryUsage.push(memInfo);

    // Keep only last 50 memory samples
    if (this.metrics.memoryUsage.length > 50) {
      this.metrics.memoryUsage.shift();
    }

    // Monitor every 2 seconds
    setTimeout(() => this.monitorMemory(), 2000);
  }

  /**
   * Get current frame rate
   */
  getCurrentFPS() {
    const recent = this.metrics.frameRates.slice(-10);
    if (recent.length === 0) return 0;

    const avgFps = recent.reduce((sum, frame) => sum + frame.fps, 0) / recent.length;
    return avgFps;
  }

  /**
   * Get performance report
   */
  getReport() {
    const report = {
      summary: {
        monitoringDuration: this.isMonitoring ?
          performance.now() - this.startTime : 0,
        totalFrames: this.frameCount,
        averageFPS: this.getAverageFPS(),
        assetLoadCount: this.metrics.assetLoadTimes.length,
        totalAssetLoadTime: this.getTotalAssetLoadTime(),
        memoryPeakUsage: this.getPeakMemoryUsage()
      },
      detailed: {
        assetLoadTimes: this.metrics.assetLoadTimes,
        frameRateHistory: this.metrics.frameRates.slice(-20), // Last 20 frames
        memoryHistory: this.metrics.memoryUsage.slice(-10),   // Last 10 samples
        lodStats: this.metrics.lodStats.slice(-5)             // Last 5 LOD snapshots
      },
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  /**
   * Get average FPS
   */
  getAverageFPS() {
    if (this.metrics.frameRates.length === 0) return 0;

    const total = this.metrics.frameRates.reduce((sum, frame) => sum + frame.fps, 0);
    return total / this.metrics.frameRates.length;
  }

  /**
   * Get total asset loading time
   */
  getTotalAssetLoadTime() {
    return this.metrics.assetLoadTimes.reduce((total, load) => total + load.loadTime, 0);
  }

  /**
   * Get peak memory usage
   */
  getPeakMemoryUsage() {
    if (this.metrics.memoryUsage.length === 0) return null;

    return Math.max(...this.metrics.memoryUsage.map(mem => mem.used));
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    // Frame rate recommendations
    const avgFps = this.getAverageFPS();
    if (avgFps < 30) {
      recommendations.push({
        type: 'performance',
        severity: 'high',
        message: `Low average FPS (${avgFps.toFixed(1)}). Consider reducing LOD distances or simplifying models.`
      });
    } else if (avgFps < 45) {
      recommendations.push({
        type: 'performance',
        severity: 'medium',
        message: `Moderate FPS (${avgFps.toFixed(1)}). LOD system is helping but could be optimized further.`
      });
    }

    // Asset loading recommendations
    const slowAssets = this.metrics.assetLoadTimes.filter(load => load.loadTime > 1000);
    if (slowAssets.length > 0) {
      recommendations.push({
        type: 'loading',
        severity: 'medium',
        message: `${slowAssets.length} assets took over 1 second to load. Consider compression or reducing file sizes.`
      });
    }

    // Memory recommendations
    if (performance.memory) {
      const peakMemory = this.getPeakMemoryUsage();
      const memoryLimitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
      const peakMemoryMB = peakMemory / 1024 / 1024;

      if (peakMemoryMB > memoryLimitMB * 0.8) {
        recommendations.push({
          type: 'memory',
          severity: 'high',
          message: `High memory usage (${peakMemoryMB.toFixed(1)}MB of ${memoryLimitMB.toFixed(1)}MB). Consider reducing texture sizes or implementing texture streaming.`
        });
      }
    }

    // LOD recommendations
    const latestLOD = this.metrics.lodStats[this.metrics.lodStats.length - 1];
    if (latestLOD) {
      const visibilityRatio = latestLOD.visible / latestLOD.totalInstances;
      if (visibilityRatio > 0.8) {
        recommendations.push({
          type: 'lod',
          severity: 'low',
          message: `High visibility ratio (${(visibilityRatio * 100).toFixed(1)}%). Consider increasing LOD distances for better culling.`
        });
      }
    }

    return recommendations;
  }

  /**
   * Log current performance snapshot
   */
  logSnapshot() {
    const fps = this.getCurrentFPS();
    const memUsage = performance.memory ?
      (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1) + 'MB' : 'N/A';

    console.log(`Performance Snapshot - FPS: ${fps.toFixed(1)}, Memory: ${memUsage}`);
  }

  /**
   * Get current performance statistics
   */
  getStats() {
    const fps = this.getCurrentFPS();
    const memUsage = performance.memory ? {
      used: performance.memory.usedJSHeapSize / 1024 / 1024,
      total: performance.memory.totalJSHeapSize / 1024 / 1024,
      limit: performance.memory.jsHeapSizeLimit / 1024 / 1024
    } : null;

    return {
      fps: Math.round(fps * 10) / 10,
      frameCount: this.frameCount,
      memory: memUsage,
      isMonitoring: this.isMonitoring,
      uptime: this.startTime ? (performance.now() - this.startTime) / 1000 : 0,
      averageFPS: this.metrics.frameRates.length > 0 ?
        this.metrics.frameRates.reduce((a, b) => a + b, 0) / this.metrics.frameRates.length : 0
    };
  }
}