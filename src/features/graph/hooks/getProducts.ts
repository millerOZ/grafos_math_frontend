import type {
  Arista,
  DependenciaCreate,
  Grafo,
  ImpactoResponse,
  InsumoCreate,
  Nodo,
  OrdenProduccionResponse,
  ProcesoCreate,
  ProductoCreate,
  ProveedorCreate,
} from "../types";
import { createGraphDataSource } from "../services/graphService";

// Para probar con el back local: crear .env.local con VITE_API_URL=http://127.0.0.1:8000
//const API_URL = import.meta.env.VITE_API_URL ?? "https://grafos-math-back.onrender.com";
const API_URL = "http://127.0.0.1:8000";

const graphApi = createGraphDataSource((...args) => fetch(...args), API_URL);

/**
 * Nodos y aristas en una sola llamada (GET /grafo). Es la única fuente del
 * grafo en el front: se pide al cargar y otra vez después de cada POST o DELETE,
 * así los ids de las aristas siempre son los que asignó el back.
 */
export function getGrafo(): Promise<Grafo> {
  return graphApi.getGraph();
}

// FastAPI responde los errores como { detail: "..." }, o una lista si el body no pasa la validación.
async function getErrorDetail(response: Response): Promise<string> {
  try {
    const { detail } = await response.json();
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map((item) => item.msg).join(", ");
  } catch {
    // el cuerpo no es JSON
  }
  return `Error HTTP: ${response.status}`;
}

async function post<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await getErrorDetail(response));
  }

  return (await response.json()) as T;
}

function postNode(endpoint: string, body: unknown): Promise<Nodo> {
  return post<Nodo>(endpoint, body);
}

export async function getImpacto(id: string): Promise<ImpactoResponse> {
  const response = await fetch(`${API_URL}/impacto/${encodeURIComponent(id)}`);

  // El back responde 404 cuando el elemento no existe. Se devuelve como caso
  // "inexistente" para que la vista maneje los tres casos de la misma forma.
  // 422: id vacío, con espacios o mal formado; no se confunde con "inexistente".
  if (response.status === 404 || response.status === 422) {
    return {
      origen: null,
      caso: response.status === 404 ? "inexistente" : "id_invalido",
      mensaje: await getErrorDetail(response),
      visitados: [],
      afectados: [],
    };
  }
  if (!response.ok) {
    throw new Error(`Error HTTP: ${response.status}`);
  }

  return (await response.json()) as ImpactoResponse;
}

// Siempre responde 200: el caso (sin_procesos | orden_valido | ciclo) viene en el cuerpo.
export async function getOrdenProduccion(): Promise<OrdenProduccionResponse> {
  const response = await fetch(`${API_URL}/orden-produccion`);
  if (!response.ok) {
    throw new Error(`Error HTTP: ${response.status}`);
  }

  return (await response.json()) as OrdenProduccionResponse;
}

export function crearProveedor(datos: ProveedorCreate): Promise<Nodo> {
  return postNode("proveedores", datos);
}

export function crearInsumo(datos: InsumoCreate): Promise<Nodo> {
  return postNode("insumos", datos);
}

export function crearProducto(datos: ProductoCreate): Promise<Nodo> {
  return postNode("productos", datos);
}

export function crearProceso(datos: ProcesoCreate): Promise<Nodo> {
  return postNode("procesos", datos);
}

// Conecta dos elementos que ya existen. El back valida existencia (404),
// arista repetida (409) y regla de capas (422); no rechaza ciclos.
export function crearDependencia(datos: DependenciaCreate): Promise<Arista> {
  return post<Arista>("dependencias", datos);
}

/**
 * POST /demo/reset: vuelve a los datos iniciales del back.
 * La clave la escribe quien presenta; no va en el código porque el
 * código del navegador lo puede leer cualquiera. 403 si es incorrecta.
 */
export async function reiniciarDemo(clave: string): Promise<Grafo> {
  const response = await fetch(`${API_URL}/demo/reset`, {
    method: "POST",
    headers: { "X-Demo-Token": clave },
  });
  if (!response.ok) {
    throw new Error(await getErrorDetail(response));
  }

  return (await response.json()) as Grafo;
}

// Quita una dependencia por id (404 si no existe). Sirve para romper un ciclo.
export async function eliminarDependencia(id: string): Promise<Arista> {
  const response = await fetch(`${API_URL}/dependencias/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(await getErrorDetail(response));
  }

  return (await response.json()) as Arista;
}
