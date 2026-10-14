import * as THREE from 'three';
import { voltColorRGB, voltIntensity } from '@/lib/colors';

export const CELL_X = [-0.78, 0, 0.78] as const;
export const CELL_RADIUS = 0.27;
export const CELL_HEIGHT = 2.1;
export const CORE_RADIUS = 0.15;

export const PACK = {
  width: 2.7,
  height: 2.55,
  depth: 1.5,
  wall: 0.09,
};

export const PALETTE = {
  metal: '#11151a',
  metalEdge: '#232c36',
  glass: '#0b0f13',
  bg: '#05070a',
  cyan: '#22d3ee',
  orange: '#f97316',
  green: '#30d158',
  amber: '#f5a524',
  red: '#e5484d',
} as const;

export interface VoltageVisual {
  r: number;
  g: number;
  b: number;
  intensity: number;
  emissiveIntensity: number;
}

/** Pure-number visual mapping for a cell voltage (allocation-free for useFrame). */
export function voltageVisual(v: number): VoltageVisual {
  const [r, g, b] = voltColorRGB(v);
  const intensity = voltIntensity(v);
  return { r, g, b, intensity, emissiveIntensity: 0.4 + intensity * 2.4 };
}

let cachedGlow: THREE.Texture | null = null;

/** Soft radial sprite used for cheap fake-bloom glows. */
export function getGlowTexture(): THREE.Texture {
  if (cachedGlow) return cachedGlow;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    cachedGlow = new THREE.Texture();
    return cachedGlow;
  }
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.22, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.16)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedGlow = tex;
  return tex;
}

const SOC_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SOC_FRAG = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform float uSoc;
  uniform float uPulse;
  uniform vec3 uColor;
  uniform vec3 uEmpty;
  void main() {
    float frac = clamp(uSoc, 0.0, 100.0) / 100.0;
    float soft = 0.012;
    float edge = smoothstep(frac - soft, frac + soft, vUv.x);
    vec3 col = mix(uColor * (1.0 + uPulse * 0.7), uEmpty, edge);
    float tube = 0.35 + 0.65 * sin(vUv.y * 3.14159265);
    float alpha = mix(0.95, 0.18, edge) * tube;
    gl_FragColor = vec4(col, alpha);
  }
`;

export interface SocRingHandles {
  material: THREE.ShaderMaterial;
  setSoc(soc: number, pulse: number): void;
}

/** Full torus + arc-fill shader (uniform driven, no per-frame geometry rebuild). */
export function createSocRingMaterial(): SocRingHandles {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uSoc: { value: 0 },
      uPulse: { value: 0 },
      uColor: { value: new THREE.Color(PALETTE.cyan) },
      uEmpty: { value: new THREE.Color('#0e3a44') },
    },
    vertexShader: SOC_VERT,
    fragmentShader: SOC_FRAG,
  });

  return {
    material,
    setSoc(soc: number, pulse: number) {
      material.uniforms.uSoc!.value = Number.isFinite(soc) ? soc : 0;
      material.uniforms.uPulse!.value = pulse;
    },
  };
}

export function createDustField(count: number): THREE.BufferGeometry {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 16;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 8 + 1;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geometry;
}

export function cellLabel(index: number): string {
  return `C${index + 1}`;
}
