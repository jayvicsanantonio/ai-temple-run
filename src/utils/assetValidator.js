/**
 * Asset Validator Module
 * Validates, optimizes, and ensures asset integrity for the game
 */

import * as BABYLON from 'babylonjs';

export class AssetValidator {
  constructor(assetManager) {
    this.assetManager = assetManager;
    this.validationResults = {
      passed: [],
      warnings: [],
      failed: [],
      summary: {}
    };

    // Validation rules
    this.rules = {
      textureSize: { max: 2048, recommended: 1024 },
      modelComplexity: { maxVertices: 50000, maxFaces: 25000 },
      fileSize: { max: 10 * 1024 * 1024, recommended: 2 * 1024 * 1024 }, // 10MB max, 2MB recommended
      supportedFormats: {
        textures: ['jpg', 'png', 'webp', 'basis'],
        models: ['glb', 'gltf', 'babylon'],
        audio: ['mp3', 'ogg', 'wav']
      }
    };

    // Asset requirements by type
    this.assetRequirements = {
      obstacles: {
        required: ['logObstacle', 'rockObstacle', 'spikeObstacle'],
        recommended: [],
        optional: ['barricadeObstacle', 'pitObstacle']
      },
      pathways: {
        required: ['pathwaySegment'],
        recommended: ['curvedPath', 'pathIntersection'],
        optional: ['bridgePlatform']
      },
      decorations: {
        required: [],
        recommended: ['tree', 'mossStone', 'carvedSymbol'],
        optional: ['crystalFormation', 'fountain', 'vines', 'stonePillar']
      },
      gameplay: {
        required: ['coin'],
        recommended: ['entranceGate'],
        optional: ['templeComplex']
      }
    };
  }

  /**
   * Validate all game assets
   */
  async validateAllAssets() {
    console.log('🔍 Starting comprehensive asset validation...');

    this.validationResults = {
      passed: [],
      warnings: [],
      failed: [],
      summary: {}
    };

    // Validate asset availability
    await this.validateAssetAvailability();

    // Validate loaded assets
    await this.validateLoadedAssets();

    // Validate asset performance
    await this.validateAssetPerformance();

    // Validate asset integrity
    await this.validateAssetIntegrity();

    // Generate validation report
    const report = this.generateValidationReport();

    console.log('✅ Asset validation completed:', report.summary);
    return report;
  }

  /**
   * Validate that required assets are available
   */
  async validateAssetAvailability() {
    console.log('📋 Validating asset availability...');

    for (const [category, requirements] of Object.entries(this.assetRequirements)) {
      // Check required assets
      for (const assetName of requirements.required) {
        const result = await this.validateSingleAsset(assetName, 'required', category);
        this.recordValidationResult(result);
      }

      // Check recommended assets
      for (const assetName of requirements.recommended) {
        const result = await this.validateSingleAsset(assetName, 'recommended', category);
        this.recordValidationResult(result);
      }

      // Check optional assets
      for (const assetName of requirements.optional) {
        const result = await this.validateSingleAsset(assetName, 'optional', category);
        this.recordValidationResult(result);
      }
    }
  }

  /**
   * Validate loaded assets (placeholder)
   */
  async validateLoadedAssets() {
    // Placeholder - would check loaded asset properties
    console.log('📦 Validating loaded assets...');
  }

  /**
   * Validate a single asset
   */
  async validateSingleAsset(assetName, priority, category) {
    const asset = this.assetManager.getModel(assetName);

    const result = {
      assetName,
      category,
      priority,
      available: !!asset,
      issues: [],
      metrics: {}
    };

    if (!asset) {
      const message = `${priority.toUpperCase()} asset '${assetName}' is missing`;
      result.issues.push(message);

      if (priority === 'required') {
        result.severity = 'error';
      } else if (priority === 'recommended') {
        result.severity = 'warning';
      } else {
        result.severity = 'info';
      }
    } else {
      result.severity = 'success';

      // Validate asset properties if available
      await this.validateAssetProperties(asset, result);
    }

    return result;
  }

  /**
   * Validate properties of a loaded asset
   */
  async validateAssetProperties(asset, result) {
    try {
      // Check if asset is a mesh or container
      if (typeof asset.getTotalVertices === 'function') {
        const vertices = asset.getTotalVertices();
        result.metrics.vertices = vertices;

        if (vertices > this.rules.modelComplexity.maxVertices) {
          result.issues.push(`High vertex count: ${vertices} (max recommended: ${this.rules.modelComplexity.maxVertices})`);
          result.severity = 'warning';
        }
      }

      // Check child meshes if it's a container
      if (typeof asset.getChildMeshes === 'function') {
        const children = asset.getChildMeshes();
        result.metrics.childMeshes = children.length;

        let totalVertices = 0;
        let hasLOD = false;

        children.forEach(child => {
          if (typeof child.getTotalVertices === 'function') {
            totalVertices += child.getTotalVertices();
          }

          // Check for LOD support
          if (child.material && child.material.bumpTexture) {
            hasLOD = true;
          }
        });

        result.metrics.totalVertices = totalVertices;
        result.metrics.hasLOD = hasLOD;

        if (!hasLOD && totalVertices > 1000) {
          result.issues.push('Asset lacks LOD support but has high complexity');
        }
      }

    } catch (error) {
      result.issues.push(`Asset validation error: ${error.message}`);
      result.severity = 'error';
    }
  }

