// Asset receiver: downloads and caches the game's asset sets — 3D models,
// level data, music, sound effects, images — so consumers (the editor 3D viewport,
// the game runtime) render from cached bytes instead of hot-loading from an
// external site on every use.
//
// A "source set" is a manifest-shaped object:
//   { images?: string[] | {url,key}[], models?: [...], sounds?: [...], music?: [...], json?: [...] }
// Unknown types are ignored; entries may be bare urls or { url, key }.
//
// The receiver resolves relative paths (e.g. 'assets/map_night/map/map.glb')
// against a base (CLIENT_CONFIG.ASSETS_BASE by default), fetches each asset once,
// caches the payload, and reports progress. Binary payloads (models / audio /
// images) are fetched as ArrayBuffers; json payloads are parsed.

import { CLIENT_CONFIG } from './config.js';

export const ASSET_TYPES = Object.freeze(['images', 'models', 'sounds', 'music', 'json']);

const DEFAULT_BASE = typeof location !== 'undefined' ? `${location.protocol}//${location.host}/` : 'http://localhost/';

export function resolveAssetUrl(url, baseUrl = DEFAULT_BASE) {
  if (url == null) return null;
  const raw = String(url);
  if (/^(https?:|data:|blob:|about:)/i.test(raw)) return raw;
  const base = baseUrl == null || baseUrl === '' ? DEFAULT_BASE : String(baseUrl);
  try {
    return new URL(raw, base).href;
  } catch (e) {
    return raw;
  }
}

// Flatten a sources object into per-type deduped absolute url lists.
export function collectAssetUrls(sources = {}, baseUrl = DEFAULT_BASE) {
  const out = { images: [], models: [], sounds: [], music: [], json: [] };
  for (const type of ASSET_TYPES) {
    const list = sources?.[type];
    const urls = [];
    const seen = new Set();
    for (const entry of list ?? []) {
      const url = typeof entry === 'string' ? entry : entry?.url;
      const resolved = resolveAssetUrl(url, baseUrl);
      if (!resolved || seen.has(resolved)) continue;
      seen.add(resolved);
      urls.push({ url: resolved, key: typeof entry === 'string' ? resolved : (entry?.key ?? resolved) });
    }
    out[type] = urls;
  }
  return out;
}

export function createAssetsReceiver({ baseUrl, fetchImpl } = {}) {
  const base = baseUrl == null ? CLIENT_CONFIG.ASSETS_BASE ?? DEFAULT_BASE : String(baseUrl);
  const cache = new Map(); // `${type}:${resolvedUrl}` -> payload
  const inflight = new Map(); // same key -> in-flight promise

  function key(type, resolved) {
    return `${type}:${resolved}`;
  }

  function cachedPayload(type, resolved) {
    const hit = cache.get(key(type, resolved));
    return hit ?? null;
  }

  async function download(url, type = 'models') {
    const resolved = resolveAssetUrl(url, base);
    const k = key(type, resolved);
    const hit = cache.get(k);
    if (hit) return hit;
    const pending = inflight.get(k) ?? fetchImpl?.(resolved).then(async (res) => {
      if (res != null && typeof res.ok === 'boolean' && !res.ok) throw new Error(`Asset fetch failed: ${resolved} (${res.status ?? 'unknown'})`);
      const buf = await res.arrayBuffer();
      cache.set(k, type === 'json' ? JSON.parse(new TextDecoder().decode(buf)) : buf);
      return cache.get(k);
    });
    inflight.set(k, pending);
    try {
      const payload = await pending;
      return payload;
    } finally {
      inflight.delete(k);
    }
  }

  return {
    baseUrl: base,
    download,
    get: (url, type = 'models') => cachedPayload(type, resolveAssetUrl(url, base)),
    has: (url, type = 'models') => cache.has(key(type, resolveAssetUrl(url, base))),
    clear: () => cache.clear(),
    // Load every asset in a source set (deduped), reporting progress 0..1.
    // Resolves to { images, models, sounds, music, json } maps keyed by asset key.
    load: async (sources, { onProgress } = {}) => {
      const flat = collectAssetUrls(sources, base);
      const assets = { images: {}, models: {}, sounds: {}, music: {}, json: {} };
      const jobs = [];
      for (const type of ASSET_TYPES) {
        for (const { url, key: assetKey } of flat[type]) jobs.push({ type, url, assetKey });
      }
      let completed = 0;
      for (const job of jobs) {
        const payload = await download(job.url, job.type);
        assets[job.type][job.assetKey] = payload;
        completed += 1;
        if (typeof onProgress === 'function') onProgress(Math.round((completed / Math.max(1, jobs.length)) * 100) / 100);
      }
      return assets;
    },
  };
}

// Load helper bound to a receiver (module-level default keeps game call-sites simple).
export function loadAssets(sources, onProgressOrOpts = {}) {
  const receiver = onProgressOrOpts?.receiver ?? createAssetsReceiver();
  const onProgress = typeof onProgressOrOpts === 'function' ? onProgressOrOpts : onProgressOrOpts?.onProgress;
  return receiver.load(sources, { onProgress });
}

// Play an SFX / music track from a loaded asset set. Accepts the map produced by
// receiver.load (payloads keyed by asset key). Music payloads are usually an
// HTMLAudioElement; SFX payloads are usually an AudioBuffer.
export function playAudio(assets, url, { music = false } = {}) {
  const bucketKey = music ? 'music' : 'sounds';
  const bucket = assets?.[bucketKey];
  if (!bucket) return null;
  const resolved = resolveAssetUrl(url);
  const payload = bucket[url] ?? bucket[resolved] ?? null;
  if (payload == null) return null;
  if (payload && typeof payload === 'object' && typeof payload.play === 'function') {
    try { payload.play(); return payload; } catch (e) { return null; }
  }
  const AudioBufferLike = payload && typeof payload === 'object' && 'sampleRate' in payload;
  if (AudioBufferLike) {
    const Ctor = typeof AudioContext !== 'undefined' ? AudioContext : (typeof window !== 'undefined' ? window.AudioContext : null);
    if (Ctor) {
      const ctx = new Ctor();
      const src = ctx.createBufferSource();
      src.buffer = payload;
      src.connect(ctx.destination);
      src.start();
      return src;
    }
  }
  const AudioCtor = typeof Audio !== 'undefined' ? Audio : null;
  if (AudioCtor) {
    const el = new AudioCtor(resolved ?? url);
    el.play?.();
    return el;
  }
  return null;
}
