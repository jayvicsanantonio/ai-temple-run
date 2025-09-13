/**
 * Player Controller Module
 * Handles player input, movement, and animations
 */

import * as BABYLON from 'babylonjs';

export class PlayerController {
  constructor(scene) {
    this.scene = scene;
    this.player = null;
    this.playerMesh = null; // Visual mesh
    this.collider = null; // Collision box
    this.isJumping = false;
    this.isSliding = false;
    this.isDead = false;

    // Lane positions
    this.lanes = [-2, 0, 2]; // Left, Middle, Right
    this.currentLane = 1; // Start in middle lane
    this.targetLane = 1;
    this.laneChangeSpeed = 10;

    // Movement parameters
    this.forwardSpeed = 10;
    this.baseY = 0.5;
    this.jumpHeight = 2.5;
    this.jumpDuration = 0.8;
    this.jumpTime = 0;
    this.slideTime = 0;
    this.maxSlideTime = 0.8;
    this.verticalVelocity = 0;
    this.gravity = -20;

    // Animation states
    this.animations = {
      idle: null,
      run: null,
      jump: null,
      slide: null,
      death: null,
    };

    this.currentAnimation = 'run';
    this.animationSpeed = 1.0;
  }

  /**
   * Initialize the player with a mesh
   * @param {BABYLON.Mesh} mesh - The player mesh
   */
  init(mesh) {
    this.player = mesh;
    this.playerMesh = mesh;
    this.player.position = new BABYLON.Vector3(0, this.baseY, 0);

    // Create collision box (slightly smaller than visual)
    this.collider = BABYLON.MeshBuilder.CreateBox(
      'playerCollider',
      { width: 0.8, height: 1.8, depth: 0.8 },
      this.scene
    );
    this.collider.isVisible = false;
    this.collider.parent = this.player;

    this.setupAnimations();
  }

  /**
   * Replace the player's visual/root mesh with a new mesh.
   * Preserves position and collider.
   * @param {BABYLON.Mesh|BABYLON.TransformNode} newMesh
   */
  setPlayerMesh(newMesh) {
    if (!newMesh) return;
    const pos = this.player ? this.player.position.clone() : new BABYLON.Vector3(0, this.baseY, 0);
    const wasDead = this.isDead;

    // Detach collider
    if (this.collider) {
      this.collider.parent = null;
    }

    // Dispose previous mesh if different
    if (this.player && this.player !== newMesh && typeof this.player.dispose === 'function') {
      try {
        this.player.dispose(false, true);
      } catch {
        // ignore
      }
    }

    this.player = newMesh;
    this.playerMesh = newMesh;
    this.player.position = pos;

    // Reattach collider
    if (this.collider) {
      this.collider.parent = this.player;
    }

    // Reset state appropriately
    if (!wasDead) {
      this.playAnimation('run');
    }
  }

  /**
   * Setup animations for the player
   */
  setupAnimations() {
    // Placeholder for animation setup
    // Will be replaced with actual animations from Blender assets
  }

  /**
   * Update player state and position
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    if (!this.player || this.isDead) return;

    // Forward movement
    this.player.position.z += this.forwardSpeed * deltaTime;

    // Lane switching
    this.updateLanePosition(deltaTime);

    // Jump logic
    this.updateJump(deltaTime);

    // Slide logic
    this.updateSlide(deltaTime);
  }

  /**
   * Update lane position with smooth transition
   * @param {number} deltaTime - Time since last update
   */
  updateLanePosition(deltaTime) {
    const targetX = this.lanes[this.targetLane];
    const currentX = this.player.position.x;

    if (Math.abs(targetX - currentX) > 0.01) {
      const direction = Math.sign(targetX - currentX);
      const moveDistance = this.laneChangeSpeed * deltaTime;

      if (Math.abs(targetX - currentX) < moveDistance) {
        this.player.position.x = targetX;
        this.currentLane = this.targetLane;
      } else {
        this.player.position.x += direction * moveDistance;
      }
    }
  }

