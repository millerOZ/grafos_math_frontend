import type { Capa, Nodo } from '../types';

export interface ReglaDependencia {
  origen: Capa;
  destino: Capa;
  texto: string;
}

export const REGLAS_DEPENDENCIA: ReglaDependencia[] = [
  { origen: 'producto', destino: 'insumo', texto: 'Producto requiere insumo / infraestructura' },
  { origen: 'insumo', destino: 'proveedor', texto: 'Insumo / infraestructura requiere proveedor' },
];

export const ETIQUETAS_CAPA: Record<Capa, string> = {
  producto: 'Producto',
  insumo: 'Insumo / infraestructura',
  proveedor: 'Proveedor',
};

export function esDependenciaPermitida(origen: Nodo, destino: Nodo): boolean {
  return REGLAS_DEPENDENCIA.some(
    (regla) => regla.origen === origen.capa && regla.destino === destino.capa,
  );
}

export function siguienteCapa(capa: Capa): Capa | null {
  if (capa === 'producto') return 'insumo';
  if (capa === 'insumo') return 'proveedor';
  return null;
}
