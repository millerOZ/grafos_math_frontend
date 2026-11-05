import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, Text, OrbitControls, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import type { Line2 } from 'three-stdlib';
import type { Capa, Grafo, Nodo } from '../features/graph/types';

/**
 * Mapa de la red de abastecimiento, de izquierda a derecha:
 *   Proveedores → Insumos → Procesos (por paso) → Productos
 *
 * Es una escena plana a propósito: sin rotación, solo arrastrar y acercar,
 * para que alguien que no conoce de grafos la lea como un diagrama.
 * Las flechas siguen el camino del abastecimiento (de quien entrega a quien
 * lo usa). En el modelo la arista es "A REQUIERE B", así que se dibujan de B a A.
 */

const CAMARA = { fov: 40, minDistance: 10, maxDistance: 140, zoomSpeed: 0.85 };
const SEPARACION_COLUMNAS = 5.6;
const SEPARACION_FILAS = 3.1;

/** Paleta clara, la misma del home: fondo color harina y texto espresso. */
const TEMA = {
  fondo: '#f7f3ec',
  texto: '#2a1c14',
  textoApagado: '#b8ad9e',
  titulos: '#8a7464',
  arista: '#d6ccbe',
  aristaApagada: '#ebe4d9',
  nodoApagado: '#e4ddd1',
  seleccionado: '#2a1c14',
};
const CAPA_COLOR: Record<Capa, string> = {
  producto: '#3478f6',
  proceso: '#8a5cd6',
  insumo: '#e3a52f',
  proveedor: '#36a269',
};
const TITULO_CAPA: Record<Capa, string> = {
  proveedor: 'Proveedores',
  insumo: 'Insumos',
  proceso: 'Procesos',
  producto: 'Productos',
};
const RADIO_NODO = 0.62;

/**
 * "Mancha de café": la falla se derrama por la red, nivel por nivel.
 * Las aristas por las que pasa se tiñen de ladrillo.
 */
const MANCHA_NODO = '#7a4a2e';
const MANCHA_HALO = '#c9925e';
const MANCHA_ARISTA = '#c45c4a';
const RETRASO_NIVEL = 0.42; // segundos entre cada nivel de la onda
const DURACION_MANCHA = 0.85; // segundos que tarda en expandirse del todo

interface Layout {
  pos: Map<string, THREE.Vector3>;
  columnas: { titulo: string; x: number }[];
  ancho: number;
  alto: number;
  techo: number;
}

/**
 * Paso de cada proceso: 0 si no requiere otro proceso; si no, 1 + el paso más
 * alto de los procesos que requiere. Los ciclos se cortan para no recorrer infinito.
 */
function pasosDeProcesos(grafo: Grafo): Map<string, number> {
  const capa = new Map(grafo.nodos.map((n) => [n.id, n.capa]));
  const requiere = new Map<string, string[]>();
  for (const a of grafo.aristas) {
    if (capa.get(a.origen) === 'proceso' && capa.get(a.destino) === 'proceso' && a.origen !== a.destino) {
      requiere.set(a.origen, [...(requiere.get(a.origen) ?? []), a.destino]);
    }
  }
  const paso = new Map<string, number>();
  const visitando = new Set<string>();
  const calcular = (id: string): number => {
    if (paso.has(id)) return paso.get(id)!;
    if (visitando.has(id)) return 0; // arista que cierra un ciclo
    visitando.add(id);
    const previos = (requiere.get(id) ?? []).map(calcular);
    visitando.delete(id);
    const valor = previos.length ? Math.max(...previos) + 1 : 0;
    paso.set(id, valor);
    return valor;
  };
  grafo.nodos.filter((n) => n.capa === 'proceso').forEach((n) => calcular(n.id));
  return paso;
}

function calcularLayout(grafo: Grafo): Layout {
  const pasos = pasosDeProcesos(grafo);
  const totalPasos = pasos.size ? Math.max(...pasos.values()) + 1 : 0;

  // Columna lógica de cada nodo.
  const columnaDe = (n: Nodo) => {
    if (n.capa === 'proveedor') return 0;
    if (n.capa === 'insumo') return 1;
    if (n.capa === 'proceso') return 2 + (pasos.get(n.id) ?? 0);
    return 2 + totalPasos;
  };
  const totalColumnas = 3 + totalPasos;
  const xDe = (col: number) => (col - (totalColumnas - 1) / 2) * SEPARACION_COLUMNAS;

  const grupos = new Map<number, Nodo[]>();
  grafo.nodos.forEach((n) => {
    const col = columnaDe(n);
    grupos.set(col, [...(grupos.get(col) ?? []), n]);
  });

  const pos = new Map<string, THREE.Vector3>();
  const maxFilas = Math.max(1, ...[...grupos.values()].map((g) => g.length));
  const piso = -((maxFilas - 1) / 2) * SEPARACION_FILAS;
  grupos.forEach((nodos, col) => {
    const esProceso = nodos[0].capa === 'proceso';
    nodos.forEach((n, i) => {
      // Los procesos se apoyan abajo: así las flechas largas insumo → producto
      // pasan por encima de la cadena de preparación en vez de cruzarla.
      const y = esProceso
        ? piso + (nodos.length - 1 - i) * SEPARACION_FILAS
        : ((nodos.length - 1) / 2 - i) * SEPARACION_FILAS;
      pos.set(n.id, new THREE.Vector3(xDe(col), y, 0));
    });
  });

  const techo = ((maxFilas - 1) / 2) * SEPARACION_FILAS + 2.6;
  const columnas = [
    { titulo: TITULO_CAPA.proveedor, x: xDe(0) },
    { titulo: TITULO_CAPA.insumo, x: xDe(1) },
    ...(totalPasos ? [{ titulo: TITULO_CAPA.proceso, x: (xDe(2) + xDe(1 + totalPasos)) / 2 }] : []),
    { titulo: TITULO_CAPA.producto, x: xDe(2 + totalPasos) },
  ];

  return {
    pos,
    columnas,
    ancho: (totalColumnas - 1) * SEPARACION_COLUMNAS + 6.5,
    alto: techo * 2 + 1.5,
    techo,
  };
}

