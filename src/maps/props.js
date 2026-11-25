// Procedural Ungaland props: the teleporter pad and the bullet-color machine, plus the machine's color picker.
import * as THREE from '../../vendor/three.module.min.js';

export const FIRST_BULLET_COLOR = 0x3aa0ff;

// First use gives blue; every later use a random, fully saturated color that differs from the last one.
export function nextBulletColor(prev, rng = Math.random) {
  if (prev == null) return FIRST_BULLET_COLOR;
  const prevHue = new THREE.Color(prev).getHSL({}).h;
  let h;
  do { h = rng(); } while (Math.abs(h - prevHue) < 0.08 || 1 - Math.abs(h - prevHue) < 0.08);
  return new THREE.Color().setHSL(h, 1, 0.55).getHex();
}

export const colorName = (hex) => `#${hex.toString(16).padStart(6, '0').toUpperCase()}`;

function glow(color, size) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
  s.scale.setScalar(size);
  return s;
}

const add = (color) => new THREE.MeshBasicMaterial({ color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });

function disposeGroup(group) {
  group.traverse((o) => {
    o.geometry?.dispose?.();
    const m = o.material;
    if (m) { m.map?.dispose?.(); m.dispose(); }
  });
}

// at: [x, floorY, z]
export function createTeleporter(at, { color = 0x6fd2ff } = {}) {
  const group = new THREE.Group();
  group.position.set(at[0], at[1], at[2]);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 48), add(color));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.9, 48), add(0x1c5fa8));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.04; disc.material.opacity = 0.5;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 3.2, 32, 1, true), add(0x8fdcff));
  beam.position.y = 1.6; beam.material.opacity = 0.18;
  const halo = glow(color, 3); halo.position.y = 1.2;
  group.add(disc, ring, beam, halo);
  let t = 0, k = 1, kT = 1;
  return {
    group,
    setLinked(on) { kT = on ? 1 : 0.2; },
    update(dt) {
      t += dt;
      k += (kT - k) * Math.min(1, dt * 4);
      disc.material.opacity = 0.5 * k;
      halo.material.opacity = k;
      ring.rotation.z = t * 0.8;
      ring.material.opacity = (0.6 + 0.4 * Math.sin(t * 3)) * k;
      beam.material.opacity = (0.14 + 0.07 * Math.sin(t * 2.2)) * k;
      beam.rotation.y = t * 0.5;
    },
    dispose() { disposeGroup(group); }
  };
}

// Broken teleporter (cosmetic): scorched cracked ring arcs, a dying flickering disc and a few hopping sparks.
export function createBrokenTeleporter(at, { potato = false } = {}) {
  const group = new THREE.Group();
  group.position.set(at[0], at[1], at[2]);
  const metal = new THREE.MeshStandardMaterial({ color: 0x23272f, roughness: 0.8, metalness: 0.5, side: THREE.DoubleSide });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.3, 0.1, 32), metal);
  base.position.y = 0.04;
  group.add(base);
  const arcs = [[0.2, 1.7, 0, 0], [2.3, 1.5, 0.35, 0.25], [4.4, 1.3, 0, 0]].map(([start, len, lift, tilt]) => {
    const arc = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.18, 20, 1, start, len), metal);
    arc.rotation.x = -Math.PI / 2 + tilt; arc.position.y = 0.11 + lift;
    group.add(arc);
    return arc;
  });
  const discMat = add(0x2a78d0);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.85, 32), discMat);
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.12;
  group.add(disc);
  const n = potato ? 4 : 10;
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: 0x9fd8ff, size: 0.07, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  sparks.frustumCulled = false;
  group.add(sparks);
  const life = new Float32Array(n).fill(-1), vel = new Float32Array(n * 3);
  let t = 0, flicker = 0;
  return {
    group,
    update(dt) {
      t += dt;
      flicker -= dt;
      if (flicker <= 0) { flicker = 0.04 + Math.random() * (Math.random() < 0.2 ? 1.2 : 0.12); discMat.opacity = Math.random() < 0.35 ? 0.04 : 0.1 + Math.random() * 0.3; }
      const p = sparkGeo.attributes.position;
      for (let i = 0; i < n; i++) {
        if (life[i] < 0) {
          if (Math.random() < dt * 1.4) { // a spark jumps off a crack
            const a = Math.random() * Math.PI * 2, r = 0.9 + Math.random() * 0.25;
            p.setXYZ(i, Math.cos(a) * r, 0.15, Math.sin(a) * r);
            vel[i * 3] = (Math.random() - 0.5) * 0.8; vel[i * 3 + 1] = 1.2 + Math.random() * 1.4; vel[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
            life[i] = 0.5 + Math.random() * 0.5;
          } else p.setXYZ(i, 0, -50, 0);
        } else {
          vel[i * 3 + 1] -= 6 * dt;
          p.setXYZ(i, p.getX(i) + vel[i * 3] * dt, Math.max(0.1, p.getY(i) + vel[i * 3 + 1] * dt), p.getZ(i) + vel[i * 3 + 2] * dt);
          life[i] -= dt;
        }
      }
      p.needsUpdate = true;
    },
    dispose() { disposeGroup(group); }
  };
}

