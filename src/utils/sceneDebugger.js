/**
 * Scene Debugger - Debug Babylon.js scene rendering and visibility issues
 */

import * as BABYLON from 'babylonjs';

export class SceneDebugger {
  constructor(scene) {
    this.scene = scene;
    this.debugEnabled = false;
    this.debugInterval = null;
  }

  /**
   * Start comprehensive scene debugging
   */
  startDebugging() {
    this.debugEnabled = true;
    console.log('=== SCENE DEBUGGER STARTED ===');

    // Immediate scene analysis
    this.analyzeScene();

    // Periodic analysis every 5 seconds
    this.debugInterval = setInterval(() => {
      if (this.debugEnabled) {
        this.analyzeScene();
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
      this.debugInterval = null;
    }
    console.log('=== SCENE DEBUGGER STOPPED ===');
  }

  /**
   * Comprehensive scene analysis
   */
  analyzeScene() {
    console.log('\n=== SCENE ANALYSIS ===');

    // Basic scene info
    console.log(`Total meshes in scene: ${this.scene.meshes.length}`);
    console.log(`Total transform nodes: ${this.scene.transformNodes.length}`);
    console.log(`Active camera: ${this.scene.activeCamera ? this.scene.activeCamera.name : 'NONE'}`);
    console.log(`Lights: ${this.scene.lights.length}`);

    // Mesh visibility analysis
    const visibleMeshes = [];
    const invisibleMeshes = [];
    const enabledMeshes = [];
    const disabledMeshes = [];

    for (const mesh of this.scene.meshes) {
      if (mesh.isVisible && mesh.isEnabled()) {
        visibleMeshes.push(mesh);
      } else {
        invisibleMeshes.push(mesh);
      }

      if (mesh.isEnabled()) {
        enabledMeshes.push(mesh);
      } else {
        disabledMeshes.push(mesh);
      }
    }

    console.log(`\nVISIBILITY BREAKDOWN:`);
    console.log(`  Visible & Enabled: ${visibleMeshes.length}`);
    console.log(`  Invisible/Disabled: ${invisibleMeshes.length}`);
    console.log(`  Enabled meshes: ${enabledMeshes.length}`);
    console.log(`  Disabled meshes: ${disabledMeshes.length}`);

    // Detail mesh analysis
    if (visibleMeshes.length > 0) {
      console.log(`\nVISIBLE MESHES:`);
      visibleMeshes.forEach(mesh => {
        console.log(`  ${mesh.name}: pos(${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}, ${mesh.position.z.toFixed(2)}) vertices:${mesh.getTotalVertices ? mesh.getTotalVertices() : 'N/A'}`);
      });
    }

    if (invisibleMeshes.length > 0) {
      console.log(`\nINVISIBLE/DISABLED MESHES:`);
      invisibleMeshes.slice(0, 10).forEach(mesh => { // Show only first 10
        console.log(`  ${mesh.name}: visible:${mesh.isVisible} enabled:${mesh.isEnabled()} pos(${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}, ${mesh.position.z.toFixed(2)})`);
      });
      if (invisibleMeshes.length > 10) {
        console.log(`  ... and ${invisibleMeshes.length - 10} more`);
      }
    }

    // Asset container analysis
    this.analyzeAssetContainers();

    // Material analysis
    this.analyzeMaterials();

    console.log('=== END ANALYSIS ===\n');
  }

  /**
   * Analyze asset containers
   */
  analyzeAssetContainers() {
    console.log(`\nASSET CONTAINERS: ${this.scene.getNodes().filter(n => n.getClassName && n.getClassName() === 'AssetContainer').length}`);

    // Find transform nodes that might contain assets
    const transformNodes = this.scene.transformNodes;
    const relevantNodes = transformNodes.filter(node =>
      node.name.includes('obstacle') ||
      node.name.includes('coin') ||
      node.name.includes('asset') ||
      node.getChildren().length > 0
    );

    if (relevantNodes.length > 0) {
      console.log(`TRANSFORM NODES WITH CHILDREN:`);
      relevantNodes.forEach(node => {
        const children = node.getChildren();
        console.log(`  ${node.name}: enabled:${node.isEnabled()} children:${children.length} pos(${node.position.x.toFixed(2)}, ${node.position.y.toFixed(2)}, ${node.position.z.toFixed(2)})`);
        children.forEach(child => {
          if (child.name) {
            console.log(`    - ${child.name}: ${child.getClassName ? child.getClassName() : 'Unknown'} visible:${child.isVisible !== undefined ? child.isVisible : 'N/A'} enabled:${child.isEnabled ? child.isEnabled() : 'N/A'}`);
          }
        });
      });
    }
  }

  /**
   * Analyze materials
   */
  analyzeMaterials() {
    console.log(`\nMATERIALS: ${this.scene.materials.length}`);
    const materialUsage = new Map();

    for (const mesh of this.scene.meshes) {
      if (mesh.material) {
        const matName = mesh.material.name || 'unnamed';
        materialUsage.set(matName, (materialUsage.get(matName) || 0) + 1);
      }
    }

    if (materialUsage.size > 0) {
      console.log(`MATERIAL USAGE:`);
      for (const [name, count] of materialUsage.entries()) {
        console.log(`  ${name}: ${count} meshes`);
      }
    }
  }

  /**
   * Force make all meshes visible for debugging
   */
  forceVisibilityTest() {
    console.log('\n=== FORCING ALL MESHES VISIBLE ===');
    let forcedCount = 0;

    for (const mesh of this.scene.meshes) {
      if (!mesh.isVisible || !mesh.isEnabled()) {
        mesh.isVisible = true;
        mesh.setEnabled(true);
        forcedCount++;
        console.log(`Forced visible: ${mesh.name}`);
      }
    }

    // Also force transform nodes enabled
    for (const node of this.scene.transformNodes) {
      if (!node.isEnabled()) {
        node.setEnabled(true);
        console.log(`Forced enabled transform node: ${node.name}`);
      }
    }

    console.log(`Total forced visible: ${forcedCount} meshes`);
    console.log('=== END FORCE VISIBILITY ===\n');
  }

  /**
   * Create test objects to verify rendering
   */
  createTestObjects() {
    console.log('\n=== CREATING TEST OBJECTS ===');

    // Test sphere
    const testSphere = BABYLON.MeshBuilder.CreateSphere('testSphere', { diameter: 2 }, this.scene);
    testSphere.position = new BABYLON.Vector3(0, 2, 10);

    // Bright test material
    const testMaterial = new BABYLON.StandardMaterial('testMat', this.scene);
    testMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0); // Bright red
    testMaterial.emissiveColor = new BABYLON.Color3(0.3, 0, 0); // Glowing
    testSphere.material = testMaterial;

    console.log(`Created test sphere at position: ${testSphere.position.toString()}`);
    console.log(`Test sphere visible: ${testSphere.isVisible}, enabled: ${testSphere.isEnabled()}`);

    // Test box for obstacles area
    const testBox = BABYLON.MeshBuilder.CreateBox('testBox', { size: 1 }, this.scene);
    testBox.position = new BABYLON.Vector3(0, 1, 20);

    const boxMaterial = new BABYLON.StandardMaterial('testBoxMat', this.scene);
    boxMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0); // Bright green
    boxMaterial.emissiveColor = new BABYLON.Color3(0, 0.3, 0);
    testBox.material = boxMaterial;

    console.log(`Created test box at position: ${testBox.position.toString()}`);
    console.log('=== END TEST OBJECTS ===\n');

    return { testSphere, testBox };
  }

  /**
   * Get scene statistics
   */
  getSceneStats() {
    return {
      totalMeshes: this.scene.meshes.length,
      visibleMeshes: this.scene.meshes.filter(m => m.isVisible && m.isEnabled()).length,
      transformNodes: this.scene.transformNodes.length,
      materials: this.scene.materials.length,
      lights: this.scene.lights.length,
      cameras: this.scene.cameras.length
    };
  }
}