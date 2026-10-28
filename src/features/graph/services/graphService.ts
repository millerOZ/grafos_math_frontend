import type { Grafo } from '../types';

export interface GraphDataSource {
  getGraph(): Promise<Grafo>;
}

interface GraphApiResponse {
  nodos: Grafo['nodos'];
  aristas: Grafo['aristas'];
}

export function createGraphDataSource(
  fetcher: typeof fetch,
  apiUrl: string,
): GraphDataSource {
  return {
    async getGraph() {
      const response = await fetcher(apiUrl);
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      const data = (await response.json()) as GraphApiResponse;
      return { nodos: data.nodos, aristas: data.aristas };
    },
  };
}