/** Aleja la cámara lo justo para que quepa todo el mapa en el espacio disponible. */
function AjustarCamara({ ancho, alto }: { ancho: number; alto: number }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;

  useEffect(() => {
    const mitad = THREE.MathUtils.degToRad(CAMARA.fov / 2);
    const aspecto = size.width / Math.max(size.height, 1);
    const z = Math.max(alto / 2 / Math.tan(mitad), ancho / 2 / (Math.tan(mitad) * aspecto));
    // Un poco hacia abajo para dejar aire al título que está arriba a la izquierda.
    camera.position.set(0, 0.4, Math.min(z * 1.02, CAMARA.maxDistance));
    controls?.target.set(0, 0.4, 0);
    controls?.update();
  }, [camera, controls, size.width, size.height, ancho, alto]);

  return null;
}

/** Variación estable (no aleatoria) por nodo, para que la mancha no sea un círculo perfecto. */
function variacion(id: string): [number, number, number] {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  const r = (k: number) => ((Math.abs(h >> k) % 100) / 100);
  return [0.8 + r(0) * 0.4, 0.75 + r(3) * 0.3, 0.8 + r(6) * 0.4];
}

/** Mancha oscura que se expande sobre un nodo contagiado, con retraso según
 * su nivel en la onda de propagación (0 = el nodo seleccionado, el "derrame" original). */
function ManchaCafe({ id, nivel }: { id: string; nivel: number }) {
  const nucleoRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const t0Ref = useRef<number | null>(null);
  const jitter = useMemo(() => variacion(id), [id]);

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
      (nucleoRef.current.material as THREE.MeshStandardMaterial).opacity = 0.9 * easeOut;
    }
    if (haloRef.current) {
      haloRef.current.visible = activo;
      const escalaHalo = RADIO_NODO * (0.4 + easeOut * 1.35);
      haloRef.current.scale.set(escalaHalo * jitter[0] * 1.1, escalaHalo * jitter[1] * 1.05, escalaHalo * jitter[2] * 1.1);
      (haloRef.current.material as THREE.MeshStandardMaterial).opacity = 0.28 * easeOut * (1 - progreso * 0.4);
    }
  });

  return (
    <>
      <mesh ref={haloRef} visible={false}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color={MANCHA_HALO} transparent opacity={0} roughness={1} depthWrite={false} />
      </mesh>
      <mesh ref={nucleoRef} visible={false}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshStandardMaterial color={MANCHA_NODO} transparent opacity={0} roughness={1} depthWrite={false} />
      </mesh>
    </>
  );
}

/** Arista con flecha hacia quien recibe; se tiñe cuando la onda de la falla la alcanza. */
function AristaAnimada({
  desde, hacia, nivel, colorNormal,
}: {
  desde: THREE.Vector3; hacia: THREE.Vector3; nivel: number | undefined; colorNormal: string;
}) {
  const lineRef = useRef<Line2>(null);
  const conoRef = useRef<THREE.Mesh>(null);
  const t0Ref = useRef<number | null>(null);
  const colorBase = useMemo(() => new THREE.Color(colorNormal), [colorNormal]);
  const colorMancha = useMemo(() => new THREE.Color(MANCHA_ARISTA), []);
  const colorActual = useMemo(() => new THREE.Color(), []);
  // La flecha se apoya justo antes del borde del nodo de llegada.
  const { punta, quat } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(hacia, desde);
    const largo = dir.length();
    dir.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const p = new THREE.Vector3().copy(desde).addScaledVector(dir, Math.max(largo - RADIO_NODO - 0.25, 0));
    return { punta: p, quat: q };
  }, [desde, hacia]);

  useFrame((state) => {
    let progreso = 0;
    if (nivel !== undefined) {
      if (t0Ref.current === null) t0Ref.current = state.clock.elapsedTime;
      const transcurrido = state.clock.elapsedTime - t0Ref.current - nivel * RETRASO_NIVEL;
      progreso = THREE.MathUtils.clamp(transcurrido / DURACION_MANCHA, 0, 1);
    } else {
      t0Ref.current = null;
    }
    colorActual.copy(colorBase).lerp(colorMancha, progreso);
    if (lineRef.current?.material) lineRef.current.material.color.copy(colorActual);
    if (conoRef.current) (conoRef.current.material as THREE.MeshBasicMaterial).color.copy(colorActual);
  });

  return (
    <group>
      <Line ref={lineRef} points={[desde, hacia]} color={colorNormal} lineWidth={1.4} />
      <mesh ref={conoRef} position={punta} quaternion={quat}>
        <coneGeometry args={[0.15, 0.42, 12]} />
        <meshBasicMaterial color={colorNormal} />
      </mesh>
    </group>
  );
}

