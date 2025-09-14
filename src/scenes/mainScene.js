/**
 * Main Scene Module
 * Sets up and manages the Babylon.js scene
 */

import * as BABYLON from 'babylonjs';
import 'babylonjs-loaders';

export class MainScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.engine = null;
    this.scene = null;
    this.camera = null;
    this.light = null;
    this.ground = null;
    this.skybox = null;
  }

  /**
   * Initialize the scene
   */
  async init() {
    this.createEngine();
    this.createScene();
    this.createCamera();
    this.createLighting();
    this.createEnvironment();
    this.setupRenderLoop();

    return this.scene;
  }

  /**
   * Create the Babylon.js engine
   */
  createEngine() {
    this.engine = new BABYLON.Engine(this.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      disableWebGL2Support: false,
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  /**
   * Create the scene
   */
  createScene() {
    this.scene = new BABYLON.Scene(this.engine);
    // Softer background to reduce flat look
    this.scene.clearColor = new BABYLON.Color3(0.55, 0.75, 0.95);

    // Enable collisions
    this.scene.collisionsEnabled = true;

    // Set gravity
    this.scene.gravity = new BABYLON.Vector3(0, -9.81, 0);

    // Enable fog for depth effect
    this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
    this.scene.fogDensity = 0.006;
    this.scene.fogColor = new BABYLON.Color3(0.55, 0.75, 0.95);

    // Global image processing for subtle tone mapping
    this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
    this.scene.imageProcessingConfiguration.exposure = 1.15;
    this.scene.imageProcessingConfiguration.contrast = 1.1;
  }

  /**
   * Create the camera
   */
  createCamera() {
    // Create a follow camera
    this.camera = new BABYLON.UniversalCamera(
      'gameCamera',
      new BABYLON.Vector3(0, 5, -10),
      this.scene
    );

    // Set camera target
    this.camera.setTarget(new BABYLON.Vector3(0, 2, 5));

    // Attach camera to canvas
    this.camera.attachControl(this.canvas, false);

    // Disable camera controls for gameplay
    this.camera.inputs.clear();
  }

  /**
   * Create lighting
   */
  createLighting() {
    // Hemispheric light for ambient lighting
    const hemiLight = new BABYLON.HemisphericLight(
      'hemiLight',
      new BABYLON.Vector3(0, 1, 0),
      this.scene
    );
    hemiLight.intensity = 0.8;
    hemiLight.diffuse = new BABYLON.Color3(1, 1, 1);
    hemiLight.specular = new BABYLON.Color3(0, 0, 0);
    hemiLight.groundColor = new BABYLON.Color3(0.5, 0.5, 0.5);

    // Directional light for shadows
    this.light = new BABYLON.DirectionalLight(
      'dirLight',
      new BABYLON.Vector3(-1, -2, 1),
      this.scene
    );
    this.light.intensity = 0.8;
    this.light.position = new BABYLON.Vector3(20, 40, -20);

    // Setup shadows
    const shadowGenerator = new BABYLON.ShadowGenerator(2048, this.light);
    shadowGenerator.usePercentageCloserFiltering = true;
    shadowGenerator.filteringQuality = BABYLON.ShadowGenerator.QUALITY_HIGH;
    shadowGenerator.contactHardeningLightSizeUVRatio = 0.0025;
    shadowGenerator.bias = -0.001;
    this.shadowGenerator = shadowGenerator;
  }

  /**
   * Create environment elements
   */
  createEnvironment() {
    // Create ground plane
    this.createGround();

    // Create skybox
    this.createSkybox();
  }

  /**
   * Create the ground plane
   */
  createGround() {
    // Create a large ground plane (hidden, tiles will be visible)
    this.ground = BABYLON.MeshBuilder.CreateGround(
      'ground',
      { width: 50, height: 200, subdivisions: 4 },
      this.scene
    );

    // Create ground material
    const groundMaterial = new BABYLON.StandardMaterial('groundMat', this.scene);
    groundMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.3, 0.2);
    groundMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    this.ground.material = groundMaterial;

    // Enable shadows
    this.ground.receiveShadows = true;

    // Enable collisions
    this.ground.checkCollisions = true;

    // Hide it since we use tiles now
    this.ground.isVisible = false;
  }

  /**
   * Create the skybox
   */
  createSkybox() {
    // Create skybox mesh
    this.skybox = BABYLON.MeshBuilder.CreateBox('skyBox', { size: 500 }, this.scene);

    // Create skybox material
    const skyboxMaterial = new BABYLON.StandardMaterial('skyBoxMat', this.scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.disableLighting = true;
    skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);

    // Simple gradient effect (will be replaced with proper skybox textures)
    skyboxMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.8, 1);

    this.skybox.material = skyboxMaterial;
    this.skybox.infiniteDistance = true;
  }

  /**
   * Setup the render loop
   */
  setupRenderLoop() {
    // Basic post processing: FXAA + subtle sharpen
    const pipeline = new BABYLON.DefaultRenderingPipeline('default', true, this.scene, [
      this.camera,
    ]);
    pipeline.fxaaEnabled = true;
    pipeline.sharpenEnabled = true;
    pipeline.sharpen.edgeAmount = 0.15;

    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  }

  /**
   * Update camera to follow target
   * @param {BABYLON.Vector3} targetPosition - Position to follow
   */
  updateCameraFollow(targetPosition) {
    if (!targetPosition) return;

    // Smooth camera follow
    const cameraOffset = new BABYLON.Vector3(0, 5, -10);
    const newPosition = targetPosition.add(cameraOffset);

    // Lerp camera position for smooth movement
    this.camera.position = BABYLON.Vector3.Lerp(this.camera.position, newPosition, 0.1);

    // Update camera target
    const targetOffset = new BABYLON.Vector3(0, 2, 5);
    this.camera.setTarget(targetPosition.add(targetOffset));
  }

  /**
   * Load a GLTF/GLB model
   * @param {string} modelPath - Path to the model file
   * @param {string} modelName - Name for the loaded mesh
   * @returns {Promise<BABYLON.AbstractMesh>} The loaded mesh
   */
  async loadModel(modelPath, modelName) {
    return new Promise((resolve, reject) => {
      BABYLON.SceneLoader.LoadAssetContainer(
        '',
        modelPath,
        this.scene,
        (container) => {
          const meshes = container.meshes;
          const root = meshes[0];

          // Add all meshes to the scene
          container.addAllToScene();

          // Set a name for the root
          root.name = modelName;

          resolve(root);
        },
        null,
        (scene, message) => {
          console.error('Error loading model:', message);
          reject(message);
        }
      );
    });
  }

  /**
   * Dispose of the scene and engine
   */
  dispose() {
    this.scene.dispose();
    this.engine.dispose();
  }
}
