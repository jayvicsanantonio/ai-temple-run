/**
 * Rendering Debugger - Debug Babylon.js rendering pipeline issues
 */

import * as BABYLON from 'babylonjs';

export class RenderingDebugger {
  constructor(scene, engine) {
    this.scene = scene;
    this.engine = engine;
    this.debugEnabled = false;
  }

  /**
   * Comprehensive rendering pipeline analysis
   */
  analyzeRenderingPipeline() {
    console.log('\n=== RENDERING PIPELINE ANALYSIS ===');

    // Check engine state
    console.log('ENGINE STATE:');
    console.log(`  Engine running: ${!this.engine.isStopped}`);
    console.log(`  Canvas size: ${this.engine.getRenderWidth()}x${this.engine.getRenderHeight()}`);
    console.log(`  WebGL context: ${this.engine._gl ? 'Active' : 'Missing'}`);
    console.log(`  Last render time: ${this.engine.getTimeStep()}ms`);

    // Check scene state
    console.log('\nSCENE STATE:');
    console.log(`  Scene ready: ${this.scene.isReady()}`);
    console.log(`  Active camera: ${this.scene.activeCamera ? this.scene.activeCamera.name : 'NONE'}`);
    console.log(`  Camera ready: ${this.scene.activeCamera ? this.scene.activeCamera.isReady() : 'N/A'}`);
    console.log(`  Total meshes: ${this.scene.meshes.length}`);
    console.log(`  Active meshes: ${this.scene.getActiveMeshes().length}`);

    // Camera analysis
    if (this.scene.activeCamera) {
      const cam = this.scene.activeCamera;
      console.log(`  Camera position: (${cam.position.x.toFixed(2)}, ${cam.position.y.toFixed(2)}, ${cam.position.z.toFixed(2)})`);
      console.log(`  Camera target: (${cam.getTarget().x.toFixed(2)}, ${cam.getTarget().y.toFixed(2)}, ${cam.getTarget().z.toFixed(2)})`);
    }

    // Lights analysis
    console.log(`\nLIGHTING:`);
    console.log(`  Total lights: ${this.scene.lights.length}`);
    const activeLights = this.scene.lights.filter(light => light.isEnabled());
    console.log(`  Active lights: ${activeLights.length}`);
    activeLights.forEach(light => {
      console.log(`    ${light.name}: ${light.getClassName()} (intensity: ${light.intensity})`);
    });

    // Materials analysis
    console.log(`\nMATERIALS:`);
    console.log(`  Total materials: ${this.scene.materials.length}`);
    const readyMaterials = this.scene.materials.filter(mat => mat.isReady());
    console.log(`  Ready materials: ${readyMaterials.length}`);

    // Detailed mesh analysis
    this.analyzeMeshRendering();

    console.log('=== END RENDERING ANALYSIS ===\n');
  }

  /**
   * Analyze mesh rendering states in detail
   */
  analyzeMeshRendering() {
    console.log(`\nDETAILED MESH ANALYSIS:`);

    const renderableMeshes = [];
    const nonRenderableMeshes = [];

    for (const mesh of this.scene.meshes) {
      const analysis = {
        name: mesh.name,
        className: mesh.getClassName(),
        isEnabled: mesh.isEnabled(),
        isVisible: mesh.isVisible,
        isReady: mesh.isReady(),
        hasVertices: mesh.getTotalVertices ? mesh.getTotalVertices() > 0 : false,
        hasMaterial: !!mesh.material,
        materialReady: mesh.material ? mesh.material.isReady() : false,
        inFrustum: this.scene.activeCamera ? this.scene.activeCamera.isInFrustum(mesh) : 'unknown',
        position: `(${mesh.position.x.toFixed(1)}, ${mesh.position.y.toFixed(1)}, ${mesh.position.z.toFixed(1)})`
      };

      if (analysis.isEnabled && analysis.isVisible && analysis.hasVertices && analysis.isReady) {
        renderableMeshes.push(analysis);
      } else {
        nonRenderableMeshes.push(analysis);
      }
    }

    console.log(`  RENDERABLE MESHES (${renderableMeshes.length}):`);
    renderableMeshes.forEach(mesh => {
      console.log(`    ${mesh.name}: ${mesh.className} at ${mesh.position} (vertices: ${mesh.hasVertices}, material: ${mesh.materialReady})`);
    });

    console.log(`  NON-RENDERABLE MESHES (${nonRenderableMeshes.length}):`);
    nonRenderableMeshes.slice(0, 10).forEach(mesh => { // Show only first 10
      const issues = [];
      if (!mesh.isEnabled) issues.push('disabled');
      if (!mesh.isVisible) issues.push('invisible');
      if (!mesh.hasVertices) issues.push('no-vertices');
      if (!mesh.isReady) issues.push('not-ready');
      if (!mesh.materialReady) issues.push('material-not-ready');

      console.log(`    ${mesh.name}: ${mesh.className} - Issues: [${issues.join(', ')}]`);
    });

    if (nonRenderableMeshes.length > 10) {
      console.log(`    ... and ${nonRenderableMeshes.length - 10} more non-renderable meshes`);
    }
  }

