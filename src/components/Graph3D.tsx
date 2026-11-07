import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Line2 } from 'three-stdlib';
import type { Capa, Grafo, Nodo } from '../features/graph/types';
import { AFECTADO, CAPA_HOJA, CAPA_NODO, TINTA, TINTA_SUAVE } from '../features/graph/paleta';

/**
 * Mapa de la red de abastecimiento, de izquierda a derecha:
 *   Proveedores → Insumos → Procesos (por paso) → Productos
 *
 * Cada capa es una hoja de papel sobre la mesa y los nodos descansan encima,
 * unidos por hilos. Se navega solo arrastrando y acercando, para que alguien que
 * no conoce de grafos lo lea como un diagrama. Los hilos siguen el camino del
 * abastecimiento (de quien entrega a quien lo usa): en el modelo la arista es
 * "A REQUIERE B", así que se dibujan de B a A.
 */

const CAMARA = { fov: 34, minDistance: 10, maxDistance: 160, zoomSpeed: 0.85 };
/** El encuadre automático no pasa de aquí: un subgrafo de un nodo no debe verse gigante. */
const ENCUADRE_MINIMO = 34;
const SEPARACION_COLUMNAS = 5.6;
const SEPARACION_FILAS = 3.1;
const MARGEN_HOJA = 3;
const RADIO_NODO = 0.62;
const ORDEN_CAPAS: Capa[] = ['proveedor', 'insumo', 'proceso', 'producto'];
const TITULO_CAPA: Record<Capa, string> = {
  proveedor: 'Proveedores',
  insumo: 'Insumos',
  proceso: 'Procesos',
  producto: 'Productos',
};
/** Cada hoja queda un poco encima de la anterior y con otra altura, como papeles apilados. */
const ALTURA_HOJA: Record<Capa, number> = { proveedor: 0, insumo: 0.1, proceso: 0.2, producto: 0.3 };
const DESFASE_HOJA: Record<Capa, number> = { proveedor: 0, insumo: 0.4, proceso: -0.3, producto: 0.2 };
const ALTURA_HILOS = 0.42;

const FONDO = '#ffffff';
const HILO = '#a9a6a2';
const INCLINACION_MESA = -0.05;
/** Inclinación del corte de las hojas: la esquina inferior derecha va a 54°. */
const PENDIENTE_CORTE = Math.tan(THREE.MathUtils.degToRad(54));

const SUAVIDAD = 4.2; // qué tan rápido llega todo a su lugar: más alto, más rápido
const DEMORA_ONDA = 0.5; // segundos para que el mapa se acomode antes de la onda
const RETRASO_NIVEL = 0.5; // segundos entre cada nivel de la onda
const DURACION_ONDA = 1.1;
const PUNTOS_HILO = 25;
const VELOCIDAD_FLUJO = 0.07; // recorridos por segundo

interface Rect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

interface Layout {
  pos: Map<string, THREE.Vector3>;
  hojas: Partial<Record<Capa, Rect>>;
  ancho: number;
  alto: number;
  centroY: number;
}

type Posiciones = RefObject<Map<string, THREE.Vector3>>;

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
  // Solo cuentan las columnas con nodos: así un subgrafo (impacto) queda centrado y sin huecos.
  const usadas = [...new Set(grafo.nodos.map(columnaDe))].sort((a, b) => a - b);
  const indice = new Map(usadas.map((col, i) => [col, i]));
  const xDe = (col: number) => ((indice.get(col) ?? 0) - (usadas.length - 1) / 2) * SEPARACION_COLUMNAS;

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
      // Los procesos se apoyan abajo: así los hilos largos insumo → producto
      // pasan por encima de la cadena de preparación en vez de cruzarla.
      const y = esProceso
        ? piso + (nodos.length - 1 - i) * SEPARACION_FILAS
        : ((nodos.length - 1) / 2 - i) * SEPARACION_FILAS;
      pos.set(n.id, new THREE.Vector3(xDe(col), y, ALTURA_HOJA[n.capa] + RADIO_NODO));
    });
  });

  // Una hoja por capa, con espacio arriba para su título.
  const hojas: Layout['hojas'] = {};
  const techo = -piso + 3.6;
  const base = piso - 1.9;
  for (const capa of ORDEN_CAPAS) {
    const xs = grafo.nodos.filter((n) => n.capa === capa).map((n) => pos.get(n.id)!.x);
    if (!xs.length) continue;
    hojas[capa] = {
      x0: Math.min(...xs) - MARGEN_HOJA,
      x1: Math.max(...xs) + MARGEN_HOJA,
      y0: base - DESFASE_HOJA[capa],
      y1: techo + DESFASE_HOJA[capa],
    };
  }

  return {
    pos,
    hojas,
    ancho: Math.max(usadas.length - 1, 0) * SEPARACION_COLUMNAS + MARGEN_HOJA * 2 + 2,
    alto: techo - base + 2.4,
    centroY: (techo + base) / 2,
  };
}

