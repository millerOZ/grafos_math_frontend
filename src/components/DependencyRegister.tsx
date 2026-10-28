import { useMemo } from 'react';
import type { Arista, Grafo, Nodo } from '../features/graph/types';
import { ETIQUETAS_CAPA, REGLAS_DEPENDENCIA, esDependenciaPermitida } from '../features/graph/domain/dependencyRules';
import ElementRegister from './ElementRegister';

export default function DependencyRegister({
  grafo,
  onAdd,
  onAddNode,
}: {
  grafo: Grafo;
  onAdd: (arista: Arista) => void;
  onAddNode: (nodo: Nodo) => void;
}) {
  const validEdges = useMemo(() => grafo.aristas.filter((edge) => {
    const edgeOrigin = grafo.nodos.find((node) => node.id === edge.origen);
    const edgeTarget = grafo.nodos.find((node) => node.id === edge.destino);
    return Boolean(edgeOrigin && edgeTarget && esDependenciaPermitida(edgeOrigin, edgeTarget));
  }), [grafo.aristas, grafo.nodos]);

  return (
    <main className="register-view">
      <section className="register-intro">
        <p className="eyebrow">Registro de elementos</p>
        <h1>Construye la red.</h1>
        <p className="register-description">
          Cada elemento nuevo se enlaza con la capa de la que depende: un insumo con su
          proveedor y un producto con sus insumos. Así la red conserva su estructura.
        </p>
        <div className="rule-list" aria-label="Reglas de conexión">
          {REGLAS_DEPENDENCIA.map((regla) => (
            <div className="rule-item" key={`${regla.origen}-${regla.destino}`}>
              <span className={`layer-dot ${regla.origen}`} />
              <span>{ETIQUETAS_CAPA[regla.origen]}</span>
              <span className="rule-arrow" aria-hidden="true">→</span>
              <span className={`layer-dot ${regla.destino}`} />
              <span>{ETIQUETAS_CAPA[regla.destino]}</span>
            </div>
          ))}
        </div>
      </section>

      <ElementRegister grafo={grafo} onAddNode={onAddNode} onAddEdge={onAdd} />

      <section className="dependency-list" aria-labelledby="dependency-list-title">
        <div className="list-heading">
          <div>
            <p className="panel-kicker">Relaciones activas</p>
            <h2 id="dependency-list-title">Dependencias registradas</h2>
          </div>
          <span className="list-count">{validEdges.length}</span>
        </div>
        <div className="dependency-table">
          {validEdges.map((arista) => {
            const nodoOrigen = grafo.nodos.find((nodo) => nodo.id === arista.origen)!;
            const nodoDestino = grafo.nodos.find((nodo) => nodo.id === arista.destino)!;
            return (
              <div className="dependency-row" key={arista.id}>
                <span className={`layer-dot ${nodoOrigen.capa}`} />
                <span>{nodoOrigen.nombre}</span>
                <span className="row-arrow" aria-hidden="true">→</span>
                <span className={`layer-dot ${nodoDestino.capa}`} />
                <span>{nodoDestino.nombre}</span>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
