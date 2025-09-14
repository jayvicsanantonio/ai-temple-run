# Implementation Plan

- [x] 1. Establish offline asset pipeline
  - Use GLB assets stored under `public/assets/models/`
  - Configure defaults via `src/core/config.js` or runtime overrides (`window.__TEMPLE_RUN_CONFIG__`)
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Implement Hyper3D character generation system
  - [x] 2.1 Create Hyper3DIntegration class with text-to-3D generation
    - Implemented `generateCharacterFromText` with prompt + bbox support
    - Job tracking via internal map and events
    - Implemented in: `src/core/hyper3dIntegration.js`
    - _Requirements: 1.1, 1.4_

  - [x] 2.2 Implement Hyper3D job polling and completion handling
    - Added `pollJobStatus` with subscription key headers in MAIN_SITE mode
    - Automatic polling with timeout and status normalization
    - Tracks "Done", "Failed", "In Progress"
    - _Requirements: 1.1, 1.4_

  - [x] 2.3 Create asset import system for completed Hyper3D models
    - Added `importCompletedAsset` with proper naming and validation
    - Fallback to procedural player placeholder on failure
    - _Requirements: 1.1, 1.5_
  - [x] 2.4 Add simple UI hook for manual generation
    - Debug prompt + button in HUD triggers generation/poll/import
    - Integrates imported model by replacing player mesh

- [x] 3. Implement PolyHaven texture integration
  - [x] 3.1 Create PolyHavenIntegration class for texture management
    - Added `searchTextures`, `downloadTexture` with resolution/format, and caching
    - Implemented in: `src/core/polyHavenIntegration.js`
    - _Requirements: 2.1, 2.4_

  - [x] 3.2 Implement texture application system
    - Added `applyTextureToObject` using Babylon PBR material
    - Supports albedo/diffuse, normal, roughness (with canvas composition)
    - Included simple texture atlas builder `createTextureAtlas`
    - _Requirements: 2.1, 2.4, 2.5_

- [x] 4. Prepare GLB usage
  - [x] 4.1 Support loading GLBs and caching
    - Implemented in: `src/core/blenderAssetManager.js`
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 4.2 Implement texture compression system
    - Added client-side hooks for KTX2/Basis
    - Runtime support detection and KTX2 transcoder config utils
    - Implemented in: `src/utils/textureCompression.js`
    - _Requirements: 2.3, 6.2, 6.5_

- [x] 5. Integrate physics engine (Ammo.js or Cannon.js)
  - [x] 5.1 Create PhysicsEngineManager with engine selection
    - Added detection for Ammo/Cannon with Babylon plugins and SIMPLE fallback
    - World configuration: gravity, basic step, obstacle body registry
    - Implemented in: `src/core/physicsEngineManager.js`
    - _Requirements: 3.1, 3.2_

  - [x] 5.2 Implement realistic character physics
    - SIMPLE engine: momentum-based lateral movement, gravity jump, ground detect
    - Hooks from `PlayerController` to physics for jump/speed/lanes
    - _Requirements: 3.2, 5.1, 5.2_

  - [x] 5.3 Implement collision detection and response
    - SIMPLE engine AABB collision check replaces prior intersect check when enabled
    - Obstacle registration/unregistration to physics manager from `ObstacleManager`
    - _Requirements: 3.3, 5.3, 5.5_

- [x] 6. Create animation state machine
  - [x] 6.1 Implement AnimationStateMachine class
    - State registration for run, jump, slide, death
    - Smooth cross-fade transitions with blend durations
    - Integrated with Babylon AnimationGroups (state machine abstraction)
    - Implemented in: `src/core/animationStateMachine.js` and wired in `playerController.js`
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [x] 6.2 Implement ragdoll physics for death animation
    - Added SIMPLE ragdoll mode in `PhysicsEngineManager` with spin/fall on death
    - `playerController.die()` triggers ragdoll; integrates with existing physics
    - Ready to extend with skeletal ragdoll when rigged assets arrive
    - _Requirements: 3.5, 4.4_

- [x] 7. Implement LOD (Level of Detail) system
  - [x] 7.1 Create AssetOptimizer class with LOD management
    - Added `AssetOptimizer` with Babylon simplifier support and fallback material degradation
    - Distance-based LOD switching via `addLODLevel` and simplification settings
    - Implemented in: `src/core/assetOptimizer.js`; integrated for player and obstacles
    - _Requirements: 2.5, 6.1, 6.4_

  - [x] 7.2 Implement performance monitoring and optimization
    - Added `PerformanceMonitor` tracking FPS, physics update time, and texture memory guess
    - Automatic LOD distance scaling to maintain FPS window
    - Implemented in: `src/core/performanceMonitor.js`; wired into game loop
    - _Requirements: 6.1, 6.3, 6.4_

