// Flood fill over a tile layer: replaces the connected region of tiles equal
// to `fromTileId` (starting at tile-grid position [startX, startY]) with
// `toTileId`. Immutable; no-op when the start cell is empty or already the
// target tile.

import { tileLayer } from './tile-palette.js';

export function fillTiles(map, layerId, startX, startY, fromTileId, toTileId) {
  const layer = tileLayer(map, layerId);
  if (!layer) return map;
  const tiles = new Map(Object.entries(layer.tiles ?? {}));
  const startKey = `${startX},${startY}`;
  const from = tiles.get(startKey);
  if (from === undefined || from !== fromTileId) return map;
  if (from === toTileId) return map;

  const queue = [[startX, startY]];
  const visited = new Set([startKey]);
  while (queue.length) {
    const [x, y] = queue.shift();
    tiles.set(`${x},${y}`, toTileId);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;
      const t = tiles.get(key);
      if (t !== undefined && t === from) {
        visited.add(key);
        queue.push([nx, ny]);
      }
    }
  }

  const layers = map.layers.map((l) =>
    l.id === layerId ? { ...l, tiles: Object.fromEntries(tiles) } : l
  );
  return { ...map, layers };
}
