// Tile palette + paint/erase operations on internal tile layers.

export const TILE_PALETTE = [
  { id: 'tiles.void', name: 'Void', color: '#140b26' },
  { id: 'tiles.ridge', name: 'Ridge', color: '#3a2f52' },
  { id: 'tiles.horizon', name: 'Horizon', color: '#5b4a7a' },
  { id: 'tiles.floor', name: 'Floor', color: '#2a3052' },
];

export function getTile(id) {
  return TILE_PALETTE.find((t) => t.id === id) ?? null;
}

export function tileLayer(map, layerId) {
  const layer = (map.layers ?? []).find((l) => l.id === layerId);
  return layer && layer.type === 'tile' ? layer : null;
}

// Paint a tile at tile-grid position [x, y] on the tile layer. Returns a new
// map (immutable); no-op for unknown tiles or missing/incorrect layers.
export function paintTile(map, layerId, x, y, tileId) {
  if (!getTile(tileId)) return map;
  const layer = tileLayer(map, layerId);
  if (!layer) return map;
  const layers = map.layers.map((l) =>
    l.id === layerId ? { ...l, tiles: { ...(l.tiles ?? {}), [`${x},${y}`]: tileId } } : l
  );
  return { ...map, layers };
}

// Erase a tile at [x, y] on the tile layer (removes the cell). Returns a new
// map; no-op for missing/incorrect layers.
export function eraseTile(map, layerId, x, y) {
  const layer = tileLayer(map, layerId);
  if (!layer) return map;
  const layers = map.layers.map((l) => {
    if (l.id !== layerId) return l;
    const tiles = { ...(l.tiles ?? {}) };
    delete tiles[`${x},${y}`];
    return { ...l, tiles };
  });
  return { ...map, layers };
}
