import type { Grafo } from '../features/graph/types';

export function calcularImpacto(grafo: Grafo, id: string): Set<string> {
  const afectados = new Set<string>([id]);
  let cambio = true;
  while (cambio) {
    cambio = false;
    for (const a of grafo.aristas) {
      if (afectados.has(a.destino) && !afectados.has(a.origen)) {
        afectados.add(a.origen);
        cambio = true;
      }
    }
  }
  return afectados;
}

/** Igual que calcularImpacto, pero registra en qué nivel (número de saltos
 * desde `id`) se contagia cada nodo, para animar la onda de contagio por etapas. */
export function calcularNiveles(grafo: Grafo, id: string): Map<string, number> {
  const niveles = new Map<string, number>([[id, 0]]);
  let frontera = [id];
  let nivel = 0;
  while (frontera.length > 0) {
    nivel += 1;
    const siguiente: string[] = [];
    for (const a of grafo.aristas) {
      if (frontera.includes(a.destino) && !niveles.has(a.origen)) {
        niveles.set(a.origen, nivel);
        siguiente.push(a.origen);
      }
    }
    frontera = siguiente;
  }
  return niveles;
}