  /**
   * Validate performance characteristics of loaded assets
   */
  async validateAssetPerformance() {
    console.log('⚡ Validating asset performance...');

    if (!this.assetManager.getLODStats) {
      this.recordValidationResult({
        assetName: 'LOD System',
        category: 'performance',
        severity: 'warning',
        issues: ['LOD system not available']
      });
      return;
    }

    const lodStats = this.assetManager.getLODStats();

    // Check LOD efficiency
    if (lodStats.totalInstances > 0) {
      const lodEfficiency = (lodStats.visible / lodStats.totalInstances) * 100;

      const result = {
        assetName: 'LOD Efficiency',
        category: 'performance',
        severity: 'success',
        issues: [],
        metrics: {
          efficiency: Math.round(lodEfficiency),
          totalInstances: lodStats.totalInstances,
          visible: lodStats.visible,
          culled: lodStats.culled || 0
        }
      };

      if (lodEfficiency < 30) {
        result.severity = 'warning';
        result.issues.push(`Low LOD efficiency: ${Math.round(lodEfficiency)}%`);
      }

      this.recordValidationResult(result);
    }
  }

  /**
   * Validate overall asset integrity
   */
  async validateAssetIntegrity() {
    console.log('🔒 Validating asset integrity...');

    // Check asset manager health
    if (this.assetManager.getAssetHealth) {
      const health = this.assetManager.getAssetHealth();

      const result = {
        assetName: 'Asset Manager Health',
        category: 'integrity',
        severity: health.status === 'healthy' ? 'success' :
                  health.status === 'degraded' ? 'warning' : 'error',
        issues: [],
        metrics: health
      };

      if (health.status !== 'healthy') {
        result.issues.push(`Asset manager is ${health.status}: ${health.loadedAssets}/${health.totalAssets} assets loaded`);
      }

      this.recordValidationResult(result);
    }
  }

  /**
   * Record a validation result
   */
  recordValidationResult(result) {
    switch (result.severity) {
      case 'success':
        this.validationResults.passed.push(result);
        break;
      case 'warning':
      case 'info':
        this.validationResults.warnings.push(result);
        break;
      case 'error':
        this.validationResults.failed.push(result);
        break;
    }
  }

  /**
   * Generate validation report
   */
  generateValidationReport() {
    const total = this.validationResults.passed.length +
                  this.validationResults.warnings.length +
                  this.validationResults.failed.length;

    const summary = {
      total,
      passed: this.validationResults.passed.length,
      warnings: this.validationResults.warnings.length,
      failed: this.validationResults.failed.length,
      overallStatus: this.getOverallStatus(),
      completionPercentage: total > 0 ? Math.round((this.validationResults.passed.length / total) * 100) : 100
    };

    const recommendations = this.generateRecommendations();

    return {
      summary,
      results: this.validationResults,
      recommendations,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get overall validation status
   */
  getOverallStatus() {
    if (this.validationResults.failed.length > 0) {
      return 'failed';
    }
    if (this.validationResults.warnings.length > 5) {
      return 'degraded';
    }
    if (this.validationResults.warnings.length > 0) {
      return 'good';
    }
    return 'excellent';
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    // Analyze common issues
    const highVertexAssets = this.validationResults.passed.concat(this.validationResults.warnings)
      .filter(r => r.metrics && r.metrics.vertices > 10000);

    if (highVertexAssets.length > 0) {
      recommendations.push({
        category: 'performance',
        priority: 'medium',
        issue: 'High-polygon assets detected',
        suggestion: 'Consider using LOD versions or simplifying geometry',
        affectedAssets: highVertexAssets.map(r => r.assetName)
      });
    }

    // Check for missing recommended assets
    const missingRecommended = this.validationResults.warnings
      .filter(r => r.priority === 'recommended');

    if (missingRecommended.length > 0) {
      recommendations.push({
        category: 'content',
        priority: 'low',
        issue: 'Missing recommended assets',
        suggestion: 'Add recommended assets to improve visual variety',
        affectedAssets: missingRecommended.map(r => r.assetName)
      });
    }

    return recommendations;
  }

  /**
   * Validate loaded assets continuously during runtime
   */
  startRuntimeValidation(intervalMs = 30000) {
    this.runtimeValidationInterval = setInterval(async () => {
      console.log('🔄 Running runtime asset validation...');

      // Quick health check
      if (this.assetManager.getAssetHealth) {
        const health = this.assetManager.getAssetHealth();
        if (health.status !== 'healthy') {
          console.warn('⚠️ Asset health degraded:', health);
        }
      }

      // LOD performance check
      if (this.assetManager.getLODStats) {
        const lodStats = this.assetManager.getLODStats();
        if (lodStats.totalInstances > 0) {
          const efficiency = (lodStats.visible / lodStats.totalInstances) * 100;
          if (efficiency < 20) {
            console.warn('⚠️ LOD efficiency is low:', Math.round(efficiency) + '%');
          }
        }
      }
    }, intervalMs);
  }

  /**
   * Stop runtime validation
   */
  stopRuntimeValidation() {
    if (this.runtimeValidationInterval) {
      clearInterval(this.runtimeValidationInterval);
      this.runtimeValidationInterval = null;
    }
  }

  /**
   * Export validation report as JSON
   */
  exportValidationReport() {
    const report = this.generateValidationReport();
    const dataStr = JSON.stringify(report, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `asset-validation-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    return report;
  }
}