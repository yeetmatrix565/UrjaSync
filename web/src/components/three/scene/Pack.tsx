'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type MutableRefObject,
} from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Grid, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { CellLabel } from './CellLabel';
import type { LerpValues } from '@/hooks/useTelemetryLerp';
import {
  CELL_HEIGHT,
  CELL_RADIUS,
  CORE_RADIUS,
  PALETTE,
  cellPositions,
  createDustField,
  createSocRingMaterial,
  fitRadius,
  getGlowTexture,
  packDimensions,
  socRingRadius,
  sohPosition,
  voltageVisual,
} from '@/lib/three/createPackScene';
import { createCableGeometry, createParticleStream } from '@/lib/three/currentParticles';

export interface PackProps {
  valuesRef: MutableRefObject<LerpValues>;
  cellAlerts: boolean[];
  /** How many cells the channel publishes; drives every dimension below. */
  cellCount: number;
  anyAlert: boolean;
  selectedCell: number | null;
  onSelectCell: (index: number | null) => void;
  reducedMotion: boolean;
}

/** Auto-rotate resumes this long after the user stops dragging. */
const ROTATE_RESUME_MS = 3500;

/** The cable loop was authored for a three-cell pack; scale it from that. */
const REFERENCE_PACK_WIDTH = 2.6;

const METAL = {
  color: PALETTE.metal,
  metalness: 0.85,
  roughness: 0.3,
  transparent: true,
  opacity: 0.52,
} as const;

/**
 * "The Pack": enclosure, cells, rings and cable, driven imperatively from
 * `useFrame` straight off the lerped telemetry ref - no per-frame React work.
 * Everything is sized from `cellCount`, so a 2S pack looks like a 2S pack.
 */
