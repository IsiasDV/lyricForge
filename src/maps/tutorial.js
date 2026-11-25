// Map definition: TUTORIAL. A guided course built entirely in code (box geometry, no model): eight rooms along -Z that
// teach movement, combat, every enemy type and the points economy (see game/tutorial.js for the step logic).
// `mode: 'tutorial'` makes GameSession run it locally, sandboxed (no stats / bests / achievements) and without rounds.
import * as THREE from '../../vendor/three.module.min.js';
import { gatedWorld, boxTriangles } from '../game/collision-world.js';
import { barriersOf } from '../game/interactions.js';
import { createPickupSpawns, GOLD_STYLE, BLUE_STYLE } from './pickup-spawns.js';
import { MAP_DATA } from './map-data.js';
import { createMapProps } from './map-props.js';
import { ROOMS, GATES, HALF_W, solids, SPAWN, GUN_SPAWNS, AMMO_SPAWNS, SIGNS, END_Z } from './tutorial-layout.js';
import { SIGN_TEXT } from '../game/tutorial.js';
import { tutorialLabels } from '../ui/tutorial-labels.js';

export { GUN_SPAWNS, AMMO_SPAWNS };
const ID = 'tutorial';
const D = MAP_DATA[ID];
const GUN_MODEL = 'assets/general/Gun.glb';
const AMMO_MODEL = 'assets/general/Bullet.glb';
const SKY = 0x0e1228;

const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;

function gridTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#2a3052'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#323963'; g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64);
  g.strokeStyle = 'rgba(160,180,255,0.25)'; g.lineWidth = 2; g.strokeRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function wrap(g, text, maxW) {
  const lines = []; let line = '';
  for (const w of text.split(' ')) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function signMesh(title, body, color) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(10,14,34,0.92)'; g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = hex(color); g.lineWidth = 14; g.strokeRect(7, 7, 1010, 498);
  g.fillStyle = hex(color); g.font = '900 84px Segoe UI, Arial, sans-serif'; g.textBaseline = 'top';
  g.fillText(title, 44, 36);
  g.fillStyle = '#e8ecff'; g.font = '600 44px Segoe UI, Arial, sans-serif';
  let y = 150;
  for (const l of wrap(g, body, 930).slice(0, 7)) { g.fillText(l, 44, y); y += 52; }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, fog: false });
  return new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), mat);
}

