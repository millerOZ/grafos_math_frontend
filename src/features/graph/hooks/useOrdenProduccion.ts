import { useEffect, useState } from 'react';
import type { Grafo, OrdenProduccionResponse } from '../types';
import { getOrdenProduccion } from './getProducts';

interface OrdenState {
  orden: OrdenProduccionResponse | null;
  error: string | null;
  cargando: boolean;
}

interface Resultado {
  grafo: Grafo;
  orden: OrdenProduccionResponse | null;
  error: string | null;
}

/**
 * Consulta GET /orden-produccion cada vez que cambia la red (por ejemplo, al
 * registrar una dependencia). Mientras llega la respuesta nueva se conserva el
 * último orden recibido, para que la vista no parpadee.
 */
export function useOrdenProduccion(grafo: Grafo): OrdenState {
  const [resultado, setResultado] = useState<Resultado | null>(null);

  useEffect(() => {
    let cancelado = false;
    getOrdenProduccion()
      .then((orden) => {
        if (!cancelado) setResultado({ grafo, orden, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelado) {
          const error = err instanceof Error ? err.message : 'No se pudo consultar el orden de producción.';
          setResultado((anterior) => ({ grafo, orden: anterior?.orden ?? null, error }));
        }
      });
    // Si la red cambia otra vez antes de que llegue la respuesta, se descarta.
    return () => {
      cancelado = true;
    };
  }, [grafo]);

  const alDia = resultado?.grafo === grafo;
  return {
    orden: resultado?.orden ?? null,
    error: alDia ? resultado.error : null,
    cargando: !alDia,
  };
}
