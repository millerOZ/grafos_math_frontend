import { useMemo, useState, type FormEvent } from 'react';
import type { Arista, Capa, Grafo } from '../features/graph/types';
import { ETIQUETAS_CAPA, esDependenciaPermitida } from '../features/graph/domain/dependencyRules';
import { crearDependencia } from '../features/graph/hooks/getProducts';

// Orden en que se listan los elementos en los selectores.
const ORDEN_CAPAS: Capa[] = ['producto', 'proceso', 'insumo', 'proveedor'];

/**
 * Conecta dos elementos que ya existen: "origen REQUIERE destino" (POST /dependencias).
 * El destino solo ofrece elementos que la regla de capas permite; el back vuelve a
 * validar existencia, repetidos y capas. Los ciclos no se bloquean: la F3 los reporta.
 */
export default function DependencyConnect({
  grafo,
  onAddEdge,
}: {
  grafo: Grafo;
  onAddEdge: (arista: Arista) => void;
}) {
  const [origenId, setOrigenId] = useState('');
  const [destinoId, setDestinoId] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const origen = grafo.nodos.find((nodo) => nodo.id === origenId);
  const origenes = useMemo(
    () => ORDEN_CAPAS.flatMap((capa) => grafo.nodos.filter((nodo) => (
      nodo.capa === capa && grafo.nodos.some((otro) => esDependenciaPermitida(nodo, otro))
    ))),
    [grafo.nodos],
  );
  const destinos = useMemo(
    () => (origen ? grafo.nodos.filter((nodo) => esDependenciaPermitida(origen, nodo)) : []),
    [grafo.nodos, origen],
  );
  const yaExiste = grafo.aristas.some((a) => a.origen === origenId && a.destino === destinoId);

  const cambiarOrigen = (id: string) => {
    setOrigenId(id);
    setDestinoId('');
    setMessage('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!origenId || !destinoId) {
      setMessage('Completa las dos partes de la frase.');
      return;
    }
    setSending(true);
    setMessage('');
    try {
      const arista = await crearDependencia({ origen: origenId, destino: destinoId });
      onAddEdge(arista);
      const nombre = (id: string) => grafo.nodos.find((nodo) => nodo.id === id)?.nombre ?? id;
      setMessage(`Guardado: para producir ${nombre(arista.origen)} se necesita ${nombre(arista.destino)}.`);
      setDestinoId('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo registrar la dependencia.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="register-card" aria-labelledby="connect-title">
      <h2 id="connect-title">Conectar</h2>
      <p className="register-card-ayuda">
        Completa la frase. Por ejemplo: para producir pan tajado necesito el proceso empacar.
      </p>
      <form onSubmit={(event) => void submit(event)}>
        <label htmlFor="connect-origin">Para producir…</label>
        <select
          id="connect-origin"
          className={`layer-select ${origen?.capa ?? ''}`}
          value={origenId}
          onChange={(event) => cambiarOrigen(event.target.value)}
        >
          <option value="">Elige un producto, proceso o insumo</option>
          {origenes.map((nodo) => (
            <option value={nodo.id} key={nodo.id}>
              {nodo.nombre} ({ETIQUETAS_CAPA[nodo.capa].toLowerCase()})
            </option>
          ))}
        </select>

        <label htmlFor="connect-target">…necesito</label>
        <select
          id="connect-target"
          className={`layer-select ${grafo.nodos.find((nodo) => nodo.id === destinoId)?.capa ?? ''}`}
          value={destinoId}
          disabled={!origen}
          onChange={(event) => { setDestinoId(event.target.value); setMessage(''); }}
        >
          <option value="">{origen ? "Elige lo que necesita" : "Primero completa «Para producir…»"}</option>
          {destinos.map((nodo) => (
            <option value={nodo.id} key={nodo.id}>
              {nodo.nombre} ({ETIQUETAS_CAPA[nodo.capa].toLowerCase()})
            </option>
          ))}
        </select>

        {yaExiste && <p className="form-message">Esta relación ya está guardada.</p>}

        <button
          className="primary-button register-submit"
          type="submit"
          disabled={sending || !origenId || !destinoId || yaExiste}
        >
          {sending ? "Guardando…" : "Guardar relación"}
        </button>
        {message && <p className="form-message" role="status">{message}</p>}
      </form>
    </section>
  );
}
