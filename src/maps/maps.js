// Client-side map registry. Each entry is a map definition (see
// night-of-the-living-void.js for the shape): metadata for the lobby, an asset
// manifest for the loading screen, and createLevel() to build the playable scene.
// Fearvelations (fearvelations.js) is unfinished and deliberately left out of MAPS until it is ready.
// To add a map: create a definition file, import it here, and mirror its id/name
// in server/maps.js.
import { tutorial } from './tutorial.js';
import { nightOfTheLivingVoid } from './night-of-the-living-void.js';
import { ungaland } from './ungaland.js';
import { chocoRocklateGladiatorArena } from './choco-rocklate-gladiator-arena.js';
import { endlessShot } from './endless-shot.js';
import { forterressoDeBeh } from './forterresso-de-beh.js';
import { deadBehsArcade } from './dead-behs-arcade.js';

export const MAPS = [tutorial, nightOfTheLivingVoid, ungaland, chocoRocklateGladiatorArena, endlessShot, forterressoDeBeh, deadBehsArcade];

// The tutorial leads the list but is never the default map (new lobbies, fallbacks) or part of the rankings.
export const isTutorialMap = (id) => MAPS.find((m) => m.id === id)?.mode === 'tutorial';
export const DEFAULT_MAP_ID = MAPS.find((m) => m.mode !== 'tutorial').id;
// Maps that count for stats: bests, history, leaderboards (everything except the tutorial).
export const rankedMaps = () => MAPS.filter((m) => m.mode !== 'tutorial');

export function getMap(id) {
  return MAPS.find((m) => m.id === id) || MAPS.find((m) => m.id === DEFAULT_MAP_ID);
}

export function listMaps() {
  return MAPS;
}

export function nextMapId(currentId) {
  const i = MAPS.findIndex((m) => m.id === currentId);
  return MAPS[(i + 1 + MAPS.length) % MAPS.length].id;
}
