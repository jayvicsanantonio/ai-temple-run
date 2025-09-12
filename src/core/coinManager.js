/**
 * Coin Manager Module
 * Handles coin spawning, collection, and pooling
 */

import * as BABYLON from 'babylonjs';

export class CoinManager {
  constructor(scene) {
    this.scene = scene;
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
    this.coinRotationSpeed = 2;
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
      // Create coin mesh (cylinder for now, will be replaced with actual coin model)
      const coin = BABYLON.MeshBuilder.CreateCylinder(
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
      
      coin.isVisible = false;
      coin.rotation.x = Math.PI / 2; // Rotate to face forward
      
      // Store coin data
      coin.coinData = {
        active: false,
        collected: false,
        lane: null
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
        coin.position.y = 1; // Float above ground
        coin.position.z = startZ + (i * 2); // Space coins apart
        
        coin.coinData.active = true;
        coin.coinData.collected = false;
        coin.coinData.lane = lane;
        
        coin.isVisible = true;
        this.coins.push(coin);
        this.totalCoins++;
      }
    }
    
    this.lastSpawnZ = startZ + (this.coinsPerGroup * 2);
  }

  /**
   * Update coin animations and check for collection
   * @param {number} deltaTime - Time since last update
   * @param {BABYLON.Vector3} playerPosition - Current player position
   */
  updateCoins(deltaTime, playerPosition) {
    if (!playerPosition) return;

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      
      // Rotate coin
      coin.rotation.z += this.coinRotationSpeed * deltaTime;
      
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
    // Simple scale and fade animation
    const animationScale = new BABYLON.Animation(
      'coinCollect',
      'scaling',
      30,
      BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    const keys = [
      { frame: 0, value: coin.scaling.clone() },
      { frame: 10, value: new BABYLON.Vector3(1.5, 1.5, 1.5) },
      { frame: 20, value: new BABYLON.Vector3(0, 0, 0) }
    ];
    
    animationScale.setKeys(keys);
    coin.animations.push(animationScale);
    
    this.scene.beginAnimation(coin, 0, 20, false);
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
    coin.isVisible = false;
    coin.coinData.active = false;
    coin.coinData.collected = false;
    coin.coinData.lane = null;
    coin.scaling = new BABYLON.Vector3(1, 1, 1);
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
