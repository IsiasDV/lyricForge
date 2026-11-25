import assert from 'node:assert';
import { createEditorCamera, panCamera, zoomCamera } from '../src/editor/camera.js';
import { createGrid, setGridVisible, setGridCellSize } from '../src/editor/grid.js';
import { createEditorView, panEditorView, zoomEditorView, toggleEditorGrid, setEditorGridCellSize, screenToWorld, panByScreen, zoomAtScreen } from '../src/editor/view.js';
import { fillTiles } from '../src/editor/map/fill.js';
import { paintTile, eraseTile, TILE_PALETTE } from '../src/editor/map/tile-palette.js';
import { createMap } from '../src/editor/map/map.js';
import { collectMapObjects, objectTypes, OBJECT_KINDS } from '../src/editor/objects.js';

const assertClose = (a, b) => assert.ok(Math.abs(a - b) < 1e-9);

// camera
{
  const cam = createEditorCamera();
  assert.deepEqual(cam, { x: 0, y: 0, zoom: 1 });
  assert.deepEqual(panCamera(cam, 5, -3), { x: 5, y: -3, zoom: 1 });
  assert.equal(zoomCamera(cam, 2).zoom, 2);
  assert.equal(zoomCamera(cam, 100).zoom, 8);
  assert.equal(zoomCamera(cam, 0.01).zoom, 0.05);
}

// grid
{
  const g = createGrid();
  assert.equal(g.visible, true);
  assert.equal(setGridVisible(g, false).visible, false);
  assert.equal(setGridCellSize(g, 16).cellSize, 16);
}

// view: screen -> world
{
  const v = createEditorView();
  const w = screenToWorld(v, 100, 50, 400, 300);
  assertClose(w.x, -100);
  assertClose(w.y, 100);
}

// view: pan by screen delta
{
  const v = createEditorView();
  const p = panByScreen(v, 40, 20, 400, 300);
  assertClose(p.camera.x, -40);
  assertClose(p.camera.y, -20);
}

// view: zoom anchored at screen
{
  const v = createEditorView();
  const z = zoomAtScreen(v, 200, 150, 2, 400, 300);
  assert.equal(z.camera.zoom, 2);
}

// tile palette paint / erase
{
  const map = createMap({ id: 't', name: 'T', width: 4, height: 4 });
  const layerId = 't:layer:tile';
  const painted = paintTile(map, layerId, 1, 2, 'tiles.floor');
  const layer = painted.layers.find((l) => l.id === layerId);
  assert.equal(layer.tiles['1,2'], 'tiles.floor');
  const erased = eraseTile(painted, layerId, 1, 2);
  const layer2 = erased.layers.find((l) => l.id === layerId);
  assert.equal(layer2.tiles['1,2'], undefined);
}

// fill
{
  const map = createMap({ id: 't2', name: 'T2', width: 4, height: 4 });
  const layerId = 't2:layer:tile';
  let m = paintTile(map, layerId, 0, 0, 'tiles.floor');
  m = paintTile(m, layerId, 1, 0, 'tiles.floor');
  m = paintTile(m, layerId, 0, 1, 'tiles.floor');
  m = paintTile(m, layerId, 2, 0, 'tiles.horizon');
  const filled = fillTiles(m, layerId, 0, 0, 'tiles.floor', 'tiles.horizon');
  const layer = filled.layers.find((l) => l.id === layerId);
  assert.equal(layer.tiles['0,0'], 'tiles.horizon');
  assert.equal(layer.tiles['1,0'], 'tiles.horizon');
  assert.equal(layer.tiles['0,1'], 'tiles.horizon');
  assert.equal(layer.tiles['2,0'], 'tiles.horizon');
}

// object inventory (3d viewport): every thing a game map contains
{
  const night = {
    id: 'night-of-the-living-void',
    model: 'assets/map_night/map/map.glb',
    scale: 0.75,
    spawn: [0, 0.5, 0],
    enemyAreas: [{ min: [-20.2, -0.7, -30.6], max: [30.0, 12.1, 43.7] }],
    powerupMachine: { at: [10.3, 0.0, 1.5] },
    perkMachine: { at: [5.8, 0.0, 1.4] },
    behgernog: { at: [-15.2, 0.09, 0.4] },
    teleporter: { at: [1, 0, 2], to: [0, 3, 0] },
    barriers: [{ min: [0, 0, 0], max: [1, 2, 1], cost: 250 }],
    lava: { mesh: 'Plane.004' },
  };
  const objs = collectMapObjects(night);
  assert.ok(objs.some((o) => o.kind === 'map-model' && o.model === night.model));
  assert.ok(objs.some((o) => o.kind === 'spawn'));
  assert.ok(objs.some((o) => o.kind === 'barrier'));
  assert.ok(objs.some((o) => o.kind === 'enemy-area'));
  assert.ok(objs.some((o) => o.kind === 'teleporter'));
  assert.ok(objs.some((o) => o.kind === 'powerup-machine'));
  assert.ok(objs.some((o) => o.kind === 'perk-machine'));
  assert.ok(objs.some((o) => o.kind === 'behgernog'));
  assert.ok(objs.some((o) => o.kind === 'lava'));
  assert.ok(objectTypes(night).includes('map-model'));
  assert.ok(OBJECT_KINDS.includes('map-model'));
  assert.equal(collectMapObjects({}).length, 0);
}

console.log('EDITOR_SMOKE_OK');
