// Editor 3D viewport: Three.js scene for viewing game maps as 3D (objects,
// models, spawner areas, barriers). Base scene follows src/render/scene.js.

import * as THREE from '../vendor/three.module.min.js';
import { objectMeshKind } from './objects.js';

export function createEditorViewport3D() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x11141a);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  camera.position.set(30, 25, 30);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(1, 1);

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const directional = new THREE.DirectionalLight(0xffffff, 0.8);
  directional.position.set(5, 10, 7);
  scene.add(directional);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x2a2f3a })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const grid = new THREE.GridHelper(200, 100, 0x2a3060, 0x1a1f40);
  grid.position.y = 0.01;
  scene.add(grid);
  const axes = new THREE.AxesHelper(10);
  scene.add(axes);

  const placed = [];

  let animId = null;
  const animate = () => { renderer.render(scene, camera); animId = requestAnimationFrame(animate); };
  function start() { if (animId == null) animId = requestAnimationFrame(animate); }
  function stop() { if (animId != null) { cancelAnimationFrame(animId); animId = null; } }

  function addObject(obj) {
    const kind = objectMeshKind(obj);
    if (!kind) return null;
    const group = new THREE.Group();
    if (kind === 'box') {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xff6a3a, roughness: 0.8, metalness: 0.4 }));
      mesh.scale.set((obj.max?.[0] ?? 1) - (obj.min?.[0] ?? 0), (obj.max?.[1] ?? 1) - (obj.min?.[1] ?? 0), (obj.max?.[2] ?? 1) - (obj.min?.[2] ?? 0));
      mesh.position.set((obj.min?.[0] ?? 0) + (obj.max?.[0] ?? 1) / 2, (obj.min?.[1] ?? 0) + (obj.max?.[1] ?? 1) / 2, (obj.min?.[2] ?? 0) + (obj.max?.[2] ?? 1) / 2);
      group.add(mesh);
    } else if (kind === 'sphere') {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 16), new THREE.MeshStandardMaterial({ color: 0x4c9ef7, roughness: 0.6, metalness: 0.4 }));
      mesh.position.set(obj.at?.[0] ?? 0, obj.at?.[1] ?? 0.5, obj.at?.[2] ?? 0);
      group.add(mesh);
    } else if (kind === 'plane') {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshStandardMaterial({ color: 0x7a2c2c, roughness: 0.9, metalness: 0.1 }));
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(obj.at?.[0] ?? 0, obj.at?.[1] ?? 0, obj.at?.[2] ?? 0);
      group.add(mesh);
    } else if (kind === 'cylinder') {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 3, 12), new THREE.MeshStandardMaterial({ color: 0x3aa0ff, roughness: 0.6, metalness: 0.5 }));
      mesh.position.set(obj.region?.min?.[0] ?? 0, 1, obj.region?.min?.[2] ?? 0);
      group.add(mesh);
    } else {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 1.0), new THREE.MeshStandardMaterial({ color: 0x23262e, roughness: 0.6, metalness: 0.5 }));
      body.position.y = 0.8;
      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), new THREE.MeshStandardMaterial({ color: 0xc84cff, roughness: 0.4, metalness: 0.3 }));
      orb.position.y = 1.5;
      group.add(body, orb);
    }
    scene.add(group);
    placed.push(group);
    return group;
  }

  function clearObjects() {
    for (const g of placed) {
      scene.remove(g);
      g.traverse((o) => { o.geometry?.dispose?.(); const m = o.material; if (m) { m.map?.dispose?.(); m.dispose(); } });
    }
    placed.length = 0;
  }

  function resize(width, height) {
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function render() {
    renderer.render(scene, camera);
  }

  function dispose() {
    renderer.dispose();
    scene.clear();
  }

  return { scene, camera, renderer, resize, render, dispose, addObject, clearObjects, placed, start, stop, grid, axes };
}