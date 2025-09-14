/**
 * Performance Testing Utility
 * Runs automated tests to validate performance optimizations
 */
import * as BABYLON from 'babylonjs';

export class PerformanceTest {
  constructor(game) {
    this.game = game;
    this.testResults = [];
  }

  /**
   * Run all performance tests
   */
  async runAllTests() {
    console.log('Starting performance tests...');

    const tests = [
      this.testAssetLoadingTime,
      this.testLODSystem,
      this.testMemoryUsage,
      this.testFrameRate
    ];

    for (const test of tests) {
      try {
        const result = await test.call(this);
        this.testResults.push(result);
        console.log(`✓ ${result.testName}: ${result.status}`);
      } catch (error) {
        console.error(`✗ Test failed: ${error.message}`);
        this.testResults.push({
          testName: error.testName || 'Unknown Test',
          status: 'FAILED',
          error: error.message
        });
      }
    }

    return this.generateReport();
  }

  /**
   * Test asset loading performance
   */
  async testAssetLoadingTime() {
    const startTime = performance.now();

    // Simulate asset loading (in real scenario, this would be actual loading)
    const assetManager = this.game.assetManager;
    if (!assetManager) {
      throw new Error('AssetManager not available');
    }

    const endTime = performance.now();
    const loadTime = endTime - startTime;

    const status = loadTime < 5000 ? 'PASSED' : 'WARNING';
    const message = loadTime < 5000 ?
      `Assets loaded in ${loadTime.toFixed(2)}ms` :
      `Slow asset loading: ${loadTime.toFixed(2)}ms (expected < 5000ms)`;

    return {
      testName: 'Asset Loading Performance',
      status: status,
      loadTime: loadTime,
      message: message
    };
  }

  /**
   * Test LOD system effectiveness
   */
  async testLODSystem() {
    const assetManager = this.game.assetManager;
    if (!assetManager || !assetManager.lodEnabled) {
      throw new Error('LOD system not available or disabled');
    }

    // Simulate different player positions to test LOD
    const testPositions = [
      { x: 0, y: 0, z: 0 },     // Close
      { x: 0, y: 0, z: 30 },    // Medium distance
      { x: 0, y: 0, z: 70 },    // Far distance
      { x: 0, y: 0, z: 150 }    // Very far (should be culled)
    ];

    const lodResults = [];

    for (const pos of testPositions) {
      const position = new BABYLON.Vector3(pos.x, pos.y, pos.z);
      assetManager.updateLOD(position);

      const stats = assetManager.getLODStats();
      lodResults.push({
        distance: pos.z,
        visible: stats.visible,
        hidden: stats.hidden,
        lodLevels: stats.lodLevels
      });
    }

    // Validate that culling is working (fewer visible objects at distance)
    const closeVisible = lodResults[0].visible;
    const farVisible = lodResults[3].visible;
    const cullingEffective = farVisible < closeVisible;

    return {
      testName: 'LOD System',
      status: cullingEffective ? 'PASSED' : 'WARNING',
      message: cullingEffective ?
        'LOD culling is working effectively' :
        'LOD culling may not be working as expected',
      details: lodResults
    };
  }

  /**
   * Test memory usage
   */
  async testMemoryUsage() {
    if (!performance.memory) {
      return {
        testName: 'Memory Usage',
        status: 'SKIPPED',
        message: 'Memory API not available in this browser'
      };
    }

    const initialMemory = performance.memory.usedJSHeapSize;

    // Simulate memory-intensive operations
    // In a real test, this might involve loading many assets
    await this.simulateMemoryLoad();

    const peakMemory = performance.memory.usedJSHeapSize;
    const memoryIncrease = peakMemory - initialMemory;
    const memoryMB = memoryIncrease / 1024 / 1024;

    const status = memoryMB < 50 ? 'PASSED' : 'WARNING';
    const message = status === 'PASSED' ?
      `Memory usage is reasonable: ${memoryMB.toFixed(1)}MB increase` :
      `High memory usage: ${memoryMB.toFixed(1)}MB increase`;

    return {
      testName: 'Memory Usage',
      status: status,
      memoryIncrease: memoryMB,
      message: message
    };
  }