export function createColorMachine(at) {
  const group = new THREE.Group();
  group.position.set(at[0], at[1], at[2]);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.7), new THREE.MeshStandardMaterial({ color: 0x23262e, roughness: 0.6, metalness: 0.5 }));
  body.position.y = 0.65;
  const panelMat = new THREE.MeshBasicMaterial({ color: FIRST_BULLET_COLOR, fog: false, side: THREE.DoubleSide });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.45), panelMat);
  panel.position.set(0, 0.95, 0.36);
  const halo = glow(FIRST_BULLET_COLOR, 1.8); halo.position.set(0, 0.95, 0.5);
  group.add(body, panel, halo);
  let t = 0;
  return {
    group,
    setColor(hex) { panelMat.color.setHex(hex); halo.material.color.setHex(hex); },
    update(dt) { t += dt; halo.material.opacity = 0.7 + 0.3 * Math.sin(t * 2.5); },
    dispose() { disposeGroup(group); }
  };
}

// Powerup machine: slot-machine box with three reels that flash through colors while spinning.
export function createPowerupMachine(at) {
  const group = new THREE.Group();
  group.position.set(at[0], at[1], at[2]);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.9, 0.8), new THREE.MeshStandardMaterial({ color: 0x2a1f35, roughness: 0.5, metalness: 0.6 }));
  body.position.y = 0.95;
  const reels = [0, 1, 2].map((i) => {
    const mat = new THREE.MeshBasicMaterial({ color: 0xc84cff, fog: false, side: THREE.DoubleSide });
    const r = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.42), mat);
    r.position.set(-0.36 + i * 0.36, 1.35, 0.41);
    const back = r.clone(); back.position.z = -0.41;
    group.add(r, back);
    return mat;
  });
  const halo = glow(0xc84cff, 2.6); halo.position.set(0, 1.35, 0);
  group.add(body, halo);
  const hues = [0xff4a3a, 0xffd23a, 0x3a8cff, 0xc84cff, 0x4cff7a];
  let t = 0, spinLeft = 0;
  return {
    group,
    spin() { spinLeft = 1.4; },
    update(dt) {
      t += dt;
      if (spinLeft > 0) {
        spinLeft -= dt;
        reels.forEach((m, i) => m.color.setHex(hues[Math.floor(t * (14 + i * 4) + i) % hues.length]));
        halo.material.color.setHex(hues[Math.floor(t * 10) % hues.length]);
        halo.material.opacity = 1;
      } else {
        reels.forEach((m) => m.color.setHex(0xc84cff));
        halo.material.color.setHex(0xc84cff);
        halo.material.opacity = 0.65 + 0.35 * Math.sin(t * 2);
      }
    },
    dispose() { disposeGroup(group); }
  };
}