export const tutorial = {
  id: ID,
  name: 'TUTORIAL',
  description: 'New here? Walk the guided course: moving, jumping, sprinting and sliding, slapping and shooting, every enemy type, points and machines, and a short final exam. Nothing can hurt you and nothing counts toward your stats.',
  ready: true,
  mode: 'tutorial',
  flyby: false, // never part of the main-menu fly-through
  banner: 'assets/map/tutorial/banner/banner.svg',
  assets: { images: [], models: [GUN_MODEL, AMMO_MODEL] },

  createLevel(loaded) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SKY);
    scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x6a70a0, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 0.7);
    sun.position.set(10, 30, 20);
    scene.add(sun);

    const list = solids();
    const nBarriers = barriersOf(D).length;
    const boxes = list.map((b) => boxTriangles(b.min, b.max));
    const tris = new Float32Array(boxes.reduce((n, b) => n + b.length, 0));
    let off = 0;
    for (const b of boxes) { tris.set(b, off); off += b.length; }
    const collision = gatedWorld(tris, [...barriersOf(D), ...GATES]);

    const owned = []; // textures / geometries released in dispose()
    const grid = gridTexture(); owned.push(grid);
    const mats = {
      floor: new THREE.MeshLambertMaterial({ map: grid }),
      wall: new THREE.MeshLambertMaterial({ color: 0xc9cfe4 }),
      ceiling: new THREE.MeshLambertMaterial({ color: 0x1c2040 })
    };
    const roomOf = (b) => ROOMS.find((r) => (b.min[2] + b.max[2]) / 2 <= r.z0 && (b.min[2] + b.max[2]) / 2 > r.z1) ?? ROOMS[0];
    for (const b of list) {
      const size = [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]];
      let mat = mats[b.tag];
      if (!mat) { mat = new THREE.MeshLambertMaterial({ color: roomOf(b).color }); owned.push(mat); } // hurdles, platforms, beam
      if (b.tag === 'floor') { grid.repeat.set(size[0] / 4, size[2] / 4); }
      const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
      m.position.set((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2);
      scene.add(m);
    }
    // coloured floor edge strips per room
    for (const r of ROOMS) {
      const mat = new THREE.MeshBasicMaterial({ color: r.color });
      owned.push(mat);
      for (const sx of [-1, 1]) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, Math.abs(r.z1 - r.z0)), mat);
        s.position.set(sx * (HALF_W - 0.2), 0.02, (r.z0 + r.z1) / 2);
        scene.add(s);
      }
    }

    // world signs (text follows the player's bindings at match start)
    const L = tutorialLabels();
    for (const s of SIGNS) {
      const room = ROOMS.find((r) => s.z <= r.z0 && s.z > r.z1) ?? ROOMS[0];
      const t = SIGN_TEXT[s.id]?.(L);
      if (!t) continue;
      const m = signMesh(t.title, t.body, room.color);
      m.position.set(s.wall * (HALF_W - 0.04), 2.5, s.z);
      m.rotation.y = s.wall < 0 ? Math.PI / 2 : -Math.PI / 2;
      scene.add(m);
    }

    // gates: glowing translucent panels that fade out when opened
    const gateVis = GATES.map((g) => {
      const mat = new THREE.MeshBasicMaterial({ color: g.color, transparent: true, opacity: 0.4, depthWrite: false });
      const m = new THREE.Mesh(new THREE.BoxGeometry(g.max[0] - g.min[0], g.max[1] - g.min[1], g.max[2] - g.min[2]), mat);
      m.position.set((g.min[0] + g.max[0]) / 2, (g.min[1] + g.max[1]) / 2, (g.min[2] + g.max[2]) / 2);
      scene.add(m);
      return { m, mat, fade: 0 };
    });

    // objective beacon: a ring on the floor + a light column
    const bColor = 0x6ef7a0;
    const beacon = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.07, 8, 40), new THREE.MeshBasicMaterial({ color: bColor, fog: false }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.06;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 6, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: bColor, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    col.position.y = 3;
    beacon.add(ring, col);
    beacon.visible = false;
    scene.add(beacon);
    let beaconT = 0;

    const mp = createMapProps({ data: D, mapId: ID, getCollision: () => collision });
    for (const p of mp.props) scene.add(p.group);
    const guns = createPickupSpawns(loaded?.models?.[GUN_MODEL], GUN_SPAWNS, GOLD_STYLE);
    scene.add(guns.group);
    const ammo = createPickupSpawns(loaded?.models?.[AMMO_MODEL], AMMO_SPAWNS, BLUE_STYLE);
    scene.add(ammo.group);

    return {
      scene, groundY: 0, collision,
      gunSpawns: guns.spawns, ammoSpawns: ammo.spawns,
      killY: -30, spawn: { ...SPAWN },
      interactables: mp.interactables, state: mp.state,
      setBarrierOpen: mp.setBarrierOpen, setLinked: mp.setLinked,
      tutorial: true,
      setBeacon(b) { beacon.visible = !!b; if (b) beacon.position.set(b.x, 0, b.z); },
      openCourseGate(i) { // director gates sit after the map barriers in the collision gate list
        collision.setGateOpen(true, nBarriers + i);
        if (gateVis[i]) gateVis[i].fade = 1;
      },
      update(dt) {
        for (const p of mp.props) p.update(dt);
        guns.update(dt); ammo.update(dt);
        beaconT += dt;
        if (beacon.visible) { const k = 1 + 0.08 * Math.sin(beaconT * 4); ring.scale.set(k, k, k); col.material.opacity = 0.14 + 0.08 * Math.sin(beaconT * 3); }
        for (const g of gateVis) {
          if (g.fade > 0) { g.fade = Math.max(0, g.fade - dt * 2.5); g.mat.opacity = 0.4 * g.fade; if (g.fade === 0) g.m.visible = false; }
          else if (g.m.visible) g.mat.opacity = 0.32 + 0.1 * Math.sin(beaconT * 3);
        }
      },
      dispose() {
        for (const p of mp.props) p.dispose();
        guns.dispose(); ammo.dispose();
        scene.traverse((o) => {
          o.geometry?.dispose?.();
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of ms) { if (!m) continue; if (m.map && m.map !== grid) m.map.dispose(); m.dispose(); }
        });
        for (const t of owned) t.dispose?.();
      }
    };
  }
};
void END_Z;
