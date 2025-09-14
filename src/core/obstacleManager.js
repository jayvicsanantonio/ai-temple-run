/**
 * Obstacle Manager Module
 * Handles obstacle spawning, pooling, and management
 */

import * as BABYLON from 'babylonjs';

export class ObstacleManager {
  constructor(scene) {
    this.scene = scene;
    this.obstacles = [];
    this.obstaclePool = [];
    this.spawnDistance = 50;
    this.lastSpawnZ = 0;
    this.minSpacing = 10;
    this.maxSpacing = 20;

    // Obstacle types
    this.obstacleTypes = ['log', 'rock', 'pit', 'spike'];

    // Lane positions matching player controller
    this.lanes = [-2, 0, 2];
    this.physics = null;
    this.optimizer = null;
    this.assetManager = null;
    this.prefabNames = [];
  }

  /**
   * Initialize the obstacle manager
   */
  init() {
    this.createObstaclePool();
  }

  setPhysicsManager(physics) {
    this.physics = physics;
  }

  setAssetOptimizer(optimizer) {
    this.optimizer = optimizer;
  }

  /**
   * Provide access to AssetManager for cloning prefabs
   */
  setAssetManager(assetManager) {
    this.assetManager = assetManager;
  }

  /**
   * Configure obstacle prefabs (names correspond to AssetManager assets)
   */
  setObstaclePrefabs(names) {
    this.prefabNames = Array.isArray(names) ? names.slice() : [];
  }

  /**
   * Create a pool of reusable obstacles
   */
  createObstaclePool() {
    const poolSize = 20;

    for (let i = 0; i < poolSize; i++) {
      // Create placeholder obstacles (boxes for now)
      const obstacle = BABYLON.MeshBuilder.CreateBox(`obstacle_${i}`, { size: 1 }, this.scene);

      obstacle.isVisible = false;
      obstacle.checkCollisions = true;

      // Store obstacle data
      obstacle.obstacleData = {
        type: null,
        lane: null,
        active: false,
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
      obstacle.position.y = 0.5; // Height will vary by type
      obstacle.position.z = spawnZ;

      // Configure obstacle data
      obstacle.obstacleData.type = type;
      obstacle.obstacleData.lane = lane;
      obstacle.obstacleData.active = true;

      // Make visible and add to active list
      obstacle.isVisible = true;
      this.obstacles.push(obstacle);

      // Register in physics (as static)
      if (this.physics && this.physics.registerObstacle) {
        this.physics.registerObstacle(obstacle);
      }

      // Update last spawn position
      this.lastSpawnZ = spawnZ;

      // Configure appearance based on type and attach prefab visual if available
      this.configureObstacleAppearance(obstacle, type);
      this.attachPrefabVisual(obstacle);

      // Apply LODs if available
      if (this.optimizer) this.optimizer.tryApplyLODs(obstacle);
    }
  }

  /**
   * Attach a prefab clone as the visual under the collision box, if available
   */
  attachPrefabVisual(obstacle) {
    if (!this.assetManager || !this.prefabNames.length) return;
    // Cleanup previous
    if (obstacle._prefabVisual && typeof obstacle._prefabVisual.dispose === 'function') {
      try {
        obstacle._prefabVisual.dispose(false, true);
      } catch {}
    }
    const pick = this.prefabNames[Math.floor(Math.random() * this.prefabNames.length)];
    const clone = this.assetManager.getAsset(pick);
    if (!clone) return;
    clone.parent = obstacle;
    clone.position.set(0, 0, 0);
    obstacle._prefabVisual = clone;
    // Hide the collision box mesh for visuals; keep it for physics/collisions
    obstacle.visibility = 0;
  }

  /**
   * Configure obstacle appearance based on type
   * @param {BABYLON.Mesh} obstacle - The obstacle mesh
   * @param {string} type - The obstacle type
   */
  configureObstacleAppearance(obstacle, type) {
    // Placeholder appearances - will be replaced with actual models
    const material = new BABYLON.StandardMaterial(`${type}_mat`, this.scene);

    switch (type) {
      case 'log':
        obstacle.scaling = new BABYLON.Vector3(3, 0.5, 0.5);
        material.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);
        break;
      case 'rock':
        obstacle.scaling = new BABYLON.Vector3(1, 1.5, 1);
        material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        break;
      case 'pit':
        obstacle.scaling = new BABYLON.Vector3(2, 0.1, 2);
        obstacle.position.y = -0.45;
        material.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        break;
      case 'spike':
        obstacle.scaling = new BABYLON.Vector3(0.5, 2, 0.5);
        material.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7);
        break;
    }

    obstacle.material = material;
  }

  /**
   * Update active obstacles and recycle those that are behind the player
   * @param {BABYLON.Vector3} playerPosition - Current player position
   */
  updateObstacles(playerPosition) {
    if (!playerPosition) return;

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
        obstacle.isVisible = false;
      } else if (dz > -10) {
        // Show when within relevant range (ahead or slightly behind)
        obstacle.isVisible = true;
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
   * @param {BABYLON.Mesh} obstacle - The obstacle to return
   */
  returnToPool(obstacle) {
    obstacle.isVisible = false;
    obstacle.obstacleData.active = false;
    obstacle.obstacleData.type = null;
    obstacle.obstacleData.lane = null;
    if (this.physics && this.physics.unregisterObstacle) {
      this.physics.unregisterObstacle(obstacle);
    }
  }

  /**
   * Check collision with player
   * @param {BABYLON.Mesh} playerMesh - The player mesh
   * @returns {boolean} True if collision detected
   */
  checkCollision(playerMesh) {
    if (!playerMesh) return false;

    for (const obstacle of this.obstacles) {
      if (obstacle.obstacleData.active && obstacle.intersectsMesh(playerMesh, false)) {
        return true;
      }
    }

    return false;
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
