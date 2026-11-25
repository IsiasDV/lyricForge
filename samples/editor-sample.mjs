// Sample map for the map editor (code-tree phase): small tile map demonstrating
// the internal editor map shape (tile layer keyed by "x,y" grid coords).
export const EDITOR_SAMPLE_MAP = {
  id: 'sample-editor',
  name: 'Editor Sample',
  width: 8,
  height: 8,
  layers: [
    {
      id: 'sample-editor:layer:tile',
      name: 'Tiles',
      type: 'tile',
      tiles: {
        '0,0': 'tiles.floor',
        '1,0': 'tiles.floor',
        '2,0': 'tiles.floor',
        '0,1': 'tiles.floor',
        '1,1': 'tiles.floor',
        '2,1': 'tiles.floor',
        '0,2': 'tiles.floor',
        '1,2': 'tiles.floor',
        '2,2': 'tiles.floor',
      },
    },
    { id: 'sample-editor:layer:object', name: 'Objects', type: 'object' },
  ],
};

export default EDITOR_SAMPLE_MAP;
