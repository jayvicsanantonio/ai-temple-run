/**
 * World Manager Module
 * Handles procedural tile spawning, recycling, and world generation
 */

import * as BABYLON from 'babylonjs';
import { AssetManager } from './assetManager.js';

export class WorldManager {
  constructor(scene, obstacleManager, coinManager, assetManager) {
    this.scene = scene;
    this.obstacleManager = obstacleManager;
    this.coinManager = coinManager;
    this.assetManager = assetManager;
    
    // Tile management
    this.tiles = [];
    this.tilePool = [];
    this.tileLength = 20; // Length of each tile
    this.tileWidth = 6; // Width to cover all 3 lanes
    this.tilesAhead = 5; // Number of tiles to keep ahead of player
    this.tilesBehind = 2; // Number of tiles to keep behind player
    this.lastTileZ = 0;
    
    // Visual variety - using temple pathway models
    this.tileTypes = ['pathwaySegment', 'curvedPath', 'intersection'];
    this.currentTileType = 'pathwaySegment';

    // Model variations for different tile types
    this.tileModelMap = {
      pathwaySegment: 'pathwaySegment',
      curvedPath: 'curvedPath',
      // Align to loaded GLB name
      intersection: 'pathIntersection',
    };
    
    // Difficulty parameters
    this.difficulty = 1.0;
    this.obstacleSpawnChance = 0.3;
    this.coinSpawnChance = 0.5;
    this.maxObstaclesPerTile = 2;
    
    // Materials
    this.tileMaterials = [];
    this.decorationMeshes = [];
  }

  /**
   * Initialize the world manager
   */
  init() {
    this.createTileMaterials();
    this.createTilePool();
    this.spawnInitialTiles();
  }

  /**
   * Create different materials for tiles
   */
  createTileMaterials() {
    // Main path material
    const pathMaterial = new BABYLON.StandardMaterial('pathMat', this.scene);
    pathMaterial.diffuseTexture = new BABYLON.Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', this.scene);
    pathMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.25, 0.2);
    pathMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    this.tileMaterials.push(pathMaterial);
    
    // Alternative path material
    const altPathMaterial = new BABYLON.StandardMaterial('altPathMat', this.scene);
    altPathMaterial.diffuseColor = new BABYLON.Color3(0.35, 0.3, 0.25);
    altPathMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    this.tileMaterials.push(altPathMaterial);
    
