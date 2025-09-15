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
      disableWebGL2Support: false
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
    // Swamp temple atmosphere – teal haze with warm sunlight accents
    this.scene.clearColor = new BABYLON.Color3(0.38, 0.58, 0.60);

    // Enable collisions
    this.scene.collisionsEnabled = true;

    // Set gravity
    this.scene.gravity = new BABYLON.Vector3(0, -9.81, 0);

    // Atmospheric fog for depth – teal like in Temple Run refs
    this.scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
    this.scene.fogStart = 30;
    this.scene.fogEnd = 120;
    this.scene.fogColor = new BABYLON.Color3(0.26, 0.44, 0.50);
  }

  /**
   * Create the camera
   */
  createCamera() {
    // Create a follow camera
    this.camera = new BABYLON.UniversalCamera(
      'gameCamera',
      new BABYLON.Vector3(0, 6, -14),
      this.scene
    );
    
    // Set camera target
    this.camera.setTarget(new BABYLON.Vector3(0, 2.5, 7));
    // Improve near-plane to prevent clipping with nearby meshes
    this.camera.minZ = 0.05;
    this.camera.maxZ = 2000;
    this.camera.fov = 0.8; // ~45.8 degrees, keeps character fully in frame
    
    // Attach camera to canvas
    this.camera.attachControl(this.canvas, false);
    
    // Disable camera controls for gameplay
    this.camera.inputs.clear();
  }

  /**
   * Create lighting
   */
  createLighting() {
    // Hemispheric light for ambient lighting - warmer temple atmosphere
    const hemiLight = new BABYLON.HemisphericLight(
      'hemiLight',
      new BABYLON.Vector3(0, 1, 0),
      this.scene
    );
    hemiLight.intensity = 0.5;
    // Warm golden ambient with slight green tint from foliage
    hemiLight.diffuse = new BABYLON.Color3(0.95, 0.88, 0.70);
    hemiLight.specular = new BABYLON.Color3(0.18, 0.15, 0.12);
    hemiLight.groundColor = new BABYLON.Color3(0.45, 0.50, 0.45);

    // Main directional light - simulating sunlight through temple openings
    this.light = new BABYLON.DirectionalLight(
      'templeMainLight',
      new BABYLON.Vector3(-0.5, -1.2, 0.7),
      this.scene
    );
    this.light.intensity = 0.9;
    this.light.position = new BABYLON.Vector3(40, 80, -20);
    this.light.diffuse = new BABYLON.Color3(1.0, 0.85, 0.6); // Warm golden sunlight
    this.light.specular = new BABYLON.Color3(1.0, 0.9, 0.7);

    // Secondary light for temple interior illumination
    const templeInteriorLight = new BABYLON.DirectionalLight(
      'templeInteriorLight',
      new BABYLON.Vector3(0.3, -0.8, -0.5),
      this.scene
    );
    templeInteriorLight.intensity = 0.3;
    templeInteriorLight.position = new BABYLON.Vector3(-20, 40, 30);
    templeInteriorLight.diffuse = new BABYLON.Color3(0.9, 0.7, 0.5); // Warm temple glow

    // Atmospheric rim light for depth
    const rimLight = new BABYLON.DirectionalLight(
      'rimLight',
      new BABYLON.Vector3(1, 0, 0.3),
      this.scene
    );
    rimLight.intensity = 0.2;
    rimLight.diffuse = new BABYLON.Color3(0.8, 0.6, 0.4);

    // Enhanced shadows with higher resolution
    const shadowGenerator = new BABYLON.ShadowGenerator(2048, this.light);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 16;
    shadowGenerator.bias = 0.00001;
    this.shadowGenerator = shadowGenerator;

    // Store lights for potential animation
    this.lights = {
      hemispheric: hemiLight,
      main: this.light,
      interior: templeInteriorLight,
      rim: rimLight
    };

    // Subtle bloom and glow to make coins/water pop
    try {
      const pipeline = new BABYLON.DefaultRenderingPipeline('default', true, this.scene, [this.camera]);
      pipeline.bloomEnabled = true;
      pipeline.bloomThreshold = 0.7;
      pipeline.bloomWeight = 0.4;
      pipeline.bloomKernel = 32;
      pipeline.imageProcessingEnabled = true;
      pipeline.fxaaEnabled = true;
    } catch (e) {}

    // Glow layer; coins will be added to this from the asset manager
    try {
      const glow = new BABYLON.GlowLayer('glow', this.scene, { blurKernelSize: 64 });
      glow.intensity = 0.6;
      this.glowLayer = glow;
      // expose via scene for other systems
      this.scene.glowLayer = glow;
    } catch (e) {}
  }

  /**
   * Create environment elements
   */
  createEnvironment() {
    // Create ground plane
    this.createGround();
    
    // Create skybox
    this.createSkybox();

    // Add swamp water plane
    this.createWater();

    // Add subtle caustics post-process
    this.createCausticsPostProcess();
  }

  /**
   * Fullscreen caustics overlay post-process
   */
  createCausticsPostProcess() {
    // Fragment shader
    BABYLON.Effect.ShadersStore['causticsFragmentShader'] = `
      precision highp float;
      varying vec2 vUV;
      uniform sampler2D textureSampler;
      uniform float time;
      uniform float intensity;
      uniform vec3 tint;

      float ripple(vec2 p, float t) {
        return sin(p.x * 40.0 + t * 0.6) * cos(p.y * 38.0 - t * 0.7);
      }

      void main() {
        vec4 sceneColor = texture2D(textureSampler, vUV);
        // Two-layer moving pattern
        float r = 0.5 * ripple(vUV, time) + 0.5 * ripple(vUV * 0.8 + vec2(0.1, -0.07), time * 1.2);
        r = pow(max(r, 0.0), 2.0);

        // Stronger near bottom of screen (ground area)
        float mask = smoothstep(1.0, 0.4, vUV.y);
        float a = intensity * mask * 0.6;

        vec3 caustic = vec3(tint) * r * a;
        vec3 outCol = sceneColor.rgb + caustic;
        gl_FragColor = vec4(outCol, sceneColor.a);
      }
    `;

    const pp = new BABYLON.PostProcess(
      'Caustics',
      'caustics',
      ['time', 'intensity', 'tint'],
      null,
      1.0,
      this.camera
    );

    let t = 0;
    pp.onApply = (effect) => {
      t += this.engine.getDeltaTime() * 0.001;
      effect.setFloat('time', t);
      effect.setFloat('intensity', 0.13);
      effect.setColor3('tint', new BABYLON.Color3(0.4, 0.9, 0.9));
    };

    this.causticsPostProcess = pp;
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
    // Use a large sphere for a smoother gradient sky
    this.skybox = BABYLON.MeshBuilder.CreateSphere('skyDome', { diameter: 800, segments: 24 }, this.scene);
    this.skybox.flipFaces(true); // Render inside

    const mat = new BABYLON.StandardMaterial('skyDomeMat', this.scene);
    mat.backFaceCulling = false;
    mat.disableLighting = true;
    mat.specularColor = new BABYLON.Color3(0, 0, 0);

    // Create a simple vertical gradient texture using DynamicTexture
    const tex = new BABYLON.DynamicTexture('skyGradient', { width: 512, height: 512 }, this.scene, true);
    const ctx = tex.getContext();
    const grd = ctx.createLinearGradient(0, 0, 0, 512);
    // Teal gradient similar to Temple Run swamp
    grd.addColorStop(0, '#2a4950');
    grd.addColorStop(1, '#6fb2b5');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 512, 512);
    tex.update(false);

    mat.emissiveTexture = tex;
    mat.emissiveColor = new BABYLON.Color3(1, 1, 1);

    this.skybox.material = mat;
    this.skybox.infiniteDistance = true;
  }

  /**
   * Create a simple swamp water shader plane
   */
  createWater() {
    // Large plane below tiles
    const water = BABYLON.MeshBuilder.CreateGround('swampWater', { width: 1000, height: 1000, subdivisions: 2 }, this.scene);
    water.position.y = -0.2; // Slightly below the tile base path (-0.1)
    water.checkCollisions = false;
    water.isPickable = false;

    // Minimal ripple shader
    const vs = `
      precision highp float;
      // Attributes
      attribute vec3 position;
      attribute vec2 uv;
      // Uniforms
      uniform mat4 worldViewProjection;
      uniform float time;
      // Varyings
      varying vec2 vUV;
      void main() {
        vUV = uv;
        // Subtle vertex displacement for waves
        float wave = 0.02 * sin(uv.x * 30.0 + time * 0.8) + 0.02 * cos(uv.y * 25.0 - time * 1.1);
        vec3 p = position + vec3(0.0, wave, 0.0);
        gl_Position = worldViewProjection * vec4(p, 1.0);
      }
    `;

    const fs = `
      precision highp float;
      varying vec2 vUV;
      uniform float time;
      // Fake light direction
      const vec3 lightDir = normalize(vec3(-0.6, 0.8, 0.4));
      void main() {
        // Two-layer moving noise based on trig for cheap ripples
        float r1 = sin((vUV.x + time * 0.03) * 40.0) * cos((vUV.y - time * 0.02) * 38.0);
        float r2 = sin((vUV.x * 0.7 - time * 0.05) * 60.0) * cos((vUV.y * 0.8 + time * 0.04) * 55.0);
        float ripple = 0.5 * r1 + 0.5 * r2;

        // Turquoise swamp color
        vec3 base = vec3(0.06, 0.20, 0.26);   // deep teal
        vec3 shallow = vec3(0.10, 0.55, 0.60); // bright turquoise
        float mixAmt = 0.5 + 0.5 * ripple;
        vec3 col = mix(base, shallow, clamp(mixAmt, 0.0, 1.0));

        // Soft specular glint that shimmers with ripples
        float spec = pow(max(0.0, ripple), 10.0);
        col += vec3(0.05, 0.08, 0.10) * spec;

        // Slight haze to integrate with foggy scene
        col = mix(col, vec3(0.30, 0.50, 0.55), 0.12);

        gl_FragColor = vec4(col, 0.9);
      }
    `;

    BABYLON.Effect.ShadersStore['swampWaterVertexShader'] = vs;
    BABYLON.Effect.ShadersStore['swampWaterFragmentShader'] = fs;

    const shaderMat = new BABYLON.ShaderMaterial('swampWaterMat', this.scene, {
      vertex: 'swampWater',
      fragment: 'swampWater',
    }, {
      attributes: ['position', 'uv'],
      uniforms: ['worldViewProjection', 'time'],
      needAlphaBlending: true,
    });

    shaderMat.backFaceCulling = false;
    shaderMat.alpha = 0.9;
    water.material = shaderMat;

    // Animate time
    let t = 0;
    this.scene.onBeforeRenderObservable.add(() => {
      t += this.engine.getDeltaTime() * 0.001;
      shaderMat.setFloat('time', t);
    });

    // Keep references
    this.water = water;
    this.waterMaterial = shaderMat;
  }

  /**
   * Setup the render loop
   */
  setupRenderLoop() {
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
    const cameraOffset = new BABYLON.Vector3(0, 6, -14);
    const newPosition = targetPosition.add(cameraOffset);
    
    // Lerp camera position for smooth movement
    this.camera.position = BABYLON.Vector3.Lerp(
      this.camera.position,
      newPosition,
      0.1
    );
    
    // Update camera target
    const targetOffset = new BABYLON.Vector3(0, 2.5, 7);
    this.camera.setTarget(targetPosition.add(targetOffset));
  }

  /**
   * Smart follow that frames an entire mesh based on its bounds
   * without changing the public updateCameraFollow API.
   */
  updateCameraFollowForMesh(mesh) {
    if (!mesh) return this.updateCameraFollow(mesh?.position);

    // Compute approximate height
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    const collect = typeof mesh.getChildMeshes === 'function' ? mesh.getChildMeshes(false) : [mesh];
    for (const m of collect) {
      if (!m.getBoundingInfo) continue;
      m.computeWorldMatrix(true);
      const bb = m.getBoundingInfo().boundingBox;
      minY = Math.min(minY, bb.minimumWorld.y);
      maxY = Math.max(maxY, bb.maximumWorld.y);
    }
    const height = !isFinite(minY) || !isFinite(maxY) ? 1.6 : Math.max(0.6, maxY - minY);

    // Desired offsets scale with character size
    const pos = mesh.getAbsolutePosition ? mesh.getAbsolutePosition() : mesh.position;
    const yOff = Math.max(3.5, height * 0.9 + 1.6);
    const zBack = Math.max(10, height * 5.5);
    const cameraOffset = new BABYLON.Vector3(0, yOff, -zBack);
    const targetOffset = new BABYLON.Vector3(0, Math.max(1.2, height * 0.35 + 1.0), 7);

    const desired = pos.add(cameraOffset);
    this.camera.position = BABYLON.Vector3.Lerp(this.camera.position, desired, 0.1);
    this.camera.setTarget(pos.add(targetOffset));
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
