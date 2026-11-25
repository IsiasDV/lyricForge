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
