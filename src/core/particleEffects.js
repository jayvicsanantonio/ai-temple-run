/**
 * Particle Effects Module
 * Handles particle effects for coins, collisions, and other visual feedback
 */

import * as BABYLON from 'babylonjs';

export class ParticleEffects {
  constructor(scene) {
    this.scene = scene;
    this.particleSystems = [];
    this.activeEffects = [];
  }

  /**
   * Initialize particle systems
   */
  init() {
    // Pre-create particle systems for pooling
    this.createCoinParticleSystem();
    this.createDustParticleSystem();
    this.createCollisionParticleSystem();
    this.createSparkleParticleSystem();
  }

  /**
   * Create coin collection particle effect
   */
  createCoinParticleSystem() {
    const particleSystem = new BABYLON.ParticleSystem('coinParticles', 50, this.scene);
    
    // Texture (using a simple procedural texture)
    particleSystem.particleTexture = this.createParticleTexture('star');
    
    // Emission
    particleSystem.emitter = new BABYLON.Vector3(0, 0, 0);
    particleSystem.minEmitBox = new BABYLON.Vector3(-0.5, 0, -0.5);
    particleSystem.maxEmitBox = new BABYLON.Vector3(0.5, 0, 0.5);
    
    // Colors
    particleSystem.color1 = new BABYLON.Color4(1, 0.84, 0, 1);
    particleSystem.color2 = new BABYLON.Color4(1, 0.95, 0.3, 1);
    particleSystem.colorDead = new BABYLON.Color4(1, 0.84, 0, 0);
    
    // Size
    particleSystem.minSize = 0.1;
    particleSystem.maxSize = 0.3;
    
    // Lifetime
    particleSystem.minLifeTime = 0.3;
    particleSystem.maxLifeTime = 0.8;
    
    // Emission rate
    particleSystem.emitRate = 100;
    
    // Speed
    particleSystem.minEmitPower = 2;
    particleSystem.maxEmitPower = 4;
    particleSystem.updateSpeed = 0.01;
    
    // Direction
    particleSystem.direction1 = new BABYLON.Vector3(-1, 1, -1);
    particleSystem.direction2 = new BABYLON.Vector3(1, 2, 1);
    
    // Gravity
    particleSystem.gravity = new BABYLON.Vector3(0, -5, 0);
    
    // Blending
    particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    
    particleSystem.stop();
    this.coinParticleSystem = particleSystem;
  }

  /**
   * Create dust particle effect for running
   */
  createDustParticleSystem() {
    const particleSystem = new BABYLON.ParticleSystem('dustParticles', 100, this.scene);
    
    particleSystem.particleTexture = this.createParticleTexture('smoke');
    
    particleSystem.emitter = new BABYLON.Vector3(0, 0, 0);
    particleSystem.minEmitBox = new BABYLON.Vector3(-0.3, 0, -0.3);
    particleSystem.maxEmitBox = new BABYLON.Vector3(0.3, 0, 0.3);
    
    // Colors (brownish dust)
    particleSystem.color1 = new BABYLON.Color4(0.6, 0.5, 0.4, 0.3);
    particleSystem.color2 = new BABYLON.Color4(0.5, 0.4, 0.3, 0.2);
    particleSystem.colorDead = new BABYLON.Color4(0.5, 0.4, 0.3, 0);
    
    particleSystem.minSize = 0.2;
    particleSystem.maxSize = 0.5;
    
    particleSystem.minLifeTime = 0.2;
    particleSystem.maxLifeTime = 0.5;
    
    particleSystem.emitRate = 30;
    
    particleSystem.minEmitPower = 0.5;
    particleSystem.maxEmitPower = 1;
    
    particleSystem.direction1 = new BABYLON.Vector3(-0.5, 0.2, -1);
    particleSystem.direction2 = new BABYLON.Vector3(0.5, 0.5, -0.5);
    
    particleSystem.gravity = new BABYLON.Vector3(0, -1, 0);
    
    particleSystem.stop();
    this.dustParticleSystem = particleSystem;
  }

  /**
   * Create collision particle effect
   */
  createCollisionParticleSystem() {
    const particleSystem = new BABYLON.ParticleSystem('collisionParticles', 200, this.scene);
    
    particleSystem.particleTexture = this.createParticleTexture('debris');
    
    particleSystem.emitter = new BABYLON.Vector3(0, 0, 0);
    particleSystem.createSphereEmitter(1);
    
    // Colors (reddish impact)
    particleSystem.color1 = new BABYLON.Color4(1, 0.3, 0.1, 1);
    particleSystem.color2 = new BABYLON.Color4(0.8, 0.2, 0, 1);
    particleSystem.colorDead = new BABYLON.Color4(0.5, 0.1, 0, 0);
    
    particleSystem.minSize = 0.1;
    particleSystem.maxSize = 0.4;
    
    particleSystem.minLifeTime = 0.3;
    particleSystem.maxLifeTime = 0.6;
    
    particleSystem.emitRate = 500;
    
    particleSystem.minEmitPower = 3;
    particleSystem.maxEmitPower = 6;
    
    particleSystem.gravity = new BABYLON.Vector3(0, -10, 0);
    
    particleSystem.stop();
    this.collisionParticleSystem = particleSystem;
  }