- [x] 8. Create comprehensive asset management system
  - [x] 8.1 Implement BlenderAssetManager integration
    - Unified GLB loader/caching manager
    - Asset caching with ref-counts, metadata registry, validation helpers
    - Implemented in: `src/core/blenderAssetManager.js`
    - _Requirements: 1.1, 1.2, 2.1, 2.2_

  - [x] 8.2 Create asset loading and streaming system
    - Progressive, prioritized GLB loading queue (Babylon SceneLoader wrapper)
    - Unload/release via ref-count disposal for memory management
    - Note: Three.js GLTFLoader replaced with Babylon loader in this project
    - _Requirements: 2.2, 6.3, 6.5_

- [x] 9. Implement error handling and fallback systems
  - [x] 9.1 Create comprehensive error handling classes
    - Added `AssetLoadingError`, `PhysicsEngineError` in `src/utils/errors.js`
    - Graceful degradation to placeholder meshes in `AssetManager.createPlaceholderMesh`
    - Basic logger with ring buffer in `src/utils/logger.js`
    - _Requirements: 1.3, 3.1, 5.5_

  - [x] 9.2 Implement fallback and recovery mechanisms
    - Physics auto-fallback to SIMPLE already implemented; now adds status banner feedback
    - Asset loading retries with exponential backoff + placeholder fallback
    - UI status banner for MCP connection and generation issues
    - _Requirements: 3.1, 5.5, 6.4_

- [x] 10. Integrate all systems into game engine
  - [x] 10.1 Replace existing placeholder character with Hyper3D generated model
    - Config-driven character source: PROCEDURAL | GLB | HYPER3D
    - Integrates imported model with PlayerController; applies LOD
    - Implemented in: `src/index.js` (setupRuntimeAssets), config under `gameAssets.character`
    - _Requirements: 1.1, 4.1, 4.2, 4.3_

  - [x] 10.2 Replace obstacle system with 3D generated obstacles
    - ObstacleManager supports prefab GLB visuals with collision boxes retained
    - Prefabs loaded via BlenderAssetManager; LOD applied when available
    - Implemented in: `src/core/obstacleManager.js`, `src/index.js` (runtime assets)
    - _Requirements: 1.2, 2.1, 2.4_

  - [x] 10.3 Update collision system to use physics engine
    - Physics collision path active when physics is enabled (Task 5)
    - Obstacles registered/unregistered with physics manager
    - _Requirements: 3.3, 5.3, 5.5_

- [x] 10.4 Integrate offline assets with game engine
    - Runtime GLB loading and caching integrated
    - Unified manager (`BlenderAssetManager`) used by game; performance monitor present
    - Implemented in: `src/index.js`, `src/core/blenderAssetManager.js`, `src/core/config.js`
    - _Requirements: 2.2, 2.3, 6.1, 6.5_

- [x] 11. Finalize responsive physics controls and performance optimization
  - [x] 11.1 Implement responsive character controls with physics
    - Jump impulse computed from gravity for consistent height; instant response
    - Ground detection emits landing events; landing squash feedback added
    - Sliding reduces collider height for precise under-obstacle clearance
    - Implemented in: `src/core/physicsEngineManager.js`, `src/core/playerController.js`
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 11.2 Complete performance optimization systems
    - Auto LOD scaling (Task 7) and physics accuracy scaling added when FPS drops
    - Implemented in: `src/core/performanceMonitor.js` (calls `physics.setAccuracyScale`)
    - _Requirements: 6.3, 6.4, 6.5_

  - [x] 11.3 Ensure all UV mapping and materials are properly implemented
    - Validation pass checks UVs/materials on loaded/imported assets
    - Implemented in: `src/core/blenderAssetManager.js#validateMaterials`
    - _Requirements: 1.5, 2.4_

  - [x] 11.4 Complete animation blending and physics turning systems
    - Animation blending completed earlier (Task 6); physics lateral acceleration handles turning
    - Collision shapes adjusted during slide without extra overhead
    - _Requirements: 4.5, 5.4, 6.3_

- [ ] 12. Prepare foundation for remaining Priority 1 roadmap features
  - [ ] 12.1 Create asset management hooks for future audio system integration
    - Design audio asset loading interface compatible with current 3D asset pipeline
    - Prepare animation event system for audio trigger points
    - Create performance monitoring hooks for audio processing
    - _Note: Addresses roadmap Priority 1 item "Audio Assets"_

  - [ ] 12.2 Design data structures for future save system integration
    - Create asset metadata persistence system for save/load compatibility
    - Design physics state serialization for game state saving
    - Implement asset caching system that supports cloud synchronization
    - _Note: Addresses roadmap Priority 1 item "Save System & Progression"_
  - [ ] 12.3 Update improvements roadmap document with implementation status
    - Mark "Actual 3D Assets" and "Proper Physics Engine" as completed in roadmap
    - Update implementation status for all completed features
    - Revise priority rankings based on new technical foundation
    - Add new technical requirements discovered during 3D assets and physics implementation
    - Update estimated development times for remaining features
    - _Note: Keeps roadmap current with actual implementation progress_
