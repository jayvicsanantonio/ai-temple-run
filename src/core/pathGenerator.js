/**
 * Path Generator Module - Handles creation of textured temple paths from scratch
 */

import * as BABYLON from 'babylonjs';

export class PathGenerator {
  constructor(scene, assetManager) {
    this.scene = scene;
    this.assetManager = assetManager;

    // Path configuration
    this.pathWidth = 6; // Width to cover all 3 lanes
    this.pathLength = 20; // Length of each path segment
    this.lanePositions = [-2, 0, 2]; // Player lane positions
    this.pathHeight = 0.1; // Thickness of path segments

    // Path materials
    this.materials = {};
    this.texturePatterns = [
      'stone_path',
      'temple_stones',
      'ancient_cobble',
      'worn_brick'
    ];

    // Path segment types
    this.segmentTypes = [
      'straight',
      'platform',
      'bridge',
      'stairs'
    ];

    this.initializeMaterials();
  }

  /**
   * Initialize path materials with high-quality textures
   */
  initializeMaterials() {
    // Primary stone path material
    const stonePathMaterial = new BABYLON.StandardMaterial('stonePathMaterial', this.scene);
    stonePathMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.7, 0.6); // Warm stone
    stonePathMaterial.specularColor = new BABYLON.Color3(0.3, 0.25, 0.2);
    stonePathMaterial.ambientColor = new BABYLON.Color3(0.4, 0.35, 0.3);
    stonePathMaterial.bumpTexture = this.createProceduralStoneTexture('stone_normal');
    stonePathMaterial.diffuseTexture = this.createProceduralStoneTexture('stone_diffuse');
    this.materials.stone = stonePathMaterial;

