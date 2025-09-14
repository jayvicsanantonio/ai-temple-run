#!/usr/bin/env node
/**
 * Generate 3D assets via Blender MCP and save into public/assets.
 *
 * Usage:
 *   BLENDER_HOST=localhost BLENDER_PORT=9876 node scripts/generate-assets.mjs
 *
 * Notes:
 * - Expects your MCP server to implement:
 *     POST /command { command, payload } -> { jobId } or { result: { url|assets[] } }
 *     GET  /jobs/:id -> { status, result: { url|assets[] } }
 * - Downloads returned GLB files into `public/assets/models/`.
 */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

const HOST = process.env.BLENDER_HOST || '127.0.0.1';
const PORT = process.env.BLENDER_PORT || '9876';
const BASE = `http://${HOST}:${PORT}`;

const OUT_DIR = path.resolve('public/assets/models');

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function mcp(pathname, { method = 'GET', body } = {}) {
  const url = `${BASE}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
  const headers = { 'Content-Type': 'application/json' };
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`MCP ${method} ${url} -> ${res.status} ${text}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

async function pollJob(jobId, { intervalMs = 2000, timeoutMs = 15 * 60 * 1000 } = {}) {
  const started = Date.now();
  for (;;) {
    const job = await mcp(`/jobs/${encodeURIComponent(jobId)}`);
    const status = String(job?.status || job?.state || 'In Progress').toLowerCase();
    if (status.includes('done') || status.includes('complete')) return job;
    if (status.includes('fail') || status.includes('error')) throw new Error(`Job failed: ${jobId}`);
    if (Date.now() - started > timeoutMs) throw new Error(`Job timeout: ${jobId}`);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download failed: ${url}`);
  await ensureDir(path.dirname(destPath));
  await pipeline(res.body, fs.createWriteStream(destPath));
  return destPath;
}

async function generateCharacter() {
  console.log('> Generating character (Pikachu)...');
  const payload = {
    name: 'pikachu',
    source: {
      type: 'import_or_generate',
      generate: {
        provider: 'hyper3d',
        prompt:
          'A stylized Pikachu character, bright yellow, black-tipped ears, red cheeks, cute proportions, runner-friendly rig. Clean topology, PBR, game ready.',
        bbox_condition: { x: 0.6, y: 1.1, z: 0.4 },
      },
    },
    rig: { auto_rig: true, retarget: ['idle', 'run', 'jump', 'slide', 'death'] },
    cleanup: { decimate: 0.8, limit_bones: 64 },
    export: { format: 'glb', embed_textures: true, outputName: 'pikachu' },
  };
  const res = await mcp('/command', {
    method: 'POST',
    body: { command: 'scene.import_or_generate_character', payload },
  });
  const jobId = res?.jobId || res?.id;
  let url = res?.result?.url || res?.url;
  if (!url && jobId) {
    const job = await pollJob(jobId);
    url = job?.result?.url || job?.result?.glbUrl || job?.url || job?.downloadUrl;
  }
  if (!url) throw new Error('No download URL for character');
  const dest = path.join(OUT_DIR, 'pikachu.glb');
  await downloadFile(url, dest);
  console.log('✓ Character saved:', dest);
}

async function generateEnvironment() {
  console.log('> Generating environment set...');
  const payload = {
    tile: { length: 20, width: 6, height: 0.5 },
    modules: [
      { name: 'bridge_stone', material: 'stone_cobble_moss' },
      { name: 'bridge_wood', material: 'wood_planks_worn' },
      { name: 'pillar', material: 'carved_stone' },
      { name: 'arch_gate', material: 'carved_stone' },
      { name: 'rope_vines', material: 'vines' },
      { name: 'skull_deco', material: 'bone' },
      { name: 'rock_deco', material: 'rock' },
      { name: 'water_plane', material: 'water' },
    ],
    textures: { provider: 'polyhaven', resolution: '2k', format: 'jpg' },
    export_each: { format: 'glb', embed_textures: true },
  };
  const res = await mcp('/command', {
    method: 'POST',
    body: { command: 'scene.build_temple_bridge_set', payload },
  });
  const jobId = res?.jobId || res?.id;
  let assets = res?.result?.assets || res?.assets || [];
  if (!assets.length && jobId) {
    const job = await pollJob(jobId);
    assets = job?.result?.assets || job?.assets || [];
  }
  if (!assets.length) throw new Error('No environment assets returned');
  await ensureDir(OUT_DIR);
  for (const a of assets) {
    const name = a.name || a.id;
    const url = a.url || a.glbUrl || a.downloadUrl;
    if (!name || !url) continue;
    const dest = path.join(OUT_DIR, `${name}.glb`);
    await downloadFile(url, dest).catch((e) => console.warn('Download failed', name, e.message));
    console.log('✓ Saved', name, '->', dest);
  }
}

async function main() {
  await ensureDir(OUT_DIR);
  console.log('Blender MCP:', BASE);
  await generateCharacter();
  await generateEnvironment();
  console.log('All assets generated to', OUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

