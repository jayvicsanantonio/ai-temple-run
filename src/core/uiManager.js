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
        <div class="hud-item hud-debug">
          <input id="h3d-prompt" class="hud-input" placeholder="Hyper3D prompt" />
          <button id="h3d-generate" class="ui-button small">Gen 3D</button>
          <span id="h3d-status" class="hud-status"></span>
        </div>
        <div class="hud-item hud-debug">
          <label class="hud-label">Character</label>
          <select id="char-mode" class="hud-select">
            <option value="PROCEDURAL">Procedural</option>
            <option value="GLB">GLB</option>
            <option value="HYPER3D">Hyper3D</option>
          </select>
          <input id="char-glb-url" class="hud-input" placeholder="/models/player.glb" />
          <input id="char-prompt" class="hud-input" placeholder="runner prompt" />
          <button id="char-apply" class="ui-button small">Apply</button>
        </div>
      </div>
      <div id="status-banner" class="status-banner hidden"></div>
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
    // Debug elements
    this.elements.h3dPrompt = document.getElementById('h3d-prompt');
    this.elements.h3dGenerateBtn = document.getElementById('h3d-generate');
    this.elements.h3dStatus = document.getElementById('h3d-status');
    this.elements.statusBanner = document.getElementById('status-banner');
    this.elements.charMode = document.getElementById('char-mode');
    this.elements.charGlbUrl = document.getElementById('char-glb-url');
    this.elements.charPrompt = document.getElementById('char-prompt');
    this.elements.charApply = document.getElementById('char-apply');

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

    if (this.elements.h3dGenerateBtn) {
      this.elements.h3dGenerateBtn.addEventListener('click', () => {
        const prompt = this.elements.h3dPrompt ? this.elements.h3dPrompt.value : '';
        if (this.onHyper3DGenerate) {
          const updateStatus = (text) => {
            if (this.elements.h3dStatus) this.elements.h3dStatus.textContent = text || '';
          };
          updateStatus('Starting...');
          this.onHyper3DGenerate(prompt, updateStatus);
        }
      });
    }

    if (this.elements.charApply) {
      this.elements.charApply.addEventListener('click', () => {
        if (this.onCharacterModeChange) {
          const mode = this.elements.charMode?.value || 'PROCEDURAL';
          const glbUrl = this.elements.charGlbUrl?.value || '';
          const prompt = this.elements.charPrompt?.value || '';
          this.onCharacterModeChange({ mode, glbUrl, prompt });
        }
      });
    }
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

  /**
   * Show a temporary status banner
   */
  showStatusBanner(text, level = 'info', timeoutMs = 2000) {
    const el = this.elements.statusBanner;
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden');
    el.classList.remove('info', 'warn', 'error');
    el.classList.add(level);
    if (this._bannerTimer) clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => this.hideStatusBanner(), timeoutMs);
  }

  hideStatusBanner() {
    const el = this.elements.statusBanner;
    if (!el) return;
    el.classList.add('hidden');
  }

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

  /**
   * Set Hyper3D generate button callback
   * @param {(prompt: string, updateStatus: (text:string)=>void) => void} callback
   */
  setOnHyper3DGenerateCallback(callback) {
    this.onHyper3DGenerate = callback;
  }

  /**
   * Set Character Mode change callback
   * @param {(opts: {mode:string, glbUrl?: string, prompt?: string}) => void} callback
   */
  setOnCharacterModeChangeCallback(callback) {
    this.onCharacterModeChange = callback;
  }

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