// Unlockable energy wall filling the box [min, max]; open() fades it out.
// Change Perma-Perk machine: teal cabinet with a star-shaped halo that slowly pulses.
export function createPerkMachine(at) {
  const group = new THREE.Group();
  group.position.set(at[0], at[1], at[2]);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.9, 0.8), new THREE.MeshStandardMaterial({ color: 0x14323a, roughness: 0.5, metalness: 0.6 }));
  body.position.y = 0.95;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ color: 0x2fe6d8, fog: false, side: THREE.DoubleSide }));
  screen.position.set(0, 1.25, 0.41);
  const back = screen.clone(); back.position.z = -0.41;
  const halo = glow(0x2fe6d8, 2.6); halo.position.set(0, 1.25, 0);
  group.add(body, screen, back, halo);
  let t = 0;
  return {
    group,
    update(dt) { t += dt; halo.material.opacity = 0.6 + 0.4 * Math.sin(t * 2.2); screen.rotation.z = Math.sin(t) * 0.05; },
    dispose() { disposeGroup(group); }
  };
}

export function createBarrier(min, max) {
  const group = new THREE.Group();
  group.position.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const wall = new THREE.Mesh(new THREE.BoxGeometry(...size), add(0xff6a3a));
  wall.material.opacity = 0.28;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(wall.geometry), new THREE.LineBasicMaterial({ color: 0xffb070, transparent: true, fog: false }));
  group.add(wall, edges);
  let t = 0, fade = 1, opening = false;
  return {
    group,
    get isOpen() { return opening; },
    open() { opening = true; },
    update(dt) {
      if (!group.visible) return;
      t += dt;
      if (opening) { fade = Math.max(0, fade - dt / 0.9); if (fade === 0) { group.visible = false; return; } }
      wall.material.opacity = (0.22 + 0.1 * Math.sin(t * 2.4)) * fade;
      edges.material.opacity = (0.7 + 0.3 * Math.sin(t * 3.1)) * fade;
    },
    dispose() { disposeGroup(group); }
  };
}

// Behgernog: a green shield machine (a 1-HP extra health buffer). at: [x, floorY, z]
export function createBehgernogMachine(at) {
  const group = new THREE.Group();
  group.position.set(at[0], at[1], at[2]);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.7, 0.9), new THREE.MeshStandardMaterial({ color: 0x10301c, roughness: 0.5, metalness: 0.6 }));
  body.position.y = 0.85;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#06210f'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#6dff9c'; g.lineWidth = 8; g.fillStyle = 'rgba(80,255,140,0.35)';
  g.beginPath(); g.moveTo(64, 14); g.lineTo(108, 30); g.lineTo(104, 74); g.quadraticCurveTo(100, 108, 64, 120); g.quadraticCurveTo(28, 108, 24, 74); g.lineTo(20, 30); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#c9ffd9'; g.fillRect(56, 44, 16, 44); g.fillRect(42, 58, 44, 16); // a plus: health
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), new THREE.MeshBasicMaterial({ map: tex, fog: false, side: THREE.DoubleSide }));
  screen.position.set(0, 1.0, 0.46);
  const back = screen.clone(); back.position.z = -0.46; back.rotation.y = Math.PI;
  const halo = glow(0x4dff88, 2.8); halo.position.set(0, 1.0, 0);
  const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), new THREE.MeshBasicMaterial({ color: 0x8dffb4, fog: false }));
  orb.position.y = 2.1;
  group.add(body, screen, back, halo, orb);
  let t = 0;
  return {
    group,
    update(dt) { t += dt; halo.material.opacity = 0.55 + 0.35 * Math.sin(t * 2); orb.rotation.y += dt * 1.6; orb.position.y = 2.1 + Math.sin(t * 2.4) * 0.08; },
    dispose() { disposeGroup(group); }
  };
}
