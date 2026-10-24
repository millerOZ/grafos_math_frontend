import type { Arista, Grafo } from '../features/graph/types';
import { ETIQUETAS_CAPA, REGLAS_DEPENDENCIA } from '../features/graph/domain/dependencyRules';
import { useDependencyRegistration } from '../features/graph/hooks/useDependencyRegistration';

export default function DependencyRegister({
  grafo,
  onAdd,
}: {
  grafo: Grafo;
  onAdd: (arista: Arista) => void;
}) {
  const {
    originId, targetId, message, origin, origins, targets, validEdges,
    submit, setOriginId, setTargetId,
  } = useDependencyRegistration(grafo, onAdd);

  return (
    <main className="register-view">
      <section className="register-intro">
        <p className="eyebrow">Registro de relaciones</p>
        <h1>Construye la red.</h1>
        <p className="register-description">
          Define qué elementos necesita cada parte del sistema. Solo se pueden conectar
          capas compatibles para conservar la estructura del grafo.
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

      <section className="register-card" aria-labelledby="register-title">
        <div className="register-card-heading">
          <div>
            <p className="panel-kicker">Nueva dependencia</p>
            <h2 id="register-title">Conectar elementos</h2>
          </div>
          <span className="counter-badge">{validEdges.length} registradas</span>
        </div>
        <form onSubmit={submit}>
          <label htmlFor="dependency-origin">Elemento que requiere</label>
          <select
            id="dependency-origin"
            className={origin ? `layer-select ${origin.capa}` : 'layer-select'}
            value={originId}
            onChange={(event) => setOriginId(event.target.value)}
          >
            <option value="">Selecciona el origen</option>
            {origins.map((nodo) => <option value={nodo.id} key={nodo.id}>{nodo.nombre}</option>)}
          </select>

          <label htmlFor="dependency-target">Elemento requerido</label>
          <select
            id="dependency-target"
            className={targetId ? `layer-select ${grafo.nodos.find((nodo) => nodo.id === targetId)?.capa}` : 'layer-select'}
            value={targetId}
            disabled={!origin}
            onChange={(event) => setTargetId(event.target.value)}
          >
            <option value="">{origin ? 'Selecciona el destino' : 'Primero elige un origen'}</option>
            {targets.map((nodo) => <option value={nodo.id} key={nodo.id}>{nodo.nombre}</option>)}
          </select>

          <button className="primary-button register-submit" type="submit">
            Registrar dependencia <span aria-hidden="true">→</span>
          </button>
          {message && <p className="form-message" role="status">{message}</p>}
        </form>
      </section>

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
