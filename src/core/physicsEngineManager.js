/**
 * PhysicsEngineManager
 *
 * Selects and initializes a physics backend: Ammo.js, Cannon.js, or a
 * lightweight built-in Simple engine when external libs are unavailable.
 * Provides player body control (forward velocity, lateral acceleration,
 * jumping with gravity), ground detection, and collision checks against
 * registered static obstacle bodies.
 */

import * as BABYLON from 'babylonjs';
import { getConfig } from './config.js';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export class PhysicsEngineManager {
  constructor(scene) {
    this.scene = scene;
    this.cfg = getConfig();
    this.settings = this.cfg.physics || {
      engine: 'SIMPLE',
      gravity: -20,
      lateralAccel: 40,
      lateralMaxSpeed: 12,
      jumpImpulse: 9,
      friction: 8,
    };

    this.mode = 'SIMPLE'; // SIMPLE | AMMO | CANNON
    this.player = null; // mesh
    this.playerCollider = null; // mesh used as collider (AABB in SIMPLE)
    this.playerState = {
      vel: new BABYLON.Vector3(0, 0, 0),
      acc: new BABYLON.Vector3(0, 0, 0),
      targetLaneX: 0,
      baseY: 0.5,
      grounded: true,
    };
    this.obstacles = new Set();
    this.gravity = this.settings.gravity ?? -20;
  }

  detectAndInit() {
    const enginePref = (this.settings.engine || 'AUTO').toUpperCase();
    const hasAmmo = typeof window !== 'undefined' && window.Ammo;
    const hasCannon = typeof window !== 'undefined' && (window.CANNON || window.CANNONES);

    if ((enginePref === 'AMMO' || enginePref === 'AUTO') && hasAmmo) {
      this.mode = 'AMMO';
      this._initBabylonPhysics('AMMO');
      return this.mode;
    }
    if ((enginePref === 'CANNON' || enginePref === 'AUTO') && hasCannon) {
      this.mode = 'CANNON';
      this._initBabylonPhysics('CANNON');
      return this.mode;
    }
    this.mode = 'SIMPLE';
    return this.mode;
  }

  _initBabylonPhysics(kind) {
    try {
      const gravity = new BABYLON.Vector3(0, this.gravity, 0);
      if (kind === 'AMMO' && window.Ammo) {
        const plugin = new BABYLON.AmmoJSPlugin(true, window.Ammo);
        this.scene.enablePhysics(gravity, plugin);
      } else if (kind === 'CANNON' && (window.CANNON || window.CANNONES)) {
        const cannon = window.CANNON || window.CANNONES;
        const plugin = new BABYLON.CannonJSPlugin(true, 10, cannon);
        this.scene.enablePhysics(gravity, plugin);
      }
    } catch {
      this.mode = 'SIMPLE';
    }
  }

  attachPlayer(mesh, colliderMesh, { forwardSpeed = 10, baseY = 0.5, laneX = 0 } = {}) {
    this.player = mesh;
    this.playerCollider = colliderMesh || mesh;
    this.playerState.vel.set(0, 0, forwardSpeed);
    this.playerState.acc.set(0, 0, 0);
    this.playerState.targetLaneX = laneX;
    this.playerState.baseY = baseY;
    this.player.position.y = baseY;
  }

  setForwardSpeed(speed) {
    if (!this.player) return;
    this.playerState.vel.z = speed;
  }

  setTargetLaneX(x) {
    this.playerState.targetLaneX = x;
  }

  jump() {
    if (!this.player) return;
    if (this.playerState.grounded) {
      this.playerState.vel.y = this.settings.jumpImpulse ?? 9;
      this.playerState.grounded = false;
    }
  }

  slideStart() {
    // Placeholder: could shrink collider height; left to player controller visuals
  }
  slideEnd() {}

  registerObstacle(mesh) {
    if (mesh) this.obstacles.add(mesh);
  }
  unregisterObstacle(mesh) {
    if (mesh) this.obstacles.delete(mesh);
  }

  update(deltaTime) {
    if (this.mode !== 'SIMPLE' || !this.player) return;
    const dt = clamp(deltaTime, 0, 0.05);

    // Lateral control towards target lane
    const dx = this.playerState.targetLaneX - this.player.position.x;
    const accel = this.settings.lateralAccel ?? 40;
    const maxLat = this.settings.lateralMaxSpeed ?? 12;
    const friction = this.settings.friction ?? 8;

    const ax = clamp(dx * accel, -accel, accel) - Math.sign(this.playerState.vel.x) * friction;
    this.playerState.vel.x = clamp(this.playerState.vel.x + ax * dt, -maxLat, maxLat);

    // Gravity
    this.playerState.vel.y += this.gravity * dt;

    // Integrate position
    this.player.position.x += this.playerState.vel.x * dt;
    this.player.position.y += this.playerState.vel.y * dt;
    this.player.position.z += this.playerState.vel.z * dt;

    // Ground detection (simple plane at baseY)
    if (this.player.position.y <= this.playerState.baseY) {
      this.player.position.y = this.playerState.baseY;
      if (!this.playerState.grounded && this.playerState.vel.y < 0) {
        // Landing impulse dampen
        this.playerState.vel.y = 0;
      }
      this.playerState.grounded = true;
    } else {
      this.playerState.grounded = false;
    }
  }

  // Physics-based collision check for SIMPLE engine using AABB vs AABB
  checkCollisionWithObstacles() {
    if (this.mode !== 'SIMPLE' || !this.playerCollider) return false;
    const playerBB = this.playerCollider.getBoundingInfo().boundingBox;
    for (const obs of this.obstacles) {
      if (!obs || !obs.isVisible) continue;
      const bb = obs.getBoundingInfo().boundingBox;
      const sep =
        playerBB.maximumWorld.x < bb.minimumWorld.x ||
        playerBB.minimumWorld.x > bb.maximumWorld.x ||
        playerBB.maximumWorld.y < bb.minimumWorld.y ||
        playerBB.minimumWorld.y > bb.maximumWorld.y ||
        playerBB.maximumWorld.z < bb.minimumWorld.z ||
        playerBB.minimumWorld.z > bb.maximumWorld.z;
      if (!sep) return true;
    }
    return false;
  }
}
