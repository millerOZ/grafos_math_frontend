import { useMemo } from 'react';
import type { Grafo } from '../types';
import { calcularImpacto } from '../../../lib/impact';

export function useGraphImpact(grafo: Grafo, nodeId: string | null): Set<string> | null {
  return useMemo(
    () => (nodeId ? calcularImpacto(grafo, nodeId) : null),
    [grafo, nodeId],
  );
}
