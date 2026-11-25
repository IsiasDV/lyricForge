// Editor view state: consolidates camera + grid into one state object for the
// upcoming canvas view layer binding. Pure state transitions; immutable.

import { createEditorCamera, panCamera, zoomCamera } from './camera.js';
import { createGrid, setGridVisible, setGridCellSize } from './grid.js';

export function createEditorView() {
  return { camera: createEditorCamera(), grid: createGrid() };
}

export function panEditorView(state, dx, dy) {
  return { ...state, camera: panCamera(state.camera, dx, dy) };
}

export function zoomEditorView(state, factor) {
  return { ...state, camera: zoomCamera(state.camera, factor) };
}

export function toggleEditorGrid(state) {
  return { ...state, grid: setGridVisible(state.grid, !state.grid.visible) };
}

export function setEditorGridCellSize(state, cellSize) {
  return { ...state, grid: setGridCellSize(state.grid, cellSize) };
}

// Pure screen→world conversion for canvas view binding: maps a point in
// viewport pixel coords (origin top-left) into world coords, given viewport
// size and the current camera. Y is flipped (screen y grows downward).
export function screenToWorld(state, screenX, screenY, viewportWidth, viewportHeight) {
  const cam = state.camera;
  const x = cam.x + (screenX - viewportWidth / 2) / cam.zoom;
  const y = cam.y + (viewportHeight / 2 - screenY) / cam.zoom;
  return { x, y };
}

