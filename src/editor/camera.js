// Pure editor camera state: pan (world offset) and zoom. The canvas view
// layer binds this to the renderer camera; the math lives here so it stays
// unit-testable without a DOM/GL context.

export function createEditorCamera({ width = 0, height = 0 } = {}) {
  return { x: 0, y: 0, zoom: 1 };
}

// dx/dy are screen-space pixels to shift the world view by.
export function panCamera(cam, dx, dy) {
  return { ...cam, x: cam.x + dx, y: cam.y + dy };
}

// zoomCamera scales zoom (clamped) and keeps the world point currently at the
// viewport center roughly anchored (simple center-anchored zoom).
export function zoomCamera(cam, factor) {
  const zoom = Math.min(8, Math.max(0.05, cam.zoom * factor));
  const worldX = cam.x / cam.zoom;
  const worldY = cam.y / cam.zoom;
  return { x: worldX * zoom, y: worldY * zoom, zoom };
}
