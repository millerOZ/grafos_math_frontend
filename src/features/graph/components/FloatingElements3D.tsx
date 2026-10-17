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
        roughness={0.3}
        metalness={0.2}
      />
    </mesh>
  );
}

function ConnectingLine({ start, end }: {
  start: [number, number, number];
  end: [number, number, number];
}) {
  const points = [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end),
  ];
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial color="#C4A577" opacity={0.3} transparent />
    </line>
  );
}

export function FloatingElements3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 45 }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#C4A577" />

      {/* Floating nodes representing graph connections */}
      <FloatingShape position={[-2, 1, 0]} color="#C4A577" size={0.4} speed={0.8} />
      <FloatingShape position={[2, -1, 0]} color="#6B6B6B" size={0.35} speed={1.2} />
      <FloatingShape position={[0, 0.5, -1]} color="#E8DED2" size={0.3} speed={1} />
      <FloatingShape position={[1.5, 1.5, 0.5]} color="#A67C52" size={0.25} speed={0.9} />
      <FloatingShape position={[-1.5, -0.8, 0.3]} color="#2E2E2E" size={0.28} speed={1.1} />

      {/* Subtle connecting lines */}
      <ConnectingLine start={[-2, 1, 0]} end={[0, 0.5, -1]} />
      <ConnectingLine start={[2, -1, 0]} end={[0, 0.5, -1]} />
      <ConnectingLine start={[1.5, 1.5, 0.5]} end={[0, 0.5, -1]} />
    </Canvas>
  );
}
