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
import { InputHandler } from './utils/inputHandler.js';
import { PerformanceMonitor } from './utils/performanceMonitor.js';
import { PerformanceTest } from './utils/performanceTest.js';
import { DebugVisualization } from './utils/debugVisualization.js';
import { AssetValidator } from './utils/assetValidator.js';
import { ParticleEffects } from './core/particleEffects.js';
import { SceneDebugger } from './utils/sceneDebugger.js';
import { RenderingDebugger } from './utils/renderingDebugger.js';

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
    this.performanceMonitor = null;
    this.performanceTest = null;
    this.debugVisualization = null;
    this.assetValidator = null;
    this.debugMode = false;
    this.particleEffects = null;
    this.sceneDebugger = null;
    this.renderingDebugger = null;
    this._wasJumping = false;
    this._wasSliding = false;

    // Game state
    this.isPlaying = false;
    this.isPaused = false;
    this.score = 0;
    this.distanceTraveled = 0;
    this.gameSpeed = 1.0;
    this.speedIncreaseRate = 0.1;
    this.maxSpeed = 2.5;

    // Debug toggles
    this._debugColliders = false;
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

    console.log('Game initialized successfully!');

    // Run performance tests in debug mode
    if (this.debugMode) {
      console.log('Debug mode enabled - running performance tests...');
      setTimeout(() => this.runPerformanceTests(), 2000);
    }
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

    // Set canvas size to match viewport
    this.resizeCanvas();

    // Handle window resize
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  /**
   * Resize canvas to match viewport dimensions
   */
  resizeCanvas() {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;

    // Resize Babylon.js engine if it exists
    if (this.mainScene && this.mainScene.engine) {
      this.mainScene.engine.resize();
    }
  }

  /**
   * Initialize all game systems
   */
  async initializeSystems() {
    // Initialize performance monitor first
    this.performanceMonitor = new PerformanceMonitor();

    // Initialize asset manager first
    this.assetManager = new AssetManager(this.scene, this.performanceMonitor);
    await this.assetManager.init();
    // Enable and configure LOD distances aligned with gameplay scale
    this.assetManager.configureLOD(true, { high: 30, medium: 70, low: 120 });

    // Initialize game loop
    this.gameLoop = new GameLoop(this.scene);

    // Initialize player controller with improved model
    this.playerController = new PlayerController(this.scene);
    let playerMesh = this.assetManager.getModel('player');
    if (playerMesh) {
      // Center and normalize player size (~1.6m height) then add shadows
      if (this.assetManager.centerInstance) {
        this.assetManager.centerInstance(playerMesh);
      }
      try {
        // Compute approximate height from child meshes
        const meshes = typeof playerMesh.getChildMeshes === 'function' ? playerMesh.getChildMeshes(false) : [];
        let minY = Infinity, maxY = -Infinity;
        for (const m of meshes) {
          if (!m.getBoundingInfo) continue;
          m.computeWorldMatrix(true);
          const bb = m.getBoundingInfo().boundingBox;
          minY = Math.min(minY, bb.minimumWorld.y);
          maxY = Math.max(maxY, bb.maximumWorld.y);
        }
        const height = isFinite(minY) && isFinite(maxY) ? (maxY - minY) : 1.6;
        const target = 1.6;
        if (height > 0.001) {
          const s = target / height;
          playerMesh.scaling = new BABYLON.Vector3(s, s, s);
        }
      } catch (e) {
        // best effort scaling; ignore errors
      }
      if (this.mainScene.shadowGenerator) {
        const casterMeshes = typeof playerMesh.getChildMeshes === 'function' ? playerMesh.getChildMeshes(false) : [];
        casterMeshes.forEach((m) => this.mainScene.shadowGenerator.addShadowCaster(m));
      }
    } else {
      playerMesh = this.createPlayerPlaceholder();
    }
    this.playerController.init(playerMesh);

    // Check for debug mode and initialize collider debug state
    this.debugMode = window.location.search.includes('debug=true');
    this._debugColliders = this.debugMode;
    if (this._debugColliders) {
      this.playerController.setDebugCollider(true);
    }

    // Initialize obstacle manager
    this.obstacleManager = new ObstacleManager(this.scene, this.assetManager);
    this.obstacleManager.init();
    if (this._debugColliders) {
      this.obstacleManager.setDebugColliders(true);
    }

    // Initialize coin manager
    this.coinManager = new CoinManager(this.scene, this.assetManager);
    this.coinManager.init();

    // Initialize particle effects
    this.particleEffects = new ParticleEffects(this.scene);
    this.particleEffects.init();

    // Initialize world manager with obstacle and coin managers
    this.worldManager = new WorldManager(
      this.scene,
      this.obstacleManager,
      this.coinManager,
      this.assetManager
    );
    this.worldManager.init();

    // Initialize UI manager
    this.uiManager = new UIManager();

    // Show asset health in debug mode
    if (this.debugMode && this.assetManager) {
      const health = this.assetManager.getAssetHealth();
      console.log(`🎨 Asset Health: ${health.status} (${health.loadedAssets}/${health.totalAssets} loaded, ${Math.round(health.healthPercentage)}%)`);

      // Start runtime asset validation
      if (this.assetValidator) {
        this.assetValidator.startRuntimeValidation();
      }
    }

    // Initialize input handler
    this.inputHandler = new InputHandler();
    this.inputHandler.init();

    // Initialize performance test utility
    this.performanceTest = new PerformanceTest(this);

    // Initialize enhanced debug visualization
    this.debugVisualization = new DebugVisualization(this.scene, this);
    this.debugVisualization.init();

    // Initialize asset validator
    this.assetValidator = new AssetValidator(this.assetManager);
    if (this.debugMode) {
      // Run comprehensive validation in debug mode
      setTimeout(() => this.validateAssets(), 2000);
    }

    // Initialize scene debugger for visibility debugging
    this.sceneDebugger = new SceneDebugger(this.scene);

    // Initialize rendering debugger for pipeline issues
    this.renderingDebugger = new RenderingDebugger(this.scene, this.mainScene.engine);

    if (this.debugMode) {
      // Start comprehensive debugging for rendering pipeline issues
      console.log('🔍 Starting comprehensive debugging for rendering issues...');
      setTimeout(() => {
        this.sceneDebugger.startDebugging();
        this.sceneDebugger.createTestObjects();
        this.renderingDebugger.startDebugging();
      }, 3000);
    }

    // Register systems with game loop
    this.gameLoop.registerSystem(this.playerController);
    this.gameLoop.registerSystem(this.worldManager);
    this.gameLoop.registerSystem({
      update: (deltaTime) => this.updateGame(deltaTime),
    });
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
    this.inputHandler.setOnToggleColliders(() => this.toggleColliders());
    this.inputHandler.setOnToggleSceneDebug(() => this.toggleSceneDebugging());
    this.inputHandler.setOnForceVisibility(() => this.forceAllMeshesVisible());

    // Add debug visualization and validation toggles
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F3' && this.debugVisualization) {
        this.debugVisualization.toggle();
      } else if (e.key === 'F5' && this.assetValidator) {
        this.validateAssets();
      } else if (e.key === 'F6' && this.assetValidator) {
        this.assetValidator.exportValidationReport();
      }
    });
  }

  /**
   * Setup UI callbacks
   */
  setupUICallbacks() {
    this.uiManager.setOnPlayCallback(() => this.startGame());
    this.uiManager.setOnRestartCallback(() => this.restartGame());
  }

  /**
   * Start the game
   */
  startGame() {
    console.log('Starting game...');

    // Start performance monitoring
    this.performanceMonitor.start();

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

    // Check for collisions with obstacles using the collider mesh
    // Add a small grace distance to avoid instant game over on spawn
    if (
      this.distanceTraveled > 5 &&
      this.obstacleManager.checkCollision(this.playerController.collider)
    ) {
      this.debugMode ? this.gameOverEnhanced() : this.gameOver();
    }

    // Update camera to smart-follow the player mesh (keeps full body in frame)
    if (this.playerController.player) {
      if (this.mainScene.updateCameraFollowForMesh) {
        this.mainScene.updateCameraFollowForMesh(this.playerController.player);
      } else {
        this.mainScene.updateCameraFollow(this.playerController.player.position);
      }
    }

    // Gradually increase game speed
    this.increaseGameSpeed(deltaTime);

    // World manager handles obstacle and coin spawning now
    const playerPos = this.playerController.player ? this.playerController.player.position : null;
    this.worldManager.update(deltaTime, playerPos);

    // Splash effects when interacting with swamp tiles
    if (playerPos && this.particleEffects) {
      const isSwamp = this.worldManager.isSwampAtZ(playerPos.z);
      const nowJumping = this.playerController.isJumping;
      const nowSliding = this.playerController.isSliding;
      // On landing (jumping -> not jumping)
      if (this._wasJumping && !nowJumping && isSwamp) {
        this.particleEffects.playWaterSplash(playerPos);
      }
      // On slide start
      if (!this._wasSliding && nowSliding && isSwamp) {
        this.particleEffects.playWaterSplash(playerPos);
      }
      this._wasJumping = nowJumping;
      this._wasSliding = nowSliding;
    }

    // Update debug visualization
    if (this.debugVisualization && this.debugVisualization.enabled) {
      this.debugVisualization.update();
    }

    // Log LOD statistics periodically
    if (this.frameCount % 300 === 0 && this.assetManager) {
      // Every 5 seconds at 60fps
      const lodStats = this.assetManager.getLODStats();
      this.performanceMonitor.logLODStats(lodStats);

      if (this.debugMode) {
        console.log('📊 LOD Stats:', lodStats);
      }
    }

    // Log performance snapshot every 10 seconds
    if (this.frameCount % 600 === 0) {
      this.performanceMonitor.logSnapshot();

      if (this.debugMode && this.assetManager) {
        const health = this.assetManager.getAssetHealth();
        console.log('💾 Asset Health:', health);
      }
    }

    this.frameCount = this.frameCount || 0;
    this.frameCount++;

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

    // Get performance report
    const performanceReport = this.performanceMonitor.stop();
    console.log('Performance Report:', performanceReport);

    this.isPlaying = false;

    // Stop game systems
    this.gameLoop.stop();
    this.inputHandler.disable();

    // Show game over UI
    this.uiManager.gameOver();

    // Play death animation
    this.playerController.die();
  }

  /**
   * Toggle collider debug visualization for player and obstacles
   */
  toggleColliders() {
    this._debugColliders = !this._debugColliders;
    if (this.playerController && this.playerController.setDebugCollider) {
      this.playerController.setDebugCollider(this._debugColliders);
    }
    if (this.obstacleManager && this.obstacleManager.setDebugColliders) {
      this.obstacleManager.setDebugColliders(this._debugColliders);
    }
    console.log(`🔍 Collider debug: ${this._debugColliders ? 'ON' : 'OFF'}`);

    // Also toggle asset manager debug features
    if (this.assetManager) {
      const health = this.assetManager.getAssetHealth();
      console.log(`🎨 Current Asset Health: ${health.status} - ${health.loadedAssets}/${health.totalAssets} loaded`);
    }
  }

  /**
   * Toggle scene debugging for asset visibility investigation
   */
  toggleSceneDebugging() {
    if (!this.sceneDebugger) {
      console.log('🔍 Scene debugger not available');
      return;
    }

    if (this.sceneDebugger.debugEnabled) {
      this.sceneDebugger.stopDebugging();
      console.log('🔍 Scene debugging STOPPED');
    } else {
      this.sceneDebugger.startDebugging();
      console.log('🔍 Scene debugging STARTED - Press F7 to toggle, F8 to force visibility');
    }
  }

  /**
   * Force all meshes in the scene to be visible - debugging visibility issues
   */
  forceAllMeshesVisible() {
    if (!this.sceneDebugger) {
      console.log('🔍 Scene debugger not available');
      return;
    }

    console.log('🔍 Forcing all meshes visible...');
    this.sceneDebugger.forceVisibilityTest();

    // Also create test objects to verify rendering pipeline
    const testObjects = this.sceneDebugger.createTestObjects();
    console.log('🔍 Created test objects:', testObjects);

    // Get scene statistics
    const stats = this.sceneDebugger.getSceneStats();
    console.log('🔍 Scene Statistics:', stats);
  }

  /**
   * Run performance tests
   */
  async runPerformanceTests() {
    try {
      const report = await this.performanceTest.runAllTests();
      console.log('Performance tests completed:', report);

      // Display results in UI if needed
      this.displayPerformanceResults(report);
    } catch (error) {
      console.error('Performance tests failed:', error);
    }
  }

  /**
   * Display performance results (could be shown in UI)
   */
  displayPerformanceResults(report) {
    if (this.debugMode) {
      // Create a simple debug overlay
      const overlay = document.createElement('div');
      overlay.id = 'performance-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px;
        font-family: monospace;
        font-size: 12px;
        max-width: 300px;
        z-index: 1000;
        border-radius: 5px;
      `;

      const summary = report.summary;
      overlay.innerHTML = `
        <h3>Performance Report</h3>
        <p><strong>Status:</strong> ${summary.overallStatus}</p>
        <p><strong>Tests:</strong> ${summary.passed}✓ ${summary.warnings}⚠ ${summary.failed}✗</p>
        ${
          report.recommendations.length > 0
            ? '<h4>Recommendations:</h4>' +
              report.recommendations.map((r) => `<p>• ${r.suggestion}</p>`).join('')
            : ''
        }
      `;

      document.body.appendChild(overlay);

      // Remove overlay after 10 seconds
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 10000);
    }
  }

  /**
   * Validate game assets
   */
  async validateAssets() {
    if (!this.assetValidator) {
      console.warn('Asset validator not initialized');
      return;
    }

    try {
      const report = await this.assetValidator.validateAllAssets();
      console.log('📊 Asset Validation Report:', report.summary);

      if (report.recommendations.length > 0) {
        console.log('💡 Recommendations:');
        report.recommendations.forEach((rec, i) => {
          console.log(`${i + 1}. [${rec.priority.toUpperCase()}] ${rec.issue}: ${rec.suggestion}`);
        });
      }

      return report;
    } catch (error) {
      console.error('Asset validation failed:', error);
    }
  }

  /**
   * Get comprehensive game statistics for debugging
   */
  getGameStats() {
    return {
      game: {
        isPlaying: this.isPlaying,
        isPaused: this.isPaused,
        score: this.score,
        distanceTraveled: this.distanceTraveled,
        gameSpeed: this.gameSpeed
      },
      assets: this.assetManager ? this.assetManager.getAssetHealth() : null,
      lod: this.assetManager ? this.assetManager.getLODStats() : null,
      obstacles: this.obstacleManager ? this.obstacleManager.getPerformanceStats?.() : null,
      performance: this.performanceMonitor ? this.performanceMonitor.getStats() : null
    };
  }

  /**
   * Enhanced game over with debug information
   */
  gameOverEnhanced() {
    this.gameOver();

    if (this.debugMode) {
      console.log('🎮 Game Over Debug Stats:', this.getGameStats());

      // Export debug information if available
      if (this.debugVisualization) {
        setTimeout(() => {
          this.debugVisualization.exportDebugInfo();
        }, 1000);
      }
    }
  }
}

// Initialize game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  const game = new TempleRunGame();
  game.init().catch(console.error);
});
