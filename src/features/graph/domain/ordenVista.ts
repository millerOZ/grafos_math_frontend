import type { Grafo, OrdenProduccionResponse } from '../types';

/** Lo que el mapa pinta en rojo: procesos de algún ciclo y las dependencias que lo forman. */
export interface ResaltadoCiclo {
  nodos: Set<string>;
  /** Claves `claveDependencia(origen, destino)` de las aristas "origen REQUIERE destino" del ciclo. */
  aristas: Set<string>;
}

export const claveDependencia = (origen: string, destino: string) => `${origen}>${destino}`;

/**
 * Nodos: `en_ciclo` del back (todos los procesos que forman algún ciclo, según
 * Tarjan) más los ids de cada ciclo reportado.
 * Aristas: cada ciclo viene como `ids` donde cada proceso requiere al siguiente
 * y el último al primero; de ahí salen las dependencias a resaltar.
 * Sin ciclos, null.
 */
export function resaltarCiclos(orden: OrdenProduccionResponse | null): ResaltadoCiclo | null {
  if (!orden || (orden.ciclos.length === 0 && orden.en_ciclo.length === 0)) return null;
  const nodos = new Set<string>(orden.en_ciclo);
  const aristas = new Set<string>();
  for (const { ids } of orden.ciclos) {
    ids.forEach((id, i) => {
      nodos.add(id);
      aristas.add(claveDependencia(id, ids[(i + 1) % ids.length]));
    });
  }
  return { nodos, aristas };
}

/**
 * Nodos que se ven en la vista de orden: solo los procesos y los productos que
 * los usan. Proveedores e insumos no se ordenan, así que se ocultan para que el
 * mapa muestre únicamente la cadena de preparación.
 */
export function nodosDeOrden(grafo: Grafo): Set<string> {
  const procesos = new Set(grafo.nodos.filter((n) => n.capa === 'proceso').map((n) => n.id));
  const productos = grafo.nodos
    .filter((n) => n.capa === 'producto')
    .filter((n) => grafo.aristas.some((a) => a.origen === n.id && procesos.has(a.destino)))
    .map((n) => n.id);
  return new Set([...procesos, ...productos]);
}
