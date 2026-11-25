// Move an object on an object layer to a new world position. Pure function on
// the internal map model; returns a new map (immutable).

function findObjectLayer(map, layerId) {
  const layer = (map.layers ?? []).find((l) => l.id === layerId);
  return layer && layer.type === 'object' ? layer : null;
}

// position: { x, y, z } — world coords (x/z horizontal, y up).
// Returns a new map; no-op for missing layers / unknown object ids.
export function moveObject(map, layerId, objectId, position) {
  const layer = findObjectLayer(map, layerId);
  if (!layer || !Array.isArray(layer.objects)) return map;
  const target = layer.objects.find((o) => o.id === objectId);
  if (!target) return map;
  const objects = layer.objects.map((o) =>
    o.id === objectId ? { ...o, ...position } : o
  );
  const layers = map.layers.map((l) =>
    l.id === layerId ? { ...l, objects } : l
  );
  return { ...map, layers };
}
