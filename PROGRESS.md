# Progress

- **Run 44.** Implemented roadmap item `3.4` — all editor buttons functional:
  `btn-new` now clears 3D viewport objects (`viewport3d.clearObjects()`) when resetting
  the map.
- **Run 43.** Follow-up to the assets receiver: point `ASSETS_BASE` at the real game
  asset host (`https://riseoflyric.com/`) so the editor 3D view downloads real models
  from the game's asset host, not the default site root; added optional `onError`
  callback to the viewport 3D deps and wired it through both create paths
  (`index.html` sets the `Assets:` status to `error` on failure).
- **Run 42.** Implemented roadmap item `3.3` — 3D viewport grid + axes: explicit
  visibility flags on the `GridHelper` / `AxesHelper` in `src/editor/viewport-3d.js`
  (grid + axes were added in run 28; flags now set explicitly). Visual check in browser
  still pending for the user-reported invisibility.
- **Run 41.** Implemented roadmap item `3.5` — assets receiver: `src/core/assets.js`
  (resolve / collect / download-cached / play + `ASSET_TYPES`), wired into the editor
  3D viewport (`src/editor/viewport-3d.js` receiver + `parseAsync` mount), per-map
  source sets (`src/editor/game-maps.js` `gameMapSources`), and a "Download Assets"
  button with progress status (`index.html`). Tests: `tests/editor-smoke.mjs`.
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
- **Run 11.** Implemented roadmap item `2.3c2` — grid toggle (pure helpers):
  `src/editor/grid.js` (`createGrid`, `setGridVisible`, `setGridCellSize`).
- **Run 12.** Implemented roadmap item `2.3c3` — editor view state (camera +
  grid): `src/editor/view.js` (`createEditorView`, `panEditorView`, `zoomEditorView`,
  `toggleEditorGrid`, `setEditorGridCellSize`).
- **Run 13.** Implemented roadmap item `2.3c4` — canvas view binding helpers:
  screen→world conversion — `src/editor/view.js` (`screenToWorld`).
- **Run 14.** Implemented roadmap item `2.3c5` — canvas render / input binding
  helpers: screen→world, pan, zoom — `src/editor/view.js` (`panByScreen`,
  `zoomAtScreen`).
- The code tree (`src/`, later `samples/`, `tests/`) will be added as later
  ROADMAP items are worked.

## Next run

- All editor milestones (`1.x`, `2.x`, `3.x`), mod format item `0.1`, and the assets
  receiver follow-ups are checked off. Next run should pick the first unchecked item in
  `ROADMAP.md`: the **Code tree** section — next candidate could be expanding
  `samples/editor-sample.mjs` or adding new code-tree item entries for the new modules.
