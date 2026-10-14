import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { voltIntensity } from '@/lib/colors';

export const CELL_RADIUS = 0.27;
export const CELL_HEIGHT = 2.1;
export const CORE_RADIUS = 0.15;

/** Centre-to-centre gap between adjacent cells. */
const CELL_SPACING = CELL_RADIUS * 2 + 0.24;

const MIN_PACK_WIDTH = 1.7;

export const PACK = {
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

/**
 * Shared PBR tuning for the hero scene. Kept as plain data (not live
 * materials) so the JSX in `scene/Pack` stays the single owner of the
 * THREE.Material instances — and can share one instance across panels.
 *
 * metalness ~0.9 + low roughness + the procedural environment map below is
 * what makes the enclosure read as brushed metal instead of flat plastic.
 * envMapIntensity is deliberately < 1 on the enclosure: full-strength env
 * reflections wash the cells out on small phone screens.
 */
export const PBR = {
  enclosure: {
    color: '#181e26',
    metalness: 0.88,
    roughness: 0.38,
    transparent: true,
    opacity: 0.55,
    envMapIntensity: 0.85,
  },
  /** Open-ended cell shell — see-through so the glowing core shows. */
  cellShell: {
    color: '#2a3644',
    metalness: 0.95,
    roughness: 0.22,
    transparent: true,
    opacity: 0.38,
    envMapIntensity: 1.15,
  },
  cellCap: {
    color: '#2a3644',
    metalness: 1.0,
    roughness: 0.28,
    envMapIntensity: 1.1,
  },
  cable: {
    color: '#0d1b22',
    emissive: PALETTE.cyan,
    emissiveIntensity: 0.22,
    metalness: 0.6,
    roughness: 0.42,
    envMapIntensity: 0.7,
  },
} as const;

/** X offsets for `count` cells, centred on the origin. */
export function cellPositions(count: number): number[] {
  if (count <= 0) return [];
  const span = (count - 1) * CELL_SPACING;
  return Array.from({ length: count }, (_, i) => -span / 2 + i * CELL_SPACING);
}

/** Enclosure sized to however many cells the channel publishes. */
export function packDimensions(count: number): {
  width: number;
  height: number;
  depth: number;
  wall: number;
} {
  const n = Math.max(count, 1);
  const width = Math.max(MIN_PACK_WIDTH, (n - 1) * CELL_SPACING + CELL_RADIUS * 2 + 0.5);
  return { width, height: PACK.height, depth: PACK.depth, wall: PACK.wall };
}

export function socRingRadius(count: number): number {
  return Math.max(2.0, packDimensions(count).width / 2 + 0.6);
}

/** World radius the camera must keep in frame (ring, SOH crystal, labels). */
export function fitRadius(count: number): number {
  const sohReach = packDimensions(count).width / 2 + 0.9;
  return Math.max(socRingRadius(count), sohReach) + 0.35;
}

/** Where the SOH crystal sits relative to the pack. */
export function sohPosition(count: number): [number, number, number] {
  return [packDimensions(count).width / 2 + 0.55, 0.95, 0.12];
}

export interface VoltageVisual {
  r: number;
  g: number;
  b: number;
  intensity: number;
  emissiveIntensity: number;
}

/**
 * Cell-voltage -> glow colour for the 3D hero only. Stops (driven by the
 * *actual* published voltage, never invented): <= 3.3 V critical red,
 * 3.6 V warn amber, >= 4.0 V healthy cyan. The 2D panels keep their own
 * red -> amber -> green mapping in `lib/colors`; this one is cyan at the
 * healthy end so the hero reads as one coherent cyan hologram.
 */
const GLOW_STOPS: Array<{ v: number; rgb: [number, number, number] }> = [
  { v: 3.3, rgb: [229, 72, 77] },
  { v: 3.6, rgb: [245, 165, 36] },
  { v: 4.0, rgb: [34, 211, 238] },
];

function glowColorRGB(v: number): [number, number, number] {
  if (!Number.isFinite(v)) return [229 / 255, 72 / 255, 77 / 255];
  const first = GLOW_STOPS[0]!;
  const last = GLOW_STOPS[GLOW_STOPS.length - 1]!;
  if (v <= first.v) return [first.rgb[0] / 255, first.rgb[1] / 255, first.rgb[2] / 255];
  if (v >= last.v) return [last.rgb[0] / 255, last.rgb[1] / 255, last.rgb[2] / 255];
  for (let i = 0; i < GLOW_STOPS.length - 1; i++) {
    const a = GLOW_STOPS[i]!;
    const b = GLOW_STOPS[i + 1]!;
    if (v >= a.v && v <= b.v) {
      const t = (v - a.v) / (b.v - a.v);
      return [
        (a.rgb[0] + (b.rgb[0] - a.rgb[0]) * t) / 255,
        (a.rgb[1] + (b.rgb[1] - a.rgb[1]) * t) / 255,
        (a.rgb[2] + (b.rgb[2] - a.rgb[2]) * t) / 255,
      ];
    }
  }
  return [last.rgb[0] / 255, last.rgb[1] / 255, last.rgb[2] / 255];
}

/** Pure-number visual mapping for a cell voltage (allocation-free for useFrame). */
export function voltageVisual(v: number | null): VoltageVisual {
  const value = v ?? NaN;
  const [r, g, b] = glowColorRGB(value);
  const intensity = voltIntensity(value);
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

export interface ProceduralEnvironment {
  texture: THREE.Texture;
  dispose(): void;
}

/**
 * Studio reflections without any network fetch: a procedural RoomEnvironment
 * baked once through PMREM. No external HDR URL is ever requested at runtime
 * (drei's `Environment` preset would fetch one from a CDN). The caller owns
 * the result — assign it to `scene.environment` and call `dispose()` on
 * unmount. `scene.environmentIntensity` (r163+) keeps the reflections subtle
 * so the emissive hologram colours stay dominant.
 */
export function createProceduralEnvironment(
  renderer: THREE.WebGLRenderer,
): ProceduralEnvironment {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const texture = pmrem.fromScene(room, 0.04).texture;
  return {
    texture,
    dispose() {
      texture.dispose();
      pmrem.dispose();
    },
  };
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
  uniform vec3 uEmpty;
  // Smooth SOC gradient along the ring: 0% critical red -> 50% warn amber
  // -> 100% healthy cyan, so the ring itself reads as a charge gauge.
  vec3 socGradient(float t) {
    vec3 red = vec3(0.898, 0.282, 0.302);
    vec3 amber = vec3(0.961, 0.647, 0.141);
    vec3 cyan = vec3(0.133, 0.827, 0.933);
    vec3 low = mix(red, amber, smoothstep(0.0, 0.5, t));
    return mix(low, cyan, smoothstep(0.5, 1.0, t));
  }
  void main() {
    float frac = clamp(uSoc, 0.0, 100.0) / 100.0;
    float soft = 0.012;
    float edge = smoothstep(frac - soft, frac + soft, vUv.x);
    vec3 filled = socGradient(clamp(vUv.x, 0.0, 1.0)) * (1.0 + uPulse * 0.7);
    // Hot leading edge where the fill currently ends — sells the "live" feel.
    float head = exp(-pow((vUv.x - frac) * 28.0, 2.0));
    vec3 col = mix(filled, uEmpty, edge) + filled * head * 0.9;
    float tube = 0.35 + 0.65 * sin(vUv.y * 3.14159265);
    float alpha = mix(0.95, 0.18, edge) * tube + head * 0.35 * tube;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`;

export interface SocRingHandles {
  material: THREE.ShaderMaterial;
  setSoc(soc: number | null, pulse: number): void;
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
      uEmpty: { value: new THREE.Color('#0e3a44') },
    },
    vertexShader: SOC_VERT,
    fragmentShader: SOC_FRAG,
  });

  return {
    material,
    setSoc(soc: number | null, pulse: number) {
      material.uniforms.uSoc!.value = soc !== null && Number.isFinite(soc) ? soc : 0;
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
