/**
 * Asset Manager Module
 * Handles loading and management of 3D assets, textures, and animations
 */

import * as BABYLON from 'babylonjs';
import 'babylonjs-loaders';

export class AssetManager {
  constructor(scene, performanceMonitor = null) {
    this.scene = scene;
    this.assets = {};
    this.textures = {};
    this.materials = {};
    this.loadingProgress = 0;
    this.isLoading = false;
    this.assetBasePath = '/assets/';
    this.performanceMonitor = performanceMonitor;
    // Access optional glow layer created by the main scene
    this.glowLayer = scene?.glowLayer || null;
    this.modelPaths = {
      pathways: 'models/pathways/',
      architecture: 'models/architecture/',
      obstacles: 'models/obstacles/',
      decorations: 'models/decorations/',
    };
    this.texturePaths = {
      stone: 'textures/stone/',
      metal: 'textures/metal/',
      organic: 'textures/organic/',
    };

    // LOD system defaults
    this.lodEnabled = false;
    this.lodInstances = new Map();
    this.lodDistances = { high: 20, medium: 40, low: 60 };

    // Visual tuning targets (approximate world-space sizes)
    // Values are largest dimension (or height for *_H keys)
    this.sizingTargets = {
      coin: 0.8,
      logObstacle: 3.0,
      rockObstacle: 1.4,
      spikeObstacle: 1.8,
      stonePillar_H: 4.0,
      templeWall_H: 1.5,
      bridgePlatform: 6.0,
      tree_H: 6.0,
      mossStone: 1.4,
      carvedSymbol: 1.6,
      vineArch_H: 5.0,
      totemHead: 2.2,
      brokenObelisk_H: 4.0,
      serpentIdol_H: 3.0,
      fountain_H: 3.0,
      crystalFormation_H: 3.0,
      templeComplex: 10.0,
      player_H: 1.6,
    };
  }

  /**
   * Initialize and load all game assets
   */
  async init() {
    this.isLoading = true;

    try {
      // Load textures first
      await this.loadTextures();

      // Load GLB models
      await this.loadGLBModels();

      // Create procedural assets as fallbacks
      await this.createProceduralAssets();

      // Setup materials with loaded textures
      this.createMaterials();

      // Optimize assets after loading
      this.optimizeAssets();

      console.log('All assets loaded and optimized successfully');
    } catch (error) {
      console.error('Error loading assets:', error);
    } finally {
      this.isLoading = false;
      this.loadingProgress = 100;
    }
  }

  /**
   * Load all GLB models from generated assets
   */
  async loadGLBModels() {
    const modelAssets = [
      // Pathway models
      { path: 'pathways/ancient_stone_pathway_segment.glb', name: 'pathwaySegment' },
      { path: 'pathways/curved_temple_path.glb', name: 'curvedPath' },
      { path: 'pathways/temple_intersection.glb', name: 'pathIntersection' },

      // Architecture models
      { path: 'architecture/ornate_stone_pillar.glb', name: 'stonePillar' },
      { path: 'architecture/temple_wall_segment.glb', name: 'templeWall' },
      { path: 'architecture/stone_bridge_platform.glb', name: 'bridgePlatform' },

      // Obstacle models
      { path: 'obstacles/fallen_temple_log.glb', name: 'logObstacle' },
      { path: 'obstacles/weathered_stone_block.glb', name: 'rockObstacle' },
      { path: 'obstacles/ancient_spike_trap.glb', name: 'spikeObstacle' },

      // Decoration models
      { path: 'decorations/temple_tree_with_vines.glb', name: 'tree' },
      { path: 'decorations/moss_covered_stone.glb', name: 'mossStone' },
      { path: 'decorations/ancient_carved_symbol.glb', name: 'carvedSymbol' },
      { path: 'decorations/vine_wrapped_arch.glb', name: 'vineArch' },
      { path: 'decorations/totem_head.glb', name: 'totemHead' },
      { path: 'decorations/broken_obelisk.glb', name: 'brokenObelisk' },
      { path: 'decorations/serpent_idol.glb', name: 'serpentIdol' },

      // Additional temple assets
      { path: 'temple_coin_collectible.glb', name: 'coin' },
      { path: 'temple_complex_main.glb', name: 'templeComplex' },
      { path: 'temple_crystal_formation.glb', name: 'crystalFormation' },
      { path: 'temple_entrance_gate.glb', name: 'entranceGate' },
      { path: 'temple_fountain.glb', name: 'fountain' },
      { path: 'temple_vines.glb', name: 'vines' },

      // New enhanced temple assets
      { path: 'temple_new/ancient_temple_tile.glb', name: 'ancientTempleTile' },
      { path: 'temple_new/temple_guardian_statue.glb', name: 'templeGuardian' },
      { path: 'temple_new/ornate_temple_column.glb', name: 'ornateColumn' },
      { path: 'temple_new/mystical_temple_crystal.glb', name: 'mysticalCrystal' },
      { path: 'temple_new/ancient_temple_brazier.glb', name: 'templeBrazier' },
      { path: 'temple_new/temple_stepping_stone.glb', name: 'steppingStone' },

      // Characters
      { path: 'characters/pikachu.glb', name: 'player' },
    ];

    const loadPromises = modelAssets.map(async (asset) => {
      const url = this.assetBasePath + 'models/' + asset.path;
      const startTime = performance.now();

      try {
        await this.loadGLBModel(url, asset.name);

        // Log loading performance
        if (this.performanceMonitor) {
          this.performanceMonitor.logAssetLoad(asset.name, startTime, performance.now());
        }

        console.log(`Loaded GLB model: ${asset.name}`);
      } catch (error) {
        console.warn(`Failed to load GLB model ${asset.name}, will use procedural fallback`);
      }
    });

    await Promise.allSettled(loadPromises);
  }

