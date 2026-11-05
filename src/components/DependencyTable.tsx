import { useMemo, useState } from 'react';
import type { Arista, Nodo } from '../features/graph/types';
import { ETIQUETAS_CAPA } from '../features/graph/domain/dependencyRules';

const POR_PAGINA = 10;

interface Fila {
  arista: Arista;
  origen: Nodo;
  destino: Nodo;
}

// Sin tildes ni mayúsculas, para que "azucar" encuentre "Azúcar refinada".
const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const textoBuscable = (nodo: Nodo) => `${nodo.nombre} ${nodo.id} ${ETIQUETAS_CAPA[nodo.capa]}`;

export default function DependencyTable({ filas }: { filas: Fila[] }) {
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(0);

  const filtradas = useMemo(() => {
    const termino = normalizar(busqueda.trim());
    if (!termino) return filas;
    return filas.filter(({ origen, destino }) => (
      normalizar(`${textoBuscable(origen)} ${textoBuscable(destino)}`).includes(termino)
    ));
  }, [filas, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  // Si la lista se achica (por la búsqueda), no quedarse en una página que ya no existe.
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const inicio = paginaActual * POR_PAGINA;
  const visibles = filtradas.slice(inicio, inicio + POR_PAGINA);

  const buscar = (texto: string) => {
    setBusqueda(texto);
    setPagina(0);
  };

  return (
    <section className="dependency-list" aria-labelledby="dependency-list-title">
      <div className="list-heading">
        <h2 id="dependency-list-title">Relaciones guardadas</h2>
        <span className="list-count">{filas.length} en total</span>
      </div>

      <div className="dependency-search">
        <label htmlFor="dependency-search">Buscar</label>
        <input
          id="dependency-search"
          type="search"
          value={busqueda}
          placeholder="Harina, empacar, Molino…"
          onChange={(event) => buscar(event.target.value)}
        />
      </div>

      <table className="dependency-grid">
        <thead>
          <tr>
            <th scope="col">Ref.</th>
            <th scope="col">Para producir…</th>
            <th scope="col" aria-label="requiere" />
            <th scope="col">…necesito</th>
          </tr>
        </thead>
        <tbody>
          {visibles.map(({ arista, origen, destino }) => (
            <tr key={arista.id}>
              <td className="dependency-id">{arista.id}</td>
              <td><ElementoCelda nodo={origen} /></td>
              <td className="row-arrow" aria-hidden="true">→</td>
              <td><ElementoCelda nodo={destino} /></td>
            </tr>
          ))}
          {visibles.length === 0 && (
            <tr>
              <td className="dependency-empty" colSpan={4}>
                {busqueda.trim()
                  ? `Ninguna relación coincide con «${busqueda.trim()}».`
                  : 'Todavía no hay dependencias registradas.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="dependency-pager">
        <span>
          {filtradas.length === 0
            ? '0 resultados'
            : `${inicio + 1}–${inicio + visibles.length} de ${filtradas.length}`}
          {filtradas.length !== filas.length && ` (filtradas de ${filas.length})`}
        </span>
        <div className="pager-buttons">
          <button
            type="button"
            disabled={paginaActual === 0}
            onClick={() => setPagina(paginaActual - 1)}
          >
            Anterior
          </button>
          <span>Página {paginaActual + 1} de {totalPaginas}</span>
          <button
            type="button"
            disabled={paginaActual >= totalPaginas - 1}
            onClick={() => setPagina(paginaActual + 1)}
          >
            Siguiente
          </button>
        </div>
      </div>
    </section>
  );
}

function ElementoCelda({ nodo }: { nodo: Nodo }) {
  return (
    <span className="dependency-node">
      <span className={`layer-dot ${nodo.capa}`} />
      <span>
        {nodo.nombre}
        <small>{ETIQUETAS_CAPA[nodo.capa]} · {nodo.id}</small>
      </span>
    </span>
  );
}
