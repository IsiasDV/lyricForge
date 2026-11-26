export function toTrianglesDrawMode( geometry, mode ) {
  if ( mode === 'TriangleStripDrawMode' ) return 'triangleStrip';
  if ( mode === 'TriangleFanDrawMode' ) return 'triangleFan';
  return 'triangleStrip';
}
