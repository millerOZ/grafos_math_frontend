import { describe, expect, it } from 'vitest';
import { claveDependencia, nodosDeOrden, resaltarCiclos } from './ordenVista';
import type { Grafo, OrdenProduccionResponse } from '../types';

const ORDEN_BASE: OrdenProduccionResponse = {
  caso: 'orden_valido',
  mensaje: '',
  etapas: [['PRC-AMASAR'], ['PRC-HORNEAR']],
  ciclos: [],
  en_ciclo: [],
  planes: [],
  sin_procesos: [],
};

describe('resaltarCiclos', () => {
  it('no resalta nada sin respuesta o sin ciclos', () => {
    expect(resaltarCiclos(null)).toBeNull();
    expect(resaltarCiclos(ORDEN_BASE)).toBeNull();
  });

  it('marca los procesos del ciclo y cada dependencia, incluida la que cierra el ciclo', () => {
    const r = resaltarCiclos({
      ...ORDEN_BASE,
      caso: 'ciclo',
      etapas: null,
      ciclos: [{ ids: ['PRC-AMASAR', 'PRC-HORNEAR', 'PRC-FERMENTAR'], descripcion: '' }],
    });

    expect(r?.nodos).toEqual(new Set(['PRC-AMASAR', 'PRC-HORNEAR', 'PRC-FERMENTAR']));
    expect(r?.aristas).toEqual(new Set([
      claveDependencia('PRC-AMASAR', 'PRC-HORNEAR'),
      claveDependencia('PRC-HORNEAR', 'PRC-FERMENTAR'),
      claveDependencia('PRC-FERMENTAR', 'PRC-AMASAR'),
    ]));
  });

  it('un proceso que se requiere a sí mismo resalta su propia dependencia', () => {
    const r = resaltarCiclos({ ...ORDEN_BASE, caso: 'ciclo', ciclos: [{ ids: ['PRC-TAJAR'], descripcion: '' }] });

    expect(r?.aristas).toEqual(new Set([claveDependencia('PRC-TAJAR', 'PRC-TAJAR')]));
  });
});

describe('nodosDeOrden', () => {
  it('muestra solo los procesos y los productos que los usan', () => {
    const grafo: Grafo = {
      nodos: [
        { id: 'PRD-PAN', nombre: 'Pan', capa: 'producto' },
        { id: 'PRD-GALLETA', nombre: 'Galleta', capa: 'producto' },
        { id: 'PRC-HORNEAR', nombre: 'Hornear', capa: 'proceso' },
        { id: 'INS-HARINA', nombre: 'Harina', capa: 'insumo' },
        { id: 'PRV-MOLINO', nombre: 'Molino', capa: 'proveedor' },
      ],
      aristas: [
        { id: 'e1', origen: 'PRD-PAN', destino: 'PRC-HORNEAR', tipo: 'REQUIERE' },
        { id: 'e2', origen: 'PRC-HORNEAR', destino: 'INS-HARINA', tipo: 'REQUIERE' },
        { id: 'e3', origen: 'PRD-GALLETA', destino: 'INS-HARINA', tipo: 'REQUIERE' },
        { id: 'e4', origen: 'INS-HARINA', destino: 'PRV-MOLINO', tipo: 'REQUIERE' },
      ],
    };

    expect(nodosDeOrden(grafo)).toEqual(new Set(['PRC-HORNEAR', 'PRD-PAN']));
  });
});