  /**
   * Update jump state
   * @param {number} deltaTime - Time since last update
   */
  updateJump(deltaTime) {
    if (this.isJumping) {
      this.jumpTime += deltaTime;

      // Parabolic jump curve
      const progress = this.jumpTime / this.jumpDuration;

      if (progress >= 1) {
        // End jump
        this.player.position.y = this.baseY;
        this.isJumping = false;
        this.jumpTime = 0;
        if (!this.isDead && !this.isSliding) {
          this.playAnimation('run');
        }
      } else {
        // Calculate jump height using sine curve for smooth motion
        const jumpCurve = Math.sin(progress * Math.PI);
        this.player.position.y = this.baseY + this.jumpHeight * jumpCurve;
      }
    }
  }

  /**
   * Update slide state
   * @param {number} deltaTime - Time since last update
   */
  updateSlide(deltaTime) {
    if (this.isSliding) {
      this.slideTime += deltaTime;

      // Lower the player during slide
      const slideProgress = Math.min(this.slideTime / 0.2, 1);
      this.player.position.y = this.baseY * (1 - slideProgress * 0.5);

      // Scale player to show sliding
      if (this.playerMesh) {
        this.playerMesh.scaling.y = 1 - slideProgress * 0.4;
      }

      if (this.slideTime >= this.maxSlideTime) {
        this.endSlide();
      }
    }
  }

  /**
   * Move player to the left lane
   */
  moveLeft() {
    if (this.targetLane > 0 && !this.isDead) {
      this.targetLane--;
    }
  }

  /**
   * Move player to the right lane
   */
  moveRight() {
    if (this.targetLane < this.lanes.length - 1 && !this.isDead) {
      this.targetLane++;
    }
  }

  /**
   * Make player jump
   */
  jump() {
    if (!this.isJumping && !this.isSliding && !this.isDead) {
      this.isJumping = true;
      this.jumpTime = 0;
      this.playAnimation('jump');

      // Add visual feedback
      if (this.playerMesh) {
        // Squash before jump
        BABYLON.Animation.CreateAndStartAnimation(
          'jumpSquash',
          this.playerMesh,
          'scaling.y',
          30,
          3,
          this.playerMesh.scaling.y,
          0.8,
          BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );

        // Then stretch
        setTimeout(() => {
          if (this.playerMesh) {
            this.playerMesh.scaling.y = 1.1;
          }
        }, 100);
      }
    }
  }

  /**
   * Make player slide
   */
  slide() {
    if (!this.isJumping && !this.isSliding && !this.isDead) {
      this.isSliding = true;
      this.slideTime = 0;
      this.playAnimation('slide');
    }
  }

  /**
   * End the slide action
   */
  endSlide() {
    this.isSliding = false;
    this.slideTime = 0;

    // Reset player height and scale
    this.player.position.y = this.baseY;
    if (this.playerMesh) {
      this.playerMesh.scaling.y = 1;
    }

    if (!this.isDead) {
      this.playAnimation('run');
    }
  }

  /**
   * Handle player death
   */
  die() {
    this.isDead = true;
    this.playAnimation('death');
  }

  /**
   * Play specified animation
   * @param {string} animationName - Name of the animation to play
   */
  playAnimation(animationName) {
    this.currentAnimation = animationName;
    // Animation playback will be implemented with Babylon.js animation system
  }

  /**
   * Reset player to initial state
   */
  reset() {
    if (this.player) {
      this.player.position = new BABYLON.Vector3(0, this.baseY, 0);
    }
    if (this.playerMesh) {
      this.playerMesh.scaling = new BABYLON.Vector3(1, 1, 1);
    }
    this.currentLane = 1;
    this.targetLane = 1;
    this.isJumping = false;
    this.isSliding = false;
    this.isDead = false;
    this.jumpTime = 0;
    this.slideTime = 0;
    this.verticalVelocity = 0;
    this.playAnimation('run');
  }

  /**
   * Set forward speed
   * @param {number} speed - New forward speed
   */
  setForwardSpeed(speed) {
    this.forwardSpeed = Math.max(5, Math.min(30, speed));
  }
}
