const API_URL = "http://localhost:8000";

export async function useAllNodes() {
  const response = await fetch(API_URL)

  if (!response) {
    throw new Error(`Error HTTP: ${response.status}`);
  }
  const data = await response.data;
  const auxObje = {
    nodos: data.node,
    aristas: data.aristas,
  };
  return auxObje;
}
