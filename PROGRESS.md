# Progress

- **Run 3.** Implemented roadmap item `1.1` — app shell + state store + event bus:
  `src/core/event-bus.js`, `src/core/store.js`, `src/main.js`.
- **Run 4.** Implemented roadmap item `1.2` — localStorage autosave:
  `src/io/autosave.js`.
- **Run 5.** Implemented roadmap item `1.3` — undo/redo via command pattern:
  `src/core/undo-redo.js`.
- **Run 6.** Implemented roadmap item `2.1` — map editor create new map, set
  size, layers: `src/editor/map/map.js` (`createMap`, `createMapCommand`).
- **Run 7.** Implemented roadmap item `2.2` — tile palette, paint / erase:
  `src/editor/map/tile-palette.js` (`TILE_PALETTE`, `getTile`, `paintTile`,
  `eraseTile`).
- **Run 8.** Implemented roadmap item `2.3a` — fill (flood fill):
  `src/editor/map/fill.js` (`fillTiles`).
- **Run 9.** Implemented roadmap item `2.3b` — select / move objects:
  `src/editor/map/object-move.js` (`moveObject`).
- **Run 10.** Implemented roadmap item `2.3c1` — camera pan / zoom (pure helpers):
  `src/editor/camera.js` (`createEditorCamera`, `panCamera`, `zoomCamera`).
- **Run 11.** Implemented roadmap item `2.3c2` — grid toggle (pure helpers):
  `src/editor/grid.js` (`createGrid`, `setGridVisible`, `setGridCellSize`).
- The code tree (`src/`, later `samples/`, `tests/`) will be added as later
  ROADMAP items are worked.

## Next run

- Next run should pick the first unchecked item in `ROADMAP.md`: **2.3c3 Map
  editor — editor state + UI wiring for camera / grid** (needs editor state +
  canvas).
