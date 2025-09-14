/**
 * Texture Compression Utilities
 *
 * Detects compressed texture support and provides a helper to configure
 * Babylon’s KTX2 transcoder URLs when using KTX2/Basis textures.
 */

import * as BABYLON from 'babylonjs';

export function detectCompressedTextureSupport(engine) {
  const caps = (engine && engine.getCaps && engine.getCaps()) || {};
  const gl = engine && engine._gl;
  const ext = (name) =>
    (gl &&
      (gl.getExtension(name) ||
        gl.getExtension('WEBKIT_' + name) ||
        gl.getExtension('MOZ_' + name))) ||
    null;

  return {
    astc: !!(caps.textureASTC || ext('WEBGL_compressed_texture_astc')),
    etc2: !!(caps.textureETC2 || ext('WEBGL_compressed_texture_etc')),
    s3tc: !!(caps.textureCompressionBC || ext('WEBGL_compressed_texture_s3tc')),
    pvrtc: !!ext('WEBGL_compressed_texture_pvrtc'),
    etc1: !!ext('WEBGL_compressed_texture_etc1'),
  };
}

/**
 * Configure KTX2/Basis transcoder URLs for Babylon if supported.
 * Supply paths to .js/.wasm files if you host them; otherwise leave as-is
 * and ensure your server-side export targets broadly compatible formats.
 */
export function configureKTX2Transcoder({ jsURL, wasmURL, fallback = false } = {}) {
  const KTX2 = BABYLON.KhronosTextureContainer2;
  if (!KTX2 || !KTX2.URLConfig) return false;
  const prev = { ...KTX2.URLConfig };
  KTX2.URLConfig = {
    jsDecoderModule: jsURL || prev.jsDecoderModule || '',
    wasmUASTCToASTC: wasmURL || prev.wasmUASTCToASTC || '',
  };
  return true;
}
