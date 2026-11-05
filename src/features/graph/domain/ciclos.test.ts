import { describe, expect, it } from 'vitest';
import { analizarProcesos } from './ciclos';
import type { Arista, Capa, Grafo } from '../types';

const nodo = (id: string, capa: Capa) => ({ id, nombre: id, capa });
let n = 0;
const req = (origen: string, destino: string): Arista => ({ id: `e${++n}`, origen, destino, tipo: 'REQUIERE' });

// Pan: Empacar -> Tajar -> Hornear -> Fermentar -> Amasar -> Harina
const panaderia = (): Grafo => ({
  nodos: [
    nodo('PAN', 'producto'), nodo('GALLETA', 'producto'),
    nodo('AMASAR', 'proceso'), nodo('FERMENTAR', 'proceso'), nodo('HORNEAR', 'proceso'),
    nodo('TAJAR', 'proceso'), nodo('EMPACAR', 'proceso'),
    nodo('HARINA', 'insumo'),
  ],
  aristas: [
    req('PAN', 'EMPACAR'), req('EMPACAR', 'TAJAR'), req('TAJAR', 'HORNEAR'),
    req('HORNEAR', 'FERMENTAR'), req('FERMENTAR', 'AMASAR'), req('AMASAR', 'HARINA'),
    req('GALLETA', 'HARINA'),
  ],
});

describe('analizarProcesos', () => {
  it('caso acíclico: da un orden válido, requisitos primero', () => {
    const r = analizarProcesos(panaderia());

    expect(r.ciclos).toEqual([]);
    expect(r.etapas).toEqual([['AMASAR'], ['FERMENTAR'], ['HORNEAR'], ['TAJAR'], ['EMPACAR']]);
    expect(r.planes).toHaveLength(1);
    expect(r.planes[0].producto.id).toBe('PAN');
    expect(r.planes[0].etapas?.flat()).toEqual(['AMASAR', 'FERMENTAR', 'HORNEAR', 'TAJAR', 'EMPACAR']);
    expect(r.sinProcesos.map((p) => p.id)).toEqual(['GALLETA']);
  });

  it('procesos independientes quedan en la misma etapa', () => {
    const g = panaderia();
    g.nodos.push(nodo('ETIQUETAR', 'proceso'));
    g.aristas.push(req('EMPACAR', 'ETIQUETAR'));

    expect(analizarProcesos(g).etapas?.[0]).toEqual(['AMASAR', 'ETIQUETAR']);
  });

  it('caso cíclico: reporta el ciclo y no presenta un orden falso', () => {
    const g = panaderia();
    g.aristas.push(req('AMASAR', 'HORNEAR')); // Hornear -> Fermentar -> Amasar -> Hornear

    const r = analizarProcesos(g);

    expect(r.ciclos).toEqual([{ ids: ['AMASAR', 'HORNEAR', 'FERMENTAR'] }]);
    expect([...r.enCiclo].sort()).toEqual(['AMASAR', 'FERMENTAR', 'HORNEAR']);
    expect(r.etapas).toBeNull();
    expect(r.planes[0]).toMatchObject({ etapas: null, bloqueadoPor: [0] });
  });

  it('un proceso que se requiere a sí mismo también es un ciclo', () => {
    const g = panaderia();
    g.aristas.push(req('TAJAR', 'TAJAR'));

    expect(analizarProcesos(g).ciclos).toEqual([{ ids: ['TAJAR'] }]);
  });

  it('un ciclo solo bloquea a los productos que lo usan', () => {
    const g = panaderia();
    g.nodos.push(nodo('PONQUE', 'producto'), nodo('GLASEAR', 'proceso'), nodo('DECORAR', 'proceso'));
    g.aristas.push(req('PONQUE', 'GLASEAR'), req('GLASEAR', 'DECORAR'), req('DECORAR', 'GLASEAR'));

    const r = analizarProcesos(g);
    const plan = (id: string) => r.planes.find((p) => p.producto.id === id)!;

    expect(r.ciclos).toHaveLength(1);
    expect(plan('PONQUE').etapas).toBeNull();
    expect(plan('PAN').etapas?.flat()).toEqual(['AMASAR', 'FERMENTAR', 'HORNEAR', 'TAJAR', 'EMPACAR']);
  });
});
