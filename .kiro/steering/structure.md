# Project Structure

## Directory Organization

```
ai-temple-run/
├── public/                    # Static assets served directly
│   ├── assets/
│   │   ├── models/           # 3D models (GLB/GLTF)
│   │   │   ├── architecture/ # Temple structures, pillars, walls
│   │   │   ├── decorations/  # Environmental details, symbols
│   │   │   ├── obstacles/    # Logs, spikes, blocks
│   │   │   └── pathways/     # Path segments, intersections
│   │   └── textures/         # PBR texture sets
│   │       ├── metal/        # Metal materials with full PBR maps
│   │       ├── organic/      # Wood, bark, mud textures
│   │       └── stone/        # Stone, brick, cliff textures
├── src/                      # Source code
│   ├── core/                 # Core game systems
│   ├── scenes/               # Babylon.js scene management
│   ├── utils/                # Utility modules
│   └── index.js              # Main entry point
└── docs/                     # Documentation
```

## Core Architecture Patterns

### Module System

- ES6 modules with explicit imports/exports
- Each core system is a class with consistent interface:
  - `init()` - Initialize the system
  - `update(deltaTime)` - Frame update logic
  - `reset()` - Reset to initial state

### Game Systems (`src/core/`)

- **gameLoop.js**: Central update coordinator, registers all systems
- **playerController.js**: Player movement, animations, input handling
- **obstacleManager.js**: Obstacle spawning, pooling, collision detection
- **coinManager.js**: Coin placement, collection, scoring
- **worldManager.js**: Procedural tile generation and management
- **assetManager.js**: 3D asset loading, LOD management
- **uiManager.js**: HUD, menus, game state UI
- **soundManager.js**: Audio effects and music
- **particleEffects.js**: Visual effects system

### Utilities (`src/utils/`)

- **inputHandler.js**: Keyboard and touch input abstraction
- **performanceMonitor.js**: FPS tracking, memory usage
- **performanceTest.js**: Automated performance testing

## Asset Conventions

### 3D Models

- Format: GLB (preferred) or GLTF
- Naming: `snake_case_description.glb`
- Organization by category (architecture, obstacles, etc.)
- Include LOD variants when needed

### Textures

- PBR workflow: Diffuse, Normal, Roughness, AO, Displacement
- Naming: `texture_name_MapType.jpg` (e.g., `brick_wall_Diffuse.jpg`)
- Resolution: Power of 2 (512x512, 1024x1024, 2048x2048)
- Format: JPG for diffuse, PNG for alpha channels

## Code Style Guidelines

### JavaScript Conventions

- ES6+ features (classes, arrow functions, destructuring)
- Single quotes for strings
- 2-space indentation
- 100 character line limit
- Trailing commas in multi-line structures

### Class Structure

```javascript
export class SystemName {
  constructor(dependencies) {
    // Initialize properties
  }

  init() {
    // Setup logic
  }

  update(deltaTime) {
    // Frame update
  }

  reset() {
    // Reset state
  }
}
```

### Documentation

- JSDoc comments for public methods
- Inline comments for complex logic
- README.md for setup and deployment
- Architecture decisions in docs/

## Performance Patterns

- Object pooling for frequently created/destroyed objects
- LOD system for 3D assets based on distance
- Efficient collision detection with spatial partitioning
- Mobile-optimized rendering settings
