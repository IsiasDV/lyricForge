// Game map preview registry for the 3D viewport editor.

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

export function gameMapById(id) {
  const g = GAME_MAPS.find((m) => m.id === id);
  return g ? g.mapDef : null;
}

export function gameMaps() {
  return GAME_MAPS;
}
