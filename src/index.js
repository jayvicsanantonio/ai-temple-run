/**
 * Temple Run Web Game
 * Main entry point
 */

import * as BABYLON from 'babylonjs';
import { MainScene } from './scenes/mainScene.js';
import { GameLoop } from './core/gameLoop.js';
import { PlayerController } from './core/playerController.js';
import { ObstacleManager } from './core/obstacleManager.js';
import { CoinManager } from './core/coinManager.js';
import { WorldManager } from './core/worldManager.js';
import { AssetManager } from './core/assetManager.js';
import { UIManager } from './core/uiManager.js';
import { getConfig } from './core/config.js';
import { BlenderMCPManager } from './core/blenderMCPManager.js';
import { Hyper3DIntegration } from './core/hyper3dIntegration.js';
import { PolyHavenIntegration } from './core/polyHavenIntegration.js';
import { BlenderExportIntegration } from './core/blenderExportIntegration.js';
import { PhysicsEngineManager } from './core/physicsEngineManager.js';
import { AssetOptimizer } from './core/assetOptimizer.js';
import { PerformanceMonitor } from './core/performanceMonitor.js';
import { BlenderAssetManager } from './core/blenderAssetManager.js';
import { InputHandler } from './utils/inputHandler.js';

// Import styles
import '../style.css';

class TempleRunGame {
  constructor() {
    this.canvas = null;
    this.mainScene = null;
    this.scene = null;
    this.gameLoop = null;
    this.playerController = null;
    this.obstacleManager = null;
    this.coinManager = null;
    this.worldManager = null;
    this.assetManager = null;
    this.uiManager = null;
    this.inputHandler = null;
    this.config = null;
    this.mcpManager = null;
    this.hyper3d = null;
    this.polyHaven = null;
    this.blenderExport = null;
    this.physics = null;
    this.assetOptimizer = null;
    this.performanceMonitor = null;
    this.blenderAssets = null;

    // Game state
    this.isPlaying = false;
    this.isPaused = false;
    this.score = 0;
    this.distanceTraveled = 0;
    this.gameSpeed = 1.0;
    this.speedIncreaseRate = 0.1;
    this.maxSpeed = 2.5;
    this.currentCharacterAssetName = null;
  }

  /**
   * Initialize the game
   */
  async init() {
    console.log('Initializing Temple Run Web Game...');

    // Setup canvas
    this.setupCanvas();

    // Initialize scene
    this.mainScene = new MainScene(this.canvas);
    this.scene = await this.mainScene.init();

    // Initialize game systems
    await this.initializeSystems();

    // Setup input
    this.setupInput();

    // Setup UI callbacks
    this.setupUICallbacks();

    // Initialize UI
    this.uiManager.init();

    // Load config and optionally connect to Blender MCP
    this.config = getConfig();
    this.mcpManager = new BlenderMCPManager(this.config);
    this.mcpManager.on('status', (status) => {
      if (this.config.debug) {
        console.log('[Game] MCP status event:', status);
      }
      // Show brief status banner for connection issues
      if (this.uiManager && status) {
        const level = status === 'connected' ? 'info' : status === 'error' ? 'warn' : 'info';
        this.uiManager.showStatusBanner(`MCP: ${status}`, level, 1500);
      }
    });
    if (this.config.mcp.enabled && this.config.mcp.connectOnStart) {
      this.mcpManager.connect().catch((err) => {
        console.warn('[Game] MCP connect error:', err?.message || err);
      });
    }

    // Initialize Hyper3D integration (no automatic generation here)
    this.hyper3d = new Hyper3DIntegration(this.assetManager, this.mcpManager, this.config);

    // Initialize PolyHaven integration
    this.polyHaven = new PolyHavenIntegration(this.assetManager, this.config);

    // Initialize Blender export integration
    this.blenderExport = new BlenderExportIntegration(
      this.mcpManager,
      this.assetManager,
      this.config
    );

    console.log('Game initialized successfully!');
  }

  /**
   * Setup the canvas element
   */
  setupCanvas() {
    this.canvas = document.getElementById('renderCanvas');
    if (!this.canvas) {
      // Create canvas if it doesn't exist
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'renderCanvas';
      document.body.appendChild(this.canvas);
    }
  }

