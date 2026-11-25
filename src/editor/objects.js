// Pure game-object inventory for the 3D viewport editor.
// Turns a game map definition into the flat list of things the map contains:
// map models, spawns, barriers, enemy areas, machines, hazards, ...

export const OBJECT_KINDS = Object.freeze([
  'map-model',
  'spawn',
  'barrier',
  'enemy-area',
  'teleporter',
  'broken-teleporter',
  'color-machine',
  'powerup-machine',
  'perk-machine',
  'behgernog',
  'lyric-machine',
  'shop',
  'lava',
  'pillar',
  'no-collide',
]);

export function collectMapObjects(mapDef) {
  const mapId = mapDef?.id ?? 'unknown';
  const out = [];
  const add = (kind, extra) => out.push({ mapId, kind, ...(extra ?? {}) });

  if (mapDef?.model) add('map-model', { model: mapDef.model, scale: mapDef.scale ?? 1 });
  if (mapDef?.spawn) add('spawn', { at: mapDef.spawn });

  for (const b of mapDef?.barriers ?? []) add('barrier', b);
  if (mapDef?.barrier) add('barrier', mapDef.barrier);

  for (const e of mapDef?.enemyAreas ?? []) add('enemy-area', e);
  for (const e of mapDef?.enemyAreasOpen ?? []) add('enemy-area', { ...e, open: true });
  for (const st of mapDef?.enemyStages ?? []) for (const e of st) add('enemy-area', { ...e, stage: st });

  const machine = (kind, def) => { if (def) add(kind, def); };
  machine('teleporter', mapDef?.teleporter);
  if (mapDef?.teleporters) { machine('teleporter-a', mapDef.teleporters.a); machine('teleporter-b', mapDef.teleporters.b); }
  machine('broken-teleporter', mapDef?.brokenTeleporter);
  machine('color-machine', mapDef?.colorMachine);
  machine('powerup-machine', mapDef?.powerupMachine);
  machine('perk-machine', mapDef?.perkMachine);
  machine('behgernog', mapDef?.behgernog);
  machine('lyric-machine', mapDef?.lyricMachine);
  machine('shop', mapDef?.axeShop);

  if (mapDef?.lava) add('lava', mapDef.lava);
  if (mapDef?.pillars) add('pillar', mapDef.pillars);
  for (const n of mapDef?.noCollide ?? []) add('no-collide', { name: n });

  return out;
}

export function objectTypes(mapDef) {
  const kinds = new Set();
  for (const o of collectMapObjects(mapDef)) kinds.add(o.kind);
  return [...kinds].sort();
}

// Placeholder mesh primitive used by the 3D viewport to preview a game object.
export function objectMeshKind(obj) {
  switch (obj?.kind) {
    case 'map-model': return 'box';
    case 'spawn': return 'sphere';
    case 'barrier': return 'box';
    case 'enemy-area': return 'box';
    case 'teleporter':
    case 'broken-teleporter':
    case 'color-machine':
    case 'powerup-machine':
    case 'perk-machine':
    case 'behgernog':
    case 'lyric-machine':
    case 'shop':
      return 'machine';
    case 'lava': return 'plane';
    case 'pillar': return 'cylinder';
    case 'no-collide': return null;
    default: return null;
  }
}
