import type { Capa } from './types';

/**
 * Colores de la red, compartidos por el mapa 3D y los paneles. Cada capa tiene
 * un tono de hoja (claro, de fondo) y uno de nodo (más intenso, para el punto).
 */
export const CAPA_NODO: Record<Capa, string> = {
  proveedor: '#4ab494',
  insumo: '#f2af48',
  proceso: '#a584dc',
  producto: '#3ca2e0',
};

export const CAPA_HOJA: Record<Capa, string> = {
  proveedor: '#caf2e6',
  insumo: '#fbedb8',
  proceso: '#eae0ff',
  producto: '#caecff',
};

export const TINTA = '#272727';
export const TINTA_SUAVE = '#716d6e';
export const AFECTADO = '#e66e6d';
