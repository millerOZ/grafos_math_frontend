import type { Capa, Nodo } from '../types';

export interface ReglaDependencia {
  origen: Capa;
  destino: Capa;
  texto: string;
}

// Misma regla de capas que valida el back en POST /dependencias (data.py, REGLAS_CAPAS).
export const REGLAS_DEPENDENCIA: ReglaDependencia[] = [
  { origen: 'producto', destino: 'proceso', texto: 'Producto requiere proceso' },
  { origen: 'producto', destino: 'insumo', texto: 'Producto requiere insumo / infraestructura' },
  { origen: 'proceso', destino: 'proceso', texto: 'Proceso requiere un proceso previo' },
  { origen: 'proceso', destino: 'insumo', texto: 'Proceso requiere insumo / infraestructura' },
  { origen: 'insumo', destino: 'proveedor', texto: 'Insumo / infraestructura requiere proveedor' },
];

export const ETIQUETAS_CAPA: Record<Capa, string> = {
  producto: 'Producto',
  proceso: 'Proceso',
  insumo: 'Insumo / infraestructura',
  proveedor: 'Proveedor',
};

export function esDependenciaPermitida(origen: Nodo, destino: Nodo): boolean {
  return REGLAS_DEPENDENCIA.some(
    (regla) => regla.origen === origen.capa && regla.destino === destino.capa,
  );
}

/**
 * Capa que se exige al *crear* un elemento (los que ya existen se conectan
 * aparte con POST /dependencias). Un proceso se crea sin conexiones.
 */
export function siguienteCapa(capa: Capa): Capa | null {
  if (capa === 'producto') return 'insumo';
  if (capa === 'insumo') return 'proveedor';
  return null;
}
