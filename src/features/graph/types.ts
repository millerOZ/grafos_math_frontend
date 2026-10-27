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

// --- Impacto: GET /impacto/{id} ---

export type CasoImpacto = 'inexistente' | 'sin_dependencias' | 'afecta_cadena';

export interface NodoImpactado {
  id: string;
  nombre: string;
  capa: Capa;
}

export interface NodoAfectado extends NodoImpactado {
  nivel: number;    // flechas desde el origen hasta este elemento
  camino: string[]; // ids desde el origen hasta este elemento
}

export interface ImpactoResponse {
  origen: NodoImpactado | null;
  caso: CasoImpacto;
  mensaje: string;
  visitados: string[];
  afectados: NodoAfectado[];
}

// --- Registro de elementos: POST /proveedores y POST /insumos ---

export interface ProveedorCreate {
  id: string;
  nombre: string;
  categoria?: string;
}

export interface InsumoCreate extends ProveedorCreate {
  proveedor_id: string;
}

export interface ProductoCreate extends ProveedorCreate {
  insumo_ids: string[]; // al menos uno
}