/** Avance de un frame; sin movimiento todo llega a su lugar de inmediato. */
const pasoDe = (delta: number, movimiento: boolean) => (movimiento ? Math.min(delta, 0.05) : 1000);
const { damp, clamp } = THREE.MathUtils;

/** Curva del hilo: sale y llega en horizontal, siguiendo la lectura de izquierda a derecha. */
function puntoHilo(a: THREE.Vector3, b: THREE.Vector3, t: number, salida: THREE.Vector3) {
  const c = (b.x - a.x) * 0.5;
  const u = 1 - t;
  const w0 = u * u * u;
  const w1 = 3 * u * u * t;
  const w2 = 3 * u * t * t;
  const w3 = t * t * t;
  salida.set(
    w0 * a.x + w1 * (a.x + c) + w2 * (b.x - c) + w3 * b.x,
    w0 * a.y + w1 * a.y + w2 * b.y + w3 * b.y,
    ALTURA_HILOS,
  );
  return salida;
}

/** Acerca la cámara hasta encuadrar el mapa; se detiene si el usuario toma el control. */
function AjustarCamara({
  layout, movimiento, libreRef,
}: {
  layout: Layout; movimiento: boolean; libreRef: RefObject<boolean>;
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  const objetivo = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    const mitad = THREE.MathUtils.degToRad(CAMARA.fov / 2);
    const aspecto = size.width / Math.max(size.height, 1);
    const z = Math.max(layout.alto / 2 / Math.tan(mitad), layout.ancho / 2 / (Math.tan(mitad) * aspecto));
    objetivo.current = new THREE.Vector3(0, layout.centroY, clamp(z, ENCUADRE_MINIMO, CAMARA.maxDistance));
    libreRef.current = false;
  }, [size.width, size.height, layout, libreRef]);

  useFrame((_, delta) => {
    const destino = objetivo.current;
    if (!destino || !controls || libreRef.current) return;
    const dt = pasoDe(delta, movimiento);
    camera.position.set(
      damp(camera.position.x, destino.x, SUAVIDAD, dt),
      damp(camera.position.y, destino.y, SUAVIDAD, dt),
      damp(camera.position.z, destino.z, SUAVIDAD, dt),
    );
    controls.target.set(camera.position.x, camera.position.y, 0);
    controls.update();
    if (camera.position.distanceTo(destino) < 0.01) objetivo.current = null;
  });

  return null;
}

/** La mesa se inclina apenas siguiendo al puntero: da profundidad sin mover el mapa de lugar. */
function Mesa({ movimiento, children }: { movimiento: boolean; children: React.ReactNode }) {
  const grupo = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!grupo.current) return;
    const dt = pasoDe(delta, movimiento);
    const t = state.clock.elapsedTime;
    const x = movimiento ? -state.pointer.y * 0.03 + Math.sin(t * 0.13) * 0.006 : 0;
    const y = movimiento ? state.pointer.x * 0.045 + Math.sin(t * 0.09) * 0.01 : 0;
    grupo.current.rotation.x = damp(grupo.current.rotation.x, INCLINACION_MESA + x, 2.5, dt);
    grupo.current.rotation.y = damp(grupo.current.rotation.y, y, 2.5, dt);
  });

  return <group ref={grupo} rotation-x={INCLINACION_MESA}>{children}</group>;
}