  /**
   * Initialize all game systems
   */
  async initializeSystems() {
    // Initialize asset manager first
    this.assetManager = new AssetManager(this.scene);
    await this.assetManager.init();

    // Initialize physics
    this.physics = new PhysicsEngineManager(this.scene);
    const physicsMode = this.physics.detectAndInit();

    // Initialize game loop
    this.gameLoop = new GameLoop(this.scene);

    // Initialize player controller with improved model
    this.playerController = new PlayerController(this.scene);
    const playerMesh = this.assetManager.getAsset('player') || this.createPlayerPlaceholder();
    this.playerController.init(playerMesh);
    // Connect player to physics
    if (this.physics) {
      this.playerController.enablePhysics(this.physics);
      this.physics.attachPlayer(this.playerController.player, this.playerController.collider, {
        forwardSpeed: this.playerController.forwardSpeed,
        baseY: this.playerController.baseY,
        laneX: 0,
      });
    }

    // Initialize LOD Asset Optimizer
    this.assetOptimizer = new AssetOptimizer(this.scene, this.config);
    // Apply LODs to player mesh
    this.assetOptimizer.tryApplyLODs(this.playerController.player);

    // Initialize obstacle manager
    this.obstacleManager = new ObstacleManager(this.scene);
    this.obstacleManager.init();
    if (this.physics && this.obstacleManager.setPhysicsManager) {
      this.obstacleManager.setPhysicsManager(this.physics);
    }
    if (this.obstacleManager.setAssetOptimizer) {
      this.obstacleManager.setAssetOptimizer(this.assetOptimizer);
    }

    // Initialize coin manager
    this.coinManager = new CoinManager(this.scene);
    this.coinManager.init();

    // Initialize world manager with obstacle and coin managers
    this.worldManager = new WorldManager(this.scene, this.obstacleManager, this.coinManager);
    this.worldManager.init();

    // Initialize UI manager
    this.uiManager = new UIManager();

    // Initialize input handler
    this.inputHandler = new InputHandler();
    this.inputHandler.init();

    // Register systems with game loop
    this.gameLoop.registerSystem(this.playerController);
    this.gameLoop.registerSystem(this.worldManager);
    this.gameLoop.registerSystem({
      update: (deltaTime) => this.updateGame(deltaTime),
    });
    // Physics step
    this.gameLoop.registerSystem({
      update: (dt) => {
        if (this.physics) {
          const t0 = performance.now();
          this.physics.update(dt);
          const t1 = performance.now();
          if (this.performanceMonitor) this.performanceMonitor.recordPhysicsTime(dt, t1 - t0);
        }
      },
    });

    // Performance monitor (after systems constructed)
    this.performanceMonitor = new PerformanceMonitor(
      this.scene.getEngine(),
      this.scene,
      this.assetOptimizer,
      this.config,
      this.physics
    );
    this.gameLoop.registerSystem({
      update: () => this.performanceMonitor.update(),
    });

    // Unified Blender asset manager (Hyper3D + PolyHaven + AssetManager)
    this.blenderAssets = new BlenderAssetManager(
      this.scene,
      this.assetManager,
      {
        hyper3d: this.hyper3d,
        polyHaven: this.polyHaven,
      },
      this.config
    );

    // Kick off runtime asset pipeline (character + obstacle prefabs)
    this.setupRuntimeAssets().catch((e) => console.warn('Runtime asset setup error:', e));
  }

  /**
   * Load/generate character and obstacle prefabs based on config
   */
  async setupRuntimeAssets() {
    const cfg = this.config?.gameAssets || {};
    // Character
    try {
      const mode = (cfg.character?.mode || 'PROCEDURAL').toUpperCase();
      if (mode === 'GLB' && cfg.character?.glbUrl) {
        this.uiManager?.showStatusBanner('Loading character...', 'info', 1500);
        const root = await this.blenderAssets.enqueueGLB({
          url: cfg.character.glbUrl,
          name: cfg.character.name || 'player_glb',
          priority: 10,
        });
        if (root) {
          this.playerController.setPlayerMesh(root);
          this.assetOptimizer?.tryApplyLODs(root);
          this.uiManager?.showStatusBanner('Character ready', 'info', 1200);
        }
      } else if (mode === 'HYPER3D' && this.hyper3d) {
        this.uiManager?.showStatusBanner('Generating character...', 'info', 1500);
        const root = await this.blenderAssets.generateCharacterAndImport(
          cfg.character?.prompt || 'stylized runner',
          { name: cfg.character?.name || 'player_h3d' }
        );
        if (root) {
          this.playerController.setPlayerMesh(root);
          this.assetOptimizer?.tryApplyLODs(root);
          this.uiManager?.showStatusBanner('Character ready', 'info', 1200);
        } else {
          this.uiManager?.showStatusBanner('Character fallback used', 'warn', 1800);
        }
      }
    } catch (e) {
      console.warn('Character asset pipeline error:', e);
      this.uiManager?.showStatusBanner('Character failed; using placeholder', 'warn', 2000);
    }

    // Obstacles
    try {
      const list = cfg.obstacles?.list || [];
      if (list.length) {
        this.uiManager?.showStatusBanner('Loading obstacles...', 'info', 1200);
        await Promise.all(
          list.map((o) =>
            this.blenderAssets
              .enqueueGLB({ url: o.url, name: o.name, priority: 5 })
              .catch(() => null)
          )
        );
        // Provide AssetManager and prefab names to obstacle manager
        this.obstacleManager.setAssetManager?.(this.assetManager);
        this.obstacleManager.setObstaclePrefabs?.(list.map((o) => o.name));
        this.uiManager?.showStatusBanner('Obstacles ready', 'info', 1200);
      }
    } catch (e) {
      console.warn('Obstacle asset pipeline error:', e);
      this.uiManager?.showStatusBanner('Obstacle load failed; using primitives', 'warn', 2000);
    }
  }

