# Design Document

## Overview

This design outlines the implementation of a comprehensive 3D asset pipeline using Blender MCP integration and physics engine replacement for the AI Temple Run game. The solution replaces placeholder geometry with professional 3D assets created through Blender, establishes a GLB export workflow, and integrates either Ammo.js or Cannon.js for realistic physics simulation. The architecture focuses on performance optimization through LOD systems, texture compression, and efficient asset streaming.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Blender MCP   │───▶│  Asset Pipeline  │───▶│   Three.js      │
│   Integration   │    │                  │    │   Game Engine   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                          │
                              ▼                          ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │  GLB Export      │    │ Physics Engine  │
                       │  & Compression   │    │ (Ammo/Cannon)   │
                       └──────────────────┘    └─────────────────┘
```

### Asset Creation Workflow

1. **Blender MCP Asset Generation**
   - Use Hyper3D Rodin (MAIN_SITE mode, free trial) for character generation via text prompts
   - Download high-quality textures from PolyHaven for materials
   - Create obstacle variations using Blender modeling tools
   - Generate environment props and decorative elements
   - Apply PolyHaven textures with proper UV mapping

2. **Export Pipeline**
   - Automated GLB export from Blender
   - Texture compression to KTX2/Basis format
   - LOD generation for performance optimization
   - Animation data export for skeletal animations

3. **Runtime Integration**
   - Asset loading through Three.js GLTFLoader
   - Physics body generation from collision meshes
   - Animation state machine implementation
   - Performance monitoring and optimization

## Components and Interfaces

### 0. Hyper3DIntegration

```javascript
class Hyper3DIntegration {
  constructor() {
    this.mode = 'MAIN_SITE'; // Free trial mode
    this.activeJobs = new Map();
  }

  async generateCharacterFromText(prompt, bboxCondition = null) {
    // Generate 3D character using text prompt
    // Example prompts:
    // - "athletic runner in ancient temple explorer outfit"
    // - "agile parkour character with backpack and boots"
    const result = await mcp_blender_generate_hyper3d_model_via_text({
      text_prompt: prompt,
      bbox_condition: bboxCondition,
    });

    this.activeJobs.set(result.taskUuid, {
      type: 'character',
      status: 'generating',
      startTime: Date.now(),
    });

    return result;
  }

  async generateObstacleFromText(prompt, bboxCondition = [1, 1, 0.5]) {
    // Generate obstacles with appropriate proportions
    // Example prompts:
    // - "ancient stone pillar obstacle for temple run"
    // - "broken temple wall barrier"
    const result = await mcp_blender_generate_hyper3d_model_via_text({
      text_prompt: prompt,
      bbox_condition: bboxCondition,
    });

    return result;
  }

  async pollJobStatus(taskUuid) {
    // Poll Hyper3D job completion status
    return await mcp_blender_poll_rodin_job_status({
      subscription_key: taskUuid, // For MAIN_SITE mode
    });
  }

  async importCompletedAsset(taskUuid, objectName) {
    // Import the generated asset into Blender scene
    return await mcp_blender_import_generated_asset({
      name: objectName,
      task_uuid: taskUuid,
    });
  }
}
```

### 0.1. PolyHavenIntegration

```javascript
class PolyHavenIntegration {
  constructor() {
    this.textureCache = new Map();
    this.supportedCategories = ['stone', 'fabric', 'metal', 'wood', 'concrete'];
  }

  async searchTextures(category, count = 5) {
    // Search for textures in specific category
    return await mcp_blender_search_polyhaven_assets({
      asset_type: 'textures',
      categories: category,
    });
  }

  async downloadTexture(assetId, resolution = '1k', format = 'jpg') {
    // Download texture at specified resolution
    const result = await mcp_blender_download_polyhaven_asset({
      asset_id: assetId,
      asset_type: 'textures',
      resolution: resolution,
      file_format: format,
    });

    this.textureCache.set(assetId, result);
    return result;
  }

