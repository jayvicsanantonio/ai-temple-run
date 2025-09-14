/**
 * AnimationStateMachine
 *
 * A lightweight state machine to coordinate Babylon AnimationGroups with
 * cross-fade blending. States are registered with metadata like loop and
 * speed, and transitions blend weights over a duration.
 */

export class AnimationStateMachine {
  constructor(scene) {
    this.scene = scene;
    this.states = new Map(); // name -> { group?, loop?, speed?, onEnter?, onExit? }
    this.current = null; // { name, group }
    this.next = null; // pending transition target
    this.blend = {
      active: false,
      time: 0,
      duration: 0,
      from: null, // AnimationGroup
      to: null, // AnimationGroup
    };
  }

  /**
   * Register a state.
   * @param {string} name
   * @param {{group?: any, loop?: boolean, speed?: number, onEnter?: Function, onExit?: Function}} cfg
   */
  registerState(name, cfg = {}) {
    this.states.set(name, { ...cfg });
  }

  /**
   * Transition to a state with optional blending.
   * @param {string} name
   * @param {number} [blendDuration=0.2]
   */
  setState(name, blendDuration = 0.2) {
    if (!this.states.has(name)) return;
    if (this.current && this.current.name === name) return;

    const target = this.states.get(name);
    const from = this.current ? this.states.get(this.current.name) : null;
    const fromGroup = from?.group || null;
    const toGroup = target.group || null;

    // Call onExit for current
    if (from && typeof from.onExit === 'function') from.onExit();

    // Start target group
    if (toGroup && typeof toGroup.start === 'function') {
      const loop = target.loop !== false;
      const speed = target.speed || 1;
      try {
        toGroup.start(loop, speed);
      } catch {
        // ignore
      }
    }

    // Blending if both groups support weights
    const canBlend =
      fromGroup &&
      toGroup &&
      typeof fromGroup.setWeightForAllAnimatables === 'function' &&
      typeof toGroup.setWeightForAllAnimatables === 'function';

    if (canBlend && blendDuration > 0) {
      try {
        toGroup.setWeightForAllAnimatables(0);
        fromGroup.setWeightForAllAnimatables(1);
      } catch {
        // ignore weight setup errors
      }
      this.blend = { active: true, time: 0, duration: blendDuration, from: fromGroup, to: toGroup };
    } else {
      // Immediate switch
      if (fromGroup && typeof fromGroup.stop === 'function') {
        try {
          fromGroup.stop();
        } catch {}
      }
      if (toGroup && typeof toGroup.setWeightForAllAnimatables === 'function') {
        try {
          toGroup.setWeightForAllAnimatables(1);
        } catch {}
      }
    }

    this.current = { name, group: toGroup };

    // Call onEnter for target
    if (typeof target.onEnter === 'function') target.onEnter();
  }

  /**
   * Advance blending timers; call each frame with dt.
   * @param {number} dt Seconds
   */
  update(dt) {
    if (!this.blend.active) return;
    this.blend.time += dt;
    const t = Math.min(1, this.blend.time / this.blend.duration);
    const fromW = 1 - t;
    const toW = t;
    try {
      if (this.blend.from) this.blend.from.setWeightForAllAnimatables(fromW);
      if (this.blend.to) this.blend.to.setWeightForAllAnimatables(toW);
    } catch {
      // ignore
    }
    if (t >= 1) {
      // Stop from
      if (this.blend.from && typeof this.blend.from.stop === 'function') {
        try {
          this.blend.from.stop();
        } catch {}
      }
      this.blend.active = false;
    }
  }
}
