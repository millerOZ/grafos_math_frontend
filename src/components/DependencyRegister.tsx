import { useMemo, useState, type FormEvent } from 'react';
import type { Arista, Capa, Grafo, Nodo } from '../data/mockGraph';

type ReglaDependencia = {
  origen: Capa;
  destino: Capa;
  texto: string;
};

const REGLAS: ReglaDependencia[] = [
  { origen: 'producto', destino: 'insumo', texto: 'Producto requiere insumo / infraestructura' },
  { origen: 'insumo', destino: 'proveedor', texto: 'Insumo / infraestructura requiere proveedor' },
];

const ETIQUETAS: Record<Capa, string> = {
  producto: 'Producto',
  insumo: 'Insumo / infraestructura',
  proveedor: 'Proveedor',
};

function reglaPermitida(origen: Nodo, destino: Nodo) {
  return REGLAS.some((regla) => regla.origen === origen.capa && regla.destino === destino.capa);
}

export default function DependencyRegister({
  grafo,
  onAdd,
}: {
  grafo: Grafo;
  onAdd: (arista: Arista) => void;
}) {
  const [origenId, setOrigenId] = useState('');
  const [destinoId, setDestinoId] = useState('');
  const [mensaje, setMensaje] = useState('');

  const origenes = useMemo(
    () => grafo.nodos.filter((nodo) => nodo.capa === 'producto' || nodo.capa === 'insumo'),
    [grafo.nodos],
  );
  const origen = grafo.nodos.find((nodo) => nodo.id === origenId);
  const destinos = useMemo(() => {
    if (!origen) return [];
    const destinoCapa = origen.capa === 'producto' ? 'insumo' : 'proveedor';
    return grafo.nodos.filter((nodo) => nodo.capa === destinoCapa);
  }, [grafo.nodos, origen]);

  const relacionesValidas = grafo.aristas.filter((arista) => {
    const nodoOrigen = grafo.nodos.find((nodo) => nodo.id === arista.origen);
    const nodoDestino = grafo.nodos.find((nodo) => nodo.id === arista.destino);
    return nodoOrigen && nodoDestino && reglaPermitida(nodoOrigen, nodoDestino);
  });

  const registrar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nodoOrigen = grafo.nodos.find((nodo) => nodo.id === origenId);
    const nodoDestino = grafo.nodos.find((nodo) => nodo.id === destinoId);

    if (!nodoOrigen || !nodoDestino || !reglaPermitida(nodoOrigen, nodoDestino)) {
      setMensaje('Selecciona una combinación válida de elementos.');
      return;
    }
    if (grafo.aristas.some((arista) => arista.origen === origenId && arista.destino === destinoId)) {
      setMensaje('Esta dependencia ya está registrada.');
      return;
    }

    onAdd({
      id: `e${String(grafo.aristas.length + 1).padStart(2, '0')}`,
      origen: origenId,
      destino: destinoId,
      tipo: 'REQUIERE',
    });
    setDestinoId('');
    setMensaje('Dependencia registrada correctamente.');
  };

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
          {REGLAS.map((regla) => (
            <div className="rule-item" key={`${regla.origen}-${regla.destino}`}>
              <span className={`layer-dot ${regla.origen}`} />
              <span>{ETIQUETAS[regla.origen]}</span>
              <span className="rule-arrow" aria-hidden="true">→</span>
              <span className={`layer-dot ${regla.destino}`} />
              <span>{ETIQUETAS[regla.destino]}</span>
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
          <span className="counter-badge">{relacionesValidas.length} registradas</span>
        </div>
        <form onSubmit={registrar}>
          <label htmlFor="dependency-origin">Elemento que requiere</label>
          <select
            id="dependency-origin"
            className={origen ? `layer-select ${origen.capa}` : 'layer-select'}
            value={origenId}
            onChange={(event) => { setOrigenId(event.target.value); setDestinoId(''); setMensaje(''); }}
          >
            <option value="">Selecciona el origen</option>
            {origenes.map((nodo) => <option value={nodo.id} key={nodo.id}>{nodo.nombre}</option>)}
          </select>

          <label htmlFor="dependency-target">Elemento requerido</label>
          <select
            id="dependency-target"
            className={destinoId ? `layer-select ${grafo.nodos.find((nodo) => nodo.id === destinoId)?.capa}` : 'layer-select'}
            value={destinoId}
            disabled={!origen}
            onChange={(event) => { setDestinoId(event.target.value); setMensaje(''); }}
          >
            <option value="">{origen ? 'Selecciona el destino' : 'Primero elige un origen'}</option>
            {destinos.map((nodo) => <option value={nodo.id} key={nodo.id}>{nodo.nombre}</option>)}
          </select>

          <button className="primary-button register-submit" type="submit">
            Registrar dependencia <span aria-hidden="true">→</span>
          </button>
          {mensaje && <p className="form-message" role="status">{mensaje}</p>}
        </form>
      </section>

      <section className="dependency-list" aria-labelledby="dependency-list-title">
        <div className="list-heading">
          <div>
            <p className="panel-kicker">Relaciones activas</p>
            <h2 id="dependency-list-title">Dependencias registradas</h2>
          </div>
          <span className="list-count">{relacionesValidas.length}</span>
        </div>
        <div className="dependency-table">
          {relacionesValidas.map((arista) => {
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
