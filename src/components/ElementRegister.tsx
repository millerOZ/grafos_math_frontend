import type { Arista, Capa, Grafo, Nodo } from '../features/graph/types';
import { ETIQUETAS_CAPA } from '../features/graph/domain/dependencyRules';
import { useElementRegistration } from '../features/graph/hooks/useElementRegistration';

// En el orden en que se construye la red: cada capa necesita la anterior.
// El proceso no exige nada al crearse: se conecta después con "Conectar".
const LAYERS: Capa[] = ['proveedor', 'insumo', 'proceso', 'producto'];

// Ejemplos reales de una panadería y cafetería para orientar cada campo.
const EJEMPLO: Record<Capa, { id: string; nombre: string; ayuda: string }> = {
  proveedor: {
    id: 'PRV-MOLINO',
    nombre: 'Molino La Estrella',
    ayuda: 'La empresa que nos vende y nos entrega mercancía.',
  },
  insumo: {
    id: 'INS-MANTEQUILLA',
    nombre: 'Mantequilla sin sal',
    ayuda: 'Lo que compramos para preparar: harina, leche, café en grano, bolsas.',
  },
  proceso: {
    id: 'PRC-LAMINAR',
    nombre: 'Laminar masa hojaldre',
    ayuda: 'Un paso del obrador: amasar, fermentar, hornear, empacar.',
  },
  producto: {
    id: 'PRD-CROISSANT',
    nombre: 'Croissant de mantequilla',
    ayuda: 'Lo que vendemos en la vitrina o en la barra de café.',
  },
};

// Categorías que ya usa la panadería; se sugieren, pero se puede escribir otra.
const CATEGORIAS = [
  'Materia prima', 'Lácteos', 'Café y bebidas', 'Empaque',
  'Insumo químico', 'Panadería', 'Repostería', 'Barra de café',
];

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
      <h2 id="element-title">Agregar al catálogo</h2>
      <p className="register-card-ayuda">{EJEMPLO[layer].ayuda}</p>
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

        <label htmlFor="element-id">Código interno</label>
        <input
          id="element-id"
          value={id}
          placeholder={`Ej. ${EJEMPLO[layer].id}`}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => setId(event.target.value)}
        />

        <label htmlFor="element-name">Nombre</label>
        <input
          id="element-name"
          value={name}
          placeholder={`Ej. ${EJEMPLO[layer].nombre}`}
          onChange={(event) => setName(event.target.value)}
        />

        <label htmlFor="element-category">Categoría (opcional)</label>
        <input
          id="element-category"
          list="categorias-sugeridas"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        />
        <datalist id="categorias-sugeridas">
          {CATEGORIAS.map((c) => <option value={c} key={c} />)}
        </datalist>

        {sinRequisitos && requiredLayer && (
          <p className="form-message">
            Primero registra un {ETIQUETAS_CAPA[requiredLayer].toLowerCase()}: este elemento debe enlazarse a uno.
          </p>
        )}

        {layer === 'proceso' && (
          <p className="form-message">
            El proceso se crea suelto. Después, en «Conectar», indica qué insumos usa y qué paso va antes.
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
          {sending ? "Guardando…" : "Guardar en el catálogo"}
        </button>
        {message && <p className="form-message" role="status">{message}</p>}
      </form>
    </section>
  );
}