  /**
   * Load all texture sets from PolyHaven assets
   */
  async loadTextures() {
    const textureCategories = {
      stone: ['castle_wall_slates', 'broken_wall', 'dry_riverbed_rock', 'cliff_side', 'brick_wall'],
      metal: ['metal_plate', 'green_metal_rust', 'blue_metal_plate'],
      organic: ['bark_brown', 'brown_mud', 'fine_grained_wood'],
    };

    // Some folders contain files with a different base prefix than the folder name
    const filePrefixAliases = {
      stone: {
        brick_wall: 'brick_wall_001',
      },
      organic: {
        bark_brown: 'bark_brown_02',
        brown_mud: 'brown_mud_03',
      },
    };

    // Some materials may not include all texture types; override per material when needed
    const defaultTypes = ['Diffuse', 'nor_dx', 'Rough', 'AO', 'Displacement'];
    const typeOverrides = {
      organic: {
        fine_grained_wood: ['Diffuse', 'nor_dx', 'Rough', 'AO'], // no Displacement in assets
      },
    };

    const loadPromises = [];

    for (const [category, materials] of Object.entries(textureCategories)) {
      for (const material of materials) {
        const folderPath = this.assetBasePath + this.texturePaths[category] + material + '/';
        const prefixMap = filePrefixAliases[category] || {};
        const filePrefix = prefixMap[material] || material;

        const overrides = (typeOverrides[category] || {})[material];
        const textureTypes = overrides || defaultTypes;

        for (const type of textureTypes) {
          // Use the logical material name for keys, but the actual on-disk prefix for URLs
          const textureName = `${material}_${type}`;
          const textureUrl = folderPath + `${filePrefix}_${type}.jpg`;
          loadPromises.push(this.loadTexture(textureUrl, textureName, category));
        }
      }
    }

    await Promise.allSettled(loadPromises);
  }

  /**
   * Load a single texture
   */
  async loadTexture(url, name, category) {
    return new Promise((resolve, reject) => {
      const texture = new BABYLON.Texture(
        url,
        this.scene,
        true, // noMipmaps
        false, // invertY
        BABYLON.Texture.TRILINEAR_SAMPLINGMODE,
        () => {
          // Success callback
          if (!this.textures[category]) {
            this.textures[category] = {};
          }
          this.textures[category][name] = texture;
          resolve(texture);
        },
        (message) => {
          // Error callback
          console.warn(`Failed to load texture: ${name}`);
          reject(new Error(message));
        }
      );
    });
  }

  /**
   * Create procedural assets (fallbacks for when GLB models fail to load)
   */
  async createProceduralAssets() {
    // Create player character only if a GLB wasn't loaded
    if (!this.assets.player) {
      this.createPlayerCharacter();
    }

    // Create obstacle variations only if any are missing
    if (!this.assets.logObstacle || !this.assets.rockObstacle || !this.assets.spikeObstacle) {
      this.createObstacles();
    }

    // Create coin model only if GLB wasn't loaded
    if (!this.assets.coin) {
      this.createCoin();
    }

    // Create environment decorations (purely procedural fallbacks)
    // Only if not present from GLB imports
    if (!this.assets.pillar || !this.assets.tree) {
      this.createDecorations();
    }
  }

  /**
   * Create a stylized player character
   */
  createPlayerCharacter() {
    const playerGroup = new BABYLON.TransformNode('playerModel', this.scene);

    // Body
    const body = BABYLON.MeshBuilder.CreateBox(
      'playerBody',
      { width: 0.6, height: 1, depth: 0.4 },
      this.scene
    );
    body.position.y = 0.5;
    body.parent = playerGroup;

    // Head
    const head = BABYLON.MeshBuilder.CreateSphere('playerHead', { diameter: 0.4 }, this.scene);
    head.position.y = 1.2;
    head.parent = playerGroup;

    // Arms
    const leftArm = BABYLON.MeshBuilder.CreateCylinder(
      'leftArm',
      { height: 0.6, diameter: 0.15 },
      this.scene
    );
    leftArm.position.x = -0.4;
    leftArm.position.y = 0.6;
    leftArm.rotation.z = Math.PI / 8;
    leftArm.parent = playerGroup;

    const rightArm = BABYLON.MeshBuilder.CreateCylinder(
      'rightArm',
      { height: 0.6, diameter: 0.15 },
      this.scene
    );
    rightArm.position.x = 0.4;
    rightArm.position.y = 0.6;
    rightArm.rotation.z = -Math.PI / 8;
    rightArm.parent = playerGroup;

    // Legs
    const leftLeg = BABYLON.MeshBuilder.CreateCylinder(
      'leftLeg',
      { height: 0.7, diameter: 0.2 },
      this.scene
    );
    leftLeg.position.x = -0.15;
    leftLeg.position.y = -0.05;
    leftLeg.parent = playerGroup;

    const rightLeg = BABYLON.MeshBuilder.CreateCylinder(
      'rightLeg',
      { height: 0.7, diameter: 0.2 },
      this.scene
    );
    rightLeg.position.x = 0.15;
    rightLeg.position.y = -0.05;
    rightLeg.parent = playerGroup;

    // Apply material
    const playerMat = new BABYLON.StandardMaterial('playerMat', this.scene);
    playerMat.diffuseColor = new BABYLON.Color3(0.2, 0.5, 0.9);
    playerMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

    body.material = playerMat;
    head.material = playerMat;
    leftArm.material = playerMat;
    rightArm.material = playerMat;
    leftLeg.material = playerMat;
    rightLeg.material = playerMat;

    playerGroup.setEnabled(false);
    this.assets.player = playerGroup;
  }

