import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line, Text, Billboard, OrbitControls, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import type { Line2 } from 'three-stdlib';
import type { Capa, Grafo, Nodo } from '../features/graph/types';
import { useGraphImpactLevels } from '../features/graph/hooks/useGraphImpactLevels';

/**
 * Acercar / alejar el grafo (cámbialo aquí):
 * - `posicion[2]`: menor Z = cámara más cerca (prueba 24–32; por debajo de ~22 recorta nodos).
 * - `minDistance` / `maxDistance`: límites del zoom con la rueda del mouse.
 * - `CAPA_X` más abajo: valores más chicos juntan las tres columnas.
 */
const CAMARA = {
  posicion: [0, 0, 30] as [number, number, number],
  fov: 48,
  minDistance: 8,
  maxDistance: 48,
  zoomSpeed: 0.85,
};

const CAPA_X: Record<Capa, number> = { proveedor: -11, insumo: 0, producto: 11 };
const CAPA_COLOR: Record<Capa, string> = {
  producto: '#4f9cf9',
  insumo: '#f2b84b',
  proveedor: '#6bd18b',
};
const APAGADO = '#39414b';
const RADIO_NODO = 0.6;

/**
 * "Mancha de café": tema visual de la onda de contagio.
 * En vez de pintar el nodo afectado de rojo al instante, se expande sobre él
 * una mancha, con un retraso por nivel de propagación que crea el efecto de
 * derrame avanzando por etapas. Las aristas contagiadas se pintan en rojo.
 */
const MANCHA_NODO = '#a85a2a';
const MANCHA_HALO = '#e0924c';
const MANCHA_ARISTA = '#ff4d4d';
const RETRASO_NIVEL = 0.42; // segundos entre cada nivel de la onda
const DURACION_MANCHA = 0.85; // segundos que tarda en expandirse del todo

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

/** Mancha oscura que se expande sobre un nodo contagiado, con retraso según
 * su nivel en la onda de propagación (0 = el nodo seleccionado, el "derrame" original). */
