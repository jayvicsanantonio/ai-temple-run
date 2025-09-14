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
    this.modelPaths = {
      pathways: 'models/pathways/',
      architecture: 'models/architecture/',
      obstacles: 'models/obstacles/',
      decorations: 'models/decorations/'
    };
    this.texturePaths = {
      stone: 'textures/stone/',
      metal: 'textures/metal/',
      organic: 'textures/organic/'
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
      { path: 'decorations/ancient_carved_symbol.glb', name: 'carvedSymbol' }
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
      stone: [
        'castle_wall_slates',
        'broken_wall',
        'dry_riverbed_rock',
        'cliff_side',
        'brick_wall'
      ],
      metal: [
        'metal_plate',
        'green_metal_rust',
        'blue_metal_plate'
      ],
      organic: [
        'bark_brown',
        'brown_mud',
        'fine_grained_wood'
      ]
    };

    const loadPromises = [];

    for (const [category, materials] of Object.entries(textureCategories)) {
      for (const material of materials) {
        const materialPath = this.assetBasePath + this.texturePaths[category] + material + '/';

        // Define texture types to load
        const textureTypes = ['Diffuse', 'nor_dx', 'Rough', 'AO', 'Displacement'];

        for (const type of textureTypes) {
          const textureName = `${material}_${type}`;
          const textureUrl = materialPath + textureName + '.jpg';

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
    // Create player character
    this.createPlayerCharacter();
    
    // Create obstacle variations
    this.createObstacles();
    
    // Create coin model
    this.createCoin();
    
    // Create environment decorations
    this.createDecorations();
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
    const head = BABYLON.MeshBuilder.CreateSphere(
      'playerHead',
      { diameter: 0.4 },
      this.scene
    );
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
    const log = BABYLON.MeshBuilder.CreateCylinder(
      'log',
      { height: 3, diameter: 0.8 },
      this.scene
    );
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
    const stoneTextures = ['castle_wall_slates', 'broken_wall', 'dry_riverbed_rock', 'cliff_side', 'brick_wall'];

    stoneTextures.forEach(materialName => {
      const pbrMat = new BABYLON.PBRMaterial(`${materialName}_material`, this.scene);

      // Apply textures if available
      if (this.textures.stone) {
        const diffuseTex = this.textures.stone[`${materialName}_Diffuse`];
        const normalTex = this.textures.stone[`${materialName}_nor_dx`];
        const roughnessTex = this.textures.stone[`${materialName}_Rough`];
        const aoTex = this.textures.stone[`${materialName}_AO`];

        if (diffuseTex) pbrMat.baseTexture = diffuseTex;
        if (normalTex) pbrMat.bumpTexture = normalTex;
        if (roughnessTex) pbrMat.metallicTexture = roughnessTex;
        if (aoTex) pbrMat.lightmapTexture = aoTex;

        // PBR properties for stone
        pbrMat.baseColor = new BABYLON.Color3(1, 1, 1);
        pbrMat.roughness = 0.9;
        pbrMat.metallic = 0.0;
      } else {
        // Fallback colors
        pbrMat.baseColor = new BABYLON.Color3(0.45, 0.4, 0.35);
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

    metalTextures.forEach(materialName => {
      const pbrMat = new BABYLON.PBRMaterial(`${materialName}_material`, this.scene);

      // Apply textures if available
      if (this.textures.metal) {
        const diffuseTex = this.textures.metal[`${materialName}_Diffuse`];
        const normalTex = this.textures.metal[`${materialName}_nor_dx`];
        const roughnessTex = this.textures.metal[`${materialName}_Rough`];
        const aoTex = this.textures.metal[`${materialName}_AO`];

        if (diffuseTex) pbrMat.baseTexture = diffuseTex;
        if (normalTex) pbrMat.bumpTexture = normalTex;
        if (roughnessTex) pbrMat.metallicTexture = roughnessTex;
        if (aoTex) pbrMat.lightmapTexture = aoTex;

        // PBR properties for metal
        pbrMat.baseColor = new BABYLON.Color3(1, 1, 1);
        pbrMat.roughness = materialName.includes('rust') ? 0.7 : 0.3;
        pbrMat.metallic = materialName.includes('rust') ? 0.6 : 0.9;
      } else {
        // Fallback colors
        pbrMat.baseColor = new BABYLON.Color3(0.6, 0.6, 0.6);
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

    organicTextures.forEach(materialName => {
      const pbrMat = new BABYLON.PBRMaterial(`${materialName}_material`, this.scene);

      // Apply textures if available
      if (this.textures.organic) {
        const diffuseTex = this.textures.organic[`${materialName}_Diffuse`];
        const normalTex = this.textures.organic[`${materialName}_nor_dx`];
        const roughnessTex = this.textures.organic[`${materialName}_Rough`];
        const aoTex = this.textures.organic[`${materialName}_AO`];

        if (diffuseTex) pbrMat.baseTexture = diffuseTex;
        if (normalTex) pbrMat.bumpTexture = normalTex;
        if (roughnessTex) pbrMat.metallicTexture = roughnessTex;
        if (aoTex) pbrMat.lightmapTexture = aoTex;

        // PBR properties for organic materials
        pbrMat.baseColor = new BABYLON.Color3(1, 1, 1);
        pbrMat.roughness = 0.8;
        pbrMat.metallic = 0.0;
      } else {
        // Fallback colors
        if (materialName.includes('wood')) {
          pbrMat.baseColor = new BABYLON.Color3(0.4, 0.25, 0.1);
        } else if (materialName.includes('mud')) {
          pbrMat.baseColor = new BABYLON.Color3(0.3, 0.2, 0.15);
        } else {
          pbrMat.baseColor = new BABYLON.Color3(0.35, 0.25, 0.15);
        }
        pbrMat.roughness = 0.9;
        pbrMat.metallic = 0.0;
      }

      this.materials[materialName] = pbrMat;
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
          const meshes = container.meshes;
          const root = meshes[0];
          
          // Store in assets
          this.assets[name] = root;
          
          // Initially disable
          root.setEnabled(false);
          
          console.log(`Loaded model: ${name}`);
          resolve(root);
        },
        (event) => {
          // Progress callback
          const percentage = event.loaded / event.total * 100;
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
    const loadPromises = assetList.map(asset => 
      this.loadGLBModel(asset.url, asset.name)
    );
    
    try {
      await Promise.all(loadPromises);
      console.log('All external assets loaded');
    } catch (error) {
      console.error('Error loading external assets:', error);
    }
  }
}
