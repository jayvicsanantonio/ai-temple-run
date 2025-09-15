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
    material.diffuseColor = color;
    material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
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

    // Add low stone rails along the path edges (Temple Run vibe)
    this.addPathRails(tileContainer, name);

    // Choose tile type for variety
    const tileType = this.tileTypes[Math.floor(Math.random() * this.tileTypes.length)];
    const modelName = this.tileModelMap[tileType];

    // Try to get the temple pathway model, fallback to procedural if not available
    const pathwayModel = this.assetManager?.getModel(modelName);

    if (pathwayModel) {
      // Use the GLB temple pathway model with LOD
      let path =
        this.assetManager.createLODInstance(
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
      tileType: tileType,
      isSwamp: false,
      basePath: basePath,
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

    // Add temple entrance gate at the beginning
    this.addTempleEntrance();
  }

  /**
   * Add temple entrance gate at the start of the game
   */
  addTempleEntrance() {
    const entranceModel = this.assetManager?.getModel('entranceGate');
    if (entranceModel) {
      const entrance =
        this.assetManager.createLODInstance(
          'entranceGate',
          'temple_entrance',
          new BABYLON.Vector3(0, 0, -10)
        ) || entranceModel.createInstance('temple_entrance');

      entrance.position.x = 0;
      entrance.position.y = 0;
      entrance.position.z = -10;
      entrance.scaling = new BABYLON.Vector3(1.2, 1.2, 1.2);

      // Apply stone material
      const stoneMaterial = this.assetManager?.getMaterial('castle_wall_slates');
      if (stoneMaterial) {
        const applyToMeshOrSource = (m) => {
          const target = m && m.sourceMesh ? m.sourceMesh : m;
          if (target && target.material !== undefined) target.material = stoneMaterial;
        };
        if (typeof entrance.getChildMeshes === 'function') {
          for (const m of entrance.getChildMeshes(false)) applyToMeshOrSource(m);
        } else {
          applyToMeshOrSource(entrance);
        }
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
    // Spawn obstacles
    if (Math.random() < this.obstacleSpawnChance * this.difficulty) {
      const numObstacles = Math.floor(Math.random() * this.maxObstaclesPerTile) + 1;

      for (let i = 0; i < numObstacles; i++) {
        const obstacleZ = zPosition + Math.random() * (this.tileLength - 4) + 2;
        this.obstacleManager.spawnObstacle(obstacleZ);
      }
    }

    // Spawn coins
    if (Math.random() < this.coinSpawnChance) {
      const coinZ = zPosition + Math.random() * (this.tileLength - 10) + 5;
      this.coinManager.spawnCoinGroup(coinZ);
    }

    // Add random decorations
    this.addDecorations(tile, zPosition);
  }

  /**
   * Add temple architecture elements to a tile
   */
  addTempleArchitecture(tileContainer, name) {
    // Create rich temple environment with walls, pillars, and architectural elements
    // Push side elements further away to keep the center lane clearly visible
    const sideDistance = 12; // Distance from center path to place architecture
    const decorationDistance = 12; // Distance for decorative elements

    // Add temple walls along the sides
    this.addTempleWalls(tileContainer, name, sideDistance);

    // Add stone pillars at strategic positions
    this.addStonePillars(tileContainer, name, sideDistance);

    // Add temple decorations in the background
    this.addBackgroundDecorations(tileContainer, name, decorationDistance);

    // Add atmospheric elements (vines, moss stones)
    this.addAtmosphericElements(tileContainer, name);
  }

  addTempleWalls(tileContainer, name, distance) {
    const wallModel = this.assetManager?.getModel('templeWall');
    if (!wallModel) return;

    // Left wall
    const leftWall = this.assetManager.createLODInstance('templeWall', `${name}_leftWall`, new BABYLON.Vector3(-distance, 0, 0));
    if (leftWall) {
      leftWall.parent = tileContainer;
      leftWall.scaling = new BABYLON.Vector3(1, 2, 1); // Make walls taller
      leftWall.rotation.y = Math.PI / 2; // Face inward
    }

    // Right wall
    const rightWall = this.assetManager.createLODInstance('templeWall', `${name}_rightWall`, new BABYLON.Vector3(distance, 0, 0));
    if (rightWall) {
      rightWall.parent = tileContainer;
      rightWall.scaling = new BABYLON.Vector3(1, 2, 1); // Make walls taller
      rightWall.rotation.y = -Math.PI / 2; // Face inward
    }
  }

  addStonePillars(tileContainer, name, distance) {
    const pillarModel = this.assetManager?.getModel('stonePillar');
    if (!pillarModel) return;

    // Add pillars at random positions along the sides
    if (Math.random() < 0.3) {
      const pillar = this.assetManager.createLODInstance('stonePillar', `${name}_pillar`,
        new BABYLON.Vector3((Math.random() < 0.5 ? -1 : 1) * distance, 0, Math.random() * this.tileLength - this.tileLength/2));
      if (pillar) {
        pillar.parent = tileContainer;
        pillar.scaling = new BABYLON.Vector3(1.5, 2.5, 1.5); // Impressive scale
      }
    }
  }

  addBackgroundDecorations(tileContainer, name, distance) {
    const decorationModels = ['templeComplex', 'entranceGate', 'fountain', 'crystalFormation', 'brokenObelisk'];

    // Add random background elements
    if (Math.random() < 0.4) {
      const modelName = decorationModels[Math.floor(Math.random() * decorationModels.length)];
      const decoration = this.assetManager.createLODInstance(modelName, `${name}_bg_${modelName}`,
        new BABYLON.Vector3((Math.random() < 0.5 ? -1 : 1) * distance, 0, Math.random() * this.tileLength - this.tileLength/2));
      if (decoration) {
        decoration.parent = tileContainer;
        decoration.scaling = new BABYLON.Vector3(1.2, 1.2, 1.2);
      }
    }
  }

  addAtmosphericElements(tileContainer, name) {
    // Add vines, moss, and organic elements
    const atmosphericModels = ['vines', 'mossStone', 'tree', 'vineArch'];

    for (let i = 0; i < 2; i++) {
      if (Math.random() < 0.5) {
        const modelName = atmosphericModels[Math.floor(Math.random() * atmosphericModels.length)];
        // Keep a clear corridor around the center path to avoid blocking the camera/player view
        const clearHalfWidth = this.tileWidth * 0.5 + 1.5; // lanes (±3) + margin
        const sideOffset = clearHalfWidth + 2 + Math.random() * 6; // place further out
        const x = Math.random() < 0.5 ? -sideOffset : sideOffset;
        const z = Math.random() * this.tileLength - this.tileLength / 2;
        const element = this.assetManager.createLODInstance(
          modelName,
          `${name}_atmo_${modelName}_${i}`,
          new BABYLON.Vector3(x, 0, z)
        );
        if (element) {
          element.parent = tileContainer;
          element.scaling = new BABYLON.Vector3(0.8, 0.8, 0.8);
        }
      }
    }
  }

  /**
   * Add temple decorative elements to a tile
   */
  addDecorations(tile, zPosition) {
    // Keep early gameplay visually clear
    if (zPosition < 100) return;
    // Random chance to add temple decorations
    if (Math.random() < 0.55) {
      const isSwamp = !!tile?.tileData?.isSwamp;
      const decorationModels = isSwamp
        ? [
            // Swamp-biased set (no fountains/crystals)
            'tree',
            'mossStone',
            'vines',
            'stonePillar',
            'templeWall',
            'bridgePlatform',
            'vineArch',
            'totemHead',
            'brokenObelisk',
            'serpentIdol',
          ]
        : [
            'tree',
            'mossStone',
            'carvedSymbol',
            'crystalFormation',
            'fountain',
            'vines',
            'stonePillar',
            'templeWall',
            'bridgePlatform',
            'vineArch',
            'totemHead',
            'brokenObelisk',
            'serpentIdol',
          ];
      // Avoid center-arch in the very first stretch so the opening view stays clear
      const models = (zPosition < this.tileLength * 2)
        ? decorationModels.filter((m) => m !== 'vineArch')
        : decorationModels;
      const randomDecoration = models[Math.floor(Math.random() * models.length)];
      const decorationModel = this.assetManager?.getModel(randomDecoration);

      if (decorationModel) {
        // Add temple decoration away from the center lane
        const clearHalfWidth = this.tileWidth * 0.5 + 1.2;
        let decorationX = (Math.random() < 0.5 ? -1 : 1) * (clearHalfWidth + 1 + Math.random() * 4);
        let decorationZ = zPosition + (Math.random() * this.tileLength - this.tileLength / 2);
        const decorationPos = new BABYLON.Vector3(decorationX, 0, decorationZ);

        const decoration =
          this.assetManager.createLODInstance(
            randomDecoration,
            `decoration_${zPosition}_${randomDecoration}`,
            decorationPos
          ) || decorationModel.createInstance(`decoration_${zPosition}_${randomDecoration}`);

        // If using an arch, place it near the tile ends so it frames the path without blocking the camera
        if (randomDecoration === 'vineArch') {
          decorationX = 0;
          decorationZ = zPosition + (Math.random() < 0.5 ? -this.tileLength * 0.45 : this.tileLength * 0.45);
        }
        decoration.position.x = decorationX;
        decoration.position.y = 0;
        decoration.position.z = decorationZ;

        // Scale based on decoration type
        let scale = 0.6;
        if (randomDecoration === 'fountain' || randomDecoration === 'crystalFormation') {
          scale = 0.8;
        } else if (randomDecoration === 'vines') {
          scale = 0.4;
        } else if (randomDecoration === 'stonePillar') {
          scale = 0.9;
        } else if (randomDecoration === 'templeWall') {
          scale = 0.8;
        } else if (randomDecoration === 'bridgePlatform') {
          scale = 0.7;
        } else if (randomDecoration === 'vineArch') {
          scale = 1.0;
        } else if (randomDecoration === 'totemHead') {
          scale = 0.9;
        } else if (randomDecoration === 'brokenObelisk') {
          scale = 1.0;
        } else if (randomDecoration === 'serpentIdol') {
          scale = 0.95;
        }
        decoration.scaling = new BABYLON.Vector3(scale, scale, scale);

        tile.tileData.decorations.push(decoration);
      }
    }

    // Side scenery clusters to make world feel alive (beyond path corridor)
    if (Math.random() < 0.4) {
      const cluster = this.createSceneryCluster(zPosition);
      if (cluster) tile.tileData.decorations.push(cluster);
    }
  }

  /** Create a small cluster of scenery well outside the path corridor */
  createSceneryCluster(zCenter) {
    const container = new BABYLON.TransformNode(`cluster_${zCenter.toFixed(1)}`, this.scene);
    const side = Math.random() < 0.5 ? -1 : 1;
    const baseX = side * (this.tileWidth * 0.5 + 8 + Math.random() * 6);
    const baseZ = zCenter + (Math.random() * this.tileLength - this.tileLength / 2);

    const candidates = ['tree', 'mossStone', 'brokenObelisk', 'serpentIdol', 'totemHead'];
    const num = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < num; i++) {
      const name = candidates[Math.floor(Math.random() * candidates.length)];
      const model = this.assetManager?.getModel(name);
      if (!model) continue;
      const p = new BABYLON.Vector3(
        baseX + (Math.random() - 0.5) * 3,
        0,
        baseZ + (Math.random() - 0.5) * 4
      );
      const inst =
        this.assetManager.createLODInstance(name, `${container.name}_${name}_${i}`, p) ||
        model.createInstance(`${container.name}_${name}_${i}`);
      inst.parent = container;
    }

    return container;
  }

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
