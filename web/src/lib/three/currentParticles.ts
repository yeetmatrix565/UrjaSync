import * as THREE from 'three';
import { PALETTE } from './createPackScene';

export interface ParticleStream {
  mesh: THREE.InstancedMesh;
  update(delta: number, currentA: number, reduced: boolean, elapsed: number): void;
  dispose(): void;
}

const COUNT = 150;

function mod1(x: number): number {
  return ((x % 1) + 1) % 1;
}

/** Cable loop that wraps around the pack. */
export function createCableCurve(): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-1.55, -1.5, 0.85),
      new THREE.Vector3(-2.0, -0.3, 0.6),
      new THREE.Vector3(-1.6, 0.9, 0.85),
      new THREE.Vector3(-0.7, 1.7, 0.5),
      new THREE.Vector3(0.7, 1.7, 0.5),
      new THREE.Vector3(1.6, 0.9, 0.85),
      new THREE.Vector3(2.0, -0.3, 0.6),
      new THREE.Vector3(1.55, -1.5, 0.85),
    ],
    true,
    'catmullrom',
    0.5,
  );
}

export function createCableGeometry(): THREE.TubeGeometry {
  return new THREE.TubeGeometry(createCableCurve(), 160, 0.022, 8, true);
}

export function createParticleStream(count = COUNT): ParticleStream {
  const curve = createCableCurve();
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
  for (let i = 0; i < count; i++) offsets[i] = i / count;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const point = new THREE.Vector3();

  const charging = new THREE.Color(PALETTE.cyan);
  const discharging = new THREE.Color(PALETTE.orange);

  let head = 0;

  const update = (
    delta: number,
    currentA: number,
    reduced: boolean,
    elapsed: number,
  ): void => {
    const mag = Math.abs(currentA);
    const hasFlow = Number.isFinite(currentA) && mag > 0.02;

    const targetOpacity =
      reduced || !hasFlow ? 0 : THREE.MathUtils.clamp(mag * 0.85, 0.08, 0.95);
    material.opacity += (targetOpacity - material.opacity) * Math.min(1, delta * 4);

    if (material.opacity <= 0.01) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;

    const dir = currentA >= 0 ? 1 : -1;
    const speed = Math.min(0.4, 0.03 + mag * 0.1);
    head = mod1(head + dir * speed * delta);

    color.copy(dir > 0 ? discharging : charging);

    for (let i = 0; i < count; i++) {
      const u = mod1(offsets[i]! + head);
      curve.getPointAt(u, point);
      dummy.position.copy(point);
      // subtle pulse so the stream shimmers
      const shimmer = 0.7 + 0.5 * Math.sin(elapsed * 3 + u * 40);
      const size = 0.6 + 0.9 * shimmer;
      dummy.scale.setScalar(size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  const dispose = (): void => {
    geometry.dispose();
    material.dispose();
    mesh.dispose();
  };

  return { mesh, update, dispose };
}