/** Hoja de una capa. Se desenrolla hacia abajo al aparecer y se recoge al salir. */
function Hoja({ capa, rect, movimiento }: { capa: Capa; rect?: Rect; movimiento: boolean }) {
  const malla = useRef<THREE.Mesh>(null);
  const titulo = useRef<THREE.Object3D>(null);
  const geometria = useRef<THREE.BufferGeometry>(null);
  const actual = useRef<Rect>({
    x0: rect?.x0 ?? 0, x1: rect?.x1 ?? 0, y0: rect?.y1 ?? 0, y1: rect?.y1 ?? 0,
  });
  const vertices = useMemo(() => new Float32Array(15), []);
  const normales = useMemo(() => new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]), []);
  const indices = useMemo(() => new Uint16Array([0, 1, 2, 0, 2, 3, 0, 3, 4]), []);

  useFrame((_, delta) => {
    const dt = pasoDe(delta, movimiento);
    const r = actual.current;
    const destino = rect ?? { ...r, y0: r.y1 };
    if (rect && r.y1 - r.y0 < 0.05) {
      // Reaparece recogida en su nuevo lugar, sin cruzar el mapa.
      r.x0 = rect.x0;
      r.x1 = rect.x1;
      r.y0 = rect.y1;
      r.y1 = rect.y1;
    }
    r.x0 = damp(r.x0, destino.x0, SUAVIDAD, dt);
    r.x1 = damp(r.x1, destino.x1, SUAVIDAD, dt);
    r.y0 = damp(r.y0, destino.y0, SUAVIDAD, dt);
    r.y1 = damp(r.y1, destino.y1, SUAVIDAD, dt);

    const alto = r.y1 - r.y0;
    const corte = Math.min(1.5, (r.x1 - r.x0) * 0.25, alto / PENDIENTE_CORTE);
    const z = ALTURA_HOJA[capa];
    vertices.set([
      r.x0, r.y0, z,
      r.x1 - corte, r.y0, z,
      r.x1, r.y0 + corte * PENDIENTE_CORTE, z,
      r.x1, r.y1, z,
      r.x0, r.y1, z,
    ]);
    const atributo = geometria.current?.getAttribute('position');
    if (atributo) atributo.needsUpdate = true;
    if (malla.current) malla.current.visible = alto > 0.02;
    if (titulo.current) {
      titulo.current.position.set(r.x0 + 0.7, r.y1 - 0.65, z + 0.02);
      titulo.current.visible = alto > 3;
    }
  });

  return (
    <>
      <mesh ref={malla} castShadow receiveShadow frustumCulled={false}>
        <bufferGeometry ref={geometria}>
          <bufferAttribute attach="attributes-position" args={[vertices, 3]} />
          <bufferAttribute attach="attributes-normal" args={[normales, 3]} />
          <bufferAttribute attach="index" args={[indices, 1]} />
        </bufferGeometry>
        <meshLambertMaterial color={CAPA_HOJA[capa]} shadowSide={THREE.DoubleSide} />
      </mesh>
      <Text ref={titulo} fontSize={0.52} color={TINTA_SUAVE} anchorX="left" anchorY="top">
        {TITULO_CAPA[capa]}
      </Text>
    </>
  );
}

