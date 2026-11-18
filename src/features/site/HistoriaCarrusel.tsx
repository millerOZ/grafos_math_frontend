import { Suspense, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject, type WheelEvent } from 'react';
import { Canvas, extend, useFrame, type ThreeElement, type ThreeEvent } from '@react-three/fiber';
import { Image } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Carrusel 3D de la sección "Amamos madrugar": un anillo de fotos curvas que
 * gira con el scroll de la página, se arrastra con el mouse o el dedo y acerca
 * la foto que se toca. Basado en el ejemplo "cards with border radius" de pmndrs.
 */

const FOTOS = [
  { url: '/images/historia/masa-madre.jpg', titulo: 'Pan de masa madre', detalle: 'Formado a mano, todos los días' },
  { url: '/images/historia/croissants.jpg', titulo: 'Croissants de mantequilla', detalle: 'Salen a las 6:30 a. m.' },
  { url: '/images/historia/panal.jpg', titulo: 'Miel en panal', detalle: 'Para untar en la mesa' },
  { url: '/images/historia/mermeladas.jpg', titulo: 'Mermeladas de la casa', detalle: 'Fruta de temporada' },
  { url: '/images/historia/pasteleria.jpg', titulo: 'Pastelería del día', detalle: 'Rollos, danesas y hojaldres' },
  { url: '/images/historia/horno.jpg', titulo: 'El horno de leña', detalle: 'Se prende a las 3:30 a. m.' },
  { url: '/images/historia/jugos.jpg', titulo: 'Jugos y fruta', detalle: 'Recién exprimidos' },
  { url: '/images/historia/vajilla.jpg', titulo: 'La vajilla del salón', detalle: 'Café servido en loza' },
  { url: '/images/historia/lamparas.jpg', titulo: 'Luz de la mañana', detalle: 'El salón al abrir' },
] as const;

const RADIO_ANILLO = 1.45;
const ALTO_TARJETA = 1.35; // fotos en vertical: llenan el alto del lienzo sin desbordar a los lados
const CAMARA_LEJOS = 12.5;
const CAMARA_CERCA = 9.8;
const FONDO = '#ffffff'; // --papel: la niebla funde las fotos de atrás con la página
const { damp } = THREE.MathUtils;

/** Plano doblado en arco, para que cada foto siga la curva del anillo. */
class BentPlaneGeometry extends THREE.PlaneGeometry {
  constructor(curva: number, width = 1, height = 1, widthSegments = 1, heightSegments = 1) {
    super(width, height, widthSegments, heightSegments);
    const hw = width * 0.5;
    const a = new THREE.Vector2(-hw, 0);
    const b = new THREE.Vector2(0, curva);
    const c = new THREE.Vector2(hw, 0);
    const ab = new THREE.Vector2().subVectors(a, b);
    const bc = new THREE.Vector2().subVectors(b, c);
    const ac = new THREE.Vector2().subVectors(a, c);
    const r = (ab.length() * bc.length() * ac.length()) / (2 * Math.abs(ab.cross(ac)));
    const centro = new THREE.Vector2(0, curva - r);
    const anguloBase = new THREE.Vector2().subVectors(a, centro).angle() - Math.PI * 0.5;
    const arco = anguloBase * 2;
    const uv = this.attributes.uv;
    const pos = this.attributes.position;
    const v = new THREE.Vector2();
    for (let i = 0; i < uv.count; i++) {
      v.copy(c).rotateAround(centro, arco * (1 - uv.getX(i)));
      pos.setXYZ(i, v.x, pos.getY(i), -v.y);
    }
    pos.needsUpdate = true;
  }
}
extend({ BentPlaneGeometry });

declare module '@react-three/fiber' {
  interface ThreeElements {
    bentPlaneGeometry: ThreeElement<typeof BentPlaneGeometry>;
  }
}

/** Estado del gesto: se lee y escribe en cada frame, así que vive en un ref y no re-renderiza. */
interface Control {
  objetivo: number; // rotación a la que va el anillo
  velocidad: number; // inercia del arrastre (rad/s)
  arrastrando: boolean;
  movido: number; // px arrastrados desde el último pointerdown (distingue clic de arrastre)
  ultimoX: number;
  ultimoT: number;
  progreso: number | null; // avance de la sección en pantalla
  encima: boolean;
  foco: number | null;
}

/** Diferencia angular más corta de `actual` a `destino`, en (-π, π]. */
const giroCorto = (destino: number, actual: number) => {
  const vuelta = Math.PI * 2;
  return ((((destino - actual + Math.PI) % vuelta) + vuelta) % vuelta) - Math.PI;
};