    // Grass/side material
    const grassMaterial = new BABYLON.StandardMaterial('grassMat', this.scene);
    grassMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.15);
    grassMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    this.tileMaterials.push(grassMaterial);
  }

  /**
   * Create a pool of reusable tiles
   */
  createTilePool() {
    const poolSize = 10;
    
    for (let i = 0; i < poolSize; i++) {
      const tile = this.createTile(`tile_pool_${i}`);
      tile.setEnabled(false);
      this.tilePool.push(tile);
    }
  }

  /**
   * Create a single tile using temple models
   */
  createTile(name) {
    // Create parent container for the tile
    const tileContainer = new BABYLON.TransformNode(name, this.scene);

    // Always create a thin procedural base so a path is visible even if GLB fails
    const basePath = BABYLON.MeshBuilder.CreateBox(
      `${name}_basePath`,
      { width: this.tileWidth, height: 0.2, depth: this.tileLength },
      this.scene
    );
    basePath.position.y = -0.1;
    basePath.receiveShadows = true;
    basePath.checkCollisions = false;
    basePath.parent = tileContainer;
    const baseMat = this.assetManager?.getMaterial('castle_wall_slates') || this.tileMaterials[0];
    if (baseMat) basePath.material = baseMat;

    // Choose tile type for variety
    const tileType = this.tileTypes[Math.floor(Math.random() * this.tileTypes.length)];
    const modelName = this.tileModelMap[tileType];

    // Try to get the temple pathway model, fallback to procedural if not available
    const pathwayModel = this.assetManager?.getModel(modelName);

    if (pathwayModel) {
      // Use the GLB temple pathway model with LOD
      let path = this.assetManager.createLODInstance(
        modelName,
        `${name}_path`,
        new BABYLON.Vector3(0, 0, 0)
      ) || pathwayModel.createInstance(`${name}_path`);

      path.scaling = new BABYLON.Vector3(1, 1, 1);
      path.position.y = 0;
      path.parent = tileContainer;

      // Apply receiveShadows/material to source meshes to avoid instance warnings
      const stoneMaterial = this.assetManager?.getMaterial('castle_wall_slates');
      const applyToMeshOrSource = (mesh) => {
        const target = mesh && mesh.sourceMesh ? mesh.sourceMesh : mesh;
        if (!target) return;
        if (stoneMaterial && target.material !== undefined) target.material = stoneMaterial;
        if (target.receiveShadows !== undefined) target.receiveShadows = true;
      };

      if (typeof path.getChildMeshes === 'function') {
        const children = path.getChildMeshes(false);
        // If instancing produced no visible meshes, fallback to procedural tile
        if (!children || children.length === 0) {
          if (path.dispose) path.dispose();
          path = null;
        } else {
          for (const m of children) applyToMeshOrSource(m);
        }
      } else {
        applyToMeshOrSource(path);
      }

      // Fallback when GLB path didn't yield meshes
      // If GLB produced nothing, the procedural base remains as the path
      if (!path) {
        console.warn(`Path GLB produced no meshes for ${modelName}, using base path`);
      }
    } else {
      // No GLB available; procedural base already created above
      console.warn(`No pathway model for ${modelName}, using base path`);
    }

    // Add temple architecture elements (pillars, walls)
    this.addTempleArchitecture(tileContainer, name);

    // Store tile data
    tileContainer.tileData = {
      active: false,
      obstacles: [],
      coins: [],
      decorations: [],
      tileType: tileType
    };

    return tileContainer;
  }

  /**
   * Spawn initial tiles
   */
  spawnInitialTiles() {
    // Force first few tiles to be straight segments for clarity
    const firstType = this.currentTileType;
    for (let i = 0; i < this.tilesAhead; i++) {
      // Bias to pathwaySegment for first 2 tiles
      if (i < 2) {
        this.currentTileType = 'pathwaySegment';
      }
      this.spawnTile(i * this.tileLength);
    }
    this.currentTileType = firstType;
  }

  /**
   * Spawn a new tile at the given position
   */
  spawnTile(zPosition) {
    const tile = this.getFromPool();
    
    if (tile) {
      tile.position.z = zPosition;
      tile.setEnabled(true);
      tile.tileData.active = true;
      
      // Add obstacles and coins based on difficulty
      if (zPosition > 40) { // Don't spawn obstacles in the first few tiles
        this.populateTile(tile, zPosition);
      }
      
      this.tiles.push(tile);
      this.lastTileZ = zPosition;
    }
  }

  /**
   * Populate a tile with obstacles and coins
   */
  populateTile(tile, zPosition) {
    // Spawn obstacles
    if (Math.random() < this.obstacleSpawnChance * this.difficulty) {
      const numObstacles = Math.floor(Math.random() * this.maxObstaclesPerTile) + 1;
      
      for (let i = 0; i < numObstacles; i++) {
        const obstacleZ = zPosition + (Math.random() * (this.tileLength - 4)) + 2;
        this.obstacleManager.spawnObstacle(obstacleZ);
      }
    }
    
    // Spawn coins
    if (Math.random() < this.coinSpawnChance) {
      const coinZ = zPosition + (Math.random() * (this.tileLength - 10)) + 5;
      this.coinManager.spawnCoinGroup(coinZ);
    }
    
    // Add random decorations
    this.addDecorations(tile, zPosition);
  }

  /**
   * Add temple architecture elements to a tile
   */
  addTempleArchitecture(tileContainer, name) {
    // Disabled pillars/walls to keep the road clear
    return;
  }

  /**
   * Add temple decorative elements to a tile
   */
  addDecorations(tile, zPosition) {
    // Random chance to add temple decorations
    if (Math.random() < 0.4) {
      const decorationModels = ['tree', 'mossStone', 'carvedSymbol'];
      const randomDecoration = decorationModels[Math.floor(Math.random() * decorationModels.length)];
      const decorationModel = this.assetManager?.getModel(randomDecoration);

      if (decorationModel) {
        // Add temple decoration on one side with LOD
        const decorationX = Math.random() > 0.5 ? -3.5 : 3.5;
        const decorationZ = zPosition + (Math.random() * 10 - 5);
        const decorationPos = new BABYLON.Vector3(decorationX, 0, decorationZ);

        const decoration = this.assetManager.createLODInstance(
          randomDecoration,
          `decoration_${zPosition}_${randomDecoration}`,
          decorationPos
        ) || decorationModel.createInstance(`decoration_${zPosition}_${randomDecoration}`);

        decoration.position.x = decorationX;
        decoration.position.y = 0;
        decoration.position.z = decorationZ;
        decoration.scaling = new BABYLON.Vector3(0.6, 0.6, 0.6);
        tile.tileData.decorations.push(decoration);
      }
    }
  }

  /**
   * Update world based on player position
   */
  update(deltaTime, playerPosition) {
    if (!playerPosition) return;

    const playerZ = playerPosition.z;

    // Update LOD system based on player position
    if (this.assetManager) {
      this.assetManager.updateLOD(playerPosition);
    }
    
    // Spawn new tiles ahead
    while (this.lastTileZ < playerZ + (this.tilesAhead * this.tileLength)) {
      this.spawnTile(this.lastTileZ + this.tileLength);
    }
    
    // Remove tiles behind player
    for (let i = this.tiles.length - 1; i >= 0; i--) {
      const tile = this.tiles[i];
      if (tile.position.z < playerZ - (this.tilesBehind * this.tileLength)) {
        this.returnToPool(tile);
        this.tiles.splice(i, 1);
      }
    }
    
    // Update difficulty over time
    this.updateDifficulty(deltaTime);
  }

  /**
   * Get an inactive tile from the pool
   */
  getFromPool() {
    for (const tile of this.tilePool) {
      if (!tile.tileData.active) {
        return tile;
      }
    }
    
    // Create new tile if pool is exhausted
    const newTile = this.createTile(`tile_dynamic_${this.tilePool.length}`);
    this.tilePool.push(newTile);
    return newTile;
  }

  /**
   * Return a tile to the pool
   */
  returnToPool(tile) {
    tile.setEnabled(false);
    tile.tileData.active = false;
    
    // Clean up decorations and remove from LOD tracking
    for (const decoration of tile.tileData.decorations) {
      if (this.assetManager) {
        this.assetManager.removeLODInstance(decoration);
      }
      decoration.dispose();
    }
    tile.tileData.decorations = [];
  }

  /**
   * Update difficulty over time
   */
  updateDifficulty(deltaTime) {
    // Gradually increase difficulty
    this.difficulty += deltaTime * 0.01;
    this.difficulty = Math.min(this.difficulty, 3.0);
    
    // Increase spawn chances with difficulty
    this.obstacleSpawnChance = Math.min(0.3 + (this.difficulty - 1) * 0.2, 0.7);
    this.maxObstaclesPerTile = Math.min(2 + Math.floor(this.difficulty - 1), 4);
  }

  /**
   * Reset the world manager
   */
  reset() {
    // Return all tiles to pool
    for (const tile of this.tiles) {
      this.returnToPool(tile);
    }
    
    this.tiles = [];
    this.lastTileZ = 0;
    this.difficulty = 1.0;
    this.obstacleSpawnChance = 0.3;
    this.coinSpawnChance = 0.5;
    this.maxObstaclesPerTile = 2;
    
    // Spawn initial tiles again
    this.spawnInitialTiles();
  }

  /**
   * Set difficulty parameters
   */
  setDifficulty(difficulty) {
    this.difficulty = Math.max(1, Math.min(5, difficulty));
  }
}