/** Onda que se abre sobre el papel cuando la falla alcanza un nodo; queda una marca debajo. */
function Onda({ nivel, movimiento }: { nivel: number; movimiento: boolean }) {
  const aro = useRef<THREE.Mesh>(null);
  const marca = useRef<THREE.Mesh>(null);
  const inicio = useRef<number | null>(null);

  useFrame((state) => {
    const ahora = state.clock.elapsedTime;
    if (inicio.current === null) inicio.current = ahora + DEMORA_ONDA + nivel * RETRASO_NIVEL;
    const transcurrido = ahora - inicio.current;
    const progreso = movimiento ? clamp(transcurrido / DURACION_ONDA, 0, 1) : 1;
    const suave = 1 - (1 - progreso) ** 3;

    if (marca.current) {
      marca.current.scale.setScalar(RADIO_NODO * (1 + suave * 0.72));
      (marca.current.material as THREE.MeshBasicMaterial).opacity = 0.26 * suave;
    }
    if (aro.current) {
      // Después de la primera onda sigue un latido lento, para que se note qué está afectado.
      const ciclo = progreso < 1 ? progreso : ((transcurrido - DURACION_ONDA) % 3.6) / 3.6;
      const visible = movimiento && transcurrido > 0;
      aro.current.visible = visible;
      aro.current.scale.setScalar(RADIO_NODO * (1.2 + ciclo * 2.1));
      (aro.current.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - ciclo) ** 2;
    }
  });

  return (
    <group position-z={-RADIO_NODO + 0.015}>
      <mesh ref={marca}>
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial color={AFECTADO} transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={aro} visible={false}>
        <ringGeometry args={[0.94, 1, 64]} />
        <meshBasicMaterial color={AFECTADO} transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Nodo3D({
  nodo, destino, activo, nivel, seleccionado, movimiento, posicionesRef, onSelect,
}: {
  nodo: Nodo;
  /** Sin destino, el nodo sale de la escena. */
  destino?: THREE.Vector3;
  activo: boolean;
  nivel?: number;
  seleccionado: string | null;
  movimiento: boolean;
  posicionesRef: Posiciones;
  onSelect: (id: string | null) => void;
}) {
  const grupo = useRef<THREE.Group>(null);
  const esfera = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const escala = useRef(0);
  const [hover, setHover] = useState(false);
  const posicion = useMemo(() => new THREE.Vector3(), []);
  const colorDestino = useMemo(() => new THREE.Color(), []);
  const fase = useMemo(() => [...nodo.id].reduce((suma, c) => suma + c.charCodeAt(0), 0) % 7, [nodo.id]);

  useEffect(() => {
    const mapa = posicionesRef.current;
    mapa.set(nodo.id, posicion);
    return () => {
      mapa.delete(nodo.id);
      // Si el nodo desaparece bajo el puntero no llega el pointerOut.
      document.body.style.cursor = 'auto';
    };
  }, [nodo.id, posicion, posicionesRef]);

  // Prioridad -1: los hilos leen la posición ya actualizada en este mismo frame.
  useFrame((state, delta) => {
    if (!grupo.current || !esfera.current) return;
    const dt = pasoDe(delta, movimiento);
    if (destino) {
      if (escala.current < 0.02) posicion.copy(destino); // entra en su lugar, sin cruzar el mapa
      posicion.set(
        damp(posicion.x, destino.x, SUAVIDAD, dt),
        damp(posicion.y, destino.y, SUAVIDAD, dt),
        damp(posicion.z, destino.z, SUAVIDAD, dt),
      );
    }
    escala.current = damp(escala.current, destino ? 1 : 0, SUAVIDAD * 1.3, dt);
    grupo.current.position.copy(posicion);
    grupo.current.scale.setScalar(Math.max(escala.current, 0.0001));
    grupo.current.visible = escala.current > 0.01;

    const tamano = activo || hover ? 1.14 : 1;
    esfera.current.scale.setScalar(damp(esfera.current.scale.x, tamano, 8, dt));
    esfera.current.position.z = movimiento ? Math.sin(state.clock.elapsedTime * 0.7 + fase) * 0.05 : 0;
    if (material.current) {
      colorDestino.set(activo ? TINTA : CAPA_NODO[nodo.capa]);
      material.current.color.lerp(colorDestino, 1 - Math.exp(-6 * dt));
    }
  }, -1);

  // Un nodo que está saliendo ya no recibe clics: el clic cae al vacío y vuelve al mapa completo.
  const eventos = destino
    ? {
        onPointerOver: (e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = 'pointer';
        },
        onPointerOut: () => {
          setHover(false);
          document.body.style.cursor = 'auto';
        },
        onClick: (e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          onSelect(nodo.id);
        },
      }
    : {};

  return (
    <group ref={grupo} visible={false}>
      <mesh ref={esfera} castShadow {...eventos}>
        <sphereGeometry args={[RADIO_NODO, 48, 32]} />
        <meshStandardMaterial ref={material} color={CAPA_NODO[nodo.capa]} roughness={0.62} metalness={0} />
      </mesh>
      {nivel !== undefined && <Onda key={seleccionado} nivel={nivel} movimiento={movimiento} />}
      <Text
        position={[0, 0.94, 0.1]}
        fontSize={0.46}
        maxWidth={SEPARACION_COLUMNAS - 0.6}
        textAlign="center"
        lineHeight={1.1}
        color={TINTA}
        anchorX="center"
        anchorY="bottom"
        fontWeight={activo ? 700 : 400}
      >
        {nodo.nombre}
      </Text>
    </group>
  );
}

/** Hilo entre dos nodos, con una cuenta que recorre el camino del abastecimiento. */
function Hilo({
  desde, hacia, visible, nivel, seleccionado, movimiento, posicionesRef,
}: {
  desde: string;
  hacia: string;
  visible: boolean;
  nivel?: number;
  seleccionado: string | null;
  movimiento: boolean;
  posicionesRef: Posiciones;
}) {
  const linea = useRef<Line2>(null);
  const punta = useRef<THREE.Mesh>(null);
  const cuenta = useRef<THREE.Mesh>(null);
  const opacidad = useRef(0);
  const inicio = useRef<number | null>(null);
  const puntos = useMemo(() => Array.from({ length: PUNTOS_HILO }, () => new THREE.Vector3()), []);
  const ultimoA = useMemo(() => new THREE.Vector3(Infinity, 0, 0), []);
  const ultimoB = useMemo(() => new THREE.Vector3(Infinity, 0, 0), []);
  const auxiliar = useMemo(() => new THREE.Vector3(), []);
  const adelante = useMemo(() => new THREE.Vector3(), []);
  const arriba = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const colorBase = useMemo(() => new THREE.Color(HILO), []);
  const colorFalla = useMemo(() => new THREE.Color(AFECTADO), []);
  const colorActual = useMemo(() => new THREE.Color(), []);
  const fase = useMemo(() => [...(desde + hacia)].reduce((s, c) => s * 31 + c.charCodeAt(0), 7) % 1000 / 1000, [desde, hacia]);

  useEffect(() => {
    inicio.current = null;
  }, [seleccionado, nivel]);

  useFrame((state, delta) => {
    const a = posicionesRef.current.get(desde);
    const b = posicionesRef.current.get(hacia);
    const hilo = linea.current;
    if (!a || !b || !hilo || !punta.current || !cuenta.current) return;
    const dt = pasoDe(delta, movimiento);
    const ahora = state.clock.elapsedTime;

    if (!a.equals(ultimoA) || !b.equals(ultimoB)) {
      ultimoA.copy(a);
      ultimoB.copy(b);
      // Escribe sobre el buffer existente: setPositions crearía uno nuevo en cada frame.
      const datos = hilo.geometry.getAttribute('instanceStart') as THREE.InterleavedBufferAttribute;
      const arreglo = datos.data.array as Float32Array;
      let previo = puntoHilo(a, b, 0, auxiliar).clone();
      for (let i = 1; i < PUNTOS_HILO; i += 1) {
        puntoHilo(a, b, i / (PUNTOS_HILO - 1), puntos[i]);
        arreglo.set([previo.x, previo.y, previo.z, puntos[i].x, puntos[i].y, puntos[i].z], (i - 1) * 6);
        previo = puntos[i];
      }
      datos.data.needsUpdate = true;

      // La punta se apoya justo antes del borde del nodo de llegada.
      const largo = Math.max(a.distanceTo(b), 0.001);
      const t = clamp(1 - (RADIO_NODO + 0.3) / largo, 0, 0.98);
      puntoHilo(a, b, t, punta.current.position);
      puntoHilo(a, b, t + 0.02, adelante).sub(punta.current.position).normalize();
      punta.current.quaternion.setFromUnitVectors(arriba, adelante);
    }

    opacidad.current = damp(opacidad.current, visible ? 1 : 0, SUAVIDAD * 1.3, dt);
    const opaco = opacidad.current;
    let falla = 0;
    if (nivel !== undefined) {
      if (inicio.current === null) inicio.current = ahora + DEMORA_ONDA + (nivel - 1) * RETRASO_NIVEL;
      falla = movimiento ? clamp((ahora - inicio.current) / DURACION_ONDA, 0, 1) : 1;
    }
    colorActual.copy(colorBase).lerp(colorFalla, falla);

    hilo.visible = opaco > 0.01;
    hilo.material.color.copy(colorActual);
    hilo.material.opacity = opaco;
    const materialPunta = punta.current.material as THREE.MeshBasicMaterial;
    punta.current.visible = hilo.visible;
    materialPunta.color.copy(colorActual);
    materialPunta.opacity = opaco;

    const recorrido = (ahora * VELOCIDAD_FLUJO + fase) % 1;
    const materialCuenta = cuenta.current.material as THREE.MeshBasicMaterial;
    cuenta.current.visible = movimiento && hilo.visible;
    puntoHilo(a, b, recorrido, cuenta.current.position);
    cuenta.current.scale.setScalar(Math.sin(recorrido * Math.PI));
    materialCuenta.color.copy(colorActual);
    materialCuenta.opacity = opaco;
  });

  return (
    <group>
      <Line
        ref={linea}
        points={puntos}
        color={HILO}
        lineWidth={1.5}
        transparent
        opacity={0}
        frustumCulled={false}
      />
      <mesh ref={punta} visible={false}>
        <coneGeometry args={[0.13, 0.38, 12]} />
        <meshBasicMaterial color={HILO} transparent opacity={0} />
      </mesh>
      <mesh ref={cuenta} visible={false}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshBasicMaterial color={HILO} transparent opacity={0} />
      </mesh>
    </group>
  );
}

interface Graph3DProps {
  grafo: Grafo;
  /** Si existe, solo estos nodos se muestran; los demás salen de la escena. */
  visibles: Set<string> | null;
  seleccionado: string | null;
  /** Nivel de contagio de cada nodo afectado (viene de GET /impacto). */
  niveles: Map<string, number> | null;
  /** Con false, todo llega a su lugar de inmediato y no hay animación de ambiente. */
  movimiento: boolean;
  onSelect: (id: string | null) => void;
}

function Escena({ grafo, visibles, seleccionado, niveles, movimiento, onSelect }: Graph3DProps) {
  const layoutCompleto = useMemo(() => calcularLayout(grafo), [grafo]);
  const layout = useMemo(() => {
    if (!visibles) return layoutCompleto;
    return calcularLayout({
      nodos: grafo.nodos.filter((n) => visibles.has(n.id)),
      aristas: grafo.aristas.filter((a) => visibles.has(a.origen) && visibles.has(a.destino)),
    });
  }, [grafo, visibles, layoutCompleto]);
  const posicionesRef = useRef(new Map<string, THREE.Vector3>());
  const libreRef = useRef(false);
  // El área de sombras se mide con el mapa completo, para que no cambie al filtrar.
  const alcanceSombra = Math.ceil(Math.max(layoutCompleto.ancho, layoutCompleto.alto) / 2) + 8;

  return (
    <>
      <color attach="background" args={[FONDO]} />
      <ambientLight intensity={2.35} />
      <directionalLight
        key={alcanceSombra}
        position={[-16, 20, 34]}
        intensity={1.15}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-radius={7}
        shadow-bias={-0.0004}
        shadow-camera-left={-alcanceSombra}
        shadow-camera-right={alcanceSombra}
        shadow-camera-top={alcanceSombra}
        shadow-camera-bottom={-alcanceSombra}
        shadow-camera-near={1}
        shadow-camera-far={110}
      />
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
        onStart={() => { libreRef.current = true; }}
      />
      <AjustarCamara layout={layout} movimiento={movimiento} libreRef={libreRef} />

      <Mesa movimiento={movimiento}>
        <mesh position-z={-0.03} receiveShadow>
          <planeGeometry args={[600, 600]} />
          <shadowMaterial opacity={0.1} />
        </mesh>

        {ORDEN_CAPAS.map((capa) => (
          <Hoja key={capa} capa={capa} rect={layout.hojas[capa]} movimiento={movimiento} />
        ))}

        {grafo.nodos.map((n) => (
          <Nodo3D
            key={n.id}
            nodo={n}
            destino={layout.pos.get(n.id)}
            activo={seleccionado === n.id}
            nivel={niveles?.get(n.id)}
            seleccionado={seleccionado}
            movimiento={movimiento}
            posicionesRef={posicionesRef}
            onSelect={onSelect}
          />
        ))}

        {grafo.aristas.map((ar) => {
          if (ar.origen === ar.destino) return null;
          const enFalla = niveles?.has(ar.origen) && niveles.has(ar.destino);
          return (
            // Arista "origen REQUIERE destino": el hilo va de destino (quien entrega) a origen (quien usa).
            <Hilo
              key={ar.id}
              desde={ar.destino}
              hacia={ar.origen}
              visible={layout.pos.has(ar.origen) && layout.pos.has(ar.destino)}
              nivel={enFalla ? Math.max(niveles?.get(ar.origen) ?? 0, niveles?.get(ar.destino) ?? 0) : undefined}
              seleccionado={seleccionado}
              movimiento={movimiento}
              posicionesRef={posicionesRef}
            />
          );
        })}
      </Mesa>
    </>
  );
}

export default function Graph3D(props: Graph3DProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 70], fov: CAMARA.fov }}
      onPointerMissed={() => props.onSelect(null)}
      shadows={{ type: THREE.PCFShadowMap }}
      flat
    >
      <Escena {...props} />
    </Canvas>
  );
}