  async applyTextureToObject(objectName, textureId) {
    // Apply downloaded texture to Blender object
    return await mcp_blender_set_texture({
      object_name: objectName,
      texture_id: textureId,
    });
  }
}
```

### 1. BlenderAssetManager

```javascript
class BlenderAssetManager {
  constructor() {
    this.mcpConnection = null;
    this.assetCache = new Map();
    this.lodLevels = ['high', 'medium', 'low'];
    this.hyper3dEnabled = true; // MAIN_SITE mode, free trial
    this.polyhavenEnabled = true;
  }

  async generateCharacter(prompt, bboxCondition = null) {
    // Use Hyper3D Rodin text-to-3D generation
    // Example: "athletic runner character in temple explorer outfit"
    const result = await this.generateHyper3DModelViaText(prompt, bboxCondition);

    // Poll for completion and import when ready
    await this.pollAndImportHyper3DAsset(result.taskUuid, 'Character');

    // Apply PolyHaven textures for enhanced materials
    await this.applyPolyHavenTextures('Character', 'fabric', 'leather');

    return this.exportAsGLB('Character', 'high');
  }

  async generateObstacle(type, variations = 3) {
    // Create obstacle variations using Blender modeling
    const obstacles = [];
    for (let i = 0; i < variations; i++) {
      const prompt = `${type} obstacle variation ${i + 1} for temple run game`;
      const result = await this.generateHyper3DModelViaText(prompt);
      obstacles.push(result);
    }

    // Apply stone/temple textures from PolyHaven
    await this.applyPolyHavenTextures(obstacles, 'stone', 'concrete');

    return obstacles;
  }

  async downloadPolyHavenTexture(category, resolution = '1k') {
    // Search and download appropriate textures
    const assets = await this.searchPolyHavenAssets('textures', category);
    const selectedAsset = assets[0]; // Pick first suitable texture

    return await this.downloadPolyHavenAsset(selectedAsset.id, 'textures', resolution, 'jpg');
  }

  async exportAsGLB(objectName, lodLevel = 'high') {
    // Export Blender object to GLB format with animations
    // Include materials and compressed textures
    // Generate multiple LOD levels if needed
  }
}
```

### 2. PhysicsEngineManager

```javascript
class PhysicsEngineManager {
  constructor(engine = 'ammo') {
    this.engine = engine; // 'ammo' or 'cannon'
    this.world = null;
    this.bodies = new Map();
    this.gravity = -9.81;
  }

  async initialize() {
    // Initialize chosen physics engine
    // Set up world with gravity
    // Configure collision detection
  }

  createRigidBody(mesh, mass, shape) {
    // Create physics body from Three.js mesh
    // Add to physics world
    // Return body reference for game logic
  }

  enableRagdoll(characterMesh) {
    // Convert character to ragdoll physics
    // Disable kinematic control
    // Apply death forces
  }
}
```

### 3. AnimationStateMachine

```javascript
class AnimationStateMachine {
  constructor(mixer, animations) {
    this.mixer = mixer;
    this.states = new Map();
    this.currentState = 'idle';
    this.transitions = new Map();
  }

  addState(name, animation, loop = true) {
    // Register animation state
    // Configure looping and blending
  }

  transition(toState, duration = 0.2) {
    // Smooth transition between animations
    // Handle blending and timing
  }

  update(deltaTime) {
    // Update animation mixer
    // Handle state transitions
  }
}
```

### 4. AssetOptimizer

```javascript
class AssetOptimizer {
  constructor() {
    this.lodManager = new LODManager();
    this.textureCompressor = new TextureCompressor();
    this.performanceMonitor = new PerformanceMonitor();
  }

  optimizeForDevice(assets, deviceCapabilities) {
    // Adjust LOD levels based on device
    // Compress textures appropriately
    // Reduce polygon counts if needed
  }

