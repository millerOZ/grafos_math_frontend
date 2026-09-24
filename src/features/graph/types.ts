export type Capa = 'producto' | 'insumo' | 'proveedor';

export interface Nodo {
  id: string;
  nombre: string;
  capa: Capa;
  categoria?: string;
}

export interface Arista {
  id: string;
  origen: string;
  destino: string;
  tipo: 'REQUIERE';
}

export interface Grafo {
  nodos: Nodo[];
  aristas: Arista[];
}
