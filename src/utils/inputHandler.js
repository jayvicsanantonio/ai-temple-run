/**
 * Input Handler Module
 * Handles keyboard and touch input for the game
 */

import Hammer from 'hammerjs';

export class InputHandler {
  constructor() {
    this.callbacks = {
      onLeft: null,
      onRight: null,
      onJump: null,
      onSlide: null,
      onPause: null,
      onToggleColliders: null
    };
    
    this.isEnabled = false;
    this.hammerManager = null;
  }

  /**
   * Initialize input handlers
   */
  init() {
    this.setupKeyboardControls();
    this.setupTouchControls();
  }

  /**
   * Setup keyboard controls
   */
  setupKeyboardControls() {
    document.addEventListener('keydown', (event) => {
      if (!this.isEnabled) return;
      
      switch (event.key.toLowerCase()) {
        case 'arrowleft':
        case 'a':
          event.preventDefault();
          if (this.callbacks.onLeft) this.callbacks.onLeft();
          break;
          
        case 'arrowright':
        case 'd':
          event.preventDefault();
          if (this.callbacks.onRight) this.callbacks.onRight();
          break;
          
        case 'arrowup':
        case 'w':
        case ' ': // Spacebar
          event.preventDefault();
          if (this.callbacks.onJump) this.callbacks.onJump();
          break;
          
        case 'arrowdown':
        case 's':
          event.preventDefault();
          if (this.callbacks.onSlide) this.callbacks.onSlide();
          break;
          
        case 'escape':
        case 'p':
          event.preventDefault();
          if (this.callbacks.onPause) this.callbacks.onPause();
          break;

        case 'c':
          // Toggle collider debug visualization
          event.preventDefault();
          if (this.callbacks.onToggleColliders) this.callbacks.onToggleColliders();
          break;

        case 'f7':
          // Toggle scene debugging
          event.preventDefault();
          if (this.callbacks.onToggleSceneDebug) this.callbacks.onToggleSceneDebug();
          break;

        case 'f8':
          // Force all meshes visible
          event.preventDefault();
          if (this.callbacks.onForceVisibility) this.callbacks.onForceVisibility();
          break;
      }
    });
  }

  /**
   * Setup touch controls using Hammer.js
   */
  setupTouchControls() {
    const canvas = document.getElementById('renderCanvas');
    if (!canvas) {
      console.warn('Canvas not found for touch controls');
      return;
    }

    // Create Hammer instance
    this.hammerManager = new Hammer.Manager(canvas);

    // Add swipe recognizers
    const swipe = new Hammer.Swipe({
      direction: Hammer.DIRECTION_ALL,
      threshold: 10,
      velocity: 0.3
    });

    // Add tap recognizer for pause
    const tap = new Hammer.Tap({
      event: 'doubletap',
      taps: 2
    });

    this.hammerManager.add([swipe, tap]);

    // Handle swipe events
    this.hammerManager.on('swipeleft', () => {
      if (this.isEnabled && this.callbacks.onLeft) {
        this.callbacks.onLeft();
      }
    });

    this.hammerManager.on('swiperight', () => {
      if (this.isEnabled && this.callbacks.onRight) {
        this.callbacks.onRight();
      }
    });

    this.hammerManager.on('swipeup', () => {
      if (this.isEnabled && this.callbacks.onJump) {
        this.callbacks.onJump();
      }
    });

    this.hammerManager.on('swipedown', () => {
      if (this.isEnabled && this.callbacks.onSlide) {
        this.callbacks.onSlide();
      }
    });

    // Handle double tap for pause
    this.hammerManager.on('doubletap', () => {
      if (this.isEnabled && this.callbacks.onPause) {
        this.callbacks.onPause();
      }
    });
  }

  /**
   * Enable input handling
   */
  enable() {
    this.isEnabled = true;
  }

  /**
   * Disable input handling
   */
  disable() {
    this.isEnabled = false;
  }

  /**
   * Set callback for left movement
   * @param {Function} callback - Function to call on left input
   */
  setOnLeft(callback) {
    this.callbacks.onLeft = callback;
  }

  /**
   * Set callback for right movement
   * @param {Function} callback - Function to call on right input
   */
  setOnRight(callback) {
    this.callbacks.onRight = callback;
  }

  /**
   * Set callback for jump action
   * @param {Function} callback - Function to call on jump input
   */
  setOnJump(callback) {
    this.callbacks.onJump = callback;
  }

  /**
   * Set callback for slide action
   * @param {Function} callback - Function to call on slide input
   */
  setOnSlide(callback) {
    this.callbacks.onSlide = callback;
  }

  /**
   * Set callback for pause action
   * @param {Function} callback - Function to call on pause input
   */
  setOnPause(callback) {
    this.callbacks.onPause = callback;
  }

  /**
   * Set callback to toggle collider debug
   */
  setOnToggleColliders(callback) {
    this.callbacks.onToggleColliders = callback;
  }

  /**
   * Set callback to toggle scene debugging
   */
  setOnToggleSceneDebug(callback) {
    this.callbacks.onToggleSceneDebug = callback;
  }

  /**
   * Set callback to force all meshes visible
   */
  setOnForceVisibility(callback) {
    this.callbacks.onForceVisibility = callback;
  }

  /**
   * Clean up input handlers
   */
  destroy() {
    if (this.hammerManager) {
      this.hammerManager.destroy();
      this.hammerManager = null;
    }
  }
}