  /**
   * Create sparkle particle effect
   */
  createSparkleParticleSystem() {
    const particleSystem = new BABYLON.ParticleSystem('sparkleParticles', 30, this.scene);
    
    particleSystem.particleTexture = this.createParticleTexture('sparkle');
    
    particleSystem.emitter = new BABYLON.Vector3(0, 0, 0);
    particleSystem.minEmitBox = new BABYLON.Vector3(-0.2, -0.2, -0.2);
    particleSystem.maxEmitBox = new BABYLON.Vector3(0.2, 0.2, 0.2);
    
    // Colors (white sparkles)
    particleSystem.color1 = new BABYLON.Color4(1, 1, 1, 1);
    particleSystem.color2 = new BABYLON.Color4(0.9, 0.9, 1, 1);
    particleSystem.colorDead = new BABYLON.Color4(1, 1, 1, 0);
    
    particleSystem.minSize = 0.05;
    particleSystem.maxSize = 0.15;
    
    particleSystem.minLifeTime = 0.5;
    particleSystem.maxLifeTime = 1;
    
    particleSystem.emitRate = 20;
    
    particleSystem.minEmitPower = 0.5;
    particleSystem.maxEmitPower = 1;
    
    particleSystem.direction1 = new BABYLON.Vector3(-1, -1, -1);
    particleSystem.direction2 = new BABYLON.Vector3(1, 1, 1);
    
    particleSystem.gravity = new BABYLON.Vector3(0, -0.5, 0);
    
    particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    
    particleSystem.stop();
    this.sparkleParticleSystem = particleSystem;
  }

  /**
   * Create procedural particle texture
   */
  createParticleTexture(type) {
    const size = 64;
    const texture = new BABYLON.DynamicTexture(
      `particleTexture_${type}`,
      { width: size, height: size },
      this.scene,
      false
    );
    
    const context = texture.getContext();
    context.clearRect(0, 0, size, size);
    
    switch (type) {
      case 'star':
        // Draw a star shape
        context.fillStyle = 'white';
        context.beginPath();
        const spikes = 5;
        const outerRadius = size / 2 - 2;
        const innerRadius = outerRadius / 2;
        let rot = Math.PI / 2 * 3;
        const step = Math.PI / spikes;
        
        context.moveTo(size / 2, size / 2 - outerRadius);
        for (let i = 0; i < spikes; i++) {
          context.lineTo(
            size / 2 + Math.cos(rot) * outerRadius,
            size / 2 + Math.sin(rot) * outerRadius
          );
          rot += step;
          context.lineTo(
            size / 2 + Math.cos(rot) * innerRadius,
            size / 2 + Math.sin(rot) * innerRadius
          );
          rot += step;
        }
        context.closePath();
        context.fill();
        break;
        
      case 'smoke':
      case 'debris':
        // Draw a circle with gradient
        const gradient = context.createRadialGradient(
          size / 2, size / 2, 0,
          size / 2, size / 2, size / 2
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        context.fill();
        break;
        
      case 'sparkle':
        // Draw a cross/sparkle shape
        context.strokeStyle = 'white';
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(size / 2, 0);
        context.lineTo(size / 2, size);
        context.moveTo(0, size / 2);
        context.lineTo(size, size / 2);
        context.stroke();
        
        // Add diagonal lines
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(size * 0.2, size * 0.2);
        context.lineTo(size * 0.8, size * 0.8);
        context.moveTo(size * 0.8, size * 0.2);
        context.lineTo(size * 0.2, size * 0.8);
        context.stroke();
        break;
    }
    
    texture.update();
    return texture;
  }

  /**
   * Play coin collection effect
   */
  playCoinEffect(position) {
    this.coinParticleSystem.emitter = position.clone();
    this.coinParticleSystem.start();
    
    setTimeout(() => {
      this.coinParticleSystem.stop();
    }, 300);
  }

  /**
   * Play dust effect at player feet
   */
  playDustEffect(position) {
    this.dustParticleSystem.emitter = position.clone();
    this.dustParticleSystem.emitter.y = 0;
    
    if (!this.dustParticleSystem.isStarted()) {
      this.dustParticleSystem.start();
    }
  }

  /**
   * Stop dust effect
   */
  stopDustEffect() {
    this.dustParticleSystem.stop();
  }

  /**
   * Play collision effect
   */
  playCollisionEffect(position) {
    this.collisionParticleSystem.emitter = position.clone();
    this.collisionParticleSystem.start();
    
    setTimeout(() => {
      this.collisionParticleSystem.stop();
    }, 200);
  }

  /**
   * Play sparkle effect
   */
  playSparkleEffect(position) {
    this.sparkleParticleSystem.emitter = position.clone();
    this.sparkleParticleSystem.start();
    
    setTimeout(() => {
      this.sparkleParticleSystem.stop();
    }, 1000);
  }

  /**
   * Update all active particle systems
   */
  update(deltaTime) {
    // Particle systems update automatically in Babylon.js
  }

  /**
   * Reset all particle systems
   */
  reset() {
    this.coinParticleSystem.stop();
    this.dustParticleSystem.stop();
    this.collisionParticleSystem.stop();
    this.sparkleParticleSystem.stop();
  }

  /**
   * Dispose all particle systems
   */
  dispose() {
    this.coinParticleSystem.dispose();
    this.dustParticleSystem.dispose();
    this.collisionParticleSystem.dispose();
    this.sparkleParticleSystem.dispose();
  }
}
