// Map definition: Night of the Living Void.
// Asset paths are relative to client/. Files may not exist yet - loading
// tolerates missing files.
import * as THREE from '../../vendor/three.module.min.js';
import { isPotato } from '../state/settings.js';
import { liteMaterials } from '../render/lite.js';
import { CollisionWorld, trianglesFromMeshes } from '../game/collision-world.js';
import { createPickupSpawns, GOLD_STYLE, BLUE_STYLE } from './pickup-spawns.js';
import { COSTS } from '../game/interactions.js';
import { createPowerupMachine, createPerkMachine } from './props.js';
import { createBehgernog } from './map-props.js';
import { createNightSky, HORIZON_HEX } from './night-sky.js';

import { MAP_DATA } from './map-data.js';

const { model: MODEL, noCollide: NO_COLLIDE, scale: MODEL_SCALE } = MAP_DATA['night-of-the-living-void'];
// World-space gun pickup positions (x, floor y, z).
const GUN_MODEL = 'assets/general/Gun.glb';
export const GUN_SPAWNS = [[9.4, 0.0, 16.7], [5.7, 0.0, -25.1], [-3.9, 5.1, 25.7], [-20.2, 0.7, 11.4], [22.8, 0, -5.6]];
const AMMO_MODEL = 'assets/general/Bullet.glb';
export const AMMO_SPAWNS = [[8.3, 5.1, -16.5], [1.5, 5.1, 17.0], [22.0, 0.0, 29.4], [-9.4, 0.0, -16.4], [-18.7, 1.6, 42.3], [2.8, 0.2, 43.4], [-10.2, 5.1, -3.6], [-2.2, 0, 1.4]];
const MOON_DIR = new THREE.Vector3(-0.4, 0.47, -0.8).normalize();

export const nightOfTheLivingVoid = {
  id: 'night-of-the-living-void',
  name: 'Night of the Living Void',
  description: "You say it's Nacht, but it's not der Untoten. This is the gateway to the alternative canon.",
  banner: 'assets/map/night/banner/banner.png',
  loadingBackground: 'assets/map/night/loading/loading.jpg',
  loadingAudio: 'assets/map/night/loading/loading.m4a',

  // Preload manifest, by asset type (see core/assets.js).
  assets: {
    images: ['assets/map/night/loading/loading.jpg'],
    models: [MODEL, GUN_MODEL, AMMO_MODEL]
  },

  // Once-per-match easter egg song (see GameSession).
  secret: { audio: 'assets/map_night/secret/secret.opus' },

  // Builds the playable level. Returns { scene, spawn, update(dt), dispose() }.
  createLevel(loaded) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(HORIZON_HEX);
    scene.fog = new THREE.Fog(HORIZON_HEX, 25, 170);

    scene.add(new THREE.HemisphereLight(0x8094d8, 0x10121f, 0.75));
    scene.add(new THREE.AmbientLight(0x5560a0, 0.15));
    const moon = new THREE.DirectionalLight(0xb4c4ff, 0.95);
    moon.position.copy(MOON_DIR).multiplyScalar(100);
    scene.add(moon);

    const sky = createNightSky({ moonDir: MOON_DIR });
    scene.add(sky.group);
    const pm = MAP_DATA['night-of-the-living-void'].powerupMachine.at;
    const spinner = createPowerupMachine(pm);
    const pk = MAP_DATA['night-of-the-living-void'].perkMachine.at;
    const perker = createPerkMachine(pk);
    const bg = createBehgernog(MAP_DATA['night-of-the-living-void'], 'night-of-the-living-void');
    scene.add(spinner.group, perker.group, bg.machine.group);
    const interactables = [
      { id: 'spin', kind: 'spin', x: pm[0], y: pm[1], z: pm[2], radius: 2.2, prompt: 'POWERUP MACHINE', cost: COSTS.spin, machine: spinner },
      { id: 'perkMachine', kind: 'perkMachine', x: pk[0], y: pk[1], z: pk[2], radius: 2.2, prompt: 'CHANGE PERMA-PERK', cost: COSTS.perkMachine, machine: perker },
      bg.interactable
    ];
    const guns = createPickupSpawns(loaded?.models?.[GUN_MODEL], GUN_SPAWNS, GOLD_STYLE);
    scene.add(guns.group);
    const ammo = createPickupSpawns(loaded?.models?.[AMMO_MODEL], AMMO_SPAWNS, BLUE_STYLE);
    scene.add(ammo.group);

    const spawn = { x: 0, y: 0.5, z: 0, yaw: 0 }; // feet position, 0.5 m above the origin; shared by all players
    let groundY = 0;
    let collision = null;
    let killY = -100;

    const model = loaded?.models?.[MODEL];
    if (model) {
      model.scale.setScalar(MODEL_SCALE);
      if (isPotato()) liteMaterials(model);
      scene.add(model);
      scene.updateMatrixWorld(true);
      const meshes = [];
      model.traverse((o) => {
        if (o.isMesh && !NO_COLLIDE.includes(o.name)) meshes.push({ geometry: o.geometry, matrixWorld: o.matrixWorld });
      });
      collision = new CollisionWorld(trianglesFromMeshes(meshes));
      const b = collision.bounds;
      killY = b.minY - 30;
    } else {
      console.warn(`[map] ${MODEL} did not load; using placeholder ground`);
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(400, 400),
        new THREE.MeshStandardMaterial({ color: 0x14172a })
      );
      ground.rotation.x = -Math.PI / 2;
      scene.add(ground);
      const grid = new THREE.GridHelper(400, 200, 0x2a3060, 0x1a1f40);
      grid.position.y = 0.01;
      scene.add(grid);
    }

    return {
      scene,
      groundY,
      collision,
      gunSpawns: guns.spawns,
      ammoSpawns: ammo.spawns,
      killY,
      spawn,
      interactables,
      update(dt, camera) { sky.update(dt, camera); spinner.update(dt); perker.update(dt); bg.machine.update(dt); guns.update(dt); ammo.update(dt); },
      dispose() {
        sky.dispose();
        spinner.dispose();
        perker.dispose();
        guns.dispose();
        ammo.dispose();
        scene.traverse((o) => {
          o.geometry?.dispose?.();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) {
            if (!m) continue;
            for (const v of Object.values(m)) if (v && v.isTexture) v.dispose();
            m.dispose();
          }
        });
      }
    };
  }
};
