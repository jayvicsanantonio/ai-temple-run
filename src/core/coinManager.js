/**
 * Coin Manager Module
 * Handles coin spawning, collection, and pooling
 */

import * as BABYLON from 'babylonjs';

export class CoinManager {
  constructor(scene, assetManager) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.coins = [];
    this.coinPool = [];
    this.collectedCoins = 0;
    this.totalCoins = 0;

    // Spawn parameters
    this.spawnDistance = 50;
    this.lastSpawnZ = 0;
    this.coinsPerGroup = 5;

    // Lane positions matching player controller
    this.lanes = [-2, 0, 2];

    // Visual properties
    this.coinRotationSpeed = 0; // spinning disabled; use gentle bobbing instead
    this._time = 0;
  }

  /**
   * Initialize the coin manager
   */
  init() {
    this.createCoinPool();
  }

  /**
   * Create a pool of reusable coins
   */
  createCoinPool() {
    const poolSize = 50;

    for (let i = 0; i < poolSize; i++) {
      // Try to use temple coin GLB model, fallback to procedural
      const coinModel = this.assetManager?.getModel('coin');
      let coin;

      if (coinModel) {
        console.log(`Creating coin instance ${i} from model:`, coinModel.name, coinModel.constructor.name);

        // Debug: log the structure
        if (typeof coinModel.getChildMeshes === 'function') {
          const meshes = coinModel.getChildMeshes(true); // Include descendants
          console.log(`Coin model has ${meshes.length} child meshes:`, meshes.map(m => ({
            name: m.name,
            type: m.constructor.name,
            vertices: m.getTotalVertices ? m.getTotalVertices() : 'N/A',
            enabled: m.isEnabled(),
            visible: m.isVisible
          })));
        }

        // Try using the AssetManager's createLODInstance method which handles GLB properly
        coin = this.assetManager.createLODInstance('coin', `coin_${i}`, new BABYLON.Vector3(0, 0, 0));

        if (coin) {
          coin.setEnabled(true);
          console.log(`Coin ${i} created via LOD instance: SUCCESS`);
          // Normalize coin size to fit lane scale
          coin.scaling = new BABYLON.Vector3(0.6, 0.6, 0.6);
          // Center coin instance so it's aligned to position
          if (this.assetManager?.centerInstance) {
            this.assetManager.centerInstance(coin);
          }
          // Make coin face camera around Y for readability
          if (typeof coin.getChildMeshes === 'function') {
            for (const m of coin.getChildMeshes(false)) {
              if (m && typeof m.billboardMode !== 'undefined') {
                m.billboardMode = BABYLON.AbstractMesh.BILLBOARDMODE_Y;
              }
            }
          }
        } else {
          // Fallback: try direct cloning of all child meshes
          if (typeof coinModel.getChildMeshes === 'function') {
            const meshes = coinModel.getChildMeshes(true);
            if (meshes.length > 0) {
              // Create a container for all the cloned meshes
              coin = new BABYLON.TransformNode(`coin_${i}`, this.scene);

              for (const mesh of meshes) {
                if (mesh && mesh.getTotalVertices && mesh.getTotalVertices() > 0) {
                  const clonedMesh = mesh.clone(`${coin.name}_${mesh.name}`);
                  clonedMesh.parent = coin;
                  clonedMesh.setEnabled(true);
                  clonedMesh.isVisible = true;
                }
              }
              console.log(`Coin ${i} created via mesh cloning: SUCCESS`);
            }
          }
        }

        console.log(`Coin ${i} final result:`, coin ? 'SUCCESS' : 'FAILED');

        // Do not override emissive gold material set by AssetManager tuning
      } else {
        // Fallback to procedural coin
        coin = BABYLON.MeshBuilder.CreateCylinder(
          `coin_${i}`,
          { height: 0.1, diameter: 0.8 },
          this.scene
        );

        // Create golden material
        const material = new BABYLON.StandardMaterial(`coin_mat_${i}`, this.scene);
        material.diffuseColor = new BABYLON.Color3(1, 0.84, 0);
        material.specularColor = new BABYLON.Color3(1, 1, 1);
        material.emissiveColor = new BABYLON.Color3(0.2, 0.15, 0);
        coin.material = material;

        coin.rotation.x = Math.PI / 2; // Rotate to face forward
      }

      coin.setEnabled(false);
      if (!coin.scaling) {
        coin.scaling = new BABYLON.Vector3(0.6, 0.6, 0.6);
      }

      // Store coin data
      coin.coinData = {
        active: false,
        collected: false,
        lane: null,
      };

      this.coinPool.push(coin);
    }
  }

  /**
   * Update coins and spawn new ones
   * @param {number} deltaTime - Time since last update
   * @param {BABYLON.Vector3} playerPosition - Current player position
   */
  update(deltaTime, playerPosition) {
    // Check if we need to spawn new coins
    if (playerPosition && playerPosition.z > this.lastSpawnZ - this.spawnDistance) {
      this.spawnCoinGroup(playerPosition.z + this.spawnDistance);
    }

    // Update active coins
    this.updateCoins(deltaTime, playerPosition);
  }

  /**
   * Spawn a group of coins
   * @param {number} startZ - Starting Z position for the coin group
   */
  spawnCoinGroup(startZ) {
    // Random lane selection
    const lane = Math.floor(Math.random() * this.lanes.length);
    const xPos = this.lanes[lane];

    // Spawn coins in a line
    for (let i = 0; i < this.coinsPerGroup; i++) {
      const coin = this.getFromPool();

      if (coin) {
        coin.position.x = xPos;
        coin.position.y = 0.8; // Float just above the path
        coin.position.z = startZ + i * 2; // Space coins apart

        coin.coinData.active = true;
        coin.coinData.collected = false;
        coin.coinData.lane = lane;
        coin.coinData.baseY = coin.position.y;
        coin.coinData.bobPhase = Math.random() * Math.PI * 2;

        coin.setEnabled(true);
        this.coins.push(coin);
        this.totalCoins++;
      }
    }

    this.lastSpawnZ = startZ + this.coinsPerGroup * 2;
  }

  /**
   * Update coin animations and check for collection
   * @param {number} deltaTime - Time since last update
   * @param {BABYLON.Vector3} playerPosition - Current player position
   */
  updateCoins(deltaTime, playerPosition) {
    if (!playerPosition) return;

    this._time += deltaTime;
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      const dz = coin.position.z - playerPosition.z;

      // Distance-based culling to reduce draw calls
      if (dz > 80) {
        coin.setEnabled(false);
      } else if (dz > -10) {
        coin.setEnabled(true);
      }

      // Gentle vertical bobbing for feedback (no spinning)
      if (coin.isEnabled()) {
        const a = 0.12; // amplitude
        const w = 2.4;  // speed
        const baseY = coin.coinData.baseY ?? 0.8;
        const phase = coin.coinData.bobPhase ?? 0;
        coin.position.y = baseY + Math.sin(this._time * w + phase) * a;
      }

      // Check if coin is far behind the player
      if (coin.position.z < playerPosition.z - 10) {
        this.returnToPool(coin);
        this.coins.splice(i, 1);
      }
    }
  }

  /**
   * Check and handle coin collection
   * @param {BABYLON.Mesh} playerMesh - The player mesh
   * @returns {number} Number of coins collected in this check
   */
  checkCollection(playerMesh) {
    if (!playerMesh) return 0;

    let coinsCollectedThisFrame = 0;

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];

      if (coin.coinData.active && !coin.coinData.collected) {
        // Check distance for collection (more forgiving than mesh intersection)
        const distance = BABYLON.Vector3.Distance(coin.position, playerMesh.position);

        if (distance < 1.5) {
          // Collect the coin
          coin.coinData.collected = true;
          this.collectedCoins++;
          coinsCollectedThisFrame++;

          // Play collection animation
          this.playCollectionAnimation(coin);

          // Remove from active list after a short delay
          setTimeout(() => {
            const index = this.coins.indexOf(coin);
            if (index > -1) {
              this.coins.splice(index, 1);
              this.returnToPool(coin);
            }
          }, 200);
        }
      }
    }

    return coinsCollectedThisFrame;
  }

  /**
   * Play collection animation for a coin
   * @param {BABYLON.Mesh} coin - The collected coin
   */
  playCollectionAnimation(coin) {
    // Enhanced collection animation with upward movement and golden particle burst
    const animationGroup = new BABYLON.AnimationGroup("coinCollection", this.scene);

    // Scale animation - more dramatic
    const scaleAnimation = new BABYLON.Animation(
      'coinScale',
      'scaling',
      60,
      BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const scaleKeys = [
      { frame: 0, value: coin.scaling.clone() },
      { frame: 15, value: new BABYLON.Vector3(2.0, 2.0, 2.0) },
      { frame: 30, value: new BABYLON.Vector3(0.1, 0.1, 0.1) },
    ];
    scaleAnimation.setKeys(scaleKeys);

    // Upward movement animation
    const moveAnimation = new BABYLON.Animation(
      'coinMove',
      'position.y',
      60,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const moveKeys = [
      { frame: 0, value: coin.position.y },
      { frame: 20, value: coin.position.y + 2.0 },
      { frame: 30, value: coin.position.y + 1.5 },
    ];
    moveAnimation.setKeys(moveKeys);

    // Spin animation for extra flair
    const spinAnimation = new BABYLON.Animation(
      'coinSpin',
      'rotation.y',
      60,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const spinKeys = [
      { frame: 0, value: coin.rotation.y },
      { frame: 30, value: coin.rotation.y + Math.PI * 4 },
    ];
    spinAnimation.setKeys(spinKeys);

    // Add animations to group
    animationGroup.addTargetedAnimation(scaleAnimation, coin);
    animationGroup.addTargetedAnimation(moveAnimation, coin);
    animationGroup.addTargetedAnimation(spinAnimation, coin);

    // Create golden particle burst effect
    this.createCoinParticles(coin.position);

    // Play animation group
    animationGroup.play(false);
  }

  /**
   * Create golden particle burst effect for coin collection
   * @param {BABYLON.Vector3} position - Position to create particles
   */
  createCoinParticles(position) {
    // Create particle system for golden sparkles
    const particleSystem = new BABYLON.ParticleSystem("coinParticles", 20, this.scene);

    // Create simple golden sphere for particle texture
    const particleTexture = new BABYLON.DynamicTexture("particleTexture", 64, this.scene);
    const ctx = particleTexture.getContext();
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255, 215, 0, 1)");
    gradient.addColorStop(0.5, "rgba(255, 165, 0, 0.8)");
    gradient.addColorStop(1, "rgba(255, 215, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    particleTexture.update(false);

    particleSystem.particleTexture = particleTexture;

    // Particle emission properties
    particleSystem.emitter = position.clone();
    particleSystem.minEmitBox = new BABYLON.Vector3(-0.2, -0.2, -0.2);
    particleSystem.maxEmitBox = new BABYLON.Vector3(0.2, 0.2, 0.2);

    // Particle behavior
    particleSystem.color1 = new BABYLON.Color4(1, 0.84, 0, 1);
    particleSystem.color2 = new BABYLON.Color4(1, 0.65, 0, 1);
    particleSystem.colorDead = new BABYLON.Color4(1, 1, 0, 0);

    particleSystem.minSize = 0.1;
    particleSystem.maxSize = 0.3;
    particleSystem.minLifeTime = 0.3;
    particleSystem.maxLifeTime = 0.8;

    // Emission properties
    particleSystem.emitRate = 50;
    particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;

    // Gravity and direction
    particleSystem.gravity = new BABYLON.Vector3(0, -2, 0);
    particleSystem.direction1 = new BABYLON.Vector3(-1, 1, -1);
    particleSystem.direction2 = new BABYLON.Vector3(1, 2, 1);

    particleSystem.minAngularSpeed = 0;
    particleSystem.maxAngularSpeed = Math.PI;

    particleSystem.minInitialRotation = 0;
    particleSystem.maxInitialRotation = Math.PI;

    // Start particles and auto-dispose
    particleSystem.start();

    setTimeout(() => {
      particleSystem.stop();
      setTimeout(() => {
        particleSystem.dispose();
        particleTexture.dispose();
      }, 1000);
    }, 200);
  }

  /**
   * Get an inactive coin from the pool
   * @returns {BABYLON.Mesh|null} An available coin or null
   */
  getFromPool() {
    for (const coin of this.coinPool) {
      if (!coin.coinData.active) {
        return coin;
      }
    }
    return null;
  }

  /**
   * Return a coin to the pool
   * @param {BABYLON.Mesh} coin - The coin to return
   */
  returnToPool(coin) {
    coin.setEnabled(false);
    coin.coinData.active = false;
    coin.coinData.collected = false;
    coin.coinData.lane = null;
    // keep scaling as normalized when created

    // Remove from LOD tracking
    if (this.assetManager) {
      this.assetManager.removeLODInstance(coin);
    }
  }

  /**
   * Reset the coin manager
   */
  reset() {
    // Return all coins to pool
    for (const coin of this.coins) {
      this.returnToPool(coin);
    }

    this.coins = [];
    this.collectedCoins = 0;
    this.totalCoins = 0;
    this.lastSpawnZ = 0;
  }

  /**
   * Get the current coin count
   * @returns {number} Number of collected coins
   */
  getCollectedCoins() {
    return this.collectedCoins;
  }

  /**
   * Set coin spawn parameters
   * @param {number} coinsPerGroup - Number of coins to spawn in a group
   */
  setSpawnParameters(coinsPerGroup) {
    this.coinsPerGroup = Math.max(1, Math.min(10, coinsPerGroup));
  }
}
