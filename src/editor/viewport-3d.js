// Editor 3D viewport: Three.js scene for viewing game maps as 3D (objects,
// models, spawner areas, barriers). Base scene follows src/render/scene.js.

import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { objectMeshKind } from './objects.js';
import { resolveAssetUrl } from '../../core/assets.js';

export function createEditorViewport3D(canvasEl, deps = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x11141a);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  camera.position.set(30, 25, 30);
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvasEl });
  renderer.setSize(canvasEl.clientWidth || 400, canvasEl.clientHeight || 300, false);

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
  grid.visible = true;
  scene.add(grid);
  const axes = new THREE.AxesHelper(10);
  axes.visible = true;
  scene.add(axes);

  // Orbit controls (basic: left-drag orbit, right-drag pan, wheel zoom)
  let isOrbiting = false, isPanning = false;
  let lastX = 0, lastY = 0;
  const target = new THREE.Vector3(0, 0, 0);
  const spherical = new THREE.Spherical();
  spherical.setFromVector3(camera.position.clone().sub(target));
  const minDistance = 5, maxDistance = 200;
  function updateCamera() {
    camera.position.setFromSpherical(spherical).add(target);
    camera.lookAt(target);
  }

  canvasEl.addEventListener('mousedown', (e) => {
    lastX = e.clientX; lastY = e.clientY;
    if (e.button === 0) { isOrbiting = true; canvasEl.style.cursor = 'grabbing'; }
    if (e.button === 2) { isPanning = true; canvasEl.style.cursor = 'grabbing'; }
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!isOrbiting && !isPanning) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    if (isOrbiting) {
      spherical.theta -= dx * 0.005;
      spherical.phi = THREE.MathUtils.clamp(spherical.phi + dy * 0.005, 0.01, Math.PI - 0.01);
      updateCamera();
    }
    if (isPanning) {
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0).normalize();
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1).normalize();
      target.addScaledVector(right, -dx * spherical.radius * 0.001);
      target.addScaledVector(up, dy * spherical.radius * 0.001);
      updateCamera();
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) isOrbiting = false;
    if (e.button === 2) isPanning = false;
    canvasEl.style.cursor = '';
  });
  canvasEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    spherical.radius = THREE.MathUtils.clamp(spherical.radius * (e.deltaY > 0 ? 1.1 : 0.9), minDistance, maxDistance);
    updateCamera();
  }, { passive: false });
  canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());

  const placed = [];

  let animId = null;
  const animate = () => { renderer.render(scene, camera); animId = requestAnimationFrame(animate); };
  function start() { if (animId == null) animId = requestAnimationFrame(animate); }
  function stop() { if (animId != null) { cancelAnimationFrame(animId); animId = null; } }

  const loader = deps?.loader ?? new GLTFLoader();
  const receiver = deps?.receiver ?? null;
  const onProgressCb = typeof deps?.onProgress === 'function' ? deps.onProgress : null;

  async function loadGltf(url) {
    if (receiver) {
      // Assets receiver: download (or serve from cache) the model, then parse
      // the cached GLB bytes locally instead of hot-loading from a remote url.
      const assets = await receiver.load({ models: [url] }, { onProgress: onProgressCb });
      const resolved = receiver.baseUrl ? resolveAssetUrl(url, receiver.baseUrl) : String(url);
      const path = resolved.slice(0, Math.max(resolved.lastIndexOf('/') + 1, 0));
      const buffer = assets?.models?.[resolved];
      const gltf = buffer ? await loader.parseAsync(buffer, path) : null;
      if (!gltf) throw new Error(`Asset receiver has no model payload for ${url}`);
      return gltf;
    }
    return new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
  }

  function addObject(obj) {
    const kind = objectMeshKind(obj);
    if (!kind) return null;
    const group = new THREE.Group();
    if (obj?.kind === 'map-model') {
      const modelUrl = obj.model;
      const scale = obj.scale ?? 1;
      if (modelUrl) {
        loadGltf(modelUrl).then((gltf) => {
          const model = gltf.scene;
          model.scale.setScalar(scale);
          const box = new THREE.Box3().setFromObject(model);
          const center = new THREE.Vector3();
          box.getCenter(center);
          model.position.sub(center);
          group.add(model);
        }).catch((e) => console.warn('Failed to load model:', modelUrl, e));
      } else {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshStandardMaterial({ color: 0x4c4eef, roughness: 0.8, metalness: 0.4, wireframe: true }));
        group.add(mesh);
      }
    } else if (kind === 'box') {
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
    } else if (kind === 'machine') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 1.0), new THREE.MeshStandardMaterial({ color: 0x23262e, roughness: 0.6, metalness: 0.5 }));
      body.position.y = 0.8;
      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), new THREE.MeshStandardMaterial({ color: 0xc84cff, roughness: 0.4, metalness: 0.3 }));
      orb.position.y = 1.5;
      group.add(body, orb);
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

  return { scene, camera, renderer, resize, render, dispose, addObject, clearObjects, placed, start, stop, grid, axes, receiver, loader };
}