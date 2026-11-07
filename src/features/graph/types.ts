export type Capa = 'producto' | 'proceso' | 'insumo' | 'proveedor';

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

// --- Orden y ciclos de producción: GET /orden-produccion ---

export type CasoOrden = 'sin_procesos' | 'orden_valido' | 'ciclo';

export interface Ciclo {
  /** Procesos en el orden del ciclo: cada uno requiere al siguiente, y el último al primero. */
  ids: string[];
  descripcion: string;
}

export interface PlanProducto {
  producto: NodoImpactado;
  /** Etapas de preparación (requisitos primero). null si algún proceso está en un ciclo. */
  etapas: string[][] | null;
  /** Índices de `ciclos` que bloquean este producto. */
  bloqueado_por: number[];
}

export interface OrdenProduccionResponse {
  caso: CasoOrden;
  mensaje: string;
  /** Etapas de todos los procesos, o null si hay ciclos (no se presenta un orden falso). */
  etapas: string[][] | null;
  ciclos: Ciclo[];
  /** Ids de procesos que forman parte de algún ciclo. */
  en_ciclo: string[];
  /** Productos que usan al menos un proceso. */
  planes: PlanProducto[];
  /** Productos que todavía no tienen procesos registrados. */
  sin_procesos: NodoImpactado[];
}

// --- Registro de elementos: POST /proveedores, /procesos, /insumos y /productos ---

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

export type ProcesoCreate = ProveedorCreate; // se crea sin conexiones

// --- Conectar dos elementos existentes: POST /dependencias ---

export interface DependenciaCreate {
  origen: string;  // origen REQUIERE destino
  destino: string;
}
