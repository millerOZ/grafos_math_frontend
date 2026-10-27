import type { Arista, Grafo, Nodo } from '../features/graph/types';
import { ETIQUETAS_CAPA } from '../features/graph/domain/dependencyRules';
import { useElementRegistration, type ElementLayer } from '../features/graph/hooks/useElementRegistration';

const LAYERS: ElementLayer[] = ['proveedor', 'insumo'];

export default function ElementRegister({
  grafo,
  onAddNode,
  onAddEdge,
}: {
  grafo: Grafo;
  onAddNode: (nodo: Nodo) => void;
  onAddEdge: (arista: Arista) => void;
}) {
  const {
    layer, id, name, category, providerId, message, sending, providers,
    submit, setLayer, setId, setName, setCategory, setProviderId,
  } = useElementRegistration(grafo, onAddNode, onAddEdge);

  return (
    <section className="register-card" aria-labelledby="element-title">
      <div className="register-card-heading">
        <div>
          <p className="panel-kicker">Nuevo elemento</p>
          <h2 id="element-title">Registrar en el catálogo</h2>
        </div>
      </div>
      <form onSubmit={submit}>
        <label htmlFor="element-layer">Tipo de elemento</label>
        <select
          id="element-layer"
          className={`layer-select ${layer}`}
          value={layer}
          onChange={(event) => setLayer(event.target.value as ElementLayer)}
        >
          {LAYERS.map((capa) => <option value={capa} key={capa}>{ETIQUETAS_CAPA[capa]}</option>)}
        </select>

        <label htmlFor="element-id">Identificador</label>
        <input
          id="element-id"
          value={id}
          placeholder={layer === 'proveedor' ? 'PRV-...' : 'INS-...'}
          onChange={(event) => setId(event.target.value)}
        />

        <label htmlFor="element-name">Nombre</label>
        <input id="element-name" value={name} onChange={(event) => setName(event.target.value)} />

        <label htmlFor="element-category">Categoría (opcional)</label>
        <input id="element-category" value={category} onChange={(event) => setCategory(event.target.value)} />

        {layer === 'insumo' && (
          <>
            <label htmlFor="element-provider">Proveedor que lo abastece</label>
            <select
              id="element-provider"
              className={providerId ? 'layer-select proveedor' : 'layer-select'}
              value={providerId}
              onChange={(event) => setProviderId(event.target.value)}
            >
              <option value="">Selecciona el proveedor</option>
              {providers.map((nodo) => <option value={nodo.id} key={nodo.id}>{nodo.nombre}</option>)}
            </select>
          </>
        )}

        <button className="primary-button register-submit" type="submit" disabled={sending}>
          {sending ? 'Registrando…' : 'Registrar elemento'} <span aria-hidden="true">→</span>
        </button>
        {message && <p className="form-message" role="status">{message}</p>}
      </form>
    </section>
  );
}
