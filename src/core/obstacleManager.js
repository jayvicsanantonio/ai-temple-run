/**
 * Obstacle Manager Module - Handles obstacle spawning, pooling, and management
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

  init() {
    this.createObstaclePool();
  }

  createObstaclePool() {
    const poolSize = 20;

    for (let i = 0; i < poolSize; i++) {
      const obstacle = new BABYLON.TransformNode(`obstacle_${i}`, this.scene);
      obstacle.setEnabled(false);

      obstacle.obstacleData = {
        type: null,
        lane: null,
        active: false,
        mesh: null
      };

      this.obstaclePool.push(obstacle);
    }
  }

  update(deltaTime, playerPosition) {
    if (playerPosition && playerPosition.z > this.lastSpawnZ - this.spawnDistance) {
      this.spawnObstacle(playerPosition.z + this.spawnDistance);
    }

    this.updateObstacles(playerPosition);
  }

  spawnObstacle(spawnZ) {
    const obstacle = this.getFromPool();

    if (obstacle) {
      const lane = Math.floor(Math.random() * this.lanes.length);
      const type = this.obstacleTypes[Math.floor(Math.random() * this.obstacleTypes.length)];

      obstacle.position.x = this.lanes[lane];
      obstacle.position.y = 0;
      obstacle.position.z = spawnZ;

      obstacle.obstacleData.type = type;
      obstacle.obstacleData.lane = lane;
      obstacle.obstacleData.active = true;

      obstacle.setEnabled(true);
      this.obstacles.push(obstacle);

      this.lastSpawnZ = spawnZ;

      this.configureObstacleAppearance(obstacle, type);
    }
  }

  configureObstacleAppearance(obstacle, type) {
    const modelName = this.obstacleModelMap[type];
    const obstacleModel = this.assetManager?.getModel(modelName);

    if (obstacleModel) {
      console.log(`Creating visual for obstacle ${type} at position:`, `x:${obstacle.position.x} y:${obstacle.position.y} z:${obstacle.position.z}`);
      console.log(`Obstacle model structure:`, obstacleModel.name, obstacleModel.constructor.name);

      // Debug: log the structure
      if (typeof obstacleModel.getChildMeshes === 'function') {
        const meshes = obstacleModel.getChildMeshes(true); // Include descendants
        console.log(`Obstacle model has ${meshes.length} child meshes:`, meshes.map(m => ({
          name: m.name,
          type: m.constructor.name,
          vertices: m.getTotalVertices ? m.getTotalVertices() : 'N/A',
          enabled: m.isEnabled(),
          visible: m.isVisible
        })));
      }

      // Try using the AssetManager's createLODInstance method
      let visual = this.assetManager.createLODInstance(modelName, `${obstacle.name}_${type}`, obstacle.position.clone());

      if (!visual) {
        console.log(`LOD instance failed, trying direct cloning for ${type}`);

        if (typeof obstacleModel.getChildMeshes === 'function') {
          const meshes = obstacleModel.getChildMeshes(true);
          if (meshes.length > 0) {
            // Create a container for all the cloned meshes
            visual = new BABYLON.TransformNode(`${obstacle.name}_${type}`, this.scene);

            for (const mesh of meshes) {
              if (mesh && mesh.getTotalVertices && mesh.getTotalVertices() > 0) {
                const clonedMesh = mesh.clone(`${visual.name}_${mesh.name}`);
                clonedMesh.parent = visual;
                clonedMesh.setEnabled(true);
                clonedMesh.isVisible = true;
              }
            }
            visual.position = obstacle.position.clone();
            console.log(`Obstacle ${type} created via mesh cloning: SUCCESS`);
          }
        }

        if (!visual && typeof obstacleModel.clone === 'function') {
          visual = obstacleModel.clone(`${obstacle.name}_${type}`);
          visual.setEnabled(true);
          visual.isVisible = true;
          visual.position = obstacle.position.clone();
          console.log(`Obstacle ${type} created via direct clone: SUCCESS`);
        }
      } else {
        console.log(`Obstacle ${type} created via LOD instance: SUCCESS`);
      }

      if (visual) {
        if (this.assetManager && typeof this.assetManager.centerInstance === 'function') {
          this.assetManager.centerInstance(visual);
        }
        obstacle.obstacleData.instanceRoot = visual;

        visual.setEnabled(true);

        // Configure visual scaling and positioning based on type
        switch (type) {
          case 'log':
            visual.scaling = new BABYLON.Vector3(1.2, 1, 1.2);
            visual.position.y += 0.3;
            break;
          case 'rock':
            visual.scaling = new BABYLON.Vector3(1, 1, 1);
            visual.position.y += 0;
            break;
          case 'spike':
            visual.scaling = new BABYLON.Vector3(0.8, 1, 0.8);
            visual.position.y += 0;
            break;
        }

        // Apply material
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
      }

      // Create collider
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

  updateObstacles(playerPosition) {
    if (!playerPosition) return;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obstacle = this.obstacles[i];
      const dz = obstacle.position.z - playerPosition.z;

      if (obstacle.position.z < playerPosition.z - 10) {
        this.returnToPool(obstacle);
        this.obstacles.splice(i, 1);
        continue;
      }

      if (dz > 60) {
        obstacle.setEnabled(false);
      } else if (dz > -10) {
        obstacle.setEnabled(true);
      }
    }
  }

  getFromPool() {
    for (const obstacle of this.obstaclePool) {
      if (!obstacle.obstacleData.active) {
        return obstacle;
      }
    }
    return null;
  }

  returnToPool(obstacle) {
    obstacle.setEnabled(false);
    obstacle.obstacleData.active = false;
    obstacle.obstacleData.type = null;
    obstacle.obstacleData.lane = null;

    if (obstacle.obstacleData.mesh) {
      if (this.assetManager) {
        const root = obstacle.obstacleData.instanceRoot || obstacle.obstacleData.mesh;
        this.assetManager.removeLODInstance(root);
      }
      if (obstacle.obstacleData.mesh.dispose) obstacle.obstacleData.mesh.dispose();
      if (obstacle.obstacleData.instanceRoot && obstacle.obstacleData.instanceRoot !== obstacle.obstacleData.mesh && obstacle.obstacleData.instanceRoot.dispose) {
        obstacle.obstacleData.instanceRoot.dispose();
      }
      obstacle.obstacleData.mesh = null;
      obstacle.obstacleData.instanceRoot = null;
    }
  }

  checkCollision(playerMesh) {
    if (!playerMesh) return false;

    const playerPos = playerMesh.getAbsolutePosition();

    for (const obstacle of this.obstacles) {
      if (!obstacle.obstacleData.active) continue;
      const collider = obstacle.obstacleData.mesh;
      if (!collider || collider.isDisposed()) continue;

      const colPos = collider.getAbsolutePosition();

      const dz = colPos.z - playerPos.z;
      if (dz < -0.5 || dz > 1.5) continue;

      const dx = colPos.x - playerPos.x;
      if (Math.abs(dx) > 0.9) continue;

      if (collider.isEnabled(true) && playerMesh.isEnabled(true)) {
        if (collider.intersectsMesh(playerMesh, true)) {
          if (this.debugColliders) {
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

  setDebugColliders(enabled) {
    this.debugColliders = !!enabled;
    for (const obstacle of this.obstacles) {
      const collider = obstacle.obstacleData?.mesh;
      if (!collider || collider.isDisposed?.()) continue;
      collider.isVisible = this.debugColliders;
      if (this.debugColliders) {
        collider.material = this._getColliderMat(obstacle.obstacleData?.type || 'default');
        collider.visibility = 0.5;
      } else {
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

  reset() {
    for (const obstacle of this.obstacles) {
      this.returnToPool(obstacle);
    }

    this.obstacles = [];
    this.lastSpawnZ = 0;
  }

  setSpawnParameters(minSpacing, maxSpacing) {
    this.minSpacing = Math.max(5, minSpacing);
    this.maxSpacing = Math.max(this.minSpacing + 1, maxSpacing);
  }
}