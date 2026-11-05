import type { Grafo, Nodo } from '../types';

/**
 * Análisis de los procesos internos: ¿se pueden ordenar o se contradicen?
 *
 * Solo miran las aristas proceso -> proceso ("A requiere B" = B va antes que A).
 * - Un ciclo es una cadena de procesos que termina esperando por sí misma
 *   (A requiere B y B requiere A): ninguno puede empezar primero.
 * - Si no hay ciclos, el orden sale de ir tomando, etapa por etapa, los procesos
 *   que ya no tienen requisitos pendientes (ordenamiento topológico por niveles).
 *
 * Nota: la F3 del back debe hacer este mismo cálculo; esto le da a la vista una
 * respuesta inmediata mientras tanto.
 */

export interface Ciclo {
  /** Procesos en el orden del ciclo: cada uno requiere al siguiente, y el último al primero. */
  ids: string[];
}

export interface PlanProducto {
  producto: Nodo;
  /** Etapas de preparación (requisitos primero). null si algún proceso está en un ciclo. */
  etapas: string[][] | null;
  /** Índices de `ciclos` que bloquean este producto. */
  bloqueadoPor: number[];
}

export interface AnalisisProcesos {
  procesos: Nodo[];
  ciclos: Ciclo[];
  /** Ids de procesos que forman parte de algún ciclo. */
  enCiclo: Set<string>;
  /** Etapas de todos los procesos, o null si hay ciclos (no se presenta un orden falso). */
  etapas: string[][] | null;
  /** Productos que usan al menos un proceso. */
  planes: PlanProducto[];
  /** Productos que todavía no tienen procesos registrados. */
  sinProcesos: Nodo[];
}

export function analizarProcesos(grafo: Grafo): AnalisisProcesos {
  const porId = new Map(grafo.nodos.map((n) => [n.id, n]));
  const esProceso = (id: string) => porId.get(id)?.capa === 'proceso';
  const procesos = grafo.nodos.filter((n) => n.capa === 'proceso');

  // requisitos.get(A) = procesos que A requiere (A -> B)
  const requisitos = new Map<string, string[]>(procesos.map((p) => [p.id, []]));
  for (const a of grafo.aristas) {
    if (esProceso(a.origen) && esProceso(a.destino)) {
      const lista = requisitos.get(a.origen)!;
      if (!lista.includes(a.destino)) lista.push(a.destino);
    }
  }

  const ciclos = buscarCiclos(procesos.map((p) => p.id), requisitos);
  const enCiclo = new Set(ciclos.flatMap((c) => c.ids));
  const etapas = ciclos.length ? null : ordenarPorEtapas(procesos.map((p) => p.id), requisitos);

  const planes: PlanProducto[] = [];
  const sinProcesos: Nodo[] = [];
  for (const producto of grafo.nodos.filter((n) => n.capa === 'producto')) {
    const directos = grafo.aristas
      .filter((a) => a.origen === producto.id && esProceso(a.destino))
      .map((a) => a.destino);
    if (directos.length === 0) {
      sinProcesos.push(producto);
      continue;
    }
    const usados = alcanzables(directos, requisitos);
    const bloqueadoPor = ciclos
      .map((c, i) => (c.ids.some((id) => usados.has(id)) ? i : -1))
      .filter((i) => i >= 0);
    planes.push({
      producto,
      etapas: bloqueadoPor.length ? null : ordenarPorEtapas([...usados], requisitos),
      bloqueadoPor,
    });
  }

  return { procesos, ciclos, enCiclo, etapas, planes, sinProcesos };
}

/** Todos los procesos que hacen falta, directa o indirectamente, desde `inicio`. */
function alcanzables(inicio: string[], requisitos: Map<string, string[]>): Set<string> {
  const vistos = new Set<string>();
  const pila = [...inicio];
  while (pila.length) {
    const id = pila.pop()!;
    if (vistos.has(id)) continue;
    vistos.add(id);
    pila.push(...(requisitos.get(id) ?? []));
  }
  return vistos;
}

