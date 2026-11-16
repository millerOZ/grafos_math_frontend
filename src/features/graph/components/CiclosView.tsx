import { useState } from 'react';
import { eliminarDependencia } from '../hooks/getProducts';
import type { Grafo, OrdenProduccionResponse } from '../types';

interface CiclosViewProps {
  graph: Grafo;
  /** Respuesta de GET /orden-produccion: el back calcula el orden y los ciclos. */
  orden: OrdenProduccionResponse | null;
  error: string | null;
  cargando: boolean;
  /** Vuelve a pedir GET /grafo después de quitar dependencias en el back. */
  onGuardado: () => Promise<void>;
  /** Solo lo recibe el rol que puede registrar; producción solo consulta. */
  onOpenRegistro?: () => void;
}

/**
 * Panel de la vista de orden, al lado del mapa. Responde una sola pregunta del
 * coordinador de producción: ¿en qué orden preparo, o qué lo impide?
 *
 * - Orden válido: los pasos numerados.
 * - Ciclo: qué dependencias se contradicen (con botón para quitarlas) y qué
 *   productos quedan sin orden. El mapa marca el ciclo en rojo.
 */
export function CiclosView({ graph, orden, error, cargando, onGuardado, onOpenRegistro }: CiclosViewProps) {
  const nombre = (id: string) => graph.nodos.find((n) => n.id === id)?.nombre ?? id;
  // Dependencia que se está quitando ("origen>destino") y resultado del último intento.
  const [quitando, setQuitando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  /** Quita "origen necesita destino". Si la relación se registró repetida, se quitan todas. */
  const quitar = async (origen: string, destino: string) => {
    const ids = graph.aristas.filter((a) => a.origen === origen && a.destino === destino).map((a) => a.id);
    setQuitando(`${origen}>${destino}`);
    setAviso(null);
    let quitadas = 0;
    try {
      for (const id of ids) {
        await eliminarDependencia(id);
        quitadas += 1;
      }
      setAviso({ tipo: 'ok', texto: `Listo: ${nombre(origen)} ya no necesita ${nombre(destino)}.` });
    } catch (err) {
      setAviso({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo quitar la dependencia.' });
    }
    // Aunque falle a mitad, lo que sí se quitó en el back debe reflejarse en la red.
    if (quitadas > 0) {
      try {
        await onGuardado();
      } catch {
        setAviso({ tipo: 'error', texto: 'Se quitó en el back, pero no se pudo actualizar la red. Recarga la página.' });
      }
    }
    setQuitando(null);
  };

  if (!orden) {
    return (
      <div className={error ? 'orden-estado alerta' : 'orden-estado'} role={error ? 'alert' : undefined}>
        <h2>{error ? 'No se pudo consultar el orden' : 'Consultando el orden…'}</h2>
        {error && <p>{error}</p>}
      </div>
    );
  }

  if (orden.caso === 'sin_procesos') {
    return (
      <div className="orden-estado">
        <h2>Todavía no hay procesos</h2>
        <p>Cuando se registren y conecten, aquí aparece el orden de preparación.</p>
        {onOpenRegistro && (
          <button className="ciclos-accion" type="button" onClick={onOpenRegistro}>
            Ir a Registro
          </button>
        )}
      </div>
    );
  }

  const notas = (
    <>
      {error && <p className="orden-nota error" role="alert">No se pudo actualizar ({error}).</p>}
      {aviso && (
        <p className={aviso.tipo === 'ok' ? 'orden-nota' : 'orden-nota error'} role="status">
          {aviso.texto}
        </p>
      )}
    </>
  );

  if (orden.caso === 'orden_valido') {
    const etapas = orden.etapas ?? [];
    return (
      <section className="orden-panel" aria-labelledby="orden-titulo" aria-busy={cargando}>
        <div className="orden-estado ok">
          <h2 id="orden-titulo">Orden válido</h2>
          <p>Los pasos no se contradicen. Se preparan en este orden:</p>
        </div>
        <ol className="orden-pasos">
          {etapas.map((etapa, i) => (
            <li key={etapa.join('+')}>
              <span className="orden-numero" aria-hidden="true">{i + 1}</span>
              <span>
                {listar(etapa.map(nombre))}
                {etapa.length > 1 && <small> · a la vez</small>}
              </span>
            </li>
          ))}
        </ol>
        {notas}
      </section>
    );
  }

  const bloqueados = orden.planes.filter((p) => p.etapas === null).map((p) => p.producto.nombre);
  return (
    <section className="orden-panel" aria-labelledby="orden-titulo" aria-busy={cargando}>
      <div className="orden-estado alerta" role="alert">
        <h2 id="orden-titulo">Alerta: ciclo</h2>
        <p>Estos pasos se esperan entre sí, así que ninguno puede empezar.</p>
      </div>
      {orden.ciclos.map((ciclo) => (
        <ul className="orden-ciclo" key={ciclo.ids.join('>')}>
          {ciclo.ids.map((id, j) => {
            const requerido = ciclo.ids[(j + 1) % ciclo.ids.length];
            const clave = `${id}>${requerido}`;
            return (
              <li key={clave}>
                <span>
                  <strong>{nombre(id)}</strong> necesita <strong>{nombre(requerido)}</strong>
                </span>
                <button
                  className="ciclo-quitar"
                  type="button"
                  disabled={quitando !== null}
                  aria-label={`Quitar: ${nombre(id)} necesita ${nombre(requerido)}`}
                  onClick={() => void quitar(id, requerido)}
                >
                  {quitando === clave ? 'Quitando…' : 'Quitar'}
                </button>
              </li>
            );
          })}
        </ul>
      ))}
      <p className="orden-ayuda">Quita la dependencia que sobra y el orden se recalcula.</p>
      {bloqueados.length > 0 && (
        <p className="orden-bloqueo">
          Sin orden posible: <strong>{listar(bloqueados)}</strong>
        </p>
      )}
      {notas}
    </section>
  );
}

/** "a", "a y b", "a, b y c" */
function listar(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}
