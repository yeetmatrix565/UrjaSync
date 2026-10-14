import * as THREE from 'three';
import { PALETTE } from './createPackScene';

export interface ParticleStream {
  mesh: THREE.InstancedMesh;
  update(delta: number, currentA: number | null, reduced: boolean, elapsed: number): void;
  dispose(): void;
}

const COUNT = 150;
const BASE_SCALE = 1;

function mod1(x: number): number {
  return ((x % 1) + 1) % 1;
}

/** Cable loop that wraps around the pack; `scale` widens it for larger packs. */
export function createCableCurve(scale = BASE_SCALE): THREE.CatmullRomCurve3 {
  const s = Math.max(scale, 0.6);
  const points: Array<[number, number, number]> = [
    [-1.55, -1.5, 0.85],
    [-2.0, -0.3, 0.6],
    [-1.6, 0.9, 0.85],
    [-0.7, 1.7, 0.5],
    [0.7, 1.7, 0.5],
    [1.6, 0.9, 0.85],
    [2.0, -0.3, 0.6],
    [1.55, -1.5, 0.85],
  ];

  return new THREE.CatmullRomCurve3(
    points.map(([x, y, z]) => new THREE.Vector3(x * s, y, z)),
    true,
    'catmullrom',
    0.5,
  );
}

export function createCableGeometry(scale = BASE_SCALE): THREE.TubeGeometry {
  return new THREE.TubeGeometry(createCableCurve(scale), 160, 0.022, 8, true);
}

export function createParticleStream(count = COUNT, scale = BASE_SCALE): ParticleStream {
  const curve = createCableCurve(scale);
  const geometry = new THREE.SphereGeometry(0.024, 6, 6);
  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });

  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;

  const offsets = new Float32Array(count);
  // Per-particle variation, baked once so the hot loop does no allocation
  // and no per-particle random calls — only cheap sin lookups.
  const phases = new Float32Array(count);
  const baseScales = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    offsets[i] = i / count;
    phases[i] = Math.random() * Math.PI * 2;
    baseScales[i] = 0.7 + Math.random() * 0.6;
  }

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const point = new THREE.Vector3();

  const charging = new THREE.Color(PALETTE.cyan);
  const discharging = new THREE.Color(PALETTE.orange);

  let head = 0;
  // Smoothed flow speed: current steps between polls must not jerk the
  // stream, and the stream must actually stop — not creep — at 0 A.
  let smoothSpeed = 0;
  let lastDir = 0;

  const update = (
    delta: number,
    currentA: number | null,
    reduced: boolean,
    elapsed: number,
  ): void => {
    // A channel may not publish current at all - then there is simply no flow.
    const mag = currentA === null ? 0 : Math.abs(currentA);
    const hasFlow = currentA !== null && Number.isFinite(currentA) && mag > 0.02;

    const targetOpacity =
      reduced || !hasFlow ? 0 : THREE.MathUtils.clamp(mag * 0.85, 0.08, 0.95);
    material.opacity += (targetOpacity - material.opacity) * Math.min(1, delta * 4);

    if (material.opacity <= 0.01) {
      mesh.visible = false;
      // Freeze the stream while faded out so it resumes from a standstill
      // instead of visibly jumping when flow returns.
      smoothSpeed = 0;
      return;
    }
    mesh.visible = true;

    const dir = currentA === null || currentA >= 0 ? 1 : -1;
    // Ease toward the target speed; exactly 0 when there is no flow, so
    // the particles pause at 0 A instead of drifting at a base speed.
    const targetSpeed = hasFlow ? Math.min(0.4, 0.03 + mag * 0.1) : 0;
    smoothSpeed += (targetSpeed - smoothSpeed) * Math.min(1, delta * 3);
    head = mod1(head + dir * smoothSpeed * delta);

    // Colour only changes when the flow direction flips — skip 150
    // setColorAt calls per frame while the direction is steady.
    if (dir !== lastDir) {
      color.copy(dir > 0 ? discharging : charging);
      for (let i = 0; i < count; i++) mesh.setColorAt(i, color);
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      lastDir = dir;
    }

    for (let i = 0; i < count; i++) {
      const u = mod1(offsets[i]! + head);
      curve.getPointAt(u, point);
      dummy.position.copy(point);
      // Gentle shimmer from the baked per-particle phase — smoother than a
      // shared sine because neighbours no longer pulse in lockstep.
      const shimmer = 0.75 + 0.25 * Math.sin(elapsed * 2.2 + phases[i]!);
      dummy.scale.setScalar(baseScales[i]! * shimmer);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  };

  const dispose = (): void => {
    geometry.dispose();
    material.dispose();
    mesh.dispose();
  };

  return { mesh, update, dispose };
}
