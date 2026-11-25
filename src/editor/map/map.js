// Internal map model + creation for the map editor. The internal shape is
// editor-facing; the /src/format/ adapters translate to/from the game format.

export function createMap({ id, name, width, height, layers } = {}) {
  const resolvedLayers =
    layers ??
    [
      { id: `${id}:layer:tile`, name: 'Tiles', type: 'tile' },
      { id: `${id}:layer:object`, name: 'Objects', type: 'object' },
    ];
  return { id, name, width, height, layers: resolvedLayers };
}

// Undoable command: append a new map (with size and layers) to the project.
// Uses the core undo/redo command pattern from /src/core/undo-redo.js.
export function createMapCommand({ id, name, width, height }, store) {
  const previousMaps = store.get()?.project?.maps;
  const map = createMap({ id, name, width, height });
  return {
    redo: () =>
      store.set({
        project: { ...store.get()?.project, maps: [...(previousMaps ?? []), map] },
      }),
    undo: () =>
      store.set({
        project: { ...store.get()?.project, maps: previousMaps ?? [] },
      }),
  };
}
