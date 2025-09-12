/**
 * Game Loop Module
 * Manages the main game update cycle and coordinates all game systems
 */

export class GameLoop {
  constructor(scene) {
    this.scene = scene;
    this.isRunning = false;
    this.isPaused = false;
    this.gameSpeed = 1.0;
    this.deltaTime = 0;
    this.lastTime = 0;
    this.systems = [];
  }

  /**
   * Register a system to be updated in the game loop
   * @param {Object} system - System with an update method
   */
  registerSystem(system) {
    if (system && typeof system.update === 'function') {
      this.systems.push(system);
    }
  }

  /**
   * Start the game loop
   */
  start() {
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    
    // Register the main render loop with Babylon.js
    this.scene.registerBeforeRender(() => {
      if (this.isRunning && !this.isPaused) {
        this.update();
      }
    });
  }

  /**
   * Stop the game loop
   */
  stop() {
    this.isRunning = false;
  }

  /**
   * Pause the game loop
   */
  pause() {
    this.isPaused = true;
  }

  /**
   * Resume the game loop
   */
  resume() {
    this.isPaused = false;
    this.lastTime = performance.now();
  }

  /**
   * Main update method called every frame
   */
  update() {
    const currentTime = performance.now();
    this.deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    // Update all registered systems
    for (const system of this.systems) {
      system.update(this.deltaTime * this.gameSpeed);
    }
  }

  /**
   * Set the game speed multiplier
   * @param {number} speed - Speed multiplier (1.0 = normal, 2.0 = double speed)
   */
  setGameSpeed(speed) {
    this.gameSpeed = Math.max(0.1, Math.min(5.0, speed));
  }

  /**
   * Reset the game loop
   */
  reset() {
    this.gameSpeed = 1.0;
    this.deltaTime = 0;
    this.lastTime = performance.now();
    
    // Reset all systems if they have a reset method
    for (const system of this.systems) {
      if (typeof system.reset === 'function') {
        system.reset();
      }
    }
  }
}