  createLODLevels(mesh, levels = [1.0, 0.5, 0.25]) {
    // Generate multiple detail levels
    // Use mesh decimation algorithms
    // Maintain visual quality at distance
  }
}
```

## Data Models

### Asset Metadata

```javascript
const AssetMetadata = {
  id: String,
  name: String,
  type: 'character' | 'obstacle' | 'environment',
  source: 'hyper3d' | 'polyhaven' | 'manual',
  generationData: {
    hyper3d: {
      taskUuid: String,
      textPrompt: String,
      bboxCondition: Array,
      generatedAt: Date,
      mode: 'MAIN_SITE', // Free trial mode
    },
    polyhaven: {
      assetId: String,
      category: String,
      resolution: String,
      downloadedAt: Date,
    },
  },
  lodLevels: {
    high: { polygons: Number, textureSize: Number },
    medium: { polygons: Number, textureSize: Number },
    low: { polygons: Number, textureSize: Number },
  },
  animations: [
    {
      name: String,
      duration: Number,
      loop: Boolean,
      blendMode: String,
    },
  ],
  materials: [
    {
      name: String,
      textures: {
        diffuse: String,
        normal: String,
        roughness: String,
        polyhavenSource: String, // PolyHaven asset ID if applicable
      },
    },
  ],
  physics: {
    collisionShape: 'box' | 'sphere' | 'mesh',
    mass: Number,
    friction: Number,
    restitution: Number,
  },
};
```

### Physics Configuration

```javascript
const PhysicsConfig = {
  engine: 'ammo' | 'cannon',
  world: {
    gravity: { x: Number, y: Number, z: Number },
    broadphase: String,
    solver: String,
  },
  character: {
    mass: Number,
    jumpForce: Number,
    movementSpeed: Number,
    friction: Number,
  },
  obstacles: {
    staticFriction: Number,
    dynamicFriction: Number,
    restitution: Number,
  },
};
```

## Error Handling

### Asset Loading Errors

```javascript
class AssetLoadingError extends Error {
  constructor(assetId, reason) {
    super(`Failed to load asset ${assetId}: ${reason}`);
    this.assetId = assetId;
    this.reason = reason;
  }
}

// Error handling strategy
const handleAssetError = (error) => {
  if (error instanceof AssetLoadingError) {
    // Fall back to placeholder geometry
    // Log error for debugging
    // Continue game execution
  }
};
```

### Physics Engine Errors

```javascript
class PhysicsEngineError extends Error {
  constructor(operation, details) {
    super(`Physics engine error during ${operation}: ${details}`);
    this.operation = operation;
    this.details = details;
  }
}

// Graceful degradation
const handlePhysicsError = (error) => {
  // Fall back to simple collision detection
  // Disable advanced physics features
  // Maintain basic gameplay
};
```

### Blender MCP Connection Errors

```javascript
class BlenderMCPError extends Error {
  constructor(command, reason) {
    super(`Blender MCP command ${command} failed: ${reason}`);
    this.command = command;
    this.reason = reason;
  }
}

// Connection recovery
const handleMCPError = (error) => {
  // Attempt reconnection
  // Use cached assets if available
  // Provide user feedback
};
```

## Testing Strategy

### Unit Tests

1. **Asset Generation Tests**

   ```javascript
   describe('BlenderAssetManager', () => {
     test('generates character with valid GLB output', async () => {
       const manager = new BlenderAssetManager();
       const character = await manager.generateCharacter('runner');
       expect(character.format).toBe('GLB');
       expect(character.animations.length).toBeGreaterThan(0);
     });
   });
   ```

2. **Physics Engine Tests**
   ```javascript
   describe('PhysicsEngineManager', () => {
     test('creates rigid body with correct properties', () => {
       const physics = new PhysicsEngineManager('ammo');
       const body = physics.createRigidBody(mesh, 1.0, 'box');
       expect(body.mass).toBe(1.0);
       expect(body.shape).toBe('box');
     });
   });
   ```

### Integration Tests

1. **Asset Pipeline Integration**
   - Test complete Blender → GLB → Three.js workflow
   - Verify animation data preservation
   - Validate texture compression results

2. **Physics Integration**
   - Test collision detection accuracy
   - Verify momentum-based movement
   - Validate ragdoll physics activation

### Performance Tests

1. **LOD System Validation**
   - Measure frame rate with different LOD levels
   - Test automatic LOD switching
   - Validate visual quality maintenance

2. **Memory Usage Monitoring**
   - Track texture memory consumption
   - Monitor physics simulation overhead
   - Test asset streaming efficiency

### Visual Regression Tests

1. **Asset Quality Verification**
   - Compare rendered output with reference images
   - Validate animation smoothness
   - Test material appearance consistency

2. **Physics Behavior Validation**
   - Record and compare physics simulations
   - Verify consistent collision responses
   - Test ragdoll physics determinism
