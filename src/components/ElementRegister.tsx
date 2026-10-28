import type { Arista, Capa, Grafo, Nodo } from '../features/graph/types';
import { ETIQUETAS_CAPA } from '../features/graph/domain/dependencyRules';
import { useElementRegistration } from '../features/graph/hooks/useElementRegistration';

// En el orden en que se construye la red: cada capa necesita la anterior.
const LAYERS: Capa[] = ['proveedor', 'insumo', 'producto'];
const ID_PLACEHOLDER: Record<Capa, string> = {
  proveedor: 'PRV-...',
  insumo: 'INS-...',
  producto: 'PRD-...',
};

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
    layer, id, name, category, requiredIds, requiredLayer, candidates, message, sending,
    submit, setLayer, setId, setName, setCategory, setProviderId, toggleInsumo,
  } = useElementRegistration(grafo, onAddNode, onAddEdge);
  const sinRequisitos = requiredLayer !== null && candidates.length === 0;

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
          onChange={(event) => setLayer(event.target.value as Capa)}
        >
          {LAYERS.map((capa) => <option value={capa} key={capa}>{ETIQUETAS_CAPA[capa]}</option>)}
        </select>

        <label htmlFor="element-id">Identificador</label>
        <input
          id="element-id"
          value={id}
          placeholder={ID_PLACEHOLDER[layer]}
          onChange={(event) => setId(event.target.value)}
        />

        <label htmlFor="element-name">Nombre</label>
        <input id="element-name" value={name} onChange={(event) => setName(event.target.value)} />

        <label htmlFor="element-category">Categoría (opcional)</label>
        <input id="element-category" value={category} onChange={(event) => setCategory(event.target.value)} />

        {sinRequisitos && requiredLayer && (
          <p className="form-message">
            Primero registra un {ETIQUETAS_CAPA[requiredLayer].toLowerCase()}: este elemento debe enlazarse a uno.
          </p>
        )}

        {layer === 'insumo' && !sinRequisitos && (
          <>
            <label htmlFor="element-provider">Proveedor que lo abastece</label>
            <select
              id="element-provider"
              className={requiredIds.length ? 'layer-select proveedor' : 'layer-select'}
              value={requiredIds[0] ?? ''}
              onChange={(event) => setProviderId(event.target.value)}
            >
              <option value="">Selecciona el proveedor</option>
              {candidates.map((nodo) => <option value={nodo.id} key={nodo.id}>{nodo.nombre}</option>)}
            </select>
          </>
        )}

        {layer === 'producto' && !sinRequisitos && (
          <fieldset className="required-list">
            <legend>Insumos que requiere (al menos uno)</legend>
            {candidates.map((nodo) => (
              <label className="required-option" key={nodo.id}>
                <input
                  type="checkbox"
                  checked={requiredIds.includes(nodo.id)}
                  onChange={() => toggleInsumo(nodo.id)}
                />
                <span className="layer-dot insumo" />
                {nodo.nombre}
              </label>
            ))}
          </fieldset>
        )}

        <button
          className="primary-button register-submit"
          type="submit"
          disabled={sending || sinRequisitos}
        >
          {sending ? 'Registrando…' : 'Registrar elemento'} <span aria-hidden="true">→</span>
        </button>
        {message && <p className="form-message" role="status">{message}</p>}
      </form>
    </section>
  );
}
