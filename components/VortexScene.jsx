'use client';
import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

/* ── Black hole vortex particles ─────────────────────────────────── */
function VortexParticles({ mouse }) {
  const ref = useRef();
  const count = 6000;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle  = Math.random() * Math.PI * 2;
      const radius = Math.random() * 4 + 0.2;
      const spiral = (i / count) * Math.PI * 18;
      arr[i * 3]     = Math.cos(angle + spiral) * radius;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 1.8;
      arr[i * 3 + 2] = Math.sin(angle + spiral) * radius;
    }
    return arr;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (!ref.current) return;
    ref.current.rotation.y = t * 0.1;
    ref.current.rotation.x = Math.sin(t * 0.04) * 0.15;
    if (mouse.current) {
      ref.current.rotation.x += mouse.current.y * 0.03;
      ref.current.rotation.z += mouse.current.x * 0.015;
    }
    const pos = ref.current.geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      const ix = pos.getX(i), iz = pos.getZ(i);
      const dist = Math.sqrt(ix * ix + iz * iz);
      if (dist < 0.05) {
        const a = Math.random() * Math.PI * 2;
        const r = 3 + Math.random();
        pos.setXYZ(i, Math.cos(a) * r, (Math.random() - 0.5) * 1.8, Math.sin(a) * r);
      } else {
        const pull = 0.003 / (dist * 0.5);
        pos.setX(i, ix - (ix / dist) * pull);
        pos.setZ(i, iz - (iz / dist) * pull);
        pos.setY(i, pos.getY(i) * 0.999);
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial transparent color="#a855f7" size={0.022} sizeAttenuation depthWrite={false} opacity={0.9} />
    </Points>
  );
}

/* ── Ambient background dust ─────────────────────────────────────── */
function AmbientDust() {
  const ref = useRef();
  const count = 1500;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 18;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 14;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 18;
    }
    return arr;
  }, []);
  useFrame((s) => { if (ref.current) ref.current.rotation.y = s.clock.getElapsedTime() * 0.008; });
  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial transparent color="#7c3aed" size={0.01} sizeAttenuation depthWrite={false} opacity={0.4} />
    </Points>
  );
}

/* ── Camera zoom on "Enter" ─────────────────────────────────────── */
function CameraController({ zoomIn }) {
  const { camera, gl } = useThree();
  const targetZ = useRef(7);

  useEffect(() => {
    // Force black background on the renderer
    gl.setClearColor(0x000000, 0);
  }, [gl]);

  useEffect(() => {
    targetZ.current = zoomIn ? -2 : 7;
  }, [zoomIn]);

  useFrame(() => {
    camera.position.z += (targetZ.current - camera.position.z) * 0.04;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

/* ── Exported VortexScene ────────────────────────────────────────── */
export default function VortexScene({ zoomIn = false }) {
  const mouse = useRef({ x: 0, y: 0 });

  return (
    <div
      className="absolute inset-0"
      onMouseMove={(e) => {
        mouse.current = {
          x:  (e.clientX / window.innerWidth  - 0.5) * 2,
          y: -(e.clientY / window.innerHeight - 0.5) * 2,
        };
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 7], fov: 60 }}
        gl={{ antialias: false, alpha: true }}
        style={{ background: 'transparent' }}
        dpr={[1, 1.5]}
      >
        <CameraController zoomIn={zoomIn} />
        <AmbientDust />
        <VortexParticles mouse={mouse} />
      </Canvas>
    </div>
  );
}
