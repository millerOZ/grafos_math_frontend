import { describe, expect, it, vi } from 'vitest';
import { createGraphDataSource } from './graphService';
import type { Grafo } from '../types';

const GRAFO: Grafo = {
  nodos: [
    { id: 'INS-HARINA', nombre: 'Harina', capa: 'insumo' },
    { id: 'PRV-MOLINO', nombre: 'Molino', capa: 'proveedor' },
  ],
  aristas: [{ id: 'e14', origen: 'INS-HARINA', destino: 'PRV-MOLINO', tipo: 'REQUIERE' }],
};

describe('createGraphDataSource', () => {
  it('pide nodos y aristas en una sola llamada a GET /grafo', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(GRAFO), { status: 200 }));
    const api = createGraphDataSource(fetcher as unknown as typeof fetch, 'http://api');

    await expect(api.getGraph()).resolves.toEqual(GRAFO);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith('http://api/grafo');
  });

  it('usa los ids de arista que asigna el back, sin inventar ninguno', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(GRAFO), { status: 200 }));
    const api = createGraphDataSource(fetcher as unknown as typeof fetch, 'http://api');

    const grafo = await api.getGraph();
    expect(grafo.aristas.map((a) => a.id)).toEqual(['e14']);
  });

  it('falla con el código HTTP si el back responde error', async () => {
    const fetcher = vi.fn(async () => new Response('', { status: 500 }));
    const api = createGraphDataSource(fetcher as unknown as typeof fetch, 'http://api');

    await expect(api.getGraph()).rejects.toThrow('Error HTTP: 500');
  });
});
