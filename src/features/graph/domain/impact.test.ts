import { describe, expect, it } from 'vitest';
import { calcularImpacto } from '../../../lib/impact';
import type { Grafo } from '../types';

describe('calcularImpacto', () => {
  it('propaga el fallo desde un proveedor hasta los productos dependientes', () => {
    const graph: Grafo = {
      nodos: [
        { id: 'producto', nombre: 'Producto', capa: 'producto' },
        { id: 'insumo', nombre: 'Insumo', capa: 'insumo' },
        { id: 'proveedor', nombre: 'Proveedor', capa: 'proveedor' },
      ],
      aristas: [
        { id: 'e1', origen: 'producto', destino: 'insumo', tipo: 'REQUIERE' },
        { id: 'e2', origen: 'insumo', destino: 'proveedor', tipo: 'REQUIERE' },
      ],
    };

    expect(calcularImpacto(graph, 'proveedor')).toEqual(
      new Set(['proveedor', 'insumo', 'producto']),
    );
  });
});