export function Pack({
  valuesRef,
  cellAlerts,
  cellCount,
  anyAlert,
  selectedCell,
  onSelectCell,
  reducedMotion,
}: PackProps) {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const coreRefs = useRef<(THREE.Mesh | null)[]>([]);
  const glowRefs = useRef<(THREE.Sprite | null)[]>([]);
  const sohRef = useRef<THREE.Mesh>(null);
  const sohGroupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const dustRef = useRef<THREE.Points>(null);
  const rimRef = useRef<THREE.PointLight>(null);

  const [autoRotate, setAutoRotate] = useState(!reducedMotion);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const positions = useMemo(() => cellPositions(cellCount), [cellCount]);
  const dims = useMemo(() => packDimensions(cellCount), [cellCount]);
  const ringRadius = useMemo(() => socRingRadius(cellCount), [cellCount]);
  const sohAt = useMemo(() => sohPosition(cellCount), [cellCount]);
  const cableScale = dims.width / REFERENCE_PACK_WIDTH;

  const socRing = useMemo(() => createSocRingMaterial(), []);
  const stream = useMemo(() => createParticleStream(undefined, cableScale), [cableScale]);
  const cableGeo = useMemo(() => createCableGeometry(cableScale), [cableScale]);
  const dustGeo = useMemo(() => createDustField(220), []);
  const glowTex = useMemo(() => getGlowTexture(), []);

  const tmpColor = useMemo(() => new THREE.Color(), []);
  const focusTarget = useMemo(() => new THREE.Vector3(), []);
  const defaultTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const alertColor = useMemo(() => new THREE.Color(PALETTE.red), []);
  const calmColor = useMemo(() => new THREE.Color(PALETTE.cyan), []);

  const { camera, size } = useThree();

  useEffect(() => {
    setAutoRotate(!reducedMotion);
  }, [reducedMotion]);

  // Frame the pack by whichever axis is tighter, and pull back for wide packs.
  // The phone app runs full-screen (taller than a browser viewport), so a fixed
  // distance would crop the ring.
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const vFov = (cam.fov * Math.PI) / 180;
    const aspect = size.width / Math.max(1, size.height);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const radius = fitRadius(cellCount);
    const dist = Math.max(radius / Math.tan(vFov / 2), radius / Math.tan(hFov / 2));

    cam.position.setLength(dist);
    cam.updateProjectionMatrix();

    const controls = controlsRef.current;
    if (controls) {
      controls.minDistance = dist * 0.55;
      controls.maxDistance = dist * 1.9;
      controls.update();
    }
  }, [camera, size.width, size.height, cellCount]);

  useEffect(
    () => () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    },
    [],
  );

  useEffect(
    () => () => {
      stream.dispose();
      socRing.material.dispose();
      cableGeo.dispose();
      dustGeo.dispose();
    },
    [stream, socRing, cableGeo, dustGeo],
  );

  useFrame((state, delta) => {
    const dt = Math.min(0.05, delta);
    const t = state.clock.elapsedTime;
    const v = valuesRef.current;

    for (let i = 0; i < positions.length; i++) {
      const hasAlert = cellAlerts[i] === true;
      const pulse = hasAlert ? 0.5 + 0.5 * Math.sin(t * 7) : 0;
      const visual = voltageVisual(v.cells[i] ?? null);

      const core = coreRefs.current[i];
      if (core) {
        const mat = core.material as THREE.MeshStandardMaterial;
        if (hasAlert) {
          mat.emissive.lerp(tmpColor.setRGB(1, 0.16, 0.18), 0.45);
          mat.emissiveIntensity = 0.9 + pulse * 2.4;
        } else {
          mat.emissive.lerp(tmpColor.setRGB(visual.r, visual.g, visual.b), 0.12);
          mat.emissiveIntensity +=
            (visual.emissiveIntensity - mat.emissiveIntensity) * 0.12;
        }
        core.scale.setScalar(0.92 + visual.intensity * 0.16);
      }

      const glow = glowRefs.current[i];
      if (glow) {
        const mat = glow.material as THREE.SpriteMaterial;
        if (hasAlert) {
          mat.color.setRGB(1, 0.2, 0.22);
          mat.opacity = 0.45 + pulse * 0.4;
        } else {
          mat.color.setRGB(visual.r, visual.g, visual.b);
          mat.opacity = 0.3 + visual.intensity * 0.35;
        }
        const glowSize = 2.1 + (hasAlert ? pulse * 0.6 : visual.intensity * 0.5);
        glow.scale.set(glowSize, glowSize * 2.9, 1);
      }
    }

    // Metrics the channel does not publish have no hologram to show.
    if (ringRef.current) ringRef.current.visible = v.soc !== null;
    if (sohGroupRef.current) sohGroupRef.current.visible = v.soh !== null;

    socRing.setSoc(v.soc, 0.1 + 0.08 * Math.sin(t * 1.6));

    const sohMesh = sohRef.current;
    if (sohMesh) {
      const mat = sohMesh.material as THREE.MeshStandardMaterial;
      const s =
        v.soh !== null && Number.isFinite(v.soh)
          ? THREE.MathUtils.clamp(v.soh / 100, 0, 1)
          : 0;
      mat.emissiveIntensity += (0.3 + s * 2.2 - mat.emissiveIntensity) * 0.1;
      mat.opacity += (0.22 + s * 0.66 - mat.opacity) * 0.1;
      sohMesh.rotation.y = t * 0.6;
      sohMesh.rotation.x = Math.sin(t * 0.4) * 0.2;
    }

    stream.update(dt, v.currentA, reducedMotion, t);

    if (dustRef.current && !reducedMotion) {
      dustRef.current.rotation.y = t * 0.02;
    }

    const rim = rimRef.current;
    if (rim) {
      rim.color.lerp(anyAlert ? alertColor : calmColor, 0.06);
      rim.intensity = anyAlert ? 2.6 + Math.sin(t * 5) * 0.8 : 1.9;
    }

    const controls = controlsRef.current;
    if (controls) {
      if (selectedCell !== null) {
        focusTarget.set(positions[selectedCell] ?? 0, 0.15, 0);
      } else {
        focusTarget.copy(defaultTarget);
      }
      controls.target.lerp(focusTarget, 0.06);
      controls.update();
    }
  });

  const { width: W, height: H, depth: D, wall } = dims;

  return (
    <>
      <color attach="background" args={[PALETTE.bg]} />
      <fog attach="fog" args={[PALETTE.bg, 9, 20]} />

      <ambientLight intensity={0.45} />
      <directionalLight position={[4, 6, 5]} intensity={1.0} color="#cfe9ff" />
      <pointLight ref={rimRef} position={[0, 0.5, -3.4]} intensity={1.9} distance={13} />

      <Grid
        position={[0, -1.64, 0]}
        args={[24, 24]}
        cellSize={0.6}
        cellThickness={0.5}
        cellColor="#12242c"
        sectionSize={3}
        sectionThickness={0.9}
        sectionColor="#1d5a68"
        fadeDistance={18}
        fadeStrength={1.4}
        infiniteGrid
      />

      {/* Enclosure - 5-panel cutaway, front left open */}
      <group>
        <mesh position={[0, 0, -D / 2]}>
          <boxGeometry args={[W, H, wall]} />
          <meshStandardMaterial {...METAL} />
        </mesh>
        <mesh position={[0, -H / 2, 0]}>
          <boxGeometry args={[W, wall, D]} />
          <meshStandardMaterial {...METAL} />
        </mesh>
        <mesh position={[0, H / 2, 0]}>
          <boxGeometry args={[W, wall, D]} />
          <meshStandardMaterial {...METAL} />
        </mesh>
        <mesh position={[-W / 2, 0, 0]}>
          <boxGeometry args={[wall, H, D]} />
          <meshStandardMaterial {...METAL} />
        </mesh>
        <mesh position={[W / 2, 0, 0]}>
          <boxGeometry args={[wall, H, D]} />
          <meshStandardMaterial {...METAL} />
        </mesh>
      </group>

      {/* Cells - one per published cell voltage */}
      {positions.map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh
            onClick={(e) => {
              e.stopPropagation();
              onSelectCell(i);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'auto';
            }}
          >
            <cylinderGeometry
              args={[CELL_RADIUS, CELL_RADIUS, CELL_HEIGHT, 24, 1, true]}
            />
            <meshStandardMaterial
              color={PALETTE.metalEdge}
              metalness={0.92}
              roughness={0.26}
              side={THREE.DoubleSide}
              transparent
              opacity={0.42}
            />
          </mesh>

          <mesh position={[0, CELL_HEIGHT / 2, 0]}>
            <cylinderGeometry
              args={[CELL_RADIUS + 0.004, CELL_RADIUS + 0.004, 0.08, 24]}
            />
            <meshStandardMaterial
              color={PALETTE.metalEdge}
              metalness={0.95}
              roughness={0.35}
            />
          </mesh>
          <mesh position={[0, -CELL_HEIGHT / 2, 0]}>
            <cylinderGeometry
              args={[CELL_RADIUS + 0.004, CELL_RADIUS + 0.004, 0.08, 24]}
            />
            <meshStandardMaterial
              color={PALETTE.metalEdge}
              metalness={0.95}
              roughness={0.35}
            />
          </mesh>

          <mesh
            ref={(el) => {
              coreRefs.current[i] = el;
            }}
          >
            <cylinderGeometry args={[CORE_RADIUS, CORE_RADIUS, CELL_HEIGHT * 0.86, 16]} />
            <meshStandardMaterial
              color="#000000"
              emissive={PALETTE.green}
              emissiveIntensity={1}
              toneMapped={false}
            />
          </mesh>

          <sprite
            ref={(el) => {
              glowRefs.current[i] = el;
            }}
          >
            <spriteMaterial
              map={glowTex}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </sprite>

          <CellLabel
            index={i}
            valuesRef={valuesRef}
            position={[0, CELL_HEIGHT / 2 + 0.62, 0]}
          />
        </group>
      ))}

      {/* Cable loop + current particles */}
      <mesh geometry={cableGeo}>
        <meshStandardMaterial
          color="#0d1b22"
          emissive={PALETTE.cyan}
          emissiveIntensity={0.22}
          metalness={0.6}
          roughness={0.42}
        />
      </mesh>
      <primitive object={stream.mesh} />

      {/* SOC hologram ring */}
      <mesh
        ref={ringRef}
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
        position={[0, -0.02, 0]}
      >
        <torusGeometry args={[ringRadius, 0.05, 16, 160]} />
        <primitive object={socRing.material} attach="material" />
      </mesh>

      {/* SOH crystal */}
      <group ref={sohGroupRef} position={sohAt}>
        <mesh ref={sohRef}>
          <octahedronGeometry args={[0.32, 0]} />
          <meshStandardMaterial
            color="#08202a"
            emissive={PALETTE.cyan}
            emissiveIntensity={1}
            metalness={0.25}
            roughness={0.12}
            transparent
            opacity={0.7}
            toneMapped={false}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.48, 0.01, 8, 64]} />
          <meshBasicMaterial
            color={PALETTE.cyan}
            transparent
            opacity={0.32}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Ambient dust */}
      <points ref={dustRef} geometry={dustGeo}>
        <pointsMaterial
          map={glowTex}
          size={0.07}
          sizeAttenuation
          transparent
          opacity={0.32}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color={PALETTE.cyan}
          toneMapped={false}
        />
      </points>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        autoRotate={!reducedMotion && autoRotate}
        autoRotateSpeed={0.65}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={4.4}
        maxDistance={14}
        minPolarAngle={0.75}
        maxPolarAngle={2.25}
        onStart={() => {
          if (resumeTimer.current) clearTimeout(resumeTimer.current);
          setAutoRotate(false);
        }}
        onEnd={() => {
          if (reducedMotion) return;
          resumeTimer.current = setTimeout(() => setAutoRotate(true), ROTATE_RESUME_MS);
        }}
      />
    </>
  );
}
