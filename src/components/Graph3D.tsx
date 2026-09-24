import { useMemo, useRef, useLayoutEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Line, Text, Billboard, OrbitControls, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import type { Capa, Grafo, Nodo } from '../features/graph/types';
import { useGraphImpact } from '../features/graph/hooks/useGraphImpact';

const CAPA_X: Record<Capa, number> = { proveedor: -11, insumo: 0, producto: 11 };
const CAPA_COLOR: Record<Capa, string> = {
  producto: '#4f9cf9',
  insumo: '#f2b84b',
  proveedor: '#6bd18b',
};
const AFECTADO = '#ff4d4d';
const APAGADO = '#39414b';

const SILUETA_VALLE = new THREE.Shape([
  new THREE.Vector2(-32, -13),
  new THREE.Vector2(-28, -7),
  new THREE.Vector2(-23, -9),
  new THREE.Vector2(-17, -3),
  new THREE.Vector2(-11, -8),
  new THREE.Vector2(-4, -1),
  new THREE.Vector2(2, -7),
  new THREE.Vector2(8, -2),
  new THREE.Vector2(14, -8),
  new THREE.Vector2(20, -4),
  new THREE.Vector2(27, -8),
  new THREE.Vector2(32, -5),
  new THREE.Vector2(32, -16),
  new THREE.Vector2(-32, -16),
]);

const EDIFICIOS = [
  [-18, 3.5], [-15, 2.3], [-12, 4.8], [-8, 2.8], [-5, 5.7],
  [-1, 3.1], [3, 6.5], [7, 3.8], [11, 5.2], [15, 2.7], [19, 4.2],
] as const;

function MedellinBackdrop() {
  return (
    <group position={[0, 0, -12]}>
      <mesh position={[0, 0, -1]}>
        <planeGeometry args={[70, 40]} />
        <meshBasicMaterial color="#07151f" />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <shapeGeometry args={[SILUETA_VALLE]} />
        <meshBasicMaterial color="#102b35" />
      </mesh>
      {EDIFICIOS.map(([x, altura]) => (
        <mesh key={x} position={[x, -9 + altura / 2, 0.4]}>
          <boxGeometry args={[2.2, altura, 1]} />
          <meshBasicMaterial color="#183b43" />
        </mesh>
      ))}
      <mesh position={[0, -12.2, 0.8]}>
        <planeGeometry args={[70, 0.16]} />
        <meshBasicMaterial color="#d89b4a" />
      </mesh>
    </group>
  );
}

function calcularLayout(nodos: Nodo[]) {
  const pos = new Map<string, THREE.Vector3>();
  (Object.keys(CAPA_X) as Capa[]).forEach((capa) => {
    const grupo = nodos.filter((n) => n.capa === capa);
    grupo.forEach((n, i) => {
      const y = (i - (grupo.length - 1) / 2) * 2.5;
      const z = Math.sin(i * 1.7) * 1.4; // pequeña profundidad para dar sensación 3D
      pos.set(n.id, new THREE.Vector3(CAPA_X[capa], y, z));
    });
  });
  return pos;
}

function Flecha({ from, to, color }: { from: THREE.Vector3; to: THREE.Vector3; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => new THREE.Vector3().lerpVectors(from, to, 0.85), [from, to]);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const dir = new THREE.Vector3().subVectors(to, from).normalize();
    ref.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  }, [from, to]);
  return (
    <mesh ref={ref} position={pos}>
      <coneGeometry args={[0.16, 0.45, 8]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function Nodo3D({
  nodo, posicion, color, activo, onSelect,
}: {
  nodo: Nodo; posicion: THREE.Vector3; color: string; activo: boolean;
  onSelect: (id: string | null) => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <group position={posicion}>
      <Sphere
        args={[hover ? 0.75 : 0.6, 24, 24]}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = 'auto'; }}
        onClick={(e) => { e.stopPropagation(); onSelect(nodo.id); }}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hover || activo ? 0.7 : 0.15}
        />
      </Sphere>
      <Billboard position={[0, 1.15, 0]}>
        <Text
          fontSize={0.42}
          color="#e8eaed"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000"
        >
          {nodo.nombre}
        </Text>
      </Billboard>
    </group>
  );
}

export default function Graph3D({
  grafo, seleccionado, onSelect,
}: {
  grafo: Grafo; seleccionado: string | null; onSelect: (id: string | null) => void;
}) {
  const layout = useMemo(() => calcularLayout(grafo.nodos), [grafo.nodos]);
  const afectados = useGraphImpact(grafo, seleccionado);

  return (
    <Canvas camera={{ position: [0, 0, 44], fov: 50 }} onPointerMissed={() => onSelect(null)}>
      <color attach="background" args={['#07151f']} />
      <fog attach="fog" args={['#07151f', 38, 65]} />
      <MedellinBackdrop />
      <ambientLight intensity={0.7} />
      <directionalLight position={[12, 20, 15]} intensity={1.2} />
      <OrbitControls enableDamping makeDefault />

      {grafo.aristas.map((ar) => {
        const a = layout.get(ar.origen)!;
        const b = layout.get(ar.destino)!;
        let color = '#4a5560';
        if (afectados) {
          color = afectados.has(ar.origen) && afectados.has(ar.destino) ? AFECTADO : APAGADO;
        }
        return (
          <group key={ar.id}>
            <Line points={[a, b]} color={color} lineWidth={1.2} />
            <Flecha from={a} to={b} color={color} />
          </group>
        );
      })}

      {grafo.nodos.map((n) => {
        const activo = seleccionado === n.id;
        let color = CAPA_COLOR[n.capa];
        if (afectados) color = afectados.has(n.id) ? AFECTADO : APAGADO;
        if (activo) color = '#ffffff';
        return (
          <Nodo3D
            key={n.id}
            nodo={n}
            posicion={layout.get(n.id)!}
            color={color}
            activo={activo}
            onSelect={onSelect}
          />
        );
      })}
    </Canvas>
  );
}
