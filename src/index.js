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
    this.debugMode = false;
    
    // Game state
    this.isPlaying = false;
    this.isPaused = false;
    this.score = 0;
    this.distanceTraveled = 0;
    this.gameSpeed = 1.0;
    this.speedIncreaseRate = 0.1;
    this.maxSpeed = 2.5;
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
    
    // Initialize game loop
    this.gameLoop = new GameLoop(this.scene);
    
    // Initialize player controller with improved model
    this.playerController = new PlayerController(this.scene);
    const playerMesh = this.assetManager.getAsset('player') || this.createPlayerPlaceholder();
    this.playerController.init(playerMesh);
    
    // Initialize obstacle manager
    this.obstacleManager = new ObstacleManager(this.scene, this.assetManager);
    this.obstacleManager.init();
    
    // Initialize coin manager
    this.coinManager = new CoinManager(this.scene);
    this.coinManager.init();
    
    // Initialize world manager with obstacle and coin managers
    this.worldManager = new WorldManager(this.scene, this.obstacleManager, this.coinManager, this.assetManager);
    this.worldManager.init();
    
    // Initialize UI manager
    this.uiManager = new UIManager();
    
    // Initialize input handler
    this.inputHandler = new InputHandler();
    this.inputHandler.init();

    // Initialize performance test utility
    this.performanceTest = new PerformanceTest(this);

    // Check for debug mode
    this.debugMode = window.location.search.includes('debug=true');
    
    // Register systems with game loop
    this.gameLoop.registerSystem(this.playerController);
    this.gameLoop.registerSystem(this.worldManager);
    this.gameLoop.registerSystem({
      update: (deltaTime) => this.updateGame(deltaTime)
    });
  }

  /**
   * Create a placeholder player mesh
   */
  createPlayerPlaceholder() {
    const player = BABYLON.MeshBuilder.CreateBox(
      'player',
      { size: 1 },
      this.scene
    );
    
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
    this.score = Math.floor(this.distanceTraveled) + (this.coinManager.getCollectedCoins() * 10);
    
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
    if (this.obstacleManager.checkCollision(this.playerController.collider)) {
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

    // Log LOD statistics periodically
    if (this.frameCount % 300 === 0 && this.assetManager) { // Every 5 seconds at 60fps
      const lodStats = this.assetManager.getLODStats();
      this.performanceMonitor.logLODStats(lodStats);
    }

    // Log performance snapshot every 10 seconds
    if (this.frameCount % 600 === 0) {
      this.performanceMonitor.logSnapshot();
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
        ${report.recommendations.length > 0 ?
          '<h4>Recommendations:</h4>' +
          report.recommendations.map(r => `<p>• ${r.suggestion}</p>`).join('')
          : ''}
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
}

// Initialize game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  const game = new TempleRunGame();
  game.init().catch(console.error);
});