const anguloDe = (i: number) => (i / FOTOS.length) * Math.PI * 2;

function Rig({
  controlRef,
  contenedorRef,
  quieto,
  children,
}: {
  controlRef: RefObject<Control>;
  contenedorRef: RefObject<HTMLDivElement | null>;
  quieto: boolean;
  children: React.ReactNode;
}) {
  const grupo = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const c = controlRef.current;
    const g = grupo.current;
    if (!g) return;
    const dt = Math.min(delta, 0.1);

    // Scroll de la página: mientras la sección cruza la pantalla, el anillo da algo más de media vuelta.
    const el = contenedorRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      const alto = window.innerHeight;
      const p = (alto - r.top) / (alto + r.height);
      if (c.progreso !== null && c.foco === null) c.objetivo -= (p - c.progreso) * Math.PI * 1.6;
      c.progreso = p;
    }

    if (!c.arrastrando) {
      c.objetivo += c.velocidad * dt;
      c.velocidad *= Math.exp(-3 * dt);
    }

    if (c.foco !== null) {
      // La foto elegida gira al frente por el camino más corto.
      c.objetivo += giroCorto(-anguloDe(c.foco), c.objetivo);
    } else if (!quieto && !c.arrastrando && !c.encima) {
      c.objetivo -= dt * 0.06; // giro lento cuando nadie lo toca
    }

    g.rotation.y = damp(g.rotation.y, c.objetivo, 4, dt);

    // La cámara sigue un poco al puntero y se acerca cuando hay una foto elegida.
    const px = quieto ? 0 : state.pointer.x;
    const py = quieto ? 0 : state.pointer.y;
    const cam = state.camera.position;
    cam.x = damp(cam.x, -px * 0.8, 3, dt);
    cam.y = damp(cam.y, py * 0.5 + 1.1, 3, dt);
    cam.z = damp(cam.z, c.foco !== null ? CAMARA_CERCA : CAMARA_LEJOS, 3, dt);
    state.camera.lookAt(0, 0, 0);
    // La cámara se mueve sola: se vuelve a calcular qué foto está bajo el puntero.
    state.events.update?.();
  });

  return (
    <group rotation={[0, 0, 0.15]}>
      <group ref={grupo}>{children}</group>
    </group>
  );
}

interface ImagenMaterial {
  radius: number;
  zoom: number;
}

function Tarjeta({
  indice,
  controlRef,
  onEncima,
  onFoco,
}: {
  indice: number;
  controlRef: RefObject<Control>;
  onEncima: (i: number | null) => void;
  onFoco: (i: number | null) => void;
}) {
  const malla = useRef<THREE.Mesh>(null);
  const [encima, setEncima] = useState(false);
  const angulo = anguloDe(indice);

  useFrame((_, delta) => {
    const m = malla.current;
    if (!m) return;
    const dt = Math.min(delta, 0.1);
    const enFoco = controlRef.current.foco === indice;
    const escala = enFoco ? 1.2 : encima ? 1.12 : 1;
    const k = damp(m.scale.x, escala, 8, dt);
    m.scale.set(k, k * ALTO_TARJETA, 1);
    // La foto activa sale un poco del anillo para no cortarse con sus vecinas al crecer.
    const salida = damp(m.position.length() / RADIO_ANILLO, enFoco ? 1.16 : encima ? 1.08 : 1, 8, dt);
    m.position.set(Math.sin(angulo) * RADIO_ANILLO * salida, 0, Math.cos(angulo) * RADIO_ANILLO * salida);
    const material = m.material as unknown as ImagenMaterial;
    const activa = encima || enFoco;
    material.radius = damp(material.radius, activa ? 0.25 : 0.1, 5, dt);
    material.zoom = damp(material.zoom, activa ? 1 : 1.5, 5, dt);
  });

  const entrar = (e: ThreeEvent<globalThis.PointerEvent>) => {
    e.stopPropagation();
    setEncima(true);
    controlRef.current.encima = true;
    onEncima(indice);
  };
  const salir = () => {
    setEncima(false);
    controlRef.current.encima = false;
    onEncima(null);
  };
  const tocar = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const c = controlRef.current;
    if (c.movido > 6) return; // fue un arrastre, no un clic
    c.foco = c.foco === indice ? null : indice;
    onFoco(c.foco);
  };

  return (
    <Image
      ref={malla}
      url={FOTOS[indice].url}
      scale={[1, ALTO_TARJETA]} // también encuadra la foto (cover) en la proporción vertical
      transparent
      toneMapped={false}
      side={THREE.DoubleSide}
      position={[Math.sin(angulo) * RADIO_ANILLO, 0, Math.cos(angulo) * RADIO_ANILLO]}
      rotation={[0, angulo, 0]}
      onPointerOver={entrar}
      onPointerOut={salir}
      onClick={tocar}
    >
      <bentPlaneGeometry args={[0.1, 1, 1, 20, 20]} />
    </Image>
  );
}

