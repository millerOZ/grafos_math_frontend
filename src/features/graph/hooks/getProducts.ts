import type { Arista, ImpactoResponse, InsumoCreate, Nodo, ProveedorCreate } from "../types";

// Para probar con el back local: crear .env.local con VITE_API_URL=http://127.0.0.1:8000
const API_URL = import.meta.env.VITE_API_URL ?? "https://grafos-math-back.onrender.com";
async function getNodes(endpoint: string): Promise<any[]>{
  const response = await fetch(`${API_URL}/${endpoint}`);

  if (!response.ok) {
    throw new Error(`Error HTTP: ${response.status}`);
  }

  return (await response.json()) as Nodo[];
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

async function postNode(endpoint: string, body: unknown): Promise<Nodo> {
  const response = await fetch(`${API_URL}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await getErrorDetail(response));
  }

  return (await response.json()) as Nodo;
}

export function getProducts(): Promise<Nodo[]> {
  return getNodes("productos");
}

export function getInsumos(): Promise<Nodo[]> {
  return getNodes("insumos");
}
export function getProveedores(): Promise<Nodo[]> {
  return getNodes("proveedores");
}
export function getAristas(): Promise<Arista[]> {
  return getNodes("aristas");
}

export async function getImpacto(id: string): Promise<ImpactoResponse> {
  const response = await fetch(`${API_URL}/impacto/${encodeURIComponent(id)}`);

  // El back responde 404 cuando el elemento no existe. Se devuelve como caso
  // "inexistente" para que la vista maneje los tres casos de la misma forma.
  if (response.status === 404) {
    return {
      origen: null,
      caso: "inexistente",
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

export function crearProveedor(datos: ProveedorCreate): Promise<Nodo> {
  return postNode("proveedores", datos);
}

export function crearInsumo(datos: InsumoCreate): Promise<Nodo> {
  return postNode("insumos", datos);
}
