# Roadmap

## Editor milestones

- [x] **1.1 App shell + state store + event bus** — `src/core/{event-bus,store}.js`, `src/main.js`
- [x] **1.2 localStorage autosave** — `src/io/autosave.js`
- [x] **1.3 Undo/redo via command pattern** — `src/core/undo-redo.js`
- [x] **2.1 Create new map, set size, layers** — `src/editor/map/map.js`
- [x] **2.2 Tile palette, paint / erase** — `src/editor/map/tile-palette.js`
- [x] **2.3a Fill (flood fill)** — `src/editor/map/fill.js`
- [x] **2.3b Select / move objects** — `src/editor/map/object-move.js`
- [ ] **2.3c Pan / zoom / grid toggle** — needs canvas + UI (`src/editor/` view layer)
  - [x] 2.3c1 Camera pan / zoom (pure helpers) — implemented `src/editor/camera.js`
  - [x] 2.3c2 Grid toggle (pure helpers) — implemented `src/editor/grid.js`
  - [x] 2.3c3 Editor view state (camera + grid) — implemented `src/editor/view.js`
  - [x] 2.3c4 Canvas view binding helpers: screen→world (pure) — implemented `src/editor/view.js`
  - [ ] 2.3c5 Canvas render / input binding for camera / grid (needs canvas + editor state)

## Game mod format

- [x] **0.1 Ground game mod format in live riseoflyric.com source** — `docs/FORMAT.md`

## Code tree

- The code tree (`src/`, later `samples/`, `tests/`) will be added as later
  ROADMAP items are worked.
