/**
 * Error types used across systems
 */

export class AppError extends Error {
  constructor(message, { code, cause, context } = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code || 'APP_ERROR';
    if (cause) this.cause = cause;
    if (context) this.context = context;
  }
}

export class AssetLoadingError extends AppError {
  constructor(message, opts = {}) {
    super(message, { ...opts, code: 'ASSET_LOADING_ERROR' });
    this.name = 'AssetLoadingError';
  }
}

export class PhysicsEngineError extends AppError {
  constructor(message, opts = {}) {
    super(message, { ...opts, code: 'PHYSICS_ENGINE_ERROR' });
    this.name = 'PhysicsEngineError';
  }
}
