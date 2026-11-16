import { describe, expect, it } from 'vitest';
import { EJEMPLOS_IMPACTO, resolverConsulta } from './consultaImpacto';
import type { Grafo } from '../types';

const GRAFO: Grafo = {
  nodos: [
    { id: 'PRV-QUIM', nombre: 'Distribuidora de químicos', capa: 'proveedor' },
    { id: 'INS-CONSERVANTE', nombre: 'Conservante', capa: 'insumo' },
  ],
  aristas: [{ id: 'e18', origen: 'INS-CONSERVANTE', destino: 'PRV-QUIM', tipo: 'REQUIERE' }],
};

describe('resolverConsulta', () => {
  it('selecciona en el mapa un id que está en la red', () => {
    expect(resolverConsulta(GRAFO, 'PRV-QUIM')).toEqual({ tipo: 'seleccionar', id: 'PRV-QUIM' });
  });

  it('consulta al back un id que no está en la red, sin decidir si es inválido o inexistente', () => {
    expect(resolverConsulta(GRAFO, 'PRV-NO-EXISTE')).toEqual({ tipo: 'consultar', id: 'PRV-NO-EXISTE' });
  });

  it('envía el id tal cual se escribió: no recorta ni pasa a mayúsculas', () => {
    for (const id of [' PRV-QUIM', 'prv-quim', 'PRV QUIM', '']) {
      expect(resolverConsulta(GRAFO, id)).toEqual({ tipo: 'consultar', id });
    }
  });

  it('trae un ejemplo por cada caso de GET /impacto', () => {
    expect(new Set(EJEMPLOS_IMPACTO.map((e) => e.caso))).toEqual(
      new Set(['afecta_cadena', 'sin_dependencias', 'inexistente', 'id_invalido']),
    );
  });
});