  /**
   * Create obstacle models
   */
  createObstacles() {
    // Log obstacle
    const logGroup = new BABYLON.TransformNode('logObstacle', this.scene);
    const log = BABYLON.MeshBuilder.CreateCylinder('log', { height: 3, diameter: 0.8 }, this.scene);
    log.rotation.z = Math.PI / 2;
    log.position.y = 0.4;
    log.parent = logGroup;

    const logMat = new BABYLON.StandardMaterial('logMat', this.scene);
    logMat.diffuseColor = new BABYLON.Color3(0.4, 0.25, 0.1);
    log.material = logMat;

    logGroup.setEnabled(false);
    this.assets.logObstacle = logGroup;

    // Rock obstacle
    const rockGroup = new BABYLON.TransformNode('rockObstacle', this.scene);
    const rock = BABYLON.MeshBuilder.CreateSphere(
      'rock',
      { diameter: 1.2, segments: 6 },
      this.scene
    );
    rock.position.y = 0.6;
    rock.scaling = new BABYLON.Vector3(1, 1.2, 1);
    rock.parent = rockGroup;

    const rockMat = new BABYLON.StandardMaterial('rockMat', this.scene);
    rockMat.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.4);
    rock.material = rockMat;

    rockGroup.setEnabled(false);
    this.assets.rockObstacle = rockGroup;

