import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Vapor que sale del pan de la portada.
 *
 * El canvas va dentro de `.home-hero-foto`, así se mueve con el parallax. La
 * foto se pinta con `background-size: cover` y `background-position: 70% 60%`;
 * con esos mismos números se calcula dónde queda el pan en pantalla.
 */

// Tamaño de public/images/home-pan.jpg y punto (en px de la imagen) de donde sale el vapor.
const IMAGEN = { ancho: 956, alto: 500 };
const BOCA_VAPOR = { x: 672, y: 258 };
const POSICION_FONDO = { x: 0.7, y: 0.6 };

const PARTICULAS = 70;

// Azar fijo (mismo resultado en cada carga): semilla escalonada para que las
// partículas no nazcan juntas, y un desvío lateral para que el vapor salga ancho.
const azar = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const SEMILLAS = Float32Array.from({ length: PARTICULAS }, (_, i) => (i + azar(i)) / PARTICULAS);
const DESVIOS = Float32Array.from(
  { length: PARTICULAS },
  (_, i) => (azar(i + 100) - 0.5) * (0.6 + azar(i + 200) * 0.4),
);
const POSICIONES = new Float32Array(PARTICULAS * 3);

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uOrigen;
  uniform float uEscala;
  uniform float uPixelRatio;
  uniform vec2 uRaton;       // puntero en px del canvas
  uniform vec2 uVelocidad;   // px/s del puntero, suavizada
  uniform float uInfluencia; // 0 fuera del hero, 1 con el puntero encima
  uniform vec2 uInclinacion; // puntero normalizado (-1..1) para el parallax
  uniform float uSoplo;      // 1 justo después de un clic, baja a 0
  attribute float aSemilla;
  attribute float aDesvio;
  varying float vAlpha;
  varying float vSemilla;
  varying float vSoplo;

  void main() {
    float vida = fract(uTime * 0.09 + aSemilla);
    vec2 p = uOrigen;
    p.x += aDesvio * 85.0 * uEscala;
    p.y += vida * 250.0 * uEscala;
    // Ondula al subir y se abre hacia el horno.
    p.x += (sin(vida * 5.0 + aSemilla * 12.0) * 16.0 - vida * vida * 30.0) * uEscala;

    // Profundidad: cada hebra se corre distinto con el puntero, como capas de nube.
    float capa = 0.4 + fract(aSemilla * 7.31);
    p += uInclinacion * vec2(14.0, 8.0) * capa * (0.4 + vida) * uEscala;

    // El puntero arrastra el vapor y lo aparta; el vapor viejo (arriba) es más liviano.
    vec2 d = p - uRaton;
    float radio = 150.0 * uEscala;
    float f = exp(-dot(d, d) / (radio * radio)) * uInfluencia * (0.35 + vida);
    p += uVelocidad * f * 0.2;
    p += normalize(d + vec2(0.001)) * f * 55.0 * uEscala;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0.0, 1.0);
    gl_PointSize = (36.0 + vida * 120.0) * (1.0 + uSoplo * 0.35) * uEscala * uPixelRatio;

    vAlpha = smoothstep(0.0, 0.18, vida) * (1.0 - smoothstep(0.4, 1.0, vida)) * 0.2;
    vAlpha *= 1.0 + uSoplo * 1.6 * (1.0 - vida);
    vSemilla = aSemilla;
    vSoplo = uSoplo;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  varying float vAlpha;
  varying float vSemilla;
  varying float vSoplo;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float suave = smoothstep(0.5, 0.0, length(c));
    // Hebras: la mancha redonda se deforma un poco y cambia con el tiempo.
    float hebra = sin(c.x * 9.0 + vSemilla * 20.0 + uTime * 0.7)
                * sin(c.y * 7.0 - uTime * 0.5 + vSemilla * 7.0);
    suave *= 0.75 + 0.25 * hebra;
    // Con el soplo el vapor toma la luz del horno.
    vec3 color = mix(vec3(0.97, 0.94, 0.89), vec3(1.0, 0.78, 0.52), vSoplo * 0.6);
    gl_FragColor = vec4(color, suave * suave * vAlpha);
  }
