import { SPAWN, SHOP_DOOR, MACHINES, ARENA_AREA } from './tutorial-layout.js';

// Map facts shared by the client level builder and the server collision loader.
// ready: false (set on a map entry) hides nothing but blocks starting a match on the map (server + client) until its assets exist.
export const isReady = (id) => MAP_DATA[id]?.ready !== false;

export const MAP_DATA = {
  // TUTORIAL: built in code (no model), solo only; layout in tutorial-layout.js. Never loaded by the server.
  'tutorial': {
    ready: true,
    spawn: [SPAWN.x, SPAWN.y, SPAWN.z],
    barriers: [SHOP_DOOR], // the shop -> final door (purchasable)
    behgernog: { at: MACHINES.behgernog },
    powerupMachine: { at: MACHINES.powerupMachine },
    enemyAreas: [ARENA_AREA]
  },
  // Ungaland: set up, waiting for its model/art. Fill enemyAreas and flip ready to true to go live.
  'ungaland': {
    model: 'assets/map_ungaland/map/map.glb',
    scale: 2,
    noCollide: ['Body'], // the giant animated Beh (skinned) is visual only
    spawn: [0, 5.2, 0],
    enemyAreas: [
      { min: [-18.8, 2.3, 3.8], max: [23.2, 8.2, 30.8] },
      { min: [-14.8, 5.0, -13.4], max: [10.8, 14.3, -0.3] }
    ],
    // Interactive props (world coords, feet height). Teleporter sends the player to `to`.
    teleporter: { at: [21.3, -10.0, 10.6], to: [0.0, 15.1, -2.2] },
    colorMachine: { at: [0.2, 8.0, -25.4] },
    powerupMachine: { at: [-4.1, 1.6, 19.4] },
    perkMachine: { at: [-4.1, 1.6, 23.9] }, // Change Perma-Perk, 1000 pts
    behgernog: { at: [-12.8, 4.8, 29.8] } // 200 pts: a 1-HP shield
  },
  // Choco-rocklate Gladiator Arena: scaffolded, waiting for assets. Fill values, add machines if wanted, remove ready:false.
  'choco-rocklate-gladiator-arena': {
    model: 'assets/map_choco/map/map.glb',
    scale: 0.35,
    noCollide: [],
    spawn: [0, -1.0, 0], // floor at the origin is y = -1.06 at scale 0.35
    // Enemy spawn boxes: before the barrier is unlocked, then (replacing them) after.
    enemyAreas: [{ min: [-18.6, -1.1, -30.4], max: [57.7, 10.0, 5.5] }],
    enemyAreasOpen: [{ min: [-22.4, -1.1, -28.6], max: [37.7, 12.2, 130.8] }],
    barrier: { min: [-2.0, -1.1, 22.7], max: [4.6, 5.9, 24.4], cost: 500 }, // solid until a player pays
    powerupMachine: { at: [50.5, -1.1, 4.8], cost: 350 },
    teleporters: { a: [5.8, -1.1, -25.8], b: [26.1, 7.7, 137.6], cost: 50 }, // linked at B (free), then 50 pts per trip
    colorMachine: { at: [38.3, 2.6, 116.2] },
    axeShop: { at: [24.8, -1.1, 60.7], cost: 150 }, // Gladiator's Axe
    lyricMachine: { at: [-10.1, 0.8, 92.0], cost: 650 }, // spawns a Rise of Lyric orb
    perkMachine: { at: [54.4, -1.06, 2.6] },
    behgernog: { at: [-15.4, -1.06, 2.4] }
  },
  // Endless Shot: scaffolded, waiting for assets. Fill values, add machines if wanted, remove ready:false.
  'endless-shot': {
    model: 'assets/map_endless/map/map.glb',
    scale: 0.75,
    noCollide: ['Sphere'], // sky dome (visual only)
    spawn: [50.1, 0.4, -10.8],
    barriers: [
      { min: [23.8, 1.7, -17.4], max: [23.4, 7.6, -5.6], cost: 250 },
      { min: [8.6, -0.5, -39.7], max: [21.9, 7.5, -38.7], cost: 300 }
    ],
    // Enemy spawn boxes by number of barriers opened (0, 1, 2); floors must be reachable from the player spawn.
    enemyStages: [
      [{ min: [28, -1, -24], max: [58, 3, 3] }],
      [{ min: [-16, -1, -38], max: [58, 3, 3] }],
      [{ min: [-16, -1, -38], max: [58, 3, 3] }, { min: [-33, -2, -80], max: [63, 9, -42] }]
    ],
    brokenTeleporter: { at: [50.1, 0.36, -10.8], label: 'CHOCO-ROCKLATE' }, // cosmetic dead pad under the spawn
    powerupMachine: { at: [45, 0.62, -4], cost: 350 },
    colorMachine: { at: [0, -0.23, -12] },
    lyricMachine: { at: [20, 0.86, -48], cost: 650 },
    perkMachine: { at: [43, 0.72, -8] },
    behgernog: { at: [7, 0.08, -4] },
    teleporters: { a: [51, 0.32, -23], b: [40, -0.93, -50], cost: 50 }, // linked at B (free), then 50 pts per trip
    // Randomised pillar towers (new layout each match), only on floors inside this box.
    pillars: { region: { min: [-15.2, 1.1, -75.8], max: [51.5, 6.1, -56.3] }, count: 14 }
  },
  // Forterresso de Beh: a lowland loop inside a lava-lake fortress: spawn room -> walled trail (barrier 1) -> clearing and
  // hills -> ramp -> ledge -> bridge (barrier 2) -> south platform complex. The lava (Plane.004) is a hazard, not a floor.
  'forterresso-de-beh': {
    model: 'assets/map_forterresso-de-beh/map/map.glb',
    scale: 1,
    noCollide: ['Plane.004', 'Cube.008', 'Cube.009'], // lava (instant death, see `lava`) + far backdrop decor
    lava: { mesh: 'Plane.004' },
    navHops: true, // enemies hop up steep ledge faces / small gaps and never path into lava (see nav.js)
    spawn: [-4.9, -3.15, -104.6],
    barriers: [
      { min: [-6.6, -3.6, -80.9], max: [-1.0, 3.5, -79.9], cost: 250 }, // the walled trail
      { min: [-6.6, -0.6, -33.5], max: [-0.5, 5.0, -32.5], cost: 300 }  // the bridge
    ],
    // Enemy floors by number of barriers opened (0, 1, 2): one big box; closed gates, lava and nav reachability cut it down.
    enemyStages: [
      [{ min: [-72, -9, -116], max: [45, 15, 45] }],
      [{ min: [-72, -9, -116], max: [45, 15, 45] }],
      [{ min: [-72, -9, -116], max: [45, 15, 45] }]
    ],
    // Stage 0 (spawn room): powerup, perk, teleporter A. Stage 1: color machine. Stage 2 (south): Lyric, teleporter B.
    powerupMachine: { at: [-4, -1.11, -112], cost: 350 },
    perkMachine: { at: [1, -3.15, -93] },
    colorMachine: { at: [-7, -3.15, -60] },
    lyricMachine: { at: [-10, 1.38, 0], cost: 650 },
    behgernog: { at: [-52, 0.5, -5] }, // west rim: a ledge overlooking the lava lake
    teleporters: { a: [-11, 0.31, -96], b: [-33, 1.92, -7], cost: 50 } // linked at B (free), then 50 pts per trip
  },
  // Fearvelations: scaffolded, waiting for assets. Fill values, add machines if wanted, remove ready:false.
  'fearvelations': {
    ready: false,
    model: 'assets/map_fearvelations/map/map.glb',
    scale: 1,
    noCollide: [],
    spawn: [0, 0.5, 0],
    enemyAreas: []
    // enemyAreasOpen: [{ min: [x, y, z], max: [x, y, z] }],  // used after the barrier unlocks
    // barrier: { min: [x, y, z], max: [x, y, z], cost: 500 },
    // powerupMachine: { at: [x, y, z], cost: 500 },
    // teleporters: { a: [x, y, z], b: [x, y, z], cost: 50 },
    // colorMachine: { at: [x, y, z] },
    // lyricMachine: { at: [x, y, z], cost: 650 }
    // perkMachine: { at: [x, y, z] },  // Change Perma-Perk (1000 pts)
  },
  // Behs Arcade has no model: it is a self-contained mode (see client/js/arcade/).
  'dead-behs-arcade': { ready: true },
  'night-of-the-living-void': {
    model: 'assets/map_night/map/map.glb',
    scale: 0.75,
    noCollide: [],
    spawn: [0, 0.5, 0],
    powerupMachine: { at: [10.3, 0.0, 1.5] },
    perkMachine: { at: [5.8, 0.0, 1.4] },
    behgernog: { at: [-15.2, 0.09, 0.4] },
    // Enemy spawn boxes (min / max corners); floors inside them are used.
    enemyAreas: [{ min: [-20.2, -0.7, -30.6], max: [30.0, 12.1, 43.7] }]
  }
};
