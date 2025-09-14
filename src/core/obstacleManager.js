/**
 * Obstacle Manager Module
 * Handles obstacle spawning, pooling, and management
 */

import * as BABYLON from 'babylonjs';
import { AssetManager } from './assetManager.js';

export class ObstacleManager {
  constructor(scene, assetManager) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.obstacles = [];
    this.obstaclePool = [];
    this.spawnDistance = 50;
    this.lastSpawnZ = 0;
    this.minSpacing = 10;
    this.maxSpacing = 20;

    // Temple obstacle types mapped to GLB models
    this.obstacleTypes = ['log', 'rock', 'spike'];
    // Align obstacle model names with loaded/procedural assets
    this.obstacleModelMap = {
      log: 'logObstacle',
      rock: 'rockObstacle',
      spike: 'spikeObstacle',
    };

    // Lane positions matching player controller
    this.lanes = [-2, 0, 2];

    // Debug
    this.debugColliders = false;
    this._debugMats = {};
  }

  /**
   * Initialize the obstacle manager
   */
  init() {
    this.createObstaclePool();
  }

  /**
   * Create a pool of reusable obstacle containers
   */
  createObstaclePool() {
    const poolSize = 20;

    for (let i = 0; i < poolSize; i++) {
      // Create transform node containers for obstacles
      const obstacle = new BABYLON.TransformNode(`obstacle_${i}`, this.scene);
      obstacle.setEnabled(false);

      // Store obstacle data
      obstacle.obstacleData = {
        type: null,
        lane: null,
        active: false,
        mesh: null // Will hold the actual obstacle mesh instance
      };

      this.obstaclePool.push(obstacle);
    }
  }

  /**
   * Update obstacle positions and spawn new ones
   * @param {number} deltaTime - Time since last update
   * @param {BABYLON.Vector3} playerPosition - Current player position
   */
  update(deltaTime, playerPosition) {
    // Check if we need to spawn new obstacles
    if (playerPosition && playerPosition.z > this.lastSpawnZ - this.spawnDistance) {
      this.spawnObstacle(playerPosition.z + this.spawnDistance);
    }

    // Update active obstacles
    this.updateObstacles(playerPosition);
  }

  /**
   * Spawn a new obstacle
   * @param {number} spawnZ - Z position to spawn the obstacle
   */
  spawnObstacle(spawnZ) {
    const obstacle = this.getFromPool();
    
    if (obstacle) {
      // Random lane selection
      const lane = Math.floor(Math.random() * this.lanes.length);
      
      // Random obstacle type
      const type = this.obstacleTypes[Math.floor(Math.random() * this.obstacleTypes.length)];
      
      // Position the obstacle
      obstacle.position.x = this.lanes[lane];
      obstacle.position.y = 0; // Base at ground; per-type adjusts visual/collider heights
      obstacle.position.z = spawnZ;
      
      // Configure obstacle data
      obstacle.obstacleData.type = type;
      obstacle.obstacleData.lane = lane;
      obstacle.obstacleData.active = true;
      
      // Make visible and add to active list
      obstacle.setEnabled(true);
      this.obstacles.push(obstacle);
      
      // Update last spawn position
      this.lastSpawnZ = spawnZ;
      
      // Configure appearance based on type
      this.configureObstacleAppearance(obstacle, type);
    }
  }

  /**
   * Configure obstacle appearance using temple GLB models
   * @param {BABYLON.TransformNode} obstacle - The obstacle container
   * @param {string} type - The obstacle type
   */
  configureObstacleAppearance(obstacle, type) {
    // Get the corresponding temple obstacle model
    const modelName = this.obstacleModelMap[type];
    const obstacleModel = this.assetManager?.getModel(modelName);

    if (obstacleModel) {
      // Use temple obstacle GLB model with LOD (visual only)
      const visual = this.assetManager.createLODInstance(
        modelName,
        `${obstacle.name}_${type}`,
        obstacle.position.clone()
      ) || obstacleModel.createInstance(`${obstacle.name}_${type}`);

      // Parent instance root to obstacle container and recenter visuals
      visual.parent = obstacle;
      if (this.assetManager && typeof this.assetManager.centerInstance === 'function') {
        this.assetManager.centerInstance(visual);
      }
      obstacle.obstacleData.instanceRoot = visual;

      // Configure visual scaling and positioning based on type
      switch (type) {
        case 'log':
          visual.scaling = new BABYLON.Vector3(1.2, 1, 1.2);
          visual.position.y = 0.3;
          break;
        case 'rock':
          visual.scaling = new BABYLON.Vector3(1, 1, 1);
          visual.position.y = 0;
          break;
        case 'spike':
          visual.scaling = new BABYLON.Vector3(0.8, 1, 0.8);
          visual.position.y = 0;
          break;
      }

      // Apply appropriate visual material if available
      const materialName = type === 'log' ? 'bark_brown' :
                          type === 'rock' ? 'castle_wall_slates' : 'metal_plate';
      const material = this.assetManager?.getMaterial(materialName);
      if (material) {
        const applyToMeshOrSource = (m) => {
          const target = m && m.sourceMesh ? m.sourceMesh : m;
          if (target && target.material !== undefined) target.material = material;
        };
        if (typeof visual.getChildMeshes === 'function') {
          for (const m of visual.getChildMeshes(false)) applyToMeshOrSource(m);
        } else {
          applyToMeshOrSource(visual);
        }
      }

      // Create a simple, reliable collider box per obstacle type
      const collider = BABYLON.MeshBuilder.CreateBox(
        `${obstacle.name}_${type}_collider`,
        { size: 1 },
        this.scene
      );
      collider.isVisible = this.debugColliders;
      collider.parent = obstacle;
      collider.isPickable = false;
      switch (type) {
        case 'log':
          collider.scaling = new BABYLON.Vector3(3, 0.6, 0.6);
          collider.position.y = 0.3;
          break;
        case 'rock':
          collider.scaling = new BABYLON.Vector3(1.2, 1.2, 1.2);
          collider.position.y = 0.6;
          break;
        case 'spike':
          collider.scaling = new BABYLON.Vector3(0.8, 1.6, 0.8);
          collider.position.y = 0.8;
          break;
      }
      if (this.debugColliders) {
        collider.material = this._getColliderMat(type);
        collider.visibility = 0.5;
      }
      obstacle.obstacleData.mesh = collider;
    } else {
      // Fallback to procedural geometry
      const mesh = BABYLON.MeshBuilder.CreateBox(
        `${obstacle.name}_${type}`,
        { size: 1 },
        this.scene
      );
      mesh.parent = obstacle;
      mesh.checkCollisions = false;
      mesh.isVisible = this.debugColliders;
      if (this.debugColliders) {
        mesh.material = this._getColliderMat(type);
        mesh.visibility = 0.5;
      }
      obstacle.obstacleData.mesh = mesh;

      // Apply procedural styling
      const material = new BABYLON.StandardMaterial(`${type}_mat`, this.scene);

      switch (type) {
        case 'log':
          mesh.scaling = new BABYLON.Vector3(3, 0.5, 0.5);
          material.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);
          break;
        case 'rock':
          mesh.scaling = new BABYLON.Vector3(1, 1.5, 1);
          material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
          break;
        case 'spike':
          mesh.scaling = new BABYLON.Vector3(0.5, 2, 0.5);
          material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7);
          break;
      }

      mesh.material = material;
    }
  }

  /**
   * Update active obstacles and recycle those that are behind the player
   * @param {BABYLON.Vector3} playerPosition - Current player position
   */
  updateObstacles(playerPosition) {
    if (!playerPosition) return;

    // Update LOD for obstacles (handled by AssetManager but we can add specific logic here)
    // The AssetManager.updateLOD() is called from WorldManager

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obstacle = this.obstacles[i];
      const dz = obstacle.position.z - playerPosition.z;

      // Check if obstacle is far behind the player
      if (obstacle.position.z < playerPosition.z - 10) {
        this.returnToPool(obstacle);
        this.obstacles.splice(i, 1);
        continue;
      }

      // Distance-based culling: hide far-ahead obstacles to reduce draw calls
      if (dz > 60) {
        obstacle.setEnabled(false);
      } else if (dz > -10) {
        // Show when within relevant range (ahead or slightly behind)
        obstacle.setEnabled(true);
      }
    }
  }

  /**
   * Get an inactive obstacle from the pool
   * @returns {BABYLON.Mesh|null} An available obstacle or null
   */
  getFromPool() {
    for (const obstacle of this.obstaclePool) {
      if (!obstacle.obstacleData.active) {
        return obstacle;
      }
    }
    return null;
  }

  /**
   * Return an obstacle to the pool
   * @param {BABYLON.TransformNode} obstacle - The obstacle to return
   */
  returnToPool(obstacle) {
    obstacle.setEnabled(false);
    obstacle.obstacleData.active = false;
    obstacle.obstacleData.type = null;
    obstacle.obstacleData.lane = null;

    // Dispose of the mesh instance and remove from LOD tracking
    if (obstacle.obstacleData.mesh) {
      if (this.assetManager) {
        // Prefer removing the instance root if available
        const root = obstacle.obstacleData.instanceRoot || obstacle.obstacleData.mesh;
        this.assetManager.removeLODInstance(root);
      }
      // Dispose collider and any instance root container if present
      if (obstacle.obstacleData.mesh.dispose) obstacle.obstacleData.mesh.dispose();
      if (obstacle.obstacleData.instanceRoot && obstacle.obstacleData.instanceRoot !== obstacle.obstacleData.mesh && obstacle.obstacleData.instanceRoot.dispose) {
        obstacle.obstacleData.instanceRoot.dispose();
      }
      obstacle.obstacleData.mesh = null;
      obstacle.obstacleData.instanceRoot = null;
    }
  }

  /**
   * Check collision with player
   * @param {BABYLON.Mesh} playerMesh - The player mesh
   * @returns {boolean} True if collision detected
   */
  checkCollision(playerMesh) {
    if (!playerMesh) return false;

    const playerPos = playerMesh.getAbsolutePosition();

    for (const obstacle of this.obstacles) {
      if (!obstacle.obstacleData.active) continue;
      const collider = obstacle.obstacleData.mesh;
      if (!collider || collider.isDisposed()) continue;

      const colPos = collider.getAbsolutePosition();

      // Broad-phase gating using actual collider position relative to player
      const dz = colPos.z - playerPos.z;
      if (dz < -0.5 || dz > 1.5) continue; // only test when nearly overlapping in Z

      const dx = colPos.x - playerPos.x;
      if (Math.abs(dx) > 0.9) continue; // only same lane (lanes separated by 2)

      if (collider.isEnabled(true) && playerMesh.isEnabled(true)) {
        // Precise intersection to avoid false positives on AABB overlap
        if (collider.intersectsMesh(playerMesh, true)) {
          if (this.debugColliders) {
            // Color colliding collider in red and log details
            collider.isVisible = true;
            const mat = new BABYLON.StandardMaterial('collider_hit_mat', this.scene);
            mat.diffuseColor = new BABYLON.Color3(1, 0, 0);
            mat.alpha = 0.4;
            collider.material = mat;
            console.log('[Collision] with', obstacle.name, {
              type: obstacle.obstacleData.type,
              colliderPos: colPos.clone(),
              playerPos: playerPos.clone(),
              dz,
              dx,
            });
          }
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Enable/disable collider debug visualization
   */
  setDebugColliders(enabled) {
    this.debugColliders = !!enabled;
    // Update visibility/material for existing obstacles
    for (const obstacle of this.obstacles) {
      const collider = obstacle.obstacleData?.mesh;
      if (!collider || collider.isDisposed?.()) continue;
      collider.isVisible = this.debugColliders;
      if (this.debugColliders) {
        collider.material = this._getColliderMat(obstacle.obstacleData?.type || 'default');
        collider.visibility = 0.5;
      } else {
        // Keep invisible but present
        collider.visibility = 0;
      }
    }
  }

  _getColliderMat(type) {
    const key = `collider_${type}`;
    if (this._debugMats[key]) return this._debugMats[key];
    const mat = new BABYLON.StandardMaterial(key, this.scene);
    let color;
    switch (type) {
      case 'log': color = new BABYLON.Color3(1, 0.6, 0); break;
      case 'rock': color = new BABYLON.Color3(0.5, 0.7, 1); break;
      case 'spike': color = new BABYLON.Color3(1, 0, 1); break;
      default: color = new BABYLON.Color3(0, 1, 0.5); break;
    }
    mat.diffuseColor = color;
    mat.specularColor = new BABYLON.Color3(0, 0, 0);
    mat.alpha = 0.4;
    this._debugMats[key] = mat;
    return mat;
  }

  /**
   * Reset the obstacle manager
   */
  reset() {
    // Return all obstacles to pool
    for (const obstacle of this.obstacles) {
      this.returnToPool(obstacle);
    }
    
    this.obstacles = [];
    this.lastSpawnZ = 0;
  }

  /**
   * Set spawn parameters
   * @param {number} minSpacing - Minimum spacing between obstacles
   * @param {number} maxSpacing - Maximum spacing between obstacles
   */
  setSpawnParameters(minSpacing, maxSpacing) {
    this.minSpacing = Math.max(5, minSpacing);
    this.maxSpacing = Math.max(this.minSpacing + 1, maxSpacing);
  }
}
