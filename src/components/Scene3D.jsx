import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

function RotatingSolid() {
  const meshRef = useRef(null)

  useFrame((_, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += delta * 0.45
    meshRef.current.rotation.x += delta * 0.18
  })

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.35, 0]} />
      <meshStandardMaterial color="#aa3bff" roughness={0.3} metalness={0.25} />
    </mesh>
  )
}

export default function Scene3D() {
  return (
    <div className="scene-wrap">
      <Canvas camera={{ position: [3, 2.2, 4], fov: 50 }}>
        <color attach="background" args={['#1f2028']} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 5, 3]} intensity={1.25} />
        <RotatingSolid />
        <OrbitControls enableDamping makeDefault />
      </Canvas>
    </div>
  )
}