/**
 * Kahn por niveles: en cada etapa entran los procesos cuyos requisitos ya se
 * hicieron. Se asume que `ids` no tiene ciclos.
 */
function ordenarPorEtapas(ids: string[], requisitos: Map<string, string[]>): string[][] {
  const conjunto = new Set(ids);
  const pendientes = new Map(ids.map((id) => [
    id,
    (requisitos.get(id) ?? []).filter((r) => conjunto.has(r)).length,
  ]));
  // Quién espera a cada proceso (arista invertida).
  const esperan = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const id of ids) {
    for (const r of requisitos.get(id) ?? []) {
      if (conjunto.has(r)) esperan.get(r)!.push(id);
    }
  }

  const etapas: string[][] = [];
  let actual = ids.filter((id) => pendientes.get(id) === 0);
  while (actual.length) {
    etapas.push(actual);
    const siguiente: string[] = [];
    for (const id of actual) {
      for (const otro of esperan.get(id)!) {
        const resta = pendientes.get(otro)! - 1;
        pendientes.set(otro, resta);
        if (resta === 0) siguiente.push(otro);
      }
    }
    actual = siguiente;
  }
  return etapas;
}

/**
 * Componentes fuertemente conexas (Tarjan). Cada componente con más de un
 * proceso, o con un proceso que se requiere a sí mismo, contiene un ciclo; de
 * cada una se reporta el ciclo más corto que pasa por su primer proceso.
 */
function buscarCiclos(ids: string[], requisitos: Map<string, string[]>): Ciclo[] {
  let contador = 0;
  const indice = new Map<string, number>();
  const bajo = new Map<string, number>();
  const pila: string[] = [];
  const enPila = new Set<string>();
  const componentes: string[][] = [];

  const visitar = (v: string) => {
    indice.set(v, contador);
    bajo.set(v, contador);
    contador += 1;
    pila.push(v);
    enPila.add(v);
    for (const w of requisitos.get(v) ?? []) {
      if (!indice.has(w)) {
        visitar(w);
        bajo.set(v, Math.min(bajo.get(v)!, bajo.get(w)!));
      } else if (enPila.has(w)) {
        bajo.set(v, Math.min(bajo.get(v)!, indice.get(w)!));
      }
    }
    if (bajo.get(v) === indice.get(v)) {
      const componente: string[] = [];
      let w: string;
      do {
        w = pila.pop()!;
        enPila.delete(w);
        componente.push(w);
      } while (w !== v);
      componentes.push(componente);
    }
  };
  for (const id of ids) if (!indice.has(id)) visitar(id);

  const orden = new Map(ids.map((id, i) => [id, i]));
  return componentes
    .filter((c) => c.length > 1 || (requisitos.get(c[0]) ?? []).includes(c[0]))
    .map((c) => {
      const raiz = [...c].sort((a, b) => orden.get(a)! - orden.get(b)!)[0];
      return { ids: cicloMasCorto(raiz, new Set(c), requisitos) };
    })
    .sort((a, b) => orden.get(a.ids[0])! - orden.get(b.ids[0])!);
}

/** BFS desde `raiz` dentro de la componente hasta volver a ella. */
function cicloMasCorto(raiz: string, componente: Set<string>, requisitos: Map<string, string[]>): string[] {
  const padre = new Map<string, string | null>([[raiz, null]]);
  const cola = [raiz];
  while (cola.length) {
    const v = cola.shift()!;
    for (const w of requisitos.get(v) ?? []) {
      if (w === raiz) {
        const camino = [v];
        let p = padre.get(v);
        while (p) {
          camino.unshift(p);
          p = padre.get(p);
        }
        return camino;
      }
      if (componente.has(w) && !padre.has(w)) {
        padre.set(w, v);
        cola.push(w);
      }
    }
  }
  return [raiz];
}