function Nodo3D({
  nodo, posicion, color, colorTexto, activo, nivel, onSelect,
}: {
  nodo: Nodo; posicion: THREE.Vector3; color: string; colorTexto: string; activo: boolean; nivel?: number;
  onSelect: (id: string | null) => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <group position={posicion}>
      <Sphere
        args={[hover || activo ? 0.68 : RADIO_NODO, 32, 32]}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = 'auto'; }}
        onClick={(e) => { e.stopPropagation(); onSelect(nodo.id); }}
      >
        <meshStandardMaterial color={color} roughness={0.55} metalness={0} />
      </Sphere>
      {nivel !== undefined && <ManchaCafe id={nodo.id} nivel={nivel} />}
      <Text
        position={[0, 1.02, 0]}
        fontSize={0.5}
        maxWidth={SEPARACION_COLUMNAS - 0.5}
        textAlign="center"
        lineHeight={1.1}
        color={colorTexto}
        anchorX="center"
        anchorY="bottom"
        fontWeight={activo ? 700 : 400}
      >
        {nodo.nombre}
      </Text>
    </group>
  );
}

export default function Graph3D({
  grafo, seleccionado, niveles, onSelect,
}: {
  grafo: Grafo;
  seleccionado: string | null;
  /** Nivel de contagio de cada nodo afectado (viene de GET /impacto). */
  niveles: Map<string, number> | null;
  onSelect: (id: string | null) => void;
}) {
  const layout = useMemo(() => calcularLayout(grafo), [grafo]);
  const afectados = useMemo(
    () => (niveles ? new Set(niveles.keys()) : null),
    [niveles],
  );

  return (
    <Canvas
      camera={{ position: [0, 0, 40], fov: CAMARA.fov }}
      onPointerMissed={() => onSelect(null)}
      flat
    >
      <color attach="background" args={[TEMA.fondo]} />
      <ambientLight intensity={1.6} />
      <directionalLight position={[6, 12, 20]} intensity={1.1} />
      <OrbitControls
        makeDefault
        enableRotate={false}
        enableDamping
        enableZoom
        screenSpacePanning
        zoomSpeed={CAMARA.zoomSpeed}
        minDistance={CAMARA.minDistance}
        maxDistance={CAMARA.maxDistance}
        mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
        touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN }}
      />
      <AjustarCamara ancho={layout.ancho} alto={layout.alto} />

      {layout.columnas.map((col) => (
        <Text
          key={col.titulo}
          position={[col.x, layout.techo, 0]}
          fontSize={0.56}
          color={TEMA.titulos}
          anchorX="center"
          anchorY="bottom"
          letterSpacing={0.02}
        >
          {col.titulo}
        </Text>
      ))}

      {grafo.aristas.map((ar) => {
        // Arista "origen REQUIERE destino": la flecha va de destino (quien entrega) a origen (quien usa).
        const desde = layout.pos.get(ar.destino);
        const hacia = layout.pos.get(ar.origen);
        // Si la arista llega antes que sus nodos (carga asíncrona), no se dibuja todavía.
        if (!desde || !hacia || ar.origen === ar.destino) return null;
        const colorNormal = afectados ? TEMA.aristaApagada : TEMA.arista;
        let nivelArista: number | undefined;
        if (niveles && afectados?.has(ar.origen) && afectados?.has(ar.destino)) {
          nivelArista = Math.max(niveles.get(ar.origen) ?? 0, niveles.get(ar.destino) ?? 0);
        }
        return (
          <AristaAnimada
            key={`${ar.id}-${seleccionado ?? 'none'}`}
            desde={desde}
            hacia={hacia}
            nivel={nivelArista}
            colorNormal={colorNormal}
          />
        );
      })}

      {grafo.nodos.map((n) => {
        const posicion = layout.pos.get(n.id);
        if (!posicion) return null;
        const activo = seleccionado === n.id;
        const apagado = Boolean(afectados && !afectados.has(n.id));
        let color = CAPA_COLOR[n.capa];
        if (apagado) color = TEMA.nodoApagado;
        if (activo) color = TEMA.seleccionado;
        return (
          <Nodo3D
            key={`${n.id}-${seleccionado ?? 'none'}`}
            nodo={n}
            posicion={posicion}
            color={color}
            colorTexto={apagado ? TEMA.textoApagado : TEMA.texto}
            activo={activo}
            nivel={niveles?.get(n.id)}
            onSelect={onSelect}
          />
        );
      })}
    </Canvas>
  );
}