    // Temple cobblestone material
    const cobbleMaterial = new BABYLON.StandardMaterial('cobblePathMaterial', this.scene);
    cobbleMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.65, 0.55); // Ancient cobble
    cobbleMaterial.specularColor = new BABYLON.Color3(0.2, 0.15, 0.1);
    cobbleMaterial.ambientColor = new BABYLON.Color3(0.35, 0.3, 0.25);
    cobbleMaterial.diffuseTexture = this.createProceduralCobbleTexture();
    this.materials.cobble = cobbleMaterial;

    // Worn brick material
    const brickMaterial = new BABYLON.StandardMaterial('brickPathMaterial', this.scene);
    brickMaterial.diffuseColor = new BABYLON.Color3(0.75, 0.55, 0.45); // Weathered brick
    brickMaterial.specularColor = new BABYLON.Color3(0.25, 0.2, 0.15);
    brickMaterial.ambientColor = new BABYLON.Color3(0.4, 0.3, 0.25);
    brickMaterial.diffuseTexture = this.createProceduralBrickTexture();
    this.materials.brick = brickMaterial;
  }

  /**
   * Create procedural stone texture
   */
  createProceduralStoneTexture(name) {
    const texture = new BABYLON.DynamicTexture(name, 512, this.scene);
    const ctx = texture.getContext();

    // Create stone pattern
    ctx.fillStyle = '#B8A082'; // Base stone color
    ctx.fillRect(0, 0, 512, 512);

    // Add stone block pattern
    ctx.strokeStyle = '#8F7862';
    ctx.lineWidth = 2;

    // Horizontal lines
    for (let y = 0; y < 512; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Vertical lines (offset every other row)
    for (let x = 0; x < 512; x += 128) {
      for (let y = 0; y < 512; y += 128) {
        const offsetX = (Math.floor(y / 64) % 2) * 64;
        ctx.beginPath();
        ctx.moveTo(x + offsetX, y);
        ctx.lineTo(x + offsetX, y + 64);
        ctx.stroke();
      }
    }

    // Add wear and weathering
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#A0906F';
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 20 + 5;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    texture.update();
    texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    texture.uScale = 2;
    texture.vScale = 2;

    return texture;
  }

  /**
   * Create procedural cobblestone texture
   */
  createProceduralCobbleTexture() {
    const texture = new BABYLON.DynamicTexture('cobbleTexture', 512, this.scene);
    const ctx = texture.getContext();

    // Base color
    ctx.fillStyle = '#A89680';
    ctx.fillRect(0, 0, 512, 512);

    // Draw individual cobblestones
    const cobbleSize = 32;
    for (let y = 0; y < 512; y += cobbleSize) {
      for (let x = 0; x < 512; x += cobbleSize) {
        // Random offset for natural look
        const offsetX = (Math.random() - 0.5) * 8;
        const offsetY = (Math.random() - 0.5) * 8;

        // Cobblestone color variation
        const variation = Math.random() * 0.2 - 0.1;
        const r = Math.floor((0.66 + variation) * 255);
        const g = Math.floor((0.59 + variation) * 255);
        const b = Math.floor((0.50 + variation) * 255);

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.strokeStyle = '#6B5D4F';
        ctx.lineWidth = 1;

        // Draw cobblestone
        ctx.beginPath();
        ctx.arc(x + cobbleSize/2 + offsetX, y + cobbleSize/2 + offsetY, cobbleSize/3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    texture.update();
    texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    texture.uScale = 3;
    texture.vScale = 3;

    return texture;
  }

  /**
   * Create procedural brick texture
   */
  createProceduralBrickTexture() {
    const texture = new BABYLON.DynamicTexture('brickTexture', 512, this.scene);
    const ctx = texture.getContext();

    // Base color
    ctx.fillStyle = '#B8906F';
    ctx.fillRect(0, 0, 512, 512);

    // Draw brick pattern
    const brickWidth = 64;
    const brickHeight = 32;

    ctx.strokeStyle = '#8B6F4A';
    ctx.lineWidth = 2;

    for (let y = 0; y < 512; y += brickHeight) {
      for (let x = 0; x < 512; x += brickWidth) {
        // Offset every other row
        const offsetX = (Math.floor(y / brickHeight) % 2) * (brickWidth / 2);
        const actualX = x + offsetX;

        // Color variation for each brick
        const variation = (Math.random() - 0.5) * 0.15;
        const r = Math.floor((0.72 + variation) * 255);
        const g = Math.floor((0.56 + variation) * 255);
        const b = Math.floor((0.44 + variation) * 255);

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(actualX, y, brickWidth - 2, brickHeight - 2);

        // Brick outline
        ctx.strokeRect(actualX, y, brickWidth - 2, brickHeight - 2);
      }
    }

    texture.update();
    texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    texture.uScale = 2;
    texture.vScale = 2;

    return texture;
  }

  /**
   * Create a new path segment with textures
   */
  createPathSegment(name, position, segmentType = 'straight') {
    const segment = new BABYLON.TransformNode(`pathSegment_${name}`, this.scene);
    segment.position = position.clone();

    // Create main path mesh
    const pathMesh = BABYLON.MeshBuilder.CreateBox(
      `${name}_path`,
      {
        width: this.pathWidth,
        height: this.pathHeight,
        depth: this.pathLength
      },
      this.scene
    );

    pathMesh.position.y = this.pathHeight / 2; // Elevate slightly above ground
    pathMesh.parent = segment;
    pathMesh.receiveShadows = true;

    // Apply material based on segment type
    this.applyPathMaterial(pathMesh, segmentType);

    // Add lane markers for visual clarity
    this.addLaneMarkers(segment, name);

    // Add edge details
    this.addPathEdges(segment, name);

    // Store segment data
    segment.segmentData = {
      type: segmentType,
      pathMesh: pathMesh,
      lanes: this.lanePositions.slice(),
      length: this.pathLength,
      width: this.pathWidth
    };

    return segment;
  }

  /**
   * Apply material to path mesh based on segment type
   */
  applyPathMaterial(pathMesh, segmentType) {
    let material;

    switch (segmentType) {
      case 'bridge':
        material = this.materials.brick;
        break;
      case 'stairs':
        material = this.materials.stone;
        break;
      case 'platform':
        material = this.materials.cobble;
        break;
      default: // straight
        material = this.materials.stone;
        break;
    }

    pathMesh.material = material;
  }

  /**
   * Add lane marker lines to path
   */
  addLaneMarkers(segment, name) {
    const markerMaterial = new BABYLON.StandardMaterial(`${name}_markerMat`, this.scene);
    markerMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.85, 0.7); // Light stone lines
    markerMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.08, 0.06);

    // Create lane divider lines
    for (let i = 0; i < this.lanePositions.length - 1; i++) {
      const lanePos = (this.lanePositions[i] + this.lanePositions[i + 1]) / 2;

      const marker = BABYLON.MeshBuilder.CreateBox(
        `${name}_marker_${i}`,
        { width: 0.1, height: 0.02, depth: this.pathLength * 0.8 },
        this.scene
      );

      marker.position.x = lanePos;
      marker.position.y = this.pathHeight + 0.01; // Slightly above path
      marker.position.z = 0;
      marker.parent = segment;
      marker.material = markerMaterial;
    }
  }

  /**
   * Add decorative edges to path
   */
  addPathEdges(segment, name) {
    const edgeMaterial = new BABYLON.StandardMaterial(`${name}_edgeMat`, this.scene);
    edgeMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.5, 0.4); // Darker edge stone
    edgeMaterial.specularColor = new BABYLON.Color3(0.1, 0.08, 0.06);

    // Left edge
    const leftEdge = BABYLON.MeshBuilder.CreateBox(
      `${name}_leftEdge`,
      { width: 0.2, height: this.pathHeight * 2, depth: this.pathLength },
      this.scene
    );
    leftEdge.position.x = -this.pathWidth / 2 - 0.1;
    leftEdge.position.y = this.pathHeight;
    leftEdge.parent = segment;
    leftEdge.material = edgeMaterial;
    leftEdge.receiveShadows = true;

    // Right edge
    const rightEdge = BABYLON.MeshBuilder.CreateBox(
      `${name}_rightEdge`,
      { width: 0.2, height: this.pathHeight * 2, depth: this.pathLength },
      this.scene
    );
    rightEdge.position.x = this.pathWidth / 2 + 0.1;
    rightEdge.position.y = this.pathHeight;
    rightEdge.parent = segment;
    rightEdge.material = edgeMaterial;
    rightEdge.receiveShadows = true;
  }

  /**
   * Create a series of connected path segments
   */
  createPathSequence(startPosition, segmentCount = 5) {
    const segments = [];
    let currentPosition = startPosition.clone();

    for (let i = 0; i < segmentCount; i++) {
      // Vary segment types for visual interest
      const segmentType = this.segmentTypes[Math.floor(Math.random() * this.segmentTypes.length)];

      const segment = this.createPathSegment(`seg_${i}`, currentPosition, segmentType);
      segments.push(segment);

      // Move to next position
      currentPosition.z += this.pathLength;
    }

    return segments;
  }

  /**
   * Create entrance path with special texturing
   */
  createEntrancePath(position) {
    const entrance = this.createPathSegment('entrance', position, 'platform');

    // Add special entrance material
    const entranceMaterial = new BABYLON.StandardMaterial('entrancePathMaterial', this.scene);
    entranceMaterial.diffuseColor = new BABYLON.Color3(0.85, 0.75, 0.65); // Lighter entrance stone
    entranceMaterial.specularColor = new BABYLON.Color3(0.4, 0.35, 0.3);
    entranceMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.04, 0.03);
    entranceMaterial.diffuseTexture = this.createProceduralStoneTexture('entrance_stone');

    const pathMesh = entrance.segmentData.pathMesh;
    pathMesh.material = entranceMaterial;

    return entrance;
  }

  /**
   * Get material for external use
   */
  getMaterial(name) {
    return this.materials[name];
  }

  /**
   * Dispose of all materials and textures
   */
  dispose() {
    Object.values(this.materials).forEach(material => {
      if (material.diffuseTexture) material.diffuseTexture.dispose();
      if (material.bumpTexture) material.bumpTexture.dispose();
      material.dispose();
    });
    this.materials = {};
  }
}