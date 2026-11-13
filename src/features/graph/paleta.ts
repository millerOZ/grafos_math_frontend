import type { Capa } from './types';

/**
 * Colores de la red, compartidos por el mapa 3D y los paneles. Cada capa tiene
 * un tono de hoja (claro, de fondo) y uno de nodo (más intenso, para el punto).
 */
export const CAPA_NODO: Record<Capa, string> = {
  proveedor: '#3f7a3a',
  insumo: '#a87d0c',
  proceso: '#b8601c',
  producto: '#6b3a17',
};

export const CAPA_HOJA: Record<Capa, string> = {
  proveedor: '#e4ead6',
  insumo: '#f7efdc',
  proceso: '#f7ebe2',
  producto: '#eae3d7',
};

export const TINTA = '#54351a';
export const TINTA_SUAVE = '#7a6550';
export const AFECTADO = '#dc4a38';
/** Nodo elegido: más oscuro que el café de los productos, para no confundirlos. */
export const ACTIVO = '#24160a';
export const HILO = '#c8b8a2';
