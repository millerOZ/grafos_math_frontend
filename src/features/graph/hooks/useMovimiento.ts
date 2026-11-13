import { useState } from 'react';

const STORAGE_KEY = 'abastecepyme.movimiento';

/** Respeta lo que el usuario eligió aquí; si no eligió, lo que pide su sistema. */
function leerMovimiento(): boolean {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado !== null) return guardado === 'si';
  } catch {
    // Sin almacenamiento disponible: se usa la preferencia del sistema.
  }
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useMovimiento(): [boolean, () => void] {
  const [movimiento, setMovimiento] = useState(leerMovimiento);

  const alternar = () => {
    const siguiente = !movimiento;
    setMovimiento(siguiente);
    try {
      localStorage.setItem(STORAGE_KEY, siguiente ? 'si' : 'no');
    } catch {
      // La elección solo dura esta sesión.
    }
  };

  return [movimiento, alternar];
}
