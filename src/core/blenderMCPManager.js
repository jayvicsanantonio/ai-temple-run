/**
 * BlenderMCPManager
 *
 * Infrastructure for connecting to a Blender MCP server, issuing API requests,
 * and handling automatic reconnection with exponential backoff.
 *
 * This is a lightweight browser-side client intended to be feature-extended
 * in later tasks (Hyper3D jobs, PolyHaven utilities, GLB export, etc.).
 */

import { getConfig } from './config.js';

export class BlenderMCPError extends Error {
  constructor(message, { code, cause } = {}) {
    super(message);
    this.name = 'BlenderMCPError';
    this.code = code || 'UNKNOWN';
    if (cause) this.cause = cause;
  }
}

export class BlenderMCPManager {
  constructor(overrides = {}) {
    this.cfg = { ...getConfig(), ...overrides };
    this.mcp = this.cfg.mcp;
    this.status = 'disconnected'; // disconnected | connecting | connected | error
    this._heartbeatTimer = null;
    this._reconnectInFlight = false;
    this._listeners = new Map(); // event -> Set(callback)
  }

  on(event, callback) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const set = this._listeners.get(event);
    if (set) set.delete(callback);
  }

  _emit(event, payload) {
    const set = this._listeners.get(event);
    if (set) for (const cb of set) cb(payload);
  }

  get isConnected() {
    return this.status === 'connected';
  }

  async connect({ signal } = {}) {
    if (!this.mcp.enabled) return false; // disabled by config
    if (this.isConnected) return true;
    this._updateStatus('connecting');
    try {
      await this._ping({ signal });
      this._updateStatus('connected');
      this._startHeartbeat();
      this._debug('Connected to Blender MCP');
      return true;
    } catch (err) {
      this._updateStatus('error');
      this._debug('Initial connection failed, scheduling reconnect...', err);
      this._scheduleReconnect();
      return false;
    }
  }

  async disconnect() {
    this._stopHeartbeat();
    this._updateStatus('disconnected');
  }

  async ensureConnected() {
    if (this.isConnected) return true;
    return this.connect();
  }

  async request(path, { method = 'GET', body, headers } = {}) {
    await this.ensureConnected();

    const url = this._url(path);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    };

    try {
      const res = await this._fetchWithTimeout(url, options, this.mcp.requestTimeoutMs);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new BlenderMCPError(`MCP request failed: ${res.status}`, {
          code: 'HTTP_' + res.status,
          cause: text,
        });
      }
      // Attempt JSON first, fallback to text
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) return res.json();
      return res.text();
    } catch (err) {
      this._debug('Request error, marking disconnected and scheduling reconnect', err);
      this._updateStatus('error');
      this._scheduleReconnect();
      throw err instanceof BlenderMCPError
        ? err
        : new BlenderMCPError('Network error during MCP request', { cause: err });
    }
  }

  async queryCapabilities() {
    // Conventionally, servers expose a capabilities or routes endpoint
    return this.request('/capabilities');
  }

  async sendCommand(command, payload) {
    return this.request('/command', { method: 'POST', body: { command, payload } });
  }

  // Internal helpers

  _url(path) {
    const base = this.mcp.baseUrl.replace(/\/$/, '');
    const p = String(path || '').startsWith('/') ? path : `/${path || ''}`;
    return `${base}${p}`;
  }

  async _ping({ signal } = {}) {
    const url = this._url(this.mcp.healthEndpoint || '/health');
    const res = await this._fetchWithTimeout(
      url,
      { method: 'GET', signal },
      Math.min(this.mcp.requestTimeoutMs, 4000)
    );
    if (!res.ok) {
      throw new BlenderMCPError('Health check failed', { code: 'HEALTH_BAD_STATUS' });
    }
    return true;
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    if (!this.mcp.heartbeatIntervalMs) return;
    this._heartbeatTimer = setInterval(async () => {
      try {
        await this._ping();
        if (this.status !== 'connected') this._updateStatus('connected');
      } catch (err) {
        this._debug('Heartbeat failed', err);
        this._updateStatus('error');
        this._scheduleReconnect();
      }
    }, this.mcp.heartbeatIntervalMs);
  }

  _stopHeartbeat() {
    if (this._heartbeatTimer) clearInterval(this._heartbeatTimer);
    this._heartbeatTimer = null;
  }

  _scheduleReconnect() {
    if (this._reconnectInFlight || !this.mcp.enabled) return;
    this._reconnectInFlight = true;

    const { maxRetries, initialDelayMs, maxDelayMs, factor, jitter } = this.mcp.retry;

    const attempt = async (n, delay) => {
      if (!this.mcp.enabled) {
        this._reconnectInFlight = false;
        return;
      }
      await this._sleep(delay);
      this._debug(`Reconnect attempt ${n + 1}`);
      try {
        await this._ping();
        this._updateStatus('connected');
        this._startHeartbeat();
        this._reconnectInFlight = false;
      } catch {
        const nextDelay = Math.min(Math.floor(delay * factor), maxDelayMs);
        const jitterMs = Math.floor(nextDelay * (Math.random() * jitter));
        if (n + 1 < maxRetries) {
          attempt(n + 1, nextDelay + jitterMs);
        } else {
          this._debug('Max reconnect attempts reached');
          this._reconnectInFlight = false;
          this._updateStatus('disconnected');
        }
      }
    };

    attempt(0, initialDelayMs);
  }

  _updateStatus(newStatus) {
    if (this.status === newStatus) return;
    this.status = newStatus;
    this._emit('status', newStatus);
    if (this.cfg.debug) {
      console.log(`[MCP] status: ${newStatus}`);
    }
  }

  async _fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...(options || {}), signal: controller.signal });
      return res;
    } finally {
      clearTimeout(id);
    }
  }

  _sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  _debug(...args) {
    if (!this.cfg.debug) return;
    console.debug('[MCP]', ...args);
  }
}
