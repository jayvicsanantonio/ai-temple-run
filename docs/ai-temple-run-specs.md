# Temple Run–Like Web App: Technical Specifications

This document describes the technologies, frameworks, and workflows required to build a Temple Run–like endless runner game as a **web application**. It is designed to be **AI agent–friendly**, meaning all components are explicitly defined with clear roles and interactions. The project will integrate **Blender MCP** for asset creation.

---

## 1. Project Overview

- **Game Type**: Endless Runner (Temple Run–like)
- **Platform**: Web (modern browsers, desktop + mobile)
- **Core Gameplay**:
  - Player character auto-runs forward.
  - Player can switch lanes (left, middle, right), jump, and slide.
  - Obstacles and coins are spawned procedurally.
  - Game ends when the player collides with an obstacle.
  - Score increases over time and with collected coins.

---

## 2. Core Technology Stack

### 2.1 Asset Creation
- **Blender + Blender MCP**
  - Role: Model, texture, rig, and animate characters, environments, and obstacles.
  - Export Format: `.glb` / `.gltf` (industry standard for web delivery).
  - Animations required:
    - Idle
    - Run cycle
    - Jump
    - Slide
    - Death/fall
  - Assets required:
    - Character (runner)
    - Tiles (ground segments)
    - Obstacles (logs, rocks, pits, spikes)
    - Coins
    - Environment (trees, cliffs, skybox)

---

### 2.2 Web Game Engine
- **Babylon.js**
  - High-level WebGL engine with physics, animation, and collision detection.
  - Built-in support for `.gltf` assets.
  - Provides scene graph, lighting, materials, and camera control.

---

### 2.3 Physics & Collision
- **Babylon.js Physics Plugin**
  - Options: Ammo.js, Cannon.js, Oimo.js.
  - Role: Handle basic collision detection between player and obstacles.
  - Simplification: Lane-based system (3 discrete positions) minimizes complex physics calculations.

---

### 2.4 Game Logic
- **JavaScript (ES6+ or TypeScript)**
  - Implement gameplay loop, procedural spawning, score system, and input handling.
  - Organize code into modules:
    - `playerController.js`
    - `obstacleManager.js`
    - `coinManager.js`
    - `gameLoop.js`
    - `uiManager.js`

---

### 2.5 User Interface
- **HTML + CSS (TailwindCSS recommended)**
  - UI Elements:
    - Start screen
    - Score display
    - Coin counter
    - Game over screen
    - Restart button

---

### 2.6 Input Handling
- **Keyboard / Mouse (Desktop)**
  - Arrow keys or WASD for left/right/jump/slide.
- **Touch (Mobile)**
  - Swipe gestures (left, right, up, down).
  - Implemented with a library like **Hammer.js** or custom touch event handling.

---

### 2.7 Procedural Generation
- **Tile Spawner System**
  - Maintains a pool of ground tiles.
  - Spawns new tiles ahead of the player.
  - Recycles tiles that fall behind.
  - Randomly attaches obstacles and coins to tiles.

---

### 2.8 Build & Tooling
- **Vite** or **Next.js**
  - Role: Modern bundler and dev server.
  - Provides hot reload and optimized builds.

- **ESLint + Prettier**
  - Code quality and consistency.

- **GitHub / GitLab**
  - Version control and CI/CD.

---

### 2.9 Deployment
- **Static Hosting**
  - Options: Vercel, Netlify, GitHub Pages.
  - Assets (GLTF/GLB) served from CDN for performance.

---

## 3. AI Integration (Optional Extensions)

While not required for MVP, AI agents can be integrated later:

- **Procedural Asset Placement**: AI models suggest obstacle/coin patterns.
- **Difficulty Scaling**: AI agent adjusts spawn rates based on player performance.
- **AI-Assisted Development**: Code generation via AI coding agents, fed with this document.

---

## 4. Game Architecture Overview

### 4.1 Core Systems
1. **Player Controller**
   - Handles input mapping (keyboard/touch → lane changes, jump, slide).
   - Plays correct animations.
   - Updates player’s forward movement.

2. **World Manager**
   - Spawns/recycles tiles.
   - Manages procedural placement of obstacles/coins.
   - Adjusts difficulty over time.

