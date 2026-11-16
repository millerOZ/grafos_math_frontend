import type { Grafo } from '../types';

export interface GraphDataSource {
  /** GET /grafo: todos los nodos y aristas, tal como están en el back. */
  getGraph(): Promise<Grafo>;
}

interface GraphApiResponse {
  nodos: Grafo['nodos'];
  aristas: Grafo['aristas'];
}

/**
 * El `fetcher` se inyecta para poder probar el servicio sin red.
 * `apiUrl` es la URL base del back (sin "/grafo").
 */
export function createGraphDataSource(
  fetcher: typeof fetch,
  apiUrl: string,
): GraphDataSource {
  return {
    async getGraph() {
      const response = await fetcher(`${apiUrl}/grafo`);
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      const data = (await response.json()) as GraphApiResponse;
      return { nodos: data.nodos, aristas: data.aristas };
    },
  };
}
