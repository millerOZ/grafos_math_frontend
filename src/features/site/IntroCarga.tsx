import { useEffect, useState } from 'react';

/**
 * Intro corto de la portada, inspirado en la entrada de deltacafes.com:
 * fondo café, la frase entra partida en dos desde un desenfoque y luego
 * una cortina sube para mostrar la página. Se ve una vez por sesión.
 */
const CLAVE = 'bb-intro-visto';
const MINIMO_MS = 1900; // tiempo mínimo en pantalla antes de salir
const MAXIMO_MS = 4000; // si la página tarda más, sale igual
const SALIDA_MS = 950; // duración de la cortina

type Fase = 'entrada' | 'salida' | 'fin';

function debeMostrar(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    return sessionStorage.getItem(CLAVE) === null;
  } catch {
    return true;
  }
}

export function IntroCarga() {
  const [fase, setFase] = useState<Fase>(() => (debeMostrar() ? 'entrada' : 'fin'));
  const activo = fase !== 'fin';

  // Espera el tiempo mínimo y a que la página termine de cargar (con un tope).
  useEffect(() => {
    if (fase !== 'entrada') return;
    const inicio = performance.now();
    let salio = false;
    const salir = () => {
      if (salio) return;
      salio = true;
      setFase('salida');
    };
    const alCargar = () => {
      const resta = Math.max(0, MINIMO_MS - (performance.now() - inicio));
      window.setTimeout(salir, resta);
    };
    if (document.readyState === 'complete') alCargar();
    else window.addEventListener('load', alCargar, { once: true });
    const tope = window.setTimeout(salir, MAXIMO_MS);
    return () => {
      window.removeEventListener('load', alCargar);
      window.clearTimeout(tope);
    };
  }, [fase]);

  useEffect(() => {
    if (fase !== 'salida') return;
    const t = window.setTimeout(() => setFase('fin'), SALIDA_MS);
    return () => window.clearTimeout(t);
  }, [fase]);

  // Sin scroll mientras está la cortina; se marca como visto al terminar.
  useEffect(() => {
    if (!activo) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previo;
      try {
        sessionStorage.setItem(CLAVE, '1');
      } catch {
        /* sin almacenamiento: se volverá a ver, no pasa nada */
      }
    };
  }, [activo]);

  // Escape o clic la saltan.
  useEffect(() => {
    if (fase !== 'entrada') return;
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setFase('salida');
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [fase]);

  if (!activo) return null;

  return (
    <div
      className={`intro-carga ${fase === 'salida' ? 'saliendo' : ''}`}
      onClick={() => fase === 'entrada' && setFase('salida')}
      aria-hidden="true"
    >
      <div className="intro-frase">
        <span className="intro-izq">Bake &</span>
        <span className="intro-der">
          Brew · Medellín
        </span>
      </div>
      <div className="intro-linea" />
      <p className="intro-marca">Bake &amp; Brew · Medellín</p>
    </div>
  );
}