3. **Collision System**
   - Detects overlap between player and obstacles/coins.
   - Ends game on obstacle hit.
   - Increases score on coin pickup.

4. **UI Manager**
   - Updates score and coin count in real-time.
   - Displays game over / restart options.

5. **Game Loop**
   - Runs at ~60fps.
   - Updates all systems each frame.

---

## 5. File Structure Example

```
project-root/
│
├── public/                 # Static assets
│   ├── models/             # Blender exports (.glb/.gltf)
│   ├── textures/           # Image textures
│   └── ui/                 # UI assets (icons, fonts)
│
├── src/
│   ├── core/
│   │   ├── gameLoop.js
│   │   ├── playerController.js
│   │   ├── obstacleManager.js
│   │   ├── coinManager.js
│   │   └── uiManager.js
│   │
│   ├── scenes/
│   │   └── mainScene.js
│   │
│   ├── utils/
│   │   └── inputHandler.js
│   │
│   └── index.js
│
├── index.html
├── package.json
└── vite.config.js
```

---

## 6. Development Workflow

1. **Asset Creation**
   - Use Blender MCP to build models and animations.
   - Export assets to `.glb/.gltf`.

2. **Integration**
   - Import assets into Babylon.js scene.
   - Test animations and collisions.

3. **Core Gameplay**
   - Implement lane-based movement.
   - Add forward motion.
   - Build procedural tile/obstacle spawner.

4. **UI Layer**
   - Score counter, start/game over screens.

5. **Optimization**
   - Use asset compression (Draco/KTX2).
   - Lazy-load assets.

6. **Testing**
   - Cross-browser (Chrome, Safari, Firefox).
   - Mobile responsiveness.

7. **Deployment**
   - Host via Vercel/Netlify.
   - Share public URL.

---

## 7. Minimum Viable Product (MVP)

- Player runs forward continuously.
- Lane-switching mechanic works.
- Jump/slide implemented.
- Procedural tile spawning.
- Obstacles and coin pickups.
- Score and game over UI.

---

## 8. Stretch Goals

- Multiple characters.
- Power-ups (magnet, shield, double coins).
- Dynamic environments (jungle → ruins → cave).
- Leaderboard integration.
- AI-based difficulty balancing.

---

## 9. Milestone-Based Tasks

### Task 1: Project Setup
- Initialize project with Vite + Babylon.js.
- Configure ESLint + Prettier.
- Set up file structure as defined in Section 5.

### Task 2: Scene Initialization
- Create a Babylon.js scene with camera and lighting.
- Add ground plane and skybox placeholder.
- Load and render test cube (placeholder for player).

### Task 3: Player Controller
- Implement forward movement loop.
- Implement lane switching (3 lanes).
- Implement jump and slide logic.
- Integrate animations from Blender MCP assets.

### Task 4: World Manager
- Implement tile spawner system.
- Add basic obstacle spawning (placeholder cubes).
- Add coin spawning system.
- Add recycling of off-screen tiles.

### Task 5: Collision Detection
- Implement collisions between player and obstacles.
- Implement coin pickups.
- Trigger game over state on obstacle collision.

### Task 6: UI Manager
- Build start screen with “Play” button.
- Build in-game HUD: score and coin counter.
- Build game over screen with “Restart” button.

### Task 7: Asset Integration
- Replace placeholder cubes with Blender MCP assets (player, tiles, obstacles, coins).
- Add character run, jump, slide, death animations.
- Apply textures and materials.

### Task 8: Optimization
- Enable asset compression (Draco/KTX2).
- Implement object pooling for obstacles/coins.
- Optimize mobile performance (reduce draw calls, LODs).

### Task 9: Final Polish
- Add sound effects and background music.
- Smooth camera follow system.
- Add particle effects (dust, coin sparkle).
- Refine difficulty progression (faster speed, more obstacles).

### Task 10: Deployment
- Configure build for production.
- Deploy to Vercel/Netlify.
- Verify browser and mobile compatibility.

---

## 10. References

- [Babylon.js Documentation](https://doc.babylonjs.com/)
- [Three.js Documentation](https://threejs.org/docs/)
- [Blender MCP](https://github.com/blender-mcp)
- [GLTF Format](https://www.khronos.org/gltf/)

---