  /**
   * Create a placeholder player mesh
   */
  createPlayerPlaceholder() {
    const player = BABYLON.MeshBuilder.CreateBox('player', { size: 1 }, this.scene);

    player.position.y = 0.5;

    // Create player material
    const playerMaterial = new BABYLON.StandardMaterial('playerMat', this.scene);
    playerMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.6, 1);
    player.material = playerMaterial;

    // Enable shadows
    if (this.mainScene.shadowGenerator) {
      this.mainScene.shadowGenerator.addShadowCaster(player);
    }

    return player;
  }

  /**
   * Setup input controls
   */
  setupInput() {
    // Connect input to player controller
    this.inputHandler.setOnLeft(() => this.playerController.moveLeft());
    this.inputHandler.setOnRight(() => this.playerController.moveRight());
    this.inputHandler.setOnJump(() => this.playerController.jump());
    this.inputHandler.setOnSlide(() => this.playerController.slide());
    this.inputHandler.setOnPause(() => this.togglePause());
  }

  /**
   * Setup UI callbacks
   */
  setupUICallbacks() {
    this.uiManager.setOnPlayCallback(() => this.startGame());
    this.uiManager.setOnRestartCallback(() => this.restartGame());
    // Hyper3D debug generate button
    this.uiManager.setOnHyper3DGenerateCallback(async (prompt, updateStatus) => {
      try {
        const text = prompt && prompt.trim().length > 0 ? prompt.trim() : 'stylized runner';
        updateStatus('Submitting job...');
        const { id } = await this.hyper3d.generateCharacterFromText(text, {
          bboxCondition: this.config?.hyper3d?.defaultBboxCondition || null,
        });
        updateStatus('Polling...');
        const { status } = await this.hyper3d.pollJobStatus(id);
        updateStatus(status);
        if (status === 'Done') {
          updateStatus('Importing...');
          const mesh = await this.hyper3d.importCompletedAsset(id, { name: 'player_h3d' });
          if (mesh) {
            this.playerController.setPlayerMesh(mesh);
            updateStatus('Ready');
          } else {
            updateStatus('Import failed');
          }
        }
      } catch (err) {
        console.warn('Hyper3D generate error:', err);
        updateStatus('Error');
      }
    });

    // Character mode apply
    this.uiManager.setOnCharacterModeChangeCallback(async ({ mode, glbUrl, prompt }) => {
      await this.switchCharacterMode(mode, { glbUrl, prompt });
    });
  }

  /**
   * Switch character model at runtime based on mode.
   */
  async switchCharacterMode(mode, { glbUrl, prompt } = {}) {
    const m = (mode || '').toUpperCase();
    this.config.gameAssets = this.config.gameAssets || { character: {} };
    this.config.gameAssets.character.mode = m;
    if (glbUrl) this.config.gameAssets.character.glbUrl = glbUrl;
    if (prompt) this.config.gameAssets.character.prompt = prompt;

    try {
      if (m === 'PROCEDURAL') {
        const placeholder = this.createPlayerPlaceholder();
        this.playerController.setPlayerMesh(placeholder);
        this.currentCharacterAssetName = null;
        this.uiManager?.showStatusBanner('Using procedural character', 'info', 1200);
        return;
      }
      if (m === 'GLB' && this.config.gameAssets.character.glbUrl) {
        const name = this.config.gameAssets.character.name || 'player_glb';
        const root = await this.blenderAssets.enqueueGLB({
          url: this.config.gameAssets.character.glbUrl,
          name,
          priority: 10,
        });
        if (root) {
          if (this.currentCharacterAssetName && this.currentCharacterAssetName !== name) {
            this.blenderAssets.release?.(this.currentCharacterAssetName);
          }
          this.playerController.setPlayerMesh(root);
          this.assetOptimizer?.tryApplyLODs(root);
          this.currentCharacterAssetName = name;
          this.uiManager?.showStatusBanner('Character ready (GLB)', 'info', 1200);
        }
        return;
      }
      if (m === 'HYPER3D' && this.hyper3d) {
        const name = this.config.gameAssets.character.name || 'player_h3d';
        const root = await this.blenderAssets.generateCharacterAndImport(
          this.config.gameAssets.character.prompt || 'stylized runner',
          { name }
        );
        if (root) {
          if (this.currentCharacterAssetName && this.currentCharacterAssetName !== name) {
            this.blenderAssets.release?.(this.currentCharacterAssetName);
          }
          this.playerController.setPlayerMesh(root);
          this.assetOptimizer?.tryApplyLODs(root);
          this.currentCharacterAssetName = name;
          this.uiManager?.showStatusBanner('Character ready (Hyper3D)', 'info', 1200);
        } else {
          this.uiManager?.showStatusBanner('Character generation failed', 'warn', 1800);
        }
        return;
      }
      this.uiManager?.showStatusBanner('Unknown character mode', 'warn', 1500);
    } catch (e) {
      console.warn('switchCharacterMode error:', e);
      this.uiManager?.showStatusBanner('Character switch failed', 'error', 1800);
    }
  }

  /**
   * Start the game
   */
  startGame() {
    console.log('Starting game...');

    this.isPlaying = true;
    this.isPaused = false;
    this.score = 0;
    this.distanceTraveled = 0;
    this.gameSpeed = 1.0;

    // Reset all systems
    this.playerController.reset();
    this.obstacleManager.reset();
    this.coinManager.reset();
    this.worldManager.reset();

    // Enable input
    this.inputHandler.enable();

    // Start game loop
    this.gameLoop.start();
  }

  /**
   * Restart the game
   */
  restartGame() {
    console.log('Restarting game...');
    this.startGame();
  }

  /**
   * Toggle pause state
   */
  togglePause() {
    if (!this.isPlaying) return;

    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      this.gameLoop.pause();
      console.log('Game paused');
    } else {
      this.gameLoop.resume();
      console.log('Game resumed');
    }
  }

  /**
   * Main game update logic
   */
  updateGame(deltaTime) {
    if (!this.isPlaying || this.isPaused) return;

    // Update distance traveled
    this.distanceTraveled += this.playerController.forwardSpeed * deltaTime;

    // Update score based on distance and coins
    this.score = Math.floor(this.distanceTraveled) + this.coinManager.getCollectedCoins() * 10;

    // Update UI
    this.uiManager.updateScore(this.score);
    this.uiManager.updateDistance(this.distanceTraveled);
    this.uiManager.updateCoins(this.coinManager.getCollectedCoins());

    // Check for coin collection (uses player position)
    const coinsCollected = this.coinManager.checkCollection(this.playerController.player);
    if (coinsCollected > 0) {
      console.log(`Collected ${coinsCollected} coins!`);
    }

    // Physics-aware collision detection
    const hit = this.physics
      ? this.physics.checkCollisionWithObstacles()
      : this.obstacleManager.checkCollision(this.playerController.collider);
    if (hit) {
      this.gameOver();
    }

    // Update camera to follow player
    if (this.playerController.player) {
      this.mainScene.updateCameraFollow(this.playerController.player.position);
    }

    // Gradually increase game speed
    this.increaseGameSpeed(deltaTime);

    // World manager handles obstacle and coin spawning now
    const playerPos = this.playerController.player ? this.playerController.player.position : null;
    this.worldManager.update(deltaTime, playerPos);

    // Still need to update obstacle and coin animations/cleanup
    this.obstacleManager.updateObstacles(playerPos);
    this.coinManager.updateCoins(deltaTime, playerPos);
  }

  /**
   * Gradually increase game speed
   */
  increaseGameSpeed(deltaTime) {
    if (this.gameSpeed < this.maxSpeed) {
      this.gameSpeed += this.speedIncreaseRate * deltaTime;
      this.gameLoop.setGameSpeed(this.gameSpeed);

      // Also increase player forward speed
      const newSpeed = 10 + (this.gameSpeed - 1) * 5;
      this.playerController.setForwardSpeed(newSpeed);
    }
  }

  /**
   * Handle game over
   */
  gameOver() {
    console.log('Game Over!');
    console.log(`Final Score: ${this.score}`);
    console.log(`Distance: ${Math.floor(this.distanceTraveled)}m`);
    console.log(`Coins: ${this.coinManager.getCollectedCoins()}`);

    this.isPlaying = false;

    // Stop game systems
    this.gameLoop.stop();
    this.inputHandler.disable();

    // Show game over UI
    this.uiManager.gameOver();

    // Play death animation
    this.playerController.die();
  }
}

// Initialize game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  const game = new TempleRunGame();
  game.init().catch(console.error);
});
