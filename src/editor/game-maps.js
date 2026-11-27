// Game map preview registry for the 3D viewport editor.

import { ASSET_TYPES } from '../core/assets.js';

export const GAME_MAPS = [
  { id: 'tutorial', name: 'Tutorial', mapDef: { id: 'tutorial', name: 'Tutorial' } },
  { id: 'night-of-the-living-void', name: 'Night of the Living Void', mapDef: { id: 'night-of-the-living-void', name: 'Night of the Living Void', model: 'assets/map_night/map/map.glb', scale: 0.75, spawn: [0, 0.5, 0] } },
  { id: 'ungaland', name: 'Ungaland', mapDef: { id: 'ungaland', name: 'Ungaland', model: 'assets/map_ungaland/map/map.glb', scale: 2, spawn: [0, 0.5, 0] } },
  { id: 'choco-rocklate-gladiator-arena', name: 'Choco-Rocklate Gladiator Arena', mapDef: { id: 'choco-rocklate-gladiator-arena', name: 'Choco-Rocklate Gladiator Arena', model: 'assets/map_choco/map/map.glb', scale: 0.35, spawn: [0, 0.5, 0] } },
  { id: 'endless-shot', name: 'Endless Shot', mapDef: { id: 'endless-shot', name: 'Endless Shot', model: 'assets/map_endless/map/map.glb', scale: 0.75, spawn: [0, 0.5, 0] } },
  { id: 'forterresso-de-beh', name: 'Forterresso de Beh', mapDef: { id: 'forterresso-de-beh', name: 'Forterresso de Beh', model: 'assets/map_forterresso-de-beh/map/map.glb', scale: 1, spawn: [0, 0.5, 0] } },
  { id: 'fearvelations', name: 'Fearvelations', mapDef: { id: 'fearvelations', name: 'Fearvelations', model: 'assets/map_fearvelations/map/map.glb', scale: 1, spawn: [0, 0.5, 0] } },
  { id: 'dead-behs-arcade', name: 'Dead Behs Arcade', mapDef: { id: 'dead-behs-arcade', name: 'Dead Behs Arcade', width: 32, height: 32 } },
];

// Source set the asset receiver downloads for a previewable game map: its 3D
// model(s) plus any images the map definition carries (loading screen, banner...).
export function gameMapSources(gmap) {
  const mapDef = gmap?.mapDef ?? gmap ?? null;
  const sources = {};
  for (const type of ASSET_TYPES) sources[type] = [];
  const push = (type, url) => {
    if (!url || typeof url !== 'string') return;
    if (!sources[type].some((e) => (typeof e === 'string' ? e : e?.url) === url)) sources[type].push(url);
  };
  for (const url of mapDef?.assets?.images ?? []) push('images', url);
  for (const url of mapDef?.assets?.models ?? []) push('models', url);
  if (mapDef?.model) push('models', mapDef.model);
  return sources;
}

export function gameMapById(id) {
  const g = GAME_MAPS.find((m) => m.id === id);
  return g ? g.mapDef : null;
}

export function gameMaps() {
  return GAME_MAPS;
}
