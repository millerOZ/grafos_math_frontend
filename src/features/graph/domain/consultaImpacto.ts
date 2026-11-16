import type { CasoImpacto, Grafo } from '../types';

/**
 * Qué hacer con un id escrito a mano en la vista de impacto.
 *
 * - "seleccionar": el id está en la red; se selecciona en el mapa como si se
 *   hubiera tocado el nodo, así el grafo resalta la falla.
 * - "consultar": no está en la red que tiene el front. Se le pregunta igual al
 *   back, que decide si es un dato inválido (422) o un elemento inexistente
 *   (404). El front no valida el formato: el back es la única fuente de verdad.
 *
 * El id se envía tal cual se escribió (sin recortar espacios ni pasar a
 * mayúsculas), para que " PRV-QUIM" o "prv-quim" lleguen como dato inválido.
 */
export type ConsultaImpacto = { tipo: 'seleccionar'; id: string } | { tipo: 'consultar'; id: string };

export function resolverConsulta(grafo: Grafo, idEscrito: string): ConsultaImpacto {
  return grafo.nodos.some((nodo) => nodo.id === idEscrito)
    ? { tipo: 'seleccionar', id: idEscrito }
    : { tipo: 'consultar', id: idEscrito };
}

/** Ids de los datos de la demo, uno por cada caso de GET /impacto. */
export const EJEMPLOS_IMPACTO: { id: string; caso: CasoImpacto; etiqueta: string }[] = [
  { id: 'INS-LEVADURA', caso: 'afecta_cadena', etiqueta: 'Afecta una cadena' },
  { id: 'PRD-PAN', caso: 'sin_dependencias', etiqueta: 'Nadie depende de él' },
  { id: 'PRV-NO-EXISTE', caso: 'inexistente', etiqueta: 'No existe' },
  { id: 'prv quim', caso: 'id_invalido', etiqueta: 'Dato inválido' },
];