    // Spike obstacle
    const spikeGroup = new BABYLON.TransformNode('spikeObstacle', this.scene);
    for (let i = 0; i < 3; i++) {
      const spike = BABYLON.MeshBuilder.CreateCylinder(
        `spike_${i}`,
        { height: 1.5, diameterTop: 0, diameterBottom: 0.3 },
        this.scene
      );
      spike.position.x = (i - 1) * 0.5;
      spike.position.y = 0.75;
      spike.parent = spikeGroup;

      const spikeMat = new BABYLON.StandardMaterial(`spikeMat_${i}`, this.scene);
      spikeMat.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.6);
      spike.material = spikeMat;
    }

    spikeGroup.setEnabled(false);
    this.assets.spikeObstacle = spikeGroup;
  }

  /**
   * Create coin model
   */
  createCoin() {
    const coinGroup = new BABYLON.TransformNode('coinModel', this.scene);

    // Main coin body
    const coin = BABYLON.MeshBuilder.CreateCylinder(
      'coin',
      { height: 0.1, diameter: 0.8, tessellation: 16 },
      this.scene
    );
    coin.rotation.x = Math.PI / 2;
    coin.parent = coinGroup;

    // Inner ring for detail
    const innerRing = BABYLON.MeshBuilder.CreateTorus(
      'coinRing',
      { diameter: 0.6, thickness: 0.1, tessellation: 16 },
      this.scene
    );
    innerRing.parent = coinGroup;

    // Gold material
    const goldMat = new BABYLON.StandardMaterial('goldMat', this.scene);
    goldMat.diffuseColor = new BABYLON.Color3(1, 0.84, 0);
    goldMat.specularColor = new BABYLON.Color3(1, 1, 1);
    goldMat.emissiveColor = new BABYLON.Color3(0.3, 0.25, 0);
    goldMat.specularPower = 128;

    coin.material = goldMat;
    innerRing.material = goldMat;

    coinGroup.setEnabled(false);
    this.assets.coin = coinGroup;
  }

  /**
   * Create environment decorations
   */
  createDecorations() {
    // Temple pillar
    const pillarGroup = new BABYLON.TransformNode('pillarDecoration', this.scene);

    const base = BABYLON.MeshBuilder.CreateBox(
      'pillarBase',
      { width: 1, height: 0.3, depth: 1 },
      this.scene
    );
    base.parent = pillarGroup;

    const column = BABYLON.MeshBuilder.CreateCylinder(
      'pillarColumn',
      { height: 4, diameter: 0.6 },
      this.scene
    );
    column.position.y = 2.15;
    column.parent = pillarGroup;

    const top = BABYLON.MeshBuilder.CreateBox(
      'pillarTop',
      { width: 1.2, height: 0.4, depth: 1.2 },
      this.scene
    );
    top.position.y = 4.3;
    top.parent = pillarGroup;

    const stoneMat = new BABYLON.StandardMaterial('stoneMat', this.scene);
    stoneMat.diffuseColor = new BABYLON.Color3(0.5, 0.45, 0.4);
    base.material = stoneMat;
    column.material = stoneMat;
    top.material = stoneMat;

    pillarGroup.setEnabled(false);
    this.assets.pillar = pillarGroup;

    // Tree
    const treeGroup = new BABYLON.TransformNode('treeDecoration', this.scene);

    const trunk = BABYLON.MeshBuilder.CreateCylinder(
      'trunk',
      { height: 2, diameterBottom: 0.4, diameterTop: 0.3 },
      this.scene
    );
    trunk.position.y = 1;
    trunk.parent = treeGroup;

    const leaves = BABYLON.MeshBuilder.CreateSphere(
      'leaves',
      { diameter: 2, segments: 8 },
      this.scene
    );
    leaves.position.y = 2.5;
    leaves.scaling = new BABYLON.Vector3(1, 1.2, 1);
    leaves.parent = treeGroup;

    const trunkMat = new BABYLON.StandardMaterial('trunkMat', this.scene);
    trunkMat.diffuseColor = new BABYLON.Color3(0.3, 0.2, 0.1);
    trunk.material = trunkMat;

    const leavesMat = new BABYLON.StandardMaterial('leavesMat', this.scene);
    leavesMat.diffuseColor = new BABYLON.Color3(0.2, 0.5, 0.1);
    leaves.material = leavesMat;

    treeGroup.setEnabled(false);
    this.assets.tree = treeGroup;
  }

  /**
   * Create materials using loaded PolyHaven textures
   */
  createMaterials() {
    // Stone materials
    this.createStoneMaterials();

    // Metal materials
    this.createMetalMaterials();

    // Organic materials
    this.createOrganicMaterials();

    // Fallback procedural materials
    this.createFallbackMaterials();
  }

  /**
   * Create PBR materials for stone textures
   */
  createStoneMaterials() {
    const stoneTextures = [
      'castle_wall_slates',
      'broken_wall',
      'dry_riverbed_rock',
      'cliff_side',
      'brick_wall',
    ];

    stoneTextures.forEach((materialName) => {
      const pbrMat = new BABYLON.PBRMaterial(`${materialName}_material`, this.scene);

      // Apply textures if available
      if (this.textures.stone) {
        const diffuseTex = this.textures.stone[`${materialName}_Diffuse`];
        const normalTex = this.textures.stone[`${materialName}_nor_dx`];
        const roughnessTex = this.textures.stone[`${materialName}_Rough`];
        const aoTex = this.textures.stone[`${materialName}_AO`];

        if (diffuseTex) pbrMat.albedoTexture = diffuseTex;
        if (normalTex) pbrMat.bumpTexture = normalTex;
        if (roughnessTex) {
          // Use roughness from the green channel of the texture (grayscale map works fine)
          pbrMat.metallicTexture = roughnessTex;
          pbrMat.useRoughnessFromMetallicTextureGreen = true;
          pbrMat.useMetallnessFromMetallicTextureBlue = false;
        }
        if (aoTex) pbrMat.ambientTexture = aoTex;

        // PBR properties for stone
        pbrMat.albedoColor = new BABYLON.Color3(1, 1, 1);
        pbrMat.roughness = 0.9;
        pbrMat.metallic = 0.0;
      } else {
        // Fallback colors
        pbrMat.albedoColor = new BABYLON.Color3(0.45, 0.4, 0.35);
        pbrMat.roughness = 0.8;
        pbrMat.metallic = 0.0;
      }

      this.materials[materialName] = pbrMat;
    });
  }

  /**
   * Create PBR materials for metal textures
   */
  createMetalMaterials() {
    const metalTextures = ['metal_plate', 'green_metal_rust', 'blue_metal_plate'];

    metalTextures.forEach((materialName) => {
      const pbrMat = new BABYLON.PBRMaterial(`${materialName}_material`, this.scene);

      // Apply textures if available
      if (this.textures.metal) {
        const diffuseTex = this.textures.metal[`${materialName}_Diffuse`];
        const normalTex = this.textures.metal[`${materialName}_nor_dx`];
        const roughnessTex = this.textures.metal[`${materialName}_Rough`];
        const aoTex = this.textures.metal[`${materialName}_AO`];

        if (diffuseTex) pbrMat.albedoTexture = diffuseTex;
        if (normalTex) pbrMat.bumpTexture = normalTex;
        if (roughnessTex) {
          // Use roughness from green channel; do not read metallic from texture
          pbrMat.metallicTexture = roughnessTex;
          pbrMat.useRoughnessFromMetallicTextureGreen = true;
          pbrMat.useMetallnessFromMetallicTextureBlue = false;
        }
        if (aoTex) pbrMat.ambientTexture = aoTex;

        // PBR properties for metal
        pbrMat.albedoColor = new BABYLON.Color3(1, 1, 1);
        pbrMat.roughness = materialName.includes('rust') ? 0.7 : 0.3;
        pbrMat.metallic = materialName.includes('rust') ? 0.6 : 1.0;
      } else {
        // Fallback colors
        pbrMat.albedoColor = new BABYLON.Color3(0.6, 0.6, 0.6);
        pbrMat.roughness = 0.4;
        pbrMat.metallic = 0.8;
      }

      this.materials[materialName] = pbrMat;
    });
  }

  /**
   * Create PBR materials for organic textures
   */
  createOrganicMaterials() {
    const organicTextures = ['bark_brown', 'brown_mud', 'fine_grained_wood'];

    organicTextures.forEach((materialName) => {
      const pbrMat = new BABYLON.PBRMaterial(`${materialName}_material`, this.scene);

      // Apply textures if available
      if (this.textures.organic) {
        const diffuseTex = this.textures.organic[`${materialName}_Diffuse`];
        const normalTex = this.textures.organic[`${materialName}_nor_dx`];
        const roughnessTex = this.textures.organic[`${materialName}_Rough`];
        const aoTex = this.textures.organic[`${materialName}_AO`];

        if (diffuseTex) pbrMat.albedoTexture = diffuseTex;
        if (normalTex) pbrMat.bumpTexture = normalTex;
        if (roughnessTex) {
          pbrMat.metallicTexture = roughnessTex;
          pbrMat.useRoughnessFromMetallicTextureGreen = true;
          pbrMat.useMetallnessFromMetallicTextureBlue = false;
        }
        if (aoTex) pbrMat.ambientTexture = aoTex;

        // PBR properties for organic materials
        pbrMat.albedoColor = new BABYLON.Color3(1, 1, 1);
        pbrMat.roughness = 0.8;
        pbrMat.metallic = 0.0;
      } else {
        // Fallback colors
        if (materialName.includes('wood')) {
          pbrMat.albedoColor = new BABYLON.Color3(0.4, 0.25, 0.1);
        } else if (materialName.includes('mud')) {
          pbrMat.albedoColor = new BABYLON.Color3(0.3, 0.2, 0.15);
        } else {
          pbrMat.albedoColor = new BABYLON.Color3(0.35, 0.25, 0.15);
        }
        pbrMat.roughness = 0.9;
        pbrMat.metallic = 0.0;
      }

      this.materials[materialName] = pbrMat;
    });
  }

  /**
   * Force compile all materials to make them ready for rendering
   */
  async compileMaterials() {
    console.log('Compiling materials for rendering...');

    const materials = this.scene.materials;
    let readyCount = 0;

    // Simple approach: just wait for scene to be ready and force a render
    return new Promise((resolve) => {
      const checkSceneReady = () => {
        // Force a render cycle to compile shaders
        if (this.scene.getEngine()) {
          this.scene.getEngine().runRenderLoop(() => {
            this.scene.render();
          });

          // Stop after one render cycle
          setTimeout(() => {
            this.scene.getEngine().stopRenderLoop();
            readyCount = materials.filter(m => m.isReady()).length;
            console.log(`Materials compilation complete: ${readyCount}/${materials.length} ready`);
            resolve();
          }, 100);
        } else {
          setTimeout(checkSceneReady, 50);
        }
      };

      checkSceneReady();
    });
  }

  /**
   * Create fallback procedural materials
   */
  createFallbackMaterials() {
    // Path material with texture effect
    const pathMat = new BABYLON.StandardMaterial('pathMaterial', this.scene);
    pathMat.diffuseColor = new BABYLON.Color3(0.35, 0.3, 0.25);
    pathMat.specularColor = new BABYLON.Color3(0, 0, 0);
    pathMat.bumpTexture = this.createProceduralTexture('bump');
    this.materials.path = pathMat;

    // Grass material
    const grassMat = new BABYLON.StandardMaterial('grassMaterial', this.scene);
    grassMat.diffuseColor = new BABYLON.Color3(0.25, 0.45, 0.15);
    grassMat.specularColor = new BABYLON.Color3(0, 0, 0);
    this.materials.grass = grassMat;

    // Generic stone material
    const stoneMat = new BABYLON.StandardMaterial('stoneMaterial', this.scene);
    stoneMat.diffuseColor = new BABYLON.Color3(0.45, 0.4, 0.35);
    stoneMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    this.materials.stone = stoneMat;
  }

  /**
   * Create procedural texture
   */
  createProceduralTexture(type) {
    const texture = new BABYLON.DynamicTexture(
      `procTexture_${type}`,
      { width: 256, height: 256 },
      this.scene
    );

    const context = texture.getContext();

    if (type === 'bump') {
      // Create a simple noise pattern
      for (let x = 0; x < 256; x += 4) {
        for (let y = 0; y < 256; y += 4) {
          const value = Math.random() * 50 + 100;
          context.fillStyle = `rgb(${value}, ${value}, ${value})`;
          context.fillRect(x, y, 4, 4);
        }
      }
    }

    texture.update();
    return texture;
  }

  /**
   * Get a model by name (returns original for instancing)
   */
  getModel(modelName) {
    return this.assets[modelName] || null;
  }

  /**
   * Get a clone of an asset (prioritizes GLB models over procedural)
   */
  getAsset(assetName) {
    if (this.assets[assetName]) {
      const clone = this.assets[assetName].clone(assetName + '_instance');
      clone.setEnabled(true);
      return clone;
    }
    return null;
  }

  /**
   * Create an optimized instance with LOD tracking
   */
  createLODInstance(modelName, instanceName, position) {
    const model = this.getModel(modelName);
    if (!model) return null;

    // Helper to instance a single mesh that has geometry
    const instanceSingleMesh = (mesh, name) => {
      try {
        if (mesh && typeof mesh.getTotalVertices === 'function' && mesh.getTotalVertices() > 0) {
          return mesh.createInstance(name);
        }
      } catch (e) {
        // Fall through to hierarchy instancing/clone path
      }
      return null;
    };

    // Helper to instance all child meshes under a root into a container
    const instanceHierarchy = (root, name, containerPos = new BABYLON.Vector3(0, 0, 0)) => {
      const container = new BABYLON.TransformNode(name, this.scene);

      // Include root if it's a mesh with geometry
      if (root && typeof root.getTotalVertices === 'function' && root.getTotalVertices() > 0) {
        root.computeWorldMatrix(true);
        const inst = root.createInstance(`${name}_root`);
        // Compute local transform relative to container position (container has no rotation/scale)
        const wm = root.getWorldMatrix();
        const s = new BABYLON.Vector3();
        const r = new BABYLON.Quaternion();
        const t = new BABYLON.Vector3();
        wm.decompose(s, r, t);
        inst.parent = container;
        inst.position.copyFrom(t.subtract(containerPos));
        inst.rotationQuaternion = r;
        inst.scaling.copyFrom(s);
      }

      // Instance all descendant meshes and preserve world transforms
      const descendants =
        typeof root.getChildMeshes === 'function' ? root.getChildMeshes(false) : [];
      for (const child of descendants) {
        if (child && typeof child.getTotalVertices === 'function' && child.getTotalVertices() > 0) {
          child.computeWorldMatrix(true);
          const childInst = child.createInstance(`${name}_${child.name}`);
          const wm = child.getWorldMatrix();
          const s = new BABYLON.Vector3();
          const r = new BABYLON.Quaternion();
          const t = new BABYLON.Vector3();
          wm.decompose(s, r, t);
          childInst.parent = container;
          childInst.position.copyFrom(t.subtract(containerPos));
          childInst.rotationQuaternion = r;
          childInst.scaling.copyFrom(s);
        }
      }

      return container;
    };

    let instance = null;

    // Try to instance directly if it's a mesh with geometry
    instance = instanceSingleMesh(model, instanceName);

    // If not possible (e.g., TransformNode or mesh without geometry), instance hierarchy
    if (!instance) {
      instance = instanceHierarchy(model, instanceName, position || new BABYLON.Vector3(0, 0, 0));
    }

    if (position && instance && instance.position) {
      instance.position.copyFrom(position);
    }

    // Ensure proper visibility for instances (no auto-scaling here)
    if (instance) {
      instance.setEnabled(true);
      if (typeof instance.getChildMeshes === 'function') {
        const childMeshes = instance.getChildMeshes(true);
        for (const mesh of childMeshes) {
          if (!mesh) continue;
          mesh.setEnabled(true);
          mesh.isVisible = true;
        }
      }

      // Apply per-asset visual tuning and clamp extreme sizes
      try {
        this.applyAssetTuning(modelName, instance);
        this._clampInstanceScale(instance, 18);
      } catch (_) {}
    }

    // Register for LOD management (track the returned top-level node)
    if (instance && this.lodEnabled) {
      if (!this.lodInstances) this.lodInstances = new Map();
      if (!this.lodDistances) this.lodDistances = { high: 20, medium: 40, low: 60 };
      this.lodInstances.set(instance, {
        originalModel: model,
        lodLevel: 'high',
        isVisible: true,
        position:
          position && position.clone
            ? position.clone()
            : instance.position?.clone?.() || new BABYLON.Vector3(0, 0, 0),
      });
    }

    return instance;
  }

  /**
   * Apply per-asset look-and-feel: scale normalization and special materials
   */
  applyAssetTuning(name, instance) {
    if (!name || !instance) return;

    const lower = String(name).toLowerCase();
    const meshes = typeof instance.getChildMeshes === 'function' ? instance.getChildMeshes(false) : [];

    // Helper: set emissive gold and add glow
    const setGoldGlow = (m) => {
      if (!m) return;
      if (!m.material) m.material = new BABYLON.StandardMaterial(`${name}_mat`, this.scene);
      if (m.material && m.material.diffuseColor) {
        m.material.diffuseColor = new BABYLON.Color3(1.0, 0.85, 0.2);
        m.material.emissiveColor = new BABYLON.Color3(0.8, 0.6, 0.15);
        m.material.specularColor = new BABYLON.Color3(1, 1, 1);
      }
      if (this.glowLayer && this.glowLayer.addIncludedOnlyMesh) {
        this.glowLayer.addIncludedOnlyMesh(m);
      }
    };

    // Scaling helpers
    const normalizeMax = (target) => this._normalizeToMaxDim(instance, target);
    const normalizeHeight = (target) => this._normalizeToHeight(instance, target);

    // Coins
    if (lower === 'coin') {
      normalizeMax(this.sizingTargets.coin);
      // Diamond look: tilt a bit
      instance.rotation = instance.rotation || new BABYLON.Vector3(0, 0, 0);
      instance.rotation.z = Math.PI * 0.25;
      for (const m of meshes) setGoldGlow(m);
      return;
    }

    // Player
    if (lower === 'player') {
      normalizeHeight(this.sizingTargets.player_H);
      return;
    }

    // Obstacles
    if (lower === 'logobstacle') return normalizeMax(this.sizingTargets.logObstacle);
    if (lower === 'rockobstacle') return normalizeMax(this.sizingTargets.rockObstacle);
    if (lower === 'spikeobstacle') return normalizeMax(this.sizingTargets.spikeObstacle);

    // Architecture / decorations
    if (lower === 'stonepillar') return normalizeHeight(this.sizingTargets.stonePillar_H);
    if (lower === 'templewall') return normalizeHeight(this.sizingTargets.templeWall_H);
    if (lower === 'bridgeplatform') return normalizeMax(this.sizingTargets.bridgePlatform);
    if (lower === 'tree') return normalizeHeight(this.sizingTargets.tree_H);

    // New enhanced temple assets
    if (lower === 'ancienttempletile') {
      normalizeMax(3.0);
      // Apply ancient stone material enhancements
      for (const m of meshes) {
        if (m.material) {
          m.material.diffuseColor = new BABYLON.Color3(0.8, 0.7, 0.6);
          m.material.specularColor = new BABYLON.Color3(0.2, 0.15, 0.1);
        }
      }
      return;
    }
    if (lower === 'templeguardian') return normalizeHeight(4.0);
    if (lower === 'ornatecolumn') return normalizeHeight(6.0);
    if (lower === 'mysticalcrystal') {
      normalizeMax(1.5);
      // Add magical glow to crystals
      for (const m of meshes) {
        if (m.material) {
          m.material.emissiveColor = new BABYLON.Color3(0.3, 0.6, 1.0);
        }
        if (this.glowLayer && this.glowLayer.addIncludedOnlyMesh) {
          this.glowLayer.addIncludedOnlyMesh(m);
        }
      }
      return;
    }
    if (lower === 'templebrazier') return normalizeMax(2.0);
    if (lower === 'steppingstone') return normalizeMax(1.2);
    if (lower === 'mossstone') return normalizeMax(this.sizingTargets.mossStone);
    if (lower === 'carvedsymbol') return normalizeMax(this.sizingTargets.carvedSymbol);
    if (lower === 'vinearch') return normalizeHeight(this.sizingTargets.vineArch_H);
    if (lower === 'totemhead') return normalizeMax(this.sizingTargets.totemHead);
    if (lower === 'brokenobelisk') return normalizeHeight(this.sizingTargets.brokenObelisk_H);
    if (lower === 'serpentidol') return normalizeHeight(this.sizingTargets.serpentIdol_H);
    if (lower === 'fountain') return normalizeHeight(this.sizingTargets.fountain_H);
    if (lower === 'crystalformation') return normalizeHeight(this.sizingTargets.crystalFormation_H);
    if (lower === 'templecomplex') return normalizeMax(this.sizingTargets.templeComplex);
  }

  /**
   * Normalize to target largest dimension
   */
  _normalizeToMaxDim(node, target) {
    const sz = this._getWorldSize(node);
    if (!sz || !isFinite(sz) || sz < 1e-3) return;
    const s = target / sz;
    if (!node.scaling) node.scaling = new BABYLON.Vector3(1, 1, 1);
    node.scaling = node.scaling.scale(s);
  }

  /**
   * Normalize to target height (Y dimension)
   */
  _normalizeToHeight(node, targetH) {
    const meshes = typeof node.getChildMeshes === 'function' ? node.getChildMeshes(false) : [];
    if (!meshes || meshes.length === 0) return;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const m of meshes) {
      if (!m.getBoundingInfo) continue;
      m.computeWorldMatrix(true);
      const bb = m.getBoundingInfo().boundingBox;
      minY = Math.min(minY, bb.minimumWorld.y);
      maxY = Math.max(maxY, bb.maximumWorld.y);
    }
    const height = maxY - minY;
    if (!height || !isFinite(height) || height < 1e-3) return;
    const s = targetH / height;
    if (!node.scaling) node.scaling = new BABYLON.Vector3(1, 1, 1);
    node.scaling = node.scaling.scale(s);
  }

  /**
   * Compute world-space bounding box size for a node
   */
  _getWorldSize(node) {
    if (!node || typeof node.getChildMeshes !== 'function') return 0;
    const meshes = node.getChildMeshes(false);
    if (!meshes || meshes.length === 0) return 0;
    let min = new BABYLON.Vector3(
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY
    );
    let max = new BABYLON.Vector3(
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY
    );
    for (const m of meshes) {
      if (!m.getBoundingInfo) continue;
      m.computeWorldMatrix(true);
      const bb = m.getBoundingInfo().boundingBox;
      min = BABYLON.Vector3.Minimize(min, bb.minimumWorld);
      max = BABYLON.Vector3.Maximize(max, bb.maximumWorld);
    }
    const size = max.subtract(min);
    return Math.max(size.x, size.y, size.z);
  }

  /**
   * Clamp the instance scale so its largest dimension <= maxDim
   */
  _clampInstanceScale(instance, maxDim) {
    const size = this._getWorldSize(instance);
    if (!size || !isFinite(size) || size <= 0) return;
    if (size > maxDim) {
      const s = maxDim / size;
      if (!instance.scaling) instance.scaling = new BABYLON.Vector3(1, 1, 1);
      instance.scaling = instance.scaling.scale(s);
    }
  }

  /**
   * Recenters an instance container so its children's bounding center aligns with the container position.
   * Useful to ensure visuals line up with gameplay colliders.
   * @param {BABYLON.TransformNode} container
   */
  centerInstance(container) {
    if (!container || typeof container.getChildMeshes !== 'function') return;
    const meshes = container.getChildMeshes(false);
    if (!meshes || meshes.length === 0) return;

    // Compute world-space bounds across all child meshes
    let min = new BABYLON.Vector3(
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY
    );
    let max = new BABYLON.Vector3(
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY
    );
    for (const m of meshes) {
      if (!m || !m.getBoundingInfo) continue;
      m.computeWorldMatrix(true);
      const bb = m.getBoundingInfo().boundingBox;
      const bmin = bb.minimumWorld;
      const bmax = bb.maximumWorld;
      min = BABYLON.Vector3.Minimize(min, bmin);
      max = BABYLON.Vector3.Maximize(max, bmax);
    }

    const centerWorld = min.add(max).scale(0.5);
    const containerWorld =
      typeof container.getAbsolutePosition === 'function'
        ? container.getAbsolutePosition()
        : container.position;
    const offset = centerWorld.subtract(containerWorld);

    if (offset.lengthSquared() < 1e-6) return; // Already centered

    for (const m of meshes) {
      if (!m || !m.position) continue;
      m.position.subtractInPlace(offset);
    }
  }

  /**
   * Update LOD system based on player position
   */
  updateLOD(playerPosition) {
    if (!this.lodEnabled || !playerPosition) return;

    this.currentPlayerPosition = playerPosition;

    for (const [instance, lodData] of this.lodInstances) {
      const worldPos =
        typeof instance.getAbsolutePosition === 'function'
          ? instance.getAbsolutePosition()
          : instance.position;
      const distance = BABYLON.Vector3.Distance(playerPosition, worldPos);

      let newLodLevel;
      let shouldBeVisible = true;

      if (distance <= this.lodDistances.high) {
        newLodLevel = 'high';
      } else if (distance <= this.lodDistances.medium) {
        newLodLevel = 'medium';
      } else if (distance <= this.lodDistances.low) {
        newLodLevel = 'low';
      } else {
        shouldBeVisible = false;
      }

      // Update visibility
      if (shouldBeVisible !== lodData.isVisible) {
        instance.setEnabled(shouldBeVisible);
        lodData.isVisible = shouldBeVisible;
      }

      // Update LOD level if changed
      if (newLodLevel !== lodData.lodLevel && shouldBeVisible) {
        this.applyLODLevel(instance, newLodLevel);
        lodData.lodLevel = newLodLevel;
      }
    }
  }

  /**
   * Apply LOD level to an instance
   */
  applyLODLevel(instance, lodLevel) {
    const applyToMesh = (mesh) => {
      if (!mesh || !mesh.material) return;
      const bump = mesh.material.bumpTexture;
      if (!bump) return;
      if (lodLevel === 'high') bump.level = 1.0;
      else if (lodLevel === 'medium') bump.level = 0.5;
      else if (lodLevel === 'low') bump.level = 0.1;
    };

    // Handle both single meshes and containers with child meshes
    if (instance && typeof instance.getChildMeshes === 'function') {
      const meshes = instance.getChildMeshes(false);
      if (meshes.length === 0) {
        applyToMesh(instance);
      } else {
        for (const m of meshes) applyToMesh(m);
      }
    } else {
      applyToMesh(instance);
    }
  }

  /**
   * Remove instance from LOD tracking
   */
  removeLODInstance(instance) {
    if (this.lodInstances.has(instance)) {
      this.lodInstances.delete(instance);
    }
  }

  /**
   * Configure LOD system
   */
  configureLOD(enabled, distances = {}) {
    this.lodEnabled = enabled;
    this.lodDistances = { ...this.lodDistances, ...distances };
  }

  /**
   * Get LOD statistics
   */
  getLODStats() {
    const stats = {
      totalInstances: this.lodInstances.size,
      visible: 0,
      hidden: 0,
      lodLevels: { high: 0, medium: 0, low: 0 },
    };

    for (const [instance, lodData] of this.lodInstances) {
      if (lodData.isVisible) {
        stats.visible++;
        stats.lodLevels[lodData.lodLevel]++;
      } else {
        stats.hidden++;
      }
    }

    return stats;
  }

  /**
   * Compress and optimize loaded assets
   */
  optimizeAssets() {
    console.log('Optimizing loaded assets...');

    // Merge identical materials
    this.mergeIdenticalMaterials();

    // Optimize textures
    this.optimizeTextures();

    // Generate mipmaps for better performance
    this.generateMipmaps();

    console.log('Asset optimization complete');
  }

  /**
   * Merge materials with identical properties
   */
  mergeIdenticalMaterials() {
    const materialMap = new Map();
    const materialsToReplace = new Map();

    Object.entries(this.materials).forEach(([name, material]) => {
      const key = this.getMaterialKey(material);

      if (materialMap.has(key)) {
        // Mark for replacement with existing material
        materialsToReplace.set(name, materialMap.get(key));
      } else {
        materialMap.set(key, material);
      }
    });

    // Replace duplicate materials
    materialsToReplace.forEach((replacementMaterial, materialName) => {
      this.materials[materialName] = replacementMaterial;
    });

    console.log(`Merged ${materialsToReplace.size} duplicate materials`);
  }

  /**
   * Generate a key for material comparison
   */
  getMaterialKey(material) {
    if (material instanceof BABYLON.PBRMaterial) {
      const color = material.albedoColor || material.baseColor;
      return `pbr_${color?.toString()}_${material.roughness}_${material.metallic}`;
    } else if (material instanceof BABYLON.StandardMaterial) {
      return `std_${material.diffuseColor?.toString()}_${material.specularColor?.toString()}`;
    }
    return material.id;
  }

  /**
   * Optimize texture memory usage
   */
  optimizeTextures() {
    Object.values(this.textures).forEach((textureCategory) => {
      Object.values(textureCategory).forEach((texture) => {
        if (texture instanceof BABYLON.Texture) {
          // Enable texture streaming for large textures
          if (texture.getSize().width > 512) {
            texture.updateSamplingMode(BABYLON.Texture.TRILINEAR_SAMPLINGMODE);
          }
        }
      });
    });
  }

  /**
   * Generate mipmaps for better performance
   */
  generateMipmaps() {
    Object.values(this.textures).forEach((textureCategory) => {
      Object.values(textureCategory).forEach((texture) => {
        if (texture instanceof BABYLON.Texture && !texture.noMipmap) {
          texture.updateSamplingMode(BABYLON.Texture.TRILINEAR_SAMPLINGMODE);
        }
      });
    });
  }

  /**
   * Get a material by name
   */
  getMaterial(materialName) {
    return this.materials[materialName] || this.materials.stone;
  }

  /**
   * Get a texture by category and name
   */
  getTexture(category, textureName) {
    return this.textures[category] && this.textures[category][textureName];
  }

  /**
   * Apply a material from our loaded textures to a mesh
   */
  applyMaterial(mesh, materialName) {
    const material = this.getMaterial(materialName);
    if (material && mesh) {
      mesh.material = material;
    }
  }

  /**
   * Get asset loading progress
   */
  getLoadingProgress() {
    return this.loadingProgress;
  }

  /**
   * Check if assets are currently loading
   */
  isAssetsLoading() {
    return this.isLoading;
  }

  /**
   * Load GLB/GLTF model
   */
  async loadGLBModel(url, name) {
    return new Promise((resolve, reject) => {
      BABYLON.SceneLoader.LoadAssetContainer(
        '',
        url,
        this.scene,
        (container) => {
          // Add loaded content to the scene so transforms are computed
          container.addAllToScene();

          // Create a dedicated transform root and parent all container root nodes under it
          const root = new BABYLON.TransformNode(`${name}_root`, this.scene);
          for (const rn of container.rootNodes || []) {
            rn.setParent(root);
          }

          // Keep base meshes enabled so they are visible in the scene
          for (const m of container.meshes) {
            if (m && m.setEnabled) {
              m.setEnabled(true);
              m.isVisible = true;

              // Ensure materials are properly set and visible (do not auto-scale)
              if (m.material) {
                if (m.material.alpha !== undefined && m.material.alpha < 0.1) {
                  m.material.alpha = 1.0;
                }
              } else {
                // Add a default material if none exists
                const defaultMat = new BABYLON.StandardMaterial(`${name}_default`, this.scene);
                defaultMat.diffuseColor = new BABYLON.Color3(0.7, 0.6, 0.5);
                defaultMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                m.material = defaultMat;
              }
            }
          }

          // Store in assets
          this.assets[name] = root;

          console.log(`Loaded model: ${name}`);
          resolve(root);
        },
        (event) => {
          // Progress callback
          const percentage = (event.loaded / event.total) * 100;
          this.loadingProgress = percentage;
        },
        (scene, message, exception) => {
          console.error(`Error loading ${name}:`, message);
          reject(new Error(message));
        }
      );
    });
  }

  /**
   * Preload assets from URLs
   */
  async preloadAssets(assetList) {
    const loadPromises = assetList.map((asset) => this.loadGLBModel(asset.url, asset.name));

    try {
      await Promise.all(loadPromises);
      console.log('All external assets loaded');
    } catch (error) {
      console.error('Error loading external assets:', error);
    }
  }

  /**
   * Get asset health information for debugging
   */
  getAssetHealth() {
    const totalAssets = Object.keys(this.assets).length;
    const loadedAssets = Object.values(this.assets).filter(asset => asset !== null).length;
    const healthPercentage = totalAssets > 0 ? (loadedAssets / totalAssets) * 100 : 0;

    let status = 'unknown';
    if (healthPercentage === 100) {
      status = 'excellent';
    } else if (healthPercentage >= 80) {
      status = 'good';
    } else if (healthPercentage >= 60) {
      status = 'fair';
    } else if (healthPercentage >= 40) {
      status = 'poor';
    } else {
      status = 'critical';
    }

    return {
      status,
      totalAssets,
      loadedAssets,
      healthPercentage,
      isLoading: this.isLoading,
      loadingProgress: this.loadingProgress
    };
  }
}
