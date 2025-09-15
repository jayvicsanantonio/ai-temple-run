/**
 * World Manager Module
 * Handles procedural tile spawning, recycling, and world generation
 */

import * as BABYLON from 'babylonjs';
import { AssetManager } from './assetManager.js';
import { PathGenerator } from './pathGenerator.js';

export class WorldManager {
  constructor(scene, obstacleManager, coinManager, assetManager) {
    this.scene = scene;
    this.obstacleManager = obstacleManager;
    this.coinManager = coinManager;
    this.assetManager = assetManager;

    // Initialize the new path generator
    this.pathGenerator = new PathGenerator(scene, assetManager);

    // Tile management
    this.tiles = [];
    this.tilePool = [];
    this.tileLength = 20; // Length of each tile
    this.tileWidth = 6; // Width to cover all 3 lanes
    this.tilesAhead = 5; // Number of tiles to keep ahead of player
    this.tilesBehind = 2; // Number of tiles to keep behind player
    this.lastTileZ = 0;

    // Using new PathGenerator system for all tiles

    // Difficulty parameters
    this.difficulty = 1.0;
    this.obstacleSpawnChance = 0.3;
    this.coinSpawnChance = 0.5;
    this.maxObstaclesPerTile = 2;

    // Materials
    this.tileMaterials = [];
    this.decorationMeshes = [];

    // Swamp biome controls
    this.swampChance = 0.2; // chance a tile becomes a swamp/bridge segment
    this.maxSwampStreak = 2; // limit consecutive swamp tiles
    this._swampStreak = 0;
    this._lastIsSwampUnderPlayer = null;
    this._envDefaults = null; // cached default env values
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
    // Use AssetManager materials instead of creating new ones
    this.tileMaterials = [];

    // Stone path materials
    const stoneMat = this.assetManager?.getMaterial('castle_wall_slates') || this.createFallbackMaterial('stone', new BABYLON.Color3(0.4, 0.35, 0.3));
    this.tileMaterials.push(stoneMat);

    // Bark/wood materials for organic elements
    const barkMat = this.assetManager?.getMaterial('bark_brown') || this.createFallbackMaterial('bark', new BABYLON.Color3(0.3, 0.2, 0.1));
    this.tileMaterials.push(barkMat);

    // Metal materials for architectural elements
    const metalMat = this.assetManager?.getMaterial('metal_plate') || this.createFallbackMaterial('metal', new BABYLON.Color3(0.5, 0.5, 0.4));
    this.tileMaterials.push(metalMat);
  }

  createFallbackMaterial(name, color) {
    const material = new BABYLON.StandardMaterial(`${name}Mat`, this.scene);

    if (name === 'stone') {
      // Enhanced ancient temple stone with procedural detail
      const stoneTexture = new BABYLON.DynamicTexture('ancientStoneTexture', 512, this.scene);
      const ctx = stoneTexture.getContext();

      // Base ancient sandstone color
      ctx.fillStyle = '#8B7355';
      ctx.fillRect(0, 0, 512, 512);

      // Add weathering stains
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = `rgba(${100 + Math.random() * 50}, ${80 + Math.random() * 40}, ${60 + Math.random() * 30}, 0.3)`;
        const size = 20 + Math.random() * 40;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, size, size);
      }

      // Add stone block mortaring lines
      ctx.strokeStyle = 'rgba(70, 60, 45, 0.8)';
      ctx.lineWidth = 3;
      for (let x = 0; x < 512; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
      }
      for (let y = 0; y < 512; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }

      stoneTexture.update();
      material.diffuseTexture = stoneTexture;
      material.diffuseColor = new BABYLON.Color3(0.9, 0.85, 0.7);
      material.specularColor = new BABYLON.Color3(0.2, 0.15, 0.1);
      material.ambientColor = new BABYLON.Color3(0.4, 0.35, 0.25);
    } else {
      material.diffuseColor = color;
      material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    }

    return material;
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
   * Create a new tile using the PathGenerator system
   */
  createTile(name) {
    // Create parent container for the tile
    const tileContainer = new BABYLON.TransformNode(name, this.scene);

    // Use the new PathGenerator to create a textured path segment
    const segmentTypes = ['straight', 'platform', 'bridge', 'stairs'];
    const randomSegmentType = segmentTypes[Math.floor(Math.random() * segmentTypes.length)];

    const pathSegment = this.pathGenerator.createPathSegment(
      `${name}_path`,
      new BABYLON.Vector3(0, 0, 0),
      randomSegmentType
    );

    pathSegment.parent = tileContainer;

    // No decorations - keep paths clean with only obstacles and coins

    // Store tile data
    tileContainer.tileData = {
      active: false,
      obstacles: [],
      coins: [],
      decorations: [],
      tileType: randomSegmentType,
      isSwamp: false,
      pathSegment: pathSegment,
    };

    return tileContainer;
  }

  /**
   * Add low guard rails/parapets along the path edges so the lane feels defined
   */
  addPathRails(container, name) {
    const railDepth = this.tileLength * 0.95;
    const railWidth = 0.5;
    const railHeight = 0.8;
    const x = this.tileWidth * 0.5 - railWidth * 0.5; // near the path edges
    const mat = this.assetManager?.getMaterial('castle_wall_slates') || this.tileMaterials?.[0];

    const left = BABYLON.MeshBuilder.CreateBox(`${name}_railL`, { width: railWidth, height: railHeight, depth: railDepth }, this.scene);
    left.position.set(-x, railHeight * 0.5 - 0.1, 0);
    left.parent = container;
    left.checkCollisions = false;
    left.receiveShadows = true;
    if (mat) left.material = mat;

    const right = BABYLON.MeshBuilder.CreateBox(`${name}_railR`, { width: railWidth, height: railHeight, depth: railDepth }, this.scene);
    right.position.set(x, railHeight * 0.5 - 0.1, 0);
    right.parent = container;
    right.checkCollisions = false;
    right.receiveShadows = true;
    if (mat) right.material = mat;
  }

  /**
   * Spawn initial tiles
   */
  spawnInitialTiles() {
    // Use consistent PathGenerator system for all tiles including entrance
    for (let i = 0; i < this.tilesAhead; i++) {
      this.spawnTile(i * this.tileLength);
    }
  }

  /**
   * Add temple entrance area with atmospheric elements for starting position
   */
  addTempleEntrance() {
    // No entrance decorations - keep the area clean
  }

  /**
   * Create atmospheric entrance courtyard before the temple
   */
  createEntranceCourtyard() {
    // Add ornate temple columns flanking the entrance
    const columnModel = this.assetManager?.getModel('ornateColumn');
    if (columnModel) {
      const leftColumn = this.assetManager.createLODInstance('ornateColumn', 'entrance_column_left', new BABYLON.Vector3(-6, 0, -12));
      const rightColumn = this.assetManager.createLODInstance('ornateColumn', 'entrance_column_right', new BABYLON.Vector3(6, 0, -12));

      if (leftColumn) {
        leftColumn.scaling = new BABYLON.Vector3(1.2, 1.0, 1.2);
      }
      if (rightColumn) {
        rightColumn.scaling = new BABYLON.Vector3(1.2, 1.0, 1.2);
      }
    }

    // Add temple guardian statues for dramatic entrance
    const guardianModel = this.assetManager?.getModel('templeGuardian');
    if (guardianModel) {
      const guardian1 = this.assetManager.createLODInstance('templeGuardian', 'entrance_guardian_1', new BABYLON.Vector3(-4, 0, -8));
      const guardian2 = this.assetManager.createLODInstance('templeGuardian', 'entrance_guardian_2', new BABYLON.Vector3(4, 0, -8));

      if (guardian1) guardian1.scaling = new BABYLON.Vector3(0.6, 0.6, 0.6);
      if (guardian2) guardian2.scaling = new BABYLON.Vector3(0.6, 0.6, 0.6);
    }

    // Add mystical crystals for magical ambiance
    const mysticalCrystalModel = this.assetManager?.getModel('mysticalCrystal');
    if (mysticalCrystalModel) {
      const crystal1 = this.assetManager.createLODInstance('mysticalCrystal', 'entrance_mystical_1', new BABYLON.Vector3(-2, 0, -6));
      const crystal2 = this.assetManager.createLODInstance('mysticalCrystal', 'entrance_mystical_2', new BABYLON.Vector3(2, 0, -6));

      if (crystal1) crystal1.scaling = new BABYLON.Vector3(0.4, 0.4, 0.4);
      if (crystal2) crystal2.scaling = new BABYLON.Vector3(0.4, 0.4, 0.4);
    }

    // Add temple trees for natural framing
    const treeModel = this.assetManager?.getModel('tree');
    if (treeModel) {
      const tree1 = this.assetManager.createLODInstance('tree', 'entrance_tree_1', new BABYLON.Vector3(-10, 0, -5));
      const tree2 = this.assetManager.createLODInstance('tree', 'entrance_tree_2', new BABYLON.Vector3(10, 0, -5));

      if (tree1) tree1.scaling = new BABYLON.Vector3(1.2, 1.2, 1.2);
      if (tree2) tree2.scaling = new BABYLON.Vector3(1.2, 1.2, 1.2);
    }

    // Add totem heads as ancient guardians
    const totemModel = this.assetManager?.getModel('totemHead');
    if (totemModel) {
      const totem1 = this.assetManager.createLODInstance('totemHead', 'entrance_totem_1', new BABYLON.Vector3(-8, 0, -3));
      const totem2 = this.assetManager.createLODInstance('totemHead', 'entrance_totem_2', new BABYLON.Vector3(8, 0, -3));

      if (totem1) totem1.scaling = new BABYLON.Vector3(1.0, 1.0, 1.0);
      if (totem2) totem2.scaling = new BABYLON.Vector3(1.0, 1.0, 1.0);
    }

    // Add temple braziers for atmospheric lighting
    const brazierModel = this.assetManager?.getModel('templeBrazier');
    if (brazierModel) {
      const brazier1 = this.assetManager.createLODInstance('templeBrazier', 'entrance_brazier_1', new BABYLON.Vector3(-3, 0, -4));
      const brazier2 = this.assetManager.createLODInstance('templeBrazier', 'entrance_brazier_2', new BABYLON.Vector3(3, 0, -4));

      if (brazier1) brazier1.scaling = new BABYLON.Vector3(0.8, 0.8, 0.8);
      if (brazier2) brazier2.scaling = new BABYLON.Vector3(0.8, 0.8, 0.8);
    }

    // Add stepping stones leading to the temple
    const stoneModel = this.assetManager?.getModel('steppingStone');
    if (stoneModel) {
      for (let i = 0; i < 3; i++) {
        const stone = this.assetManager.createLODInstance('steppingStone', `entrance_stone_${i}`,
          new BABYLON.Vector3((i - 1) * 1.5, 0, -2 - i * 1.5));
        if (stone) stone.scaling = new BABYLON.Vector3(0.8, 0.8, 0.8);
      }
    }
  }

  /**
   * Spawn a new tile at the given position
   */
  spawnTile(zPosition) {
    const tile = this.getFromPool();

    if (tile) {
      // Swamp selection with constraints
      let isSwamp = false;
      if (zPosition > 40) {
        const candidate = Math.random() < this.swampChance;
        if (candidate) {
          if (this._swampStreak < this.maxSwampStreak) {
            isSwamp = true;
            this._swampStreak++;
          }
        } else {
          this._swampStreak = 0;
        }
      } else {
        this._swampStreak = 0;
      }

      tile.position.z = zPosition;
      tile.setEnabled(true);
      tile.tileData.active = true;
      tile.tileData.isSwamp = isSwamp;

      // Keep the first stretch visually clear: disable bulky side architecture
      if (zPosition < 100) {
        try {
          const kids = tile.getChildren ? tile.getChildren() : [];
          for (const n of kids) {
            const nm = (n.name || '').toLowerCase();
            if (
              nm.includes('_leftwall') ||
              nm.includes('_rightwall') ||
              nm.includes('_pillar') ||
              nm.includes('_bg_') ||
              nm.includes('_atmo_') ||
              nm.includes('vinearch')
            ) {
              if (n.setEnabled) n.setEnabled(false);
            }
          }
        } catch (_) {}
      }

      // Apply biome styling
      if (isSwamp) {
        this.applySwampStyling(tile);
      }

      // Add obstacles and coins based on difficulty
      if (zPosition > 40) {
        // Don't spawn obstacles in the first few tiles
        this.populateTile(tile, zPosition);
      }

      this.tiles.push(tile);
      this.lastTileZ = zPosition;
    }
  }

  /**
   * Apply swamp/bridge styling to a tile: hide stone base and place a bridge platform.
   */
  applySwampStyling(tile) {
    if (!tile || !tile.tileData) return;
    const { basePath } = tile.tileData;
    if (basePath) {
      // Either hide base or make it muddy and submerged
      const mud = this.assetManager?.getMaterial('brown_mud');
      if (mud) {
        basePath.material = mud;
      }
      basePath.position.y = -0.12; // sink slightly towards the water plane
      basePath.visibility = 0.3; // faintly visible under water
    }

    // Place a bridge walkway down the middle using the bridgePlatform GLB if available
    const bridgeModel = this.assetManager?.getModel('bridgePlatform');
    if (bridgeModel) {
      const bridge =
        this.assetManager.createLODInstance(
          'bridgePlatform',
          `${tile.name}_bridge`,
          new BABYLON.Vector3(0, 0, tile.position.z)
        ) || bridgeModel.createInstance(`${tile.name}_bridge`);
      
      // Parent to tile
      bridge.parent = tile;
      // Center and stretch along tile depth
      bridge.position.set(0, 0, 0);
      bridge.scaling = new BABYLON.Vector3(1.0, 1.0, 1.6);

      // Apply stone material if available
      const stoneMaterial = this.assetManager?.getMaterial('castle_wall_slates');
      if (stoneMaterial) {
        const applyToMeshOrSource = (m) => {
          const target = m && m.sourceMesh ? m.sourceMesh : m;
          if (target && target.material !== undefined) target.material = stoneMaterial;
        };
        if (typeof bridge.getChildMeshes === 'function') {
          for (const m of bridge.getChildMeshes(false)) applyToMeshOrSource(m);
        } else {
          applyToMeshOrSource(bridge);
        }
      }
      tile.tileData.decorations.push(bridge);
    }

    // Gate the bridge with a vine-wrapped arch at the front of the tile for a visual cue
    const archModel = this.assetManager?.getModel('vineArch');
    if (archModel) {
      const arch =
        this.assetManager.createLODInstance(
          'vineArch',
          `${tile.name}_swampArchFront`,
          new BABYLON.Vector3(0, 0, tile.position.z)
        ) || archModel.createInstance(`${tile.name}_swampArchFront`);
      arch.parent = tile;
      // Place near the front edge of the tile
      arch.position.set(0, 0, -this.tileLength * 0.45);
      arch.scaling = new BABYLON.Vector3(1.0, 1.0, 1.0);
      tile.tileData.decorations.push(arch);
    }
  }

  /**
   * Populate a tile with obstacles and coins
   */
  populateTile(tile, zPosition) {
    // Reduced obstacle density for smoother temple run experience
    // Start gentle and increase gradually with distance
    const distanceMultiplier = Math.min(1.0, zPosition / 500); // Gradually increase to full difficulty at 500m
    const adjustedObstacleChance = this.obstacleSpawnChance * 0.4 * distanceMultiplier; // Reduced by 60%

    // Spawn fewer obstacles, with spacing
    if (Math.random() < adjustedObstacleChance * this.difficulty) {
      // Reduced max obstacles per tile from potentially 3+ to max 1-2
      const numObstacles = Math.random() < 0.7 ? 1 : 2;

      for (let i = 0; i < numObstacles; i++) {
        const obstacleZ = zPosition + Math.random() * (this.tileLength - 8) + 4; // More spacing
        this.obstacleManager.spawnObstacle(obstacleZ);
      }
    }

    // Increased coin spawn chance for more rewarding gameplay
    if (Math.random() < this.coinSpawnChance * 1.3) {
      const coinZ = zPosition + Math.random() * (this.tileLength - 10) + 5;
      this.coinManager.spawnCoinGroup(coinZ);
    }

    // No decorations - keep paths clean with only obstacles and coins
  }

  /**
   * Add temple architecture elements to a tile
   */
  addTempleArchitecture(tileContainer, name) {
    // No decorations - keep paths clean for gameplay focus
  }

  // All decoration methods removed - paths are now clean with only obstacles and coins

  /**
   * Update world based on player position
   */
  update(deltaTime, playerPosition) {
    if (!playerPosition) return;

    const playerZ = playerPosition.z;

    // Biome-aware environment tweaks (fog and lighting) based on current tile
    const tile = this.getTileAtZ(playerZ);
    const isSwampHere = !!tile?.tileData?.isSwamp;
    if (this._lastIsSwampUnderPlayer !== isSwampHere) {
      this._lastIsSwampUnderPlayer = isSwampHere;
      this.applyBiomeEnvironment(isSwampHere);
    }

    // Update LOD system based on player position
    if (this.assetManager) {
      this.assetManager.updateLOD(playerPosition);
    }

    // Update obstacle manager to spawn obstacles
    if (this.obstacleManager) {
      this.obstacleManager.update(deltaTime, playerPosition);
    }

    // Update coin manager to spawn coins
    if (this.coinManager) {
      this.coinManager.update(deltaTime, playerPosition);
    }

    // Spawn new tiles ahead
    while (this.lastTileZ < playerZ + this.tilesAhead * this.tileLength) {
      this.spawnTile(this.lastTileZ + this.tileLength);
    }

    // Remove tiles behind player
    for (let i = this.tiles.length - 1; i >= 0; i--) {
      const tile = this.tiles[i];
      if (tile.position.z < playerZ - this.tilesBehind * this.tileLength) {
        this.returnToPool(tile);
        this.tiles.splice(i, 1);
      }
    }

    // Update difficulty over time
    this.updateDifficulty(deltaTime);
  }

  /**
   * Return the active tile at world-space Z
   */
  getTileAtZ(z) {
    for (const t of this.tiles) {
      const z0 = t.position.z - this.tileLength * 0.5;
      const z1 = t.position.z + this.tileLength * 0.5;
      if (z >= z0 && z < z1) return t;
    }
    return null;
  }

  /**
   * Convenience: is there swamp under this world-space Z?
   */
  isSwampAtZ(z) {
    const t = this.getTileAtZ(z);
    return !!t?.tileData?.isSwamp;
  }

  /**
   * Adjust fog and lighting when entering/exiting swamp biome
   */
  applyBiomeEnvironment(isSwamp) {
    // Cache defaults on first call
    if (!this._envDefaults) {
      const dir = this.scene.getLightByName('dirLight');
      const hemi = this.scene.getLightByName('hemiLight');
      this._envDefaults = {
        fogDensity: this.scene.fogDensity,
        fogColor: this.scene.fogColor.clone(),
        dirIntensity: dir ? dir.intensity : 0,
        dirDiffuse: dir ? dir.diffuse.clone() : null,
        hemiIntensity: hemi ? hemi.intensity : 0,
        hemiDiffuse: hemi ? hemi.diffuse.clone() : null,
      };
    }

    const dir = this.scene.getLightByName('dirLight');
    const hemi = this.scene.getLightByName('hemiLight');

    if (isSwamp) {
      // Denser, cooler fog in swamp
      this.scene.fogDensity = Math.min(0.028, this._envDefaults.fogDensity * 1.6 + 0.01);
      this.scene.fogColor = new BABYLON.Color3(0.48, 0.60, 0.52);
      if (dir) {
        dir.intensity = Math.max(0.45, this._envDefaults.dirIntensity * 0.8);
        dir.diffuse = new BABYLON.Color3(0.95, 0.88, 0.76);
      }
      if (hemi) {
        hemi.intensity = Math.max(0.55, this._envDefaults.hemiIntensity * 0.85);
        hemi.diffuse = new BABYLON.Color3(0.90, 0.98, 0.90);
      }
    } else {
      // Restore defaults when leaving swamp
      this.scene.fogDensity = this._envDefaults.fogDensity;
      this.scene.fogColor = this._envDefaults.fogColor.clone();
      if (dir) {
        dir.intensity = this._envDefaults.dirIntensity;
        if (this._envDefaults.dirDiffuse) dir.diffuse = this._envDefaults.dirDiffuse.clone();
      }
      if (hemi) {
        hemi.intensity = this._envDefaults.hemiIntensity;
        if (this._envDefaults.hemiDiffuse) hemi.diffuse = this._envDefaults.hemiDiffuse.clone();
      }
    }
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
