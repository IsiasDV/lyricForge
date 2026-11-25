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
  const y = cam.y + (screenY - viewportHeight / 2) / cam.zoom;
  return { x, y };
}

// Pure screen-space drag → world delta (accounts for camera zoom).
export function panByScreen(state, screenDx, screenDy, viewportWidth, viewportHeight) {
  const cam = state.camera;
  return {
    ...state,
    camera: {
      ...cam,
      x: cam.x - screenDx / cam.zoom,
      y: cam.y - screenDy / cam.zoom,
    },
  };
}

// Pure zoom anchored at a screen point (world point under cursor stays put).
export function zoomAtScreen(
  state,
  screenX,
  screenY,
  factor,
  viewportWidth,
  viewportHeight
) {
  const cam = state.camera;
  const zoom = Math.min(8, Math.max(0.25, cam.zoom * factor));
  const worldX = cam.x + (screenX - viewportWidth / 2) / cam.zoom;
  const worldY = cam.y + (screenY - viewportHeight / 2) / cam.zoom;
  return {
    ...state,
    camera: {
      x: worldX - (screenX - viewportWidth / 2) / zoom,
      y: worldY - (viewportHeight / 2 - screenY) / zoom,
      zoom,
    },
  };
}