  /**
   * Force render a simple test scene to verify rendering works
   */
  createMinimalRenderTest() {
    console.log('\n=== MINIMAL RENDER TEST ===');

    // Create a simple bright test sphere
    const testSphere = BABYLON.MeshBuilder.CreateSphere('renderTest', { diameter: 4 }, this.scene);
    testSphere.position = new BABYLON.Vector3(0, 2, 10);

    // Create a glowing material that should be impossible to miss
    const testMaterial = new BABYLON.StandardMaterial('renderTestMat', this.scene);
    testMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0); // Bright red
    testMaterial.emissiveColor = new BABYLON.Color3(1, 0, 0); // Glowing red
    testMaterial.specularColor = new BABYLON.Color3(1, 1, 1); // Shiny
    testSphere.material = testMaterial;

    console.log(`Created test sphere: ${testSphere.name}`);
    console.log(`  Position: ${testSphere.position.toString()}`);
    console.log(`  Enabled: ${testSphere.isEnabled()}`);
    console.log(`  Visible: ${testSphere.isVisible}`);
    console.log(`  Ready: ${testSphere.isReady()}`);
    console.log(`  Vertices: ${testSphere.getTotalVertices()}`);
    console.log(`  Material ready: ${testMaterial.isReady()}`);

    // Force immediate render
    setTimeout(() => {
      this.scene.render();
      console.log('Forced render completed');

      // Check if test sphere is in active meshes
      const activeMeshes = this.scene.getActiveMeshes();
      const testSphereActive = activeMeshes.data.includes(testSphere);
      console.log(`Test sphere in active meshes: ${testSphereActive}`);
    }, 100);

    console.log('=== END MINIMAL RENDER TEST ===\n');

    return testSphere;
  }

  /**
   * Check if the render loop is actually running
   */
  verifyRenderLoop() {
    console.log('\n=== RENDER LOOP VERIFICATION ===');

    let renderCount = 0;
    const startTime = Date.now();

    // Hook into the render loop
    const originalRender = this.scene.render.bind(this.scene);
    this.scene.render = () => {
      renderCount++;
      return originalRender();
    };

    // Check render frequency after 2 seconds
    setTimeout(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const renderRate = renderCount / elapsed;

      console.log(`Render loop status:`);
      console.log(`  Renders in ${elapsed}s: ${renderCount}`);
      console.log(`  Render rate: ${renderRate.toFixed(1)} FPS`);

      if (renderCount === 0) {
        console.log('  ❌ RENDER LOOP NOT RUNNING - This is the core issue!');
      } else if (renderRate < 30) {
        console.log('  ⚠️ Low render rate detected');
      } else {
        console.log('  ✅ Render loop running normally');
      }

      // Restore original render function
      this.scene.render = originalRender;
      console.log('=== END RENDER LOOP VERIFICATION ===\n');
    }, 2000);
  }

  /**
   * Start comprehensive rendering diagnosis
   */
  startDebugging() {
    this.debugEnabled = true;
    console.log('🔍 Starting Rendering Debugger...');

    // Run all diagnostic tests
    this.analyzeRenderingPipeline();
    this.createMinimalRenderTest();
    this.verifyRenderLoop();

    // Periodic analysis
    this.debugInterval = setInterval(() => {
      if (this.debugEnabled) {
        const stats = this.engine.getDebugInfo();
        console.log(`[Render Debug] Draw calls: ${stats.drawCalls || 0}, Triangles: ${stats.triangles || 0}`);
      }
    }, 5000);
  }

  /**
   * Stop debugging
   */
  stopDebugging() {
    this.debugEnabled = false;
    if (this.debugInterval) {
      clearInterval(this.debugInterval);
    }
    console.log('🔍 Rendering Debugger stopped');
  }
}