export type Capa = 'servicio' | 'insumo' | 'proveedor';

export interface Nodo {
  id: string;
  nombre: string;
  capa: Capa;
  categoria?: string;
}

export interface Arista {
  id: string;
  origen: string;   // el que necesita
  destino: string;  // lo necesario
  tipo: 'REQUIERE';
}

export interface Grafo {
  nodos: Nodo[];
  aristas: Arista[];
}

export const MOCK_GRAFO: Grafo = {
  nodos: [
    // --- Servicios ---
    { id: 'SVC-AGUA',    nombre: 'Agua potable',           capa: 'servicio', categoria: 'Acueducto' },
    { id: 'SVC-ALC',     nombre: 'Alcantarillado',         capa: 'servicio', categoria: 'Saneamiento' },
    { id: 'SVC-SALUD',   nombre: 'Salud pública',          capa: 'servicio', categoria: 'Salud' },
    { id: 'SVC-METRO',   nombre: 'Metro',                  capa: 'servicio', categoria: 'Movilidad' },
    { id: 'SVC-BASURA',  nombre: 'Recolección de basuras', capa: 'servicio', categoria: 'Aseo' },
    { id: 'SVC-ENERGIA', nombre: 'Energía eléctrica',       capa: 'servicio', categoria: 'Energía' },

    // --- Insumos / infraestructura ---
    { id: 'INS-PLANTA',  nombre: 'Planta La Ayurá',              capa: 'insumo', categoria: 'Potabilización' },
    { id: 'INS-PTAR',    nombre: 'PTAR San Fernando',            capa: 'insumo', categoria: 'Tratamiento' },
    { id: 'INS-RED',     nombre: 'Red de acueducto',             capa: 'insumo', categoria: 'Distribución' },
    { id: 'INS-EMB-RG',  nombre: 'Embalse Riogrande',            capa: 'insumo', categoria: 'Embalse' },
    { id: 'INS-EMB-LF',  nombre: 'Embalse La Fe',                capa: 'insumo', categoria: 'Embalse' },
    { id: 'INS-EMB-MF',  nombre: 'Embalse Miraflores',           capa: 'insumo', categoria: 'Embalse' },
    { id: 'INS-QUIM',    nombre: 'Químicos de potabilización',   capa: 'insumo', categoria: 'Insumo químico' },
    { id: 'INS-SUB',     nombre: 'Subestación eléctrica',        capa: 'insumo', categoria: 'Energía' },
    { id: 'INS-CAMION',  nombre: 'Camiones recolectores',        capa: 'insumo', categoria: 'Flota' },
    { id: 'INS-VIAS',    nombre: 'Vías de acceso',               capa: 'insumo', categoria: 'Infraestructura' },
    { id: 'INS-RODANTE', nombre: 'Material rodante Metro',       capa: 'insumo', categoria: 'Flota' },

    // --- Proveedores ---
    { id: 'PRV-LLUVIA',  nombre: 'Lluvia / Clima (El Niño)', capa: 'proveedor', categoria: 'Clima' },
    { id: 'PRV-EPM',     nombre: 'EPM',                      capa: 'proveedor', categoria: 'Operador' },
    { id: 'PRV-QUIM',    nombre: 'Proveedor de químicos',    capa: 'proveedor', categoria: 'Abastecimiento' },
    { id: 'PRV-LAB',     nombre: 'Laboratorio de calidad',   capa: 'proveedor', categoria: 'Servicio' },
    { id: 'PRV-MANT',    nombre: 'Contratista mantenimiento',capa: 'proveedor', categoria: 'Servicio' },
    { id: 'PRV-PRADERA', nombre: 'Relleno La Pradera',       capa: 'proveedor', categoria: 'Disposición' },
  ],
  aristas: [
    // Servicio -> insumo
    { id: 'e01', origen: 'SVC-AGUA',    destino: 'INS-PLANTA',  tipo: 'REQUIERE' },
    { id: 'e02', origen: 'SVC-AGUA',    destino: 'INS-RED',     tipo: 'REQUIERE' },
    { id: 'e03', origen: 'SVC-ALC',     destino: 'INS-PTAR',    tipo: 'REQUIERE' },
    { id: 'e04', origen: 'SVC-ALC',     destino: 'INS-RED',     tipo: 'REQUIERE' },
    { id: 'e05', origen: 'SVC-SALUD',   destino: 'SVC-AGUA',    tipo: 'REQUIERE' },
    { id: 'e06', origen: 'SVC-SALUD',   destino: 'SVC-ALC',     tipo: 'REQUIERE' },
    { id: 'e07', origen: 'SVC-METRO',   destino: 'INS-SUB',     tipo: 'REQUIERE' },
    { id: 'e08', origen: 'SVC-METRO',   destino: 'INS-RODANTE', tipo: 'REQUIERE' },
    { id: 'e09', origen: 'SVC-BASURA',  destino: 'INS-CAMION',  tipo: 'REQUIERE' },
    { id: 'e10', origen: 'SVC-BASURA',  destino: 'INS-VIAS',    tipo: 'REQUIERE' },
    { id: 'e11', origen: 'SVC-BASURA',  destino: 'PRV-PRADERA', tipo: 'REQUIERE' },
    { id: 'e12', origen: 'SVC-ENERGIA', destino: 'INS-SUB',     tipo: 'REQUIERE' },

    // Insumo -> insumo / proveedor
    { id: 'e13', origen: 'INS-PLANTA',  destino: 'INS-EMB-RG',  tipo: 'REQUIERE' },
    { id: 'e14', origen: 'INS-PLANTA',  destino: 'INS-EMB-LF',  tipo: 'REQUIERE' },
    { id: 'e15', origen: 'INS-PLANTA',  destino: 'INS-EMB-MF',  tipo: 'REQUIERE' },
    { id: 'e16', origen: 'INS-PLANTA',  destino: 'INS-QUIM',    tipo: 'REQUIERE' },
    { id: 'e17', origen: 'INS-PLANTA',  destino: 'INS-SUB',     tipo: 'REQUIERE' },
    { id: 'e18', origen: 'INS-PLANTA',  destino: 'PRV-LAB',     tipo: 'REQUIERE' },
    { id: 'e19', origen: 'INS-RED',     destino: 'INS-SUB',     tipo: 'REQUIERE' },
    { id: 'e20', origen: 'INS-RED',     destino: 'PRV-MANT',    tipo: 'REQUIERE' },
    { id: 'e21', origen: 'INS-PTAR',    destino: 'PRV-MANT',    tipo: 'REQUIERE' },
    { id: 'e22', origen: 'INS-CAMION',  destino: 'PRV-MANT',    tipo: 'REQUIERE' },
    { id: 'e23', origen: 'INS-EMB-RG',  destino: 'PRV-LLUVIA',  tipo: 'REQUIERE' },
    { id: 'e24', origen: 'INS-EMB-LF',  destino: 'PRV-LLUVIA',  tipo: 'REQUIERE' },
    { id: 'e25', origen: 'INS-EMB-MF',  destino: 'PRV-LLUVIA',  tipo: 'REQUIERE' },
    { id: 'e26', origen: 'INS-QUIM',    destino: 'PRV-QUIM',    tipo: 'REQUIERE' },
    { id: 'e27', origen: 'INS-SUB',     destino: 'PRV-EPM',     tipo: 'REQUIERE' },
    { id: 'e28', origen: 'INS-RODANTE', destino: 'PRV-MANT',    tipo: 'REQUIERE' },
  ],
};