export function HistoriaCarrusel() {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<Control>({
    objetivo: 0, velocidad: 0, arrastrando: false, movido: 0, ultimoX: 0, ultimoT: 0,
    progreso: null, encima: false, foco: null,
  });
  const [encima, setEncima] = useState<number | null>(null);
  const [foco, setFoco] = useState<number | null>(null);
  const [visible, setVisible] = useState(true);
  const [quieto] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Fuera de pantalla no se dibuja.
  useEffect(() => {
    const el = contenedorRef.current;
    if (!el) return;
    const observador = new IntersectionObserver(([entrada]) => setVisible(entrada.isIntersecting));
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  const elegir = (i: number | null) => {
    controlRef.current.foco = i;
    setFoco(i);
  };

  const bajar = (e: PointerEvent<HTMLDivElement>) => {
    const c = controlRef.current;
    c.arrastrando = true;
    c.movido = 0;
    c.velocidad = 0;
    c.ultimoX = e.clientX;
    c.ultimoT = e.timeStamp;
  };
  const mover = (e: PointerEvent<HTMLDivElement>) => {
    const c = controlRef.current;
    if (!c.arrastrando) return;
    const dx = e.clientX - c.ultimoX;
    const dt = Math.max((e.timeStamp - c.ultimoT) / 1000, 1 / 120);
    c.ultimoX = e.clientX;
    c.ultimoT = e.timeStamp;
    c.movido += Math.abs(dx);
    if (c.movido > 6 && c.foco !== null) elegir(null); // arrastrar suelta la foto elegida
    const giro = dx * 0.007;
    c.objetivo += giro;
    c.velocidad = c.velocidad * 0.6 + (giro / dt) * 0.4;
  };
  const soltar = () => {
    controlRef.current.arrastrando = false;
  };
  const rueda = (e: WheelEvent<HTMLDivElement>) => {
    // El scroll vertical mueve la página (y el anillo con ella); el horizontal del trackpad gira directo.
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) controlRef.current.objetivo -= e.deltaX * 0.004;
  };
  const teclas = (e: KeyboardEvent<HTMLDivElement>) => {
    const actual = foco ?? 0;
    if (e.key === 'ArrowRight') elegir((actual + 1) % FOTOS.length);
    else if (e.key === 'ArrowLeft') elegir((actual - 1 + FOTOS.length) % FOTOS.length);
    else if (e.key === 'Escape') elegir(null);
    else return;
    e.preventDefault();
  };

  const mostrada = foco ?? encima;

  return (
    <div className="carrusel">
      <div
        ref={contenedorRef}
        className={encima !== null ? 'carrusel-lienzo sobre-foto' : 'carrusel-lienzo'}
        role="region"
        aria-roledescription="carrusel"
        aria-label="Fotos del obrador. Usa las flechas para recorrerlas y Escape para soltar."
        tabIndex={0}
        onPointerDown={bajar}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        onPointerLeave={soltar}
        onWheel={rueda}
        onKeyDown={teclas}
      >
        <Canvas
          camera={{ position: [0, 1.1, CAMARA_LEJOS], fov: 15 }}
          dpr={[1, 2]}
          frameloop={visible ? 'always' : 'never'}
          onPointerMissed={() => {
            if (controlRef.current.movido <= 6) elegir(null);
          }}
        >
          <color attach="background" args={[FONDO]} />
          <fog attach="fog" args={[FONDO, CAMARA_LEJOS - 1.6, CAMARA_LEJOS + 2.2]} />
          <Rig controlRef={controlRef} contenedorRef={contenedorRef} quieto={quieto}>
            <Suspense fallback={null}>
              {FOTOS.map((foto, i) => (
                <Tarjeta key={foto.url} indice={i} controlRef={controlRef} onEncima={setEncima} onFoco={setFoco} />
              ))}
            </Suspense>
          </Rig>
        </Canvas>
      </div>
      <p className="carrusel-pie" aria-live="polite">
        {mostrada !== null ? (
          <>
            <strong>{FOTOS[mostrada].titulo}</strong>
            <span>{FOTOS[mostrada].detalle}</span>
          </>
        ) : (
          <span>Arrastra o haz scroll para girar. Toca una foto para acercarla.</span>
        )}
      </p>
    </div>
  );
}
