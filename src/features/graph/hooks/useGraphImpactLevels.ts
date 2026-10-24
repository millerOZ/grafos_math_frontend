import { useMemo } from 'react';
import type { Grafo } from '../types';
import { calcularNiveles } from '../../../lib/impact';

export function useGraphImpactLevels(grafo: Grafo, nodeId: string | null): Map<string, number> | null {
  return useMemo(
    () => (nodeId ? calcularNiveles(grafo, nodeId) : null),
    [grafo, nodeId],
  );
}
