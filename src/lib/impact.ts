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
