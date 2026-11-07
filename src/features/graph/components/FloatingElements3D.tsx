import { Canvas, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

function FloatingShape({ position, color, size = 0.5, speed = 1 }: {
  position: [number, number, number];
  color: string;
  size?: number;
  speed?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime() * speed;
    meshRef.current.position.y = position[1] + Math.sin(time) * 0.3;
    meshRef.current.rotation.x = time * 0.2;
    meshRef.current.rotation.y = time * 0.3;
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.25}
        roughness={0.3}
        metalness={0.2}
      />
    </mesh>
  );
}

function ConnectingLine({ start, end, color }: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
}) {
  const points = [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end),
  ];
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

  const line = new THREE.Line(
    lineGeometry,
    new THREE.LineBasicMaterial({ color, opacity: 0.45, transparent: true }),
  );

  return <primitive object={line} />;
}

const COLORES_BASE = ["#f2af48", "#4ab494", "#a584dc", "#3ca2e0", "#e66e6d"];

/** `colores` permite usar la escena sobre fondos oscuros (5 colores, uno por nodo). */
export function FloatingElements3D({ colores = COLORES_BASE, linea = "#272727" }: { colores?: string[]; linea?: string }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 45 }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={1.1} />
      <pointLight position={[10, 10, 10]} intensity={1.6} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ffffff" />

      {/* Floating nodes representing graph connections */}
      <FloatingShape position={[-2, 1, 0]} color={colores[0]} size={0.4} speed={0.8} />
      <FloatingShape position={[2, -1, 0]} color={colores[1]} size={0.35} speed={1.2} />
      <FloatingShape position={[0, 0.5, -1]} color={colores[2]} size={0.3} speed={1} />
      <FloatingShape position={[1.5, 1.5, 0.5]} color={colores[3]} size={0.25} speed={0.9} />
      <FloatingShape position={[-1.5, -0.8, 0.3]} color={colores[4]} size={0.28} speed={1.1} />

      {/* Subtle connecting lines */}
      <ConnectingLine start={[-2, 1, 0]} end={[0, 0.5, -1]} color={linea} />
      <ConnectingLine start={[2, -1, 0]} end={[0, 0.5, -1]} color={linea} />
      <ConnectingLine start={[1.5, 1.5, 0.5]} end={[0, 0.5, -1]} color={linea} />
    </Canvas>
  );
}