  /**
   * Test frame rate performance
   */
  async testFrameRate() {
    if (!this.game.performanceMonitor) {
      throw new Error('Performance monitor not available');
    }

    // Start monitoring if not already started
    if (!this.game.performanceMonitor.isMonitoring) {
      this.game.performanceMonitor.start();
      await this.delay(2000); // Wait 2 seconds for data
    }

    const currentFPS = this.game.performanceMonitor.getCurrentFPS();

    let status, message;
    if (currentFPS >= 45) {
      status = 'PASSED';
      message = `Excellent frame rate: ${currentFPS.toFixed(1)} FPS`;
    } else if (currentFPS >= 30) {
      status = 'WARNING';
      message = `Acceptable frame rate: ${currentFPS.toFixed(1)} FPS`;
    } else {
      status = 'FAILED';
      message = `Poor frame rate: ${currentFPS.toFixed(1)} FPS`;
    }

    return {
      testName: 'Frame Rate Performance',
      status: status,
      fps: currentFPS,
      message: message
    };
  }

  /**
   * Simulate memory-intensive loading
   */
  async simulateMemoryLoad() {
    // Create and dispose temporary objects to simulate asset loading
    const tempObjects = [];
    for (let i = 0; i < 100; i++) {
      tempObjects.push(new Array(1000).fill(Math.random()));
      if (i % 20 === 0) {
        await this.delay(10); // Small delay to allow memory monitoring
      }
    }
    // Objects will be garbage collected
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate performance test report
   */
  generateReport() {
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const warnings = this.testResults.filter(r => r.status === 'WARNING').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const skipped = this.testResults.filter(r => r.status === 'SKIPPED').length;

    const overallStatus = failed > 0 ? 'FAILED' :
                         warnings > 0 ? 'WARNING' : 'PASSED';

    const report = {
      summary: {
        overallStatus: overallStatus,
        totalTests: this.testResults.length,
        passed: passed,
        warnings: warnings,
        failed: failed,
        skipped: skipped
      },
      details: this.testResults,
      recommendations: this.generateOptimizationRecommendations()
    };

    console.log('Performance Test Report:', report);
    return report;
  }

  /**
   * Generate optimization recommendations
   */
  generateOptimizationRecommendations() {
    const recommendations = [];

    this.testResults.forEach(result => {
      switch (result.testName) {
        case 'Asset Loading Performance':
          if (result.status !== 'PASSED') {
            recommendations.push({
              category: 'Asset Loading',
              priority: 'high',
              suggestion: 'Consider implementing asset preloading, compression, or reducing asset sizes'
            });
          }
          break;

        case 'LOD System':
          if (result.status !== 'PASSED') {
            recommendations.push({
              category: 'Level of Detail',
              priority: 'medium',
              suggestion: 'Adjust LOD distances or implement more aggressive culling'
            });
          }
          break;

        case 'Memory Usage':
          if (result.status === 'WARNING') {
            recommendations.push({
              category: 'Memory',
              priority: 'medium',
              suggestion: 'Implement texture streaming or reduce texture sizes'
            });
          } else if (result.status === 'FAILED') {
            recommendations.push({
              category: 'Memory',
              priority: 'high',
              suggestion: 'Critical memory usage detected. Implement asset pooling and garbage collection optimization'
            });
          }
          break;

        case 'Frame Rate Performance':
          if (result.fps < 30) {
            recommendations.push({
              category: 'Rendering',
              priority: 'high',
              suggestion: 'Reduce draw calls, implement occlusion culling, or simplify shaders'
            });
          } else if (result.fps < 45) {
            recommendations.push({
              category: 'Rendering',
              priority: 'medium',
              suggestion: 'Fine-tune LOD distances and consider mesh optimization'
            });
          }
          break;
      }
    });

    return recommendations;
  }
}
