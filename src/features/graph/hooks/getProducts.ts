import type { Arista, Nodo } from "../types";

//const API_URL = "http://127.0.0.1:8000";
const API_URL =
  "https://2abd-2800-e2-1d80-181f-11f0-7ab0-50bc-a429.ngrok-free.app";
async function getNodes(endpoint: string): Promise<any[]>{
  const response = await fetch(`${API_URL}/${endpoint}`);

  if (!response.ok) {
    throw new Error(`Error HTTP: ${response.status}`);
  }

  return (await response.json()) as Nodo[];
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