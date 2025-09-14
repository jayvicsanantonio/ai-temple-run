/**
 * UI Manager Module
 * Handles all UI elements including score, menus, and game states
 */

export class UIManager {
  constructor() {
    this.score = 0;
    this.coins = 0;
    this.distance = 0;
    this.highScore = this.loadHighScore();

    // UI Elements
    this.elements = {
      startScreen: null,
      gameUI: null,
      gameOverScreen: null,
      scoreDisplay: null,
      coinDisplay: null,
      distanceDisplay: null,
      highScoreDisplay: null,
      finalScoreDisplay: null,
      playButton: null,
      restartButton: null,
    };

    this.onPlayCallback = null;
    this.onRestartCallback = null;
    this.elements.statusBanner = null;
  }

  /**
   * Initialize UI elements
   */
  init() {
    this.createUIElements();
    this.setupEventListeners();
    this.showStartScreen();
  }

  /**
   * Create all UI elements
   */
  createUIElements() {
    // Start Screen
    const startScreen = document.createElement('div');
    startScreen.id = 'start-screen';
    startScreen.className = 'ui-screen';
    startScreen.innerHTML = `
      <div class="ui-container">
        <h1 class="game-title">Temple Run</h1>
        <p class="game-subtitle">Web Edition</p>
        <button id="play-button" class="ui-button">Play</button>
        <div class="high-score">High Score: <span id="menu-high-score">0</span></div>
      </div>
    `;
    document.body.appendChild(startScreen);
    this.elements.startScreen = startScreen;

    // Game UI (HUD)
    const gameUI = document.createElement('div');
    gameUI.id = 'game-ui';
    gameUI.className = 'game-hud hidden';
    gameUI.innerHTML = `
      <div class="hud-top">
        <div class="hud-item">
          <span class="hud-label">Score</span>
          <span id="score-display" class="hud-value">0</span>
        </div>
        <div class="hud-item">
          <span class="hud-label">Coins</span>
          <span id="coin-display" class="hud-value">0</span>
        </div>
        <div class="hud-item">
          <span class="hud-label">Distance</span>
          <span id="distance-display" class="hud-value">0m</span>
        </div>
      </div>
    `;
    document.body.appendChild(gameUI);
    this.elements.gameUI = gameUI;

    // Game Over Screen
    const gameOverScreen = document.createElement('div');
    gameOverScreen.id = 'game-over-screen';
    gameOverScreen.className = 'ui-screen hidden';
    gameOverScreen.innerHTML = `
      <div class="ui-container">
        <h2 class="game-over-title">Game Over</h2>
        <div class="score-summary">
          <div class="score-item">
            <span>Score:</span>
            <span id="final-score">0</span>
          </div>
          <div class="score-item">
            <span>Coins:</span>
            <span id="final-coins">0</span>
          </div>
          <div class="score-item">
            <span>Distance:</span>
            <span id="final-distance">0m</span>
          </div>
          <div class="score-item highlight">
            <span>High Score:</span>
            <span id="final-high-score">0</span>
          </div>
        </div>
        <button id="restart-button" class="ui-button">Play Again</button>
      </div>
    `;
    document.body.appendChild(gameOverScreen);
    this.elements.gameOverScreen = gameOverScreen;

    // Get references to elements
    this.elements.scoreDisplay = document.getElementById('score-display');
    this.elements.coinDisplay = document.getElementById('coin-display');
    this.elements.distanceDisplay = document.getElementById('distance-display');
    this.elements.highScoreDisplay = document.getElementById('menu-high-score');
    this.elements.finalScoreDisplay = document.getElementById('final-score');
    this.elements.playButton = document.getElementById('play-button');
    this.elements.restartButton = document.getElementById('restart-button');
    // No debug elements

    // Update high score display
    this.elements.highScoreDisplay.textContent = this.highScore;
  }

  /**
   * Setup event listeners for UI buttons
   */
  setupEventListeners() {
    this.elements.playButton.addEventListener('click', () => {
      this.hideStartScreen();
      this.showGameUI();
      if (this.onPlayCallback) {
        this.onPlayCallback();
      }
    });

    this.elements.restartButton.addEventListener('click', () => {
      this.hideGameOverScreen();
      this.showGameUI();
      this.resetUI();
      if (this.onRestartCallback) {
        this.onRestartCallback();
      }
    });

    // No debug event listeners
  }

  /**
   * Show start screen
   */
  showStartScreen() {
    this.elements.startScreen.classList.remove('hidden');
    this.elements.gameUI.classList.add('hidden');
    this.elements.gameOverScreen.classList.add('hidden');
  }

  /**
   * Hide start screen
   */
  hideStartScreen() {
    this.elements.startScreen.classList.add('hidden');
  }

  /**
   * Show game UI (HUD)
   */
  showGameUI() {
    this.elements.gameUI.classList.remove('hidden');
  }

  /**
   * Hide game UI
   */
  hideGameUI() {
    this.elements.gameUI.classList.add('hidden');
  }

  // Debug status banner removed

  /**
   * Show game over screen
   */
  showGameOverScreen() {
    this.elements.gameOverScreen.classList.remove('hidden');

    // Update final scores
    document.getElementById('final-score').textContent = this.score;
    document.getElementById('final-coins').textContent = this.coins;
    document.getElementById('final-distance').textContent = `${Math.floor(this.distance)}m`;
    document.getElementById('final-high-score').textContent = this.highScore;
  }

  /**
   * Hide game over screen
   */
  hideGameOverScreen() {
    this.elements.gameOverScreen.classList.add('hidden');
  }

  /**
   * Update score display
   * @param {number} score - New score value
   */
  updateScore(score) {
    this.score = score;
    this.elements.scoreDisplay.textContent = score;

    // Update high score if necessary
    if (score > this.highScore) {
      this.highScore = score;
      this.saveHighScore(score);
    }
  }

  /**
   * Update coin display
   * @param {number} coins - New coin count
   */
  updateCoins(coins) {
    this.coins = coins;
    this.elements.coinDisplay.textContent = coins;
  }

  /**
   * Update distance display
   * @param {number} distance - Distance in game units
   */
  updateDistance(distance) {
    this.distance = distance;
    this.elements.distanceDisplay.textContent = `${Math.floor(distance)}m`;
  }

  /**
   * Reset UI values
   */
  resetUI() {
    this.score = 0;
    this.coins = 0;
    this.distance = 0;
    this.updateScore(0);
    this.updateCoins(0);
    this.updateDistance(0);
  }

  /**
   * Handle game over
   */
  gameOver() {
    this.hideGameUI();
    this.showGameOverScreen();
  }

  /**
   * Set play button callback
   * @param {Function} callback - Function to call when play is clicked
   */
  setOnPlayCallback(callback) {
    this.onPlayCallback = callback;
  }

  /**
   * Set restart button callback
   * @param {Function} callback - Function to call when restart is clicked
   */
  setOnRestartCallback(callback) {
    this.onRestartCallback = callback;
  }

  // Debug callback setters removed

  /**
   * Load high score from local storage
   * @returns {number} Saved high score or 0
   */
  loadHighScore() {
    const saved = localStorage.getItem('templeRunHighScore');
    return saved ? parseInt(saved, 10) : 0;
  }

  /**
   * Save high score to local storage
   * @param {number} score - Score to save
   */
  saveHighScore(score) {
    localStorage.setItem('templeRunHighScore', score.toString());
  }
}
