// Editor 3D viewport: Three.js scene for viewing game maps as 3D (objects,
// models, spawner areas, barriers). Base scene follows src/render/scene.js; map
// models and object layers are layered in by callers once assets exist.

import * as THREE from '../../vendor/three.module.min.js';

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

  return { scene, camera, renderer, resize, render, dispose };
}
