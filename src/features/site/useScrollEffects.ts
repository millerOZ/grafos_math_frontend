import { useEffect, useRef, useState } from 'react';

const prefiereMenosMovimiento = () =>
  typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Parallax: escribe en la variable CSS `--parallax` cuánto se ha desplazado
 * el elemento respecto al centro de la pantalla (en px, ya multiplicado por
 * `velocidad`). El CSS decide qué mover con ella. Usa un solo rAF por frame.
 */
export function useParallax<T extends HTMLElement>(velocidad = 0.3) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefiereMenosMovimiento()) return;
    let frame = 0;
    const actualizar = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const centro = rect.top + rect.height / 2 - window.innerHeight / 2;
      el.style.setProperty('--parallax', `${(-centro * velocidad).toFixed(1)}px`);
    };
    const pedir = () => {
      if (!frame) frame = requestAnimationFrame(actualizar);
    };
    actualizar();
    window.addEventListener('scroll', pedir, { passive: true });
    window.addEventListener('resize', pedir);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', pedir);
      window.removeEventListener('resize', pedir);
    };
  }, [velocidad]);

  return ref;
}

/**
 * Progreso de lectura de una sección (0 cuando entra por abajo, 1 cuando su
 * final pasa por el centro). Se expone como `--progreso` para dibujar la línea
 * del día en el obrador.
 */
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefiereMenosMovimiento()) {
      el.style.setProperty('--progreso', '1');
      return;
    }
    let frame = 0;
    const actualizar = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const inicio = window.innerHeight * 0.75;
      const total = rect.height;
      const avance = Math.min(1, Math.max(0, (inicio - rect.top) / total));
      el.style.setProperty('--progreso', avance.toFixed(3));
    };
    const pedir = () => {
      if (!frame) frame = requestAnimationFrame(actualizar);
    };
    actualizar();
    window.addEventListener('scroll', pedir, { passive: true });
    window.addEventListener('resize', pedir);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', pedir);
      window.removeEventListener('resize', pedir);
    };
  }, []);

  return ref;
}

/** Marca `visible` la primera vez que el elemento entra en pantalla. */
export function useReveal<T extends HTMLElement>(umbral = 0.25) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(prefiereMenosMovimiento);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const observer = new IntersectionObserver(([entrada]) => {
      if (entrada.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: umbral });
    observer.observe(el);
    return () => observer.disconnect();
  }, [umbral, visible]);

  return [ref, visible] as const;
}
