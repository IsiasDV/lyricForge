# Roadmap

## Editor milestones

- [x] **1.1 App shell + state store + event bus** — `src/core/{event-bus,store}.js`, `src/main.js`
- [x] **1.2 localStorage autosave** — `src/io/autosave.js`
- [x] **1.3 Undo/redo via command pattern** — `src/core/undo-redo.js`
- [x] **2.1 Create new map, set size, layers** — `src/editor/map/map.js`
- [x] **2.2 Tile palette, paint / erase** — `src/editor/map/tile-palette.js`
- [x] **2.3a Fill (flood fill)** — `src/editor/map/fill.js`
- [x] **2.3b Select / move objects** — `src/editor/map/object-move.js`
- [x] **2.3c Pan / zoom / grid toggle** — needs canvas + UI (`src/editor/` view layer)
  - [x] 2.3c1 Camera pan / zoom (pure helpers) — implemented `src/editor/camera.js`
  - [x] 2.3c2 Grid toggle (pure helpers) — implemented `src/editor/grid.js`
  - [x] 2.3c3 Editor view state (camera + grid) — implemented `src/editor/view.js`
  - [x] 2.3c4 Canvas view binding helpers: screen→world (pure) — implemented `src/editor/view.js`
  - [x] 2.3c5 Canvas render / input binding helpers: screen→world, pan, zoom — implemented `src/editor/view.js`

## Editor milestones (3D viewport)

- [x] **3.1 Editor 3D viewport module (Three.js scene / lights / camera / ground / grid + axes)** — `src/editor/viewport-3d.js`
- [x] **3.2 Game object inventory + placeholder mesh kinds** — `src/editor/objects.js`, `src/editor/viewport-3d.js`
- [x] **3.3 3D viewport grid + axes** — user-reported: no grid or axes visible yet (grid + axes added in run 28; run 42 sets explicit visibility flags; verify in browser)
- [x] **3.4 All editor buttons functional** — user-reported: buttons don't work yet (3D toggle now uses safe start/stop loop; btn-new now clears 3D viewport)
- [x] **3.5 Assets receiver (download + cache: models / level data / music / SFX / images) — editor renders from its own site** — `src/core/assets.js`, `src/editor/viewport-3d.js`, `src/editor/game-maps.js`, `index.html` (receiver wiring + "Download Assets" button)

## Game mod format

- [x] **0.1 Ground game mod format in live riseoflyric.com source** — `docs/FORMAT.md`

## Code tree

- The code tree (`src/`, later `samples/`, `tests/`) will be added as later
  ROADMAP items are worked.
