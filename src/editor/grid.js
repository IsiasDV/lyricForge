// Grid overlay helpers: visibility + cell size (world units). The canvas view
// layer binds this to the renderer; the state lives here for testability.

export function createGrid({ visible = true, cellSize = 1 } = {}) {
  return { visible, cellSize };
}

export function setGridVisible(grid, visible) {
  return { ...grid, visible };
}

export function setGridCellSize(grid, cellSize) {
  return { ...grid, cellSize };
}
