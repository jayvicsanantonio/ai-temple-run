/**
 * Asset Manager Module
 * Handles loading and management of 3D assets, textures, and animations
 */

import * as BABYLON from 'babylonjs';
import 'babylonjs-loaders';

export class AssetManager {
  constructor(scene) {
    this.scene = scene;
    this.assets = {};
    this.textures = {};
    this.materials = {};
    this.loadingProgress = 0;
    this.isLoading = false;
  }

  /**
   * Initialize and load all game assets
   */
  async init() {
    this.isLoading = true;
    
    try {
      // Create procedural assets for now
      await this.createProceduralAssets();
      
      // Setup materials
      this.createMaterials();
      
      console.log('All assets loaded successfully');
    } catch (error) {
      console.error('Error loading assets:', error);
    } finally {
      this.isLoading = false;
      this.loadingProgress = 100;
    }
  }

  /**
   * Create procedural assets (placeholder until real models are available)
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
   * Create materials for various surfaces
   */
  createMaterials() {
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
    
    // Stone material
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
   * Get a clone of an asset
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
