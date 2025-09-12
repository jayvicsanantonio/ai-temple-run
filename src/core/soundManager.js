/**
 * Sound Manager Module
 * Handles all game audio including music and sound effects
 */

export class SoundManager {
  constructor() {
    this.sounds = {};
    this.music = {};
    this.isMuted = false;
    this.soundVolume = 0.7;
    this.musicVolume = 0.5;
    this.audioContext = null;
    
    this.initAudioContext();
  }

  /**
   * Initialize Web Audio API context
   */
  initAudioContext() {
    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
    } catch (e) {
      console.warn('Web Audio API is not supported in this browser');
    }
  }

  /**
   * Initialize all game sounds
   */
  init() {
    // Create synthetic sounds since we don't have actual audio files
    this.createSyntheticSounds();
    
    // Check if sounds are muted in localStorage
    const savedMute = localStorage.getItem('templeRunMuted');
    if (savedMute === 'true') {
      this.mute();
    }
  }

  /**
   * Create synthetic sounds using Web Audio API
   */
  createSyntheticSounds() {
    if (!this.audioContext) return;

    // Create sound effects
    this.sounds.jump = () => this.playTone(440, 0.1, 'sine', 0.3);
    this.sounds.slide = () => this.playTone(220, 0.2, 'sine', 0.3);
    this.sounds.coinCollect = () => this.playTone(880, 0.1, 'square', 0.2);
    this.sounds.collision = () => this.playNoise(0.3, 0.5);
    this.sounds.gameOver = () => this.playDescendingTone();
    this.sounds.buttonClick = () => this.playTone(600, 0.05, 'square', 0.2);
    this.sounds.powerUp = () => this.playAscendingTone();
  }

  /**
   * Play a simple tone
   */
  playTone(frequency, duration, type = 'sine', volume = 0.5) {
    if (!this.audioContext || this.isMuted) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      
      const actualVolume = volume * this.soundVolume;
      gainNode.gain.setValueAtTime(actualVolume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (e) {
      console.warn('Error playing tone:', e);
    }
  }

  /**
   * Play noise (for collision effects)
   */
  playNoise(duration, volume = 0.5) {
    if (!this.audioContext || this.isMuted) return;

    try {
      const bufferSize = this.audioContext.sampleRate * duration;
      const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const output = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      const whiteNoise = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      whiteNoise.buffer = buffer;
      whiteNoise.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      const actualVolume = volume * this.soundVolume;
      gainNode.gain.setValueAtTime(actualVolume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
      
      whiteNoise.start(this.audioContext.currentTime);
    } catch (e) {
      console.warn('Error playing noise:', e);
    }
  }

  /**
   * Play ascending tone (power up effect)
   */
  playAscendingTone() {
    if (!this.audioContext || this.isMuted) return;

    const notes = [261.63, 329.63, 392.00, 523.25]; // C, E, G, C
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.playTone(freq, 0.1, 'square', 0.3);
      }, index * 50);
    });
  }

  /**
   * Play descending tone (game over effect)
   */
  playDescendingTone() {
    if (!this.audioContext || this.isMuted) return;

    const notes = [523.25, 392.00, 329.63, 261.63]; // C, G, E, C
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, 'sine', 0.4);
      }, index * 100);
    });
  }

  /**
   * Play background music (simple melody loop)
   */
  playBackgroundMusic() {
    if (!this.audioContext || this.isMuted) return;

    // Simple looping melody
    const melody = [
      { note: 261.63, duration: 0.25 }, // C
      { note: 293.66, duration: 0.25 }, // D
      { note: 329.63, duration: 0.25 }, // E
      { note: 261.63, duration: 0.25 }, // C
    ];

    let noteIndex = 0;
    const playNextNote = () => {
      if (this.isMuted) return;
      
      const { note, duration } = melody[noteIndex];
      this.playTone(note, duration, 'triangle', 0.1 * this.musicVolume);
      
      noteIndex = (noteIndex + 1) % melody.length;
      setTimeout(playNextNote, duration * 1000);
    };

    // Start the melody
    playNextNote();
  }

  /**
   * Play a sound effect by name
   */
  playSound(soundName) {
    if (this.sounds[soundName] && typeof this.sounds[soundName] === 'function') {
      this.sounds[soundName]();
    }
  }

  /**
   * Set sound effects volume
   */
  setSoundVolume(volume) {
    this.soundVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Set music volume
   */
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Mute all sounds
   */
  mute() {
    this.isMuted = true;
    localStorage.setItem('templeRunMuted', 'true');
  }

  /**
   * Unmute all sounds
   */
  unmute() {
    this.isMuted = false;
    localStorage.setItem('templeRunMuted', 'false');
    
    // Resume audio context if it was suspended
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * Toggle mute state
   */
  toggleMute() {
    if (this.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this.isMuted;
  }

  /**
   * Clean up audio context
   */
  destroy() {
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