function ManchaCafe({ nivel }: { nivel: number }) {
  const nucleoRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const t0Ref = useRef<number | null>(null);
  const jitter = useMemo(
    () => [0.8 + Math.random() * 0.4, 0.75 + Math.random() * 0.3, 0.8 + Math.random() * 0.4] as [number, number, number],
    [],
  );

  useFrame((state) => {
    if (t0Ref.current === null) t0Ref.current = state.clock.elapsedTime;
    const transcurrido = state.clock.elapsedTime - t0Ref.current - nivel * RETRASO_NIVEL;
    const activo = transcurrido > 0;
    const progreso = THREE.MathUtils.clamp(transcurrido / DURACION_MANCHA, 0, 1);
    const easeOut = 1 - (1 - progreso) ** 3;

    if (nucleoRef.current) {
      nucleoRef.current.visible = activo;
      const escala = RADIO_NODO * (0.25 + easeOut * 0.95);
      nucleoRef.current.scale.set(escala * jitter[0], escala * jitter[1], escala * jitter[2]);
      (nucleoRef.current.material as THREE.MeshStandardMaterial).opacity = 0.92 * easeOut;
    }
    if (haloRef.current) {
      haloRef.current.visible = activo;
      const escalaHalo = RADIO_NODO * (0.4 + easeOut * 1.35);
      haloRef.current.scale.set(escalaHalo * jitter[0] * 1.1, escalaHalo * jitter[1] * 1.05, escalaHalo * jitter[2] * 1.1);
      (haloRef.current.material as THREE.MeshStandardMaterial).opacity = 0.32 * easeOut * (1 - progreso * 0.4);
    }
  });

  return (
    <>
      <mesh ref={haloRef} visible={false}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color={MANCHA_HALO}
          emissive={MANCHA_HALO}
          emissiveIntensity={0.6}
          transparent
          opacity={0}
          roughness={1}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={nucleoRef} visible={false}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshStandardMaterial
          color={MANCHA_NODO}
          emissive={MANCHA_NODO}
          emissiveIntensity={0.75}
          transparent
          opacity={0}
          roughness={1}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

/** Arista + flecha que se tiñen con el color de la mancha a medida que la onda
 * de contagio las alcanza (nivel = etapa de propagación; undefined = sin contagio). */
function AristaAnimada({
  a, b, nivel, colorNormal,
}: {
  a: THREE.Vector3; b: THREE.Vector3; nivel: number | undefined; colorNormal: string;
}) {
  const lineRef = useRef<Line2>(null);
  const conoRef = useRef<THREE.Mesh>(null);
  const t0Ref = useRef<number | null>(null);
  const colorBase = useMemo(() => new THREE.Color(colorNormal), [colorNormal]);
  const colorMancha = useMemo(() => new THREE.Color(MANCHA_ARISTA), []);
  const pos = useMemo(() => new THREE.Vector3().lerpVectors(a, b, 0.85), [a, b]);
  const quat = useMemo(() => {
    const q = new THREE.Quaternion();
    const dir = new THREE.Vector3().subVectors(b, a).normalize();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return q;
  }, [a, b]);

  useFrame((state) => {
    let progreso = 0;
    if (nivel !== undefined) {
      if (t0Ref.current === null) t0Ref.current = state.clock.elapsedTime;
      const transcurrido = state.clock.elapsedTime - t0Ref.current - nivel * RETRASO_NIVEL;
      progreso = THREE.MathUtils.clamp(transcurrido / DURACION_MANCHA, 0, 1);
    } else {
      t0Ref.current = null;
    }
    const color = colorBase.clone().lerp(colorMancha, progreso);
    if (lineRef.current?.material) lineRef.current.material.color.copy(color);
    if (conoRef.current) (conoRef.current.material as THREE.MeshStandardMaterial).color.copy(color);
  });

  return (
    <group>
      <Line ref={lineRef} points={[a, b]} color={colorNormal} lineWidth={1.2} />
      <mesh ref={conoRef} position={pos} quaternion={quat}>
        <coneGeometry args={[0.16, 0.45, 8]} />
        <meshStandardMaterial color={colorNormal} />
      </mesh>
    </group>
  );
}

function Nodo3D({
  nodo, posicion, color, activo, nivel, onSelect,
}: {
  nodo: Nodo; posicion: THREE.Vector3; color: string; activo: boolean; nivel?: number;
  onSelect: (id: string | null) => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <group position={posicion}>
      <Sphere
        args={[hover ? 0.75 : RADIO_NODO, 24, 24]}
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
      {nivel !== undefined && <ManchaCafe nivel={nivel} />}
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
  const niveles = useGraphImpactLevels(grafo, seleccionado);
  const afectados = useMemo(
    () => (niveles ? new Set(niveles.keys()) : null),
    [niveles],
  );

  return (
    <Canvas camera={{ position: CAMARA.posicion, fov: CAMARA.fov }} onPointerMissed={() => onSelect(null)}>
      <color attach="background" args={['#07151f']} />
      <fog attach="fog" args={['#07151f', 28, 55]} />
      <MedellinBackdrop />
      <ambientLight intensity={0.7} />
      <directionalLight position={[12, 20, 15]} intensity={1.2} />
      <OrbitControls
        makeDefault
        enableDamping
        enableZoom
        zoomSpeed={CAMARA.zoomSpeed}
        minDistance={CAMARA.minDistance}
        maxDistance={CAMARA.maxDistance}
      />

      {grafo.aristas.map((ar) => {
        const a = layout.get(ar.origen)!;
        const b = layout.get(ar.destino)!;
        const colorNormal = afectados ? APAGADO : '#4a5560';
        let nivelArista: number | undefined;
        if (niveles && afectados?.has(ar.origen) && afectados?.has(ar.destino)) {
          nivelArista = Math.max(niveles.get(ar.origen) ?? 0, niveles.get(ar.destino) ?? 0);
        }
        return (
          <AristaAnimada
            key={`${ar.id}-${seleccionado ?? 'none'}`}
            a={a}
            b={b}
            nivel={nivelArista}
            colorNormal={colorNormal}
          />
        );
      })}

      {grafo.nodos.map((n) => {
        const activo = seleccionado === n.id;
        let color = CAPA_COLOR[n.capa];
        if (afectados && !afectados.has(n.id)) color = APAGADO;
        if (activo) color = '#ffffff';
        return (
          <Nodo3D
            key={`${n.id}-${seleccionado ?? 'none'}`}
            nodo={n}
            posicion={layout.get(n.id)!}
            color={color}
            activo={activo}
            nivel={niveles?.get(n.id)}
            onSelect={onSelect}
          />
        );
      })}
    </Canvas>
  );
}
