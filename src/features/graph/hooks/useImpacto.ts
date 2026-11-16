import { useEffect, useState } from 'react';
import type { Grafo, ImpactoResponse } from '../types';
import { getImpacto } from './getProducts';

interface ImpactoState {
  impacto: ImpactoResponse | null;
  /** Última respuesta recibida, aunque sea de otro nodo; se borra al deseleccionar. */
  ultimoImpacto: ImpactoResponse | null;
  error: string | null;
  cargando: boolean;
}

interface Resultado {
  id: string;
  impacto: ImpactoResponse | null;
  error: string | null;
}

/**
 * Consulta GET /impacto/{id} cada vez que cambia el nodo seleccionado o la red
 * (`grafo`), para que el resultado no quede viejo tras registrar o quitar una
 * dependencia. Mientras llega la respuesta nueva se conserva la anterior.
 */
export function useImpacto(nodeId: string | null, grafo?: Grafo): ImpactoState {
  const [resultado, setResultado] = useState<Resultado | null>(null);
  if (nodeId === null && resultado) setResultado(null);

  useEffect(() => {
    if (nodeId === null) return;
    let cancelado = false;
    getImpacto(nodeId)
      .then((impacto) => {
        if (!cancelado) setResultado({ id: nodeId, impacto, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelado) {
          const error = err instanceof Error ? err.message : 'No se pudo consultar el impacto.';
          setResultado({ id: nodeId, impacto: null, error });
        }
      });
    // Si el usuario cambia de nodo antes de que llegue la respuesta, se descarta.
    return () => {
      cancelado = true;
    };
  }, [nodeId, grafo]);

  const actual = nodeId !== null && resultado?.id === nodeId ? resultado : null;
  return {
    impacto: actual?.impacto ?? null,
    ultimoImpacto: resultado?.impacto ?? null,
    error: actual?.error ?? null,
    cargando: nodeId !== null && !actual,
  };
}