`;

function Vapor() {
  const material = useRef<THREE.ShaderMaterial>(null);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOrigen: { value: new THREE.Vector2() },
      uEscala: { value: 1 },
      uPixelRatio: { value: 1 },
      uRaton: { value: new THREE.Vector2(1e5, 1e5) },
      uVelocidad: { value: new THREE.Vector2() },
      uInfluencia: { value: 0 },
      uInclinacion: { value: new THREE.Vector2() },
      uSoplo: { value: 0 },
    }),
    [],
  );

  // El canvas no recibe eventos (el texto del hero va encima), así que el puntero
  // se escucha en la ventana y se guarda en un ref: nada de esto re-renderiza.
  const lienzo = useThree((s) => s.gl.domElement);
  const puntero = useRef({ x: 0, y: 0, dentro: false, clic: false, previo: new THREE.Vector2(), hayPrevio: false });

  useEffect(() => {
    const hero = lienzo.closest('.home-hero');
    if (!hero) return;
    const mover = (e: PointerEvent) => {
      const r = lienzo.getBoundingClientRect();
      puntero.current.x = (e.clientX - r.left) / r.width;
      puntero.current.y = (e.clientY - r.top) / r.height;
      puntero.current.dentro = true;
    };
    const salir = () => {
      puntero.current.dentro = false;
      puntero.current.hayPrevio = false;
    };
    const clic = (e: PointerEvent) => {
      // Los botones del hero siguen siendo botones: no soplan.
      if ((e.target as Element).closest('button, a')) return;
      puntero.current.clic = true;
    };
    hero.addEventListener('pointermove', mover as EventListener);
    hero.addEventListener('pointerleave', salir);
    hero.addEventListener('pointerdown', clic as EventListener);
    return () => {
      hero.removeEventListener('pointermove', mover as EventListener);
      hero.removeEventListener('pointerleave', salir);
      hero.removeEventListener('pointerdown', clic as EventListener);
    };
  }, [lienzo]);

  // Misma cuenta que hace el navegador con `cover`: de px de la imagen a px del canvas
  // (cámara ortográfica: 1 unidad = 1 px, origen en el centro, y hacia arriba).
  const colocacion = useMemo(() => {
    const escala = Math.max(size.width / IMAGEN.ancho, size.height / IMAGEN.alto);
    const sobraX = size.width - IMAGEN.ancho * escala;
    const sobraY = size.height - IMAGEN.alto * escala;
    const px = sobraX * POSICION_FONDO.x + BOCA_VAPOR.x * escala;
    const py = sobraY * POSICION_FONDO.y + BOCA_VAPOR.y * escala;
    return { x: px - size.width / 2, y: size.height / 2 - py, escala };
  }, [size.width, size.height]);

  useFrame((_, delta) => {
    const m = material.current;
    if (!m) return;
    // Al volver de una pestaña oculta `delta` llega grande; se limita para que no salte.
    m.uniforms.uTime.value += Math.min(delta, 0.1);
    m.uniforms.uOrigen.value.set(colocacion.x, colocacion.y);
    m.uniforms.uEscala.value = colocacion.escala;
    m.uniforms.uPixelRatio.value = dpr;

    const p = puntero.current;
    const dt = Math.max(Math.min(delta, 0.1), 1e-3);
    const u = m.uniforms;
    const x = (p.x - 0.5) * size.width;
    const y = (0.5 - p.y) * size.height;
    if (p.dentro) {
      // Velocidad del puntero en px/s, suavizada para que el vapor siga el gesto y no el temblor.
      const vx = p.hayPrevio ? (x - p.previo.x) / dt : 0;
      const vy = p.hayPrevio ? (y - p.previo.y) / dt : 0;
      u.uVelocidad.value.x = THREE.MathUtils.damp(u.uVelocidad.value.x, THREE.MathUtils.clamp(vx, -2500, 2500), 6, dt);
      u.uVelocidad.value.y = THREE.MathUtils.damp(u.uVelocidad.value.y, THREE.MathUtils.clamp(vy, -2500, 2500), 6, dt);
      p.previo.set(x, y);
      p.hayPrevio = true;
      u.uRaton.value.set(x, y);
    } else {
      u.uVelocidad.value.multiplyScalar(Math.exp(-4 * dt));
    }
    u.uInfluencia.value = THREE.MathUtils.damp(u.uInfluencia.value, p.dentro ? 1 : 0, 3, dt);
    u.uInclinacion.value.x = THREE.MathUtils.damp(u.uInclinacion.value.x, p.dentro ? p.x * 2 - 1 : 0, 2, dt);
    u.uInclinacion.value.y = THREE.MathUtils.damp(u.uInclinacion.value.y, p.dentro ? 1 - p.y * 2 : 0, 2, dt);

    if (p.clic) {
      u.uSoplo.value = 1;
      p.clic = false;
    } else {
      u.uSoplo.value = THREE.MathUtils.damp(u.uSoplo.value, 0, 1.8, dt);
    }
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[POSICIONES, 3]} />
        <bufferAttribute attach="attributes-aSemilla" args={[SEMILLAS, 1]} />
        <bufferAttribute attach="attributes-aDesvio" args={[DESVIOS, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
      />
    </points>
  );
}

export function HumoPan() {
  const contenedor = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  // Fuera de pantalla no se anima: el hero es lo primero y casi siempre se deja atrás.
  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    const observador = new IntersectionObserver(([entrada]) => setVisible(entrada.isIntersecting));
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  return (
    <div className="home-hero-humo" ref={contenedor}>
      <Canvas
        orthographic
        camera={{ position: [0, 0, 10], zoom: 1 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
        frameloop={visible ? 'always' : 'never'}
      >
        <Vapor />
      </Canvas>
    </div>
  );
}
