import { useState } from 'react';
import { eliminarDependencia } from '../hooks/getProducts';
import type { Ciclo, Grafo, OrdenProduccionResponse } from '../types';

interface CiclosViewProps {
  graph: Grafo;
  /** Respuesta de GET /orden-produccion: el back calcula el orden y los ciclos. */
  orden: OrdenProduccionResponse | null;
  error: string | null;
  cargando: boolean;
  /** Se llama con los ids quitados en el back, para actualizar la red. */
  onRemoveDependencies: (ids: string[]) => void;
  /** Solo lo recibe el rol que puede registrar; producción solo consulta. */
  onOpenRegistro?: () => void;
}

/**
 * Responde dos preguntas del coordinador de producción:
 * ¿en qué orden preparo cada producto? y ¿hay pasos que se contradicen?
 */
export function CiclosView({ graph, orden, error, cargando, onRemoveDependencies, onOpenRegistro }: CiclosViewProps) {
  const nombre = (id: string) => graph.nodos.find((n) => n.id === id)?.nombre ?? id;
  // Frase del ciclo que se está quitando ("origen>destino") y resultado del último intento.
  const [quitando, setQuitando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  /** Quita "origen necesita destino". Si la relación se registró repetida, se quitan todas. */
  const quitar = async (origen: string, destino: string) => {
    const ids = graph.aristas.filter((a) => a.origen === origen && a.destino === destino).map((a) => a.id);
    setQuitando(`${origen}>${destino}`);
    setAviso(null);
    const quitadas: string[] = [];
    try {
      for (const id of ids) {
        await eliminarDependencia(id);
        quitadas.push(id);
      }
      setAviso({ tipo: 'ok', texto: `Se quitó: ${nombre(origen)} ya no necesita ${nombre(destino)}.` });
    } catch (err) {
      setAviso({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo quitar la dependencia.' });
    } finally {
      if (quitadas.length) onRemoveDependencies(quitadas);
      setQuitando(null);
    }
  };

  if (!orden) {
    return (
      <section className="ciclos-view">
        <div className={error ? 'ciclos-estado alerta' : 'ciclos-estado neutro'} role={error ? 'alert' : undefined}>
          <h2>{error ? 'No se pudo consultar el orden de producción' : 'Consultando el orden de producción…'}</h2>
          {error && <p>{error}</p>}
        </div>
      </section>
    );
  }

  const { ciclos, planes, sin_procesos: sinProcesos } = orden;
  const bloqueados = planes.filter((p) => p.etapas === null);

  if (orden.caso === 'sin_procesos') {
    return (
      <section className="ciclos-view">
        <div className="ciclos-estado neutro">
          <h2>Todavía no hay procesos registrados</h2>
          <p>
            Los procesos son los pasos que hace la panadería: amasar, hornear, empacar.
            {onOpenRegistro
              ? "Regístralos y conéctalos para ver aquí el orden de preparación."
              : "Cuando el responsable de compras los registre y conecte, verás aquí el orden de preparación."}
          </p>
          {onOpenRegistro && (
            <button className="ciclos-accion" type="button" onClick={onOpenRegistro}>
              Ir a Registro
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="ciclos-view" aria-labelledby="ciclos-titulo" aria-busy={cargando}>
      {error && (
        <p className="ciclos-nota" role="alert">
          No se pudo actualizar ({error}). Se muestra la última respuesta recibida.
        </p>
      )}
      {aviso && (
        <p className={aviso.tipo === 'ok' ? 'ciclos-nota' : 'ciclos-nota ciclos-nota-error'} role="status">
          {aviso.texto}
        </p>
      )}
      {orden.caso === 'orden_valido' ? (
        <div className="ciclos-estado ok">
          <h2 id="ciclos-titulo">Los pasos de producción no se contradicen</h2>
          <p>Cada producto tiene un orden de preparación posible. Abajo está, paso por paso.</p>
        </div>
      ) : (
        <div className="ciclos-estado alerta" role="alert">
          <h2 id="ciclos-titulo">
            {ciclos.length === 1
              ? 'Hay una contradicción entre procesos'
              : `Hay ${ciclos.length} contradicciones entre procesos`}
          </h2>
          <p>
            Algunos pasos terminan esperando por sí mismos, así que ninguno puede empezar primero.
            {bloqueados.length > 0 && (
              <> Mientras no se corrija, no hay un orden posible para {listar(bloqueados.map((p) => p.producto.nombre))}.</>
            )}
          </p>
        </div>
      )}

      {ciclos.length > 0 && (
        <div className="ciclos-bloque">
          <h3>Dónde está la contradicción</h3>
          <div className="ciclos-lista">
            {ciclos.map((ciclo, i) => (
              <article className="ciclo-card" key={ciclo.ids.join('>')}>
                <AnilloCiclo ciclo={ciclo} nombre={nombre} />
                <div>
                  <h4>{ciclos.length > 1 ? `Ciclo ${i + 1}` : 'El ciclo'}</h4>
                  <ul className="ciclo-frases">
                    {ciclo.ids.map((id, j) => {
                      const requerido = ciclo.ids[(j + 1) % ciclo.ids.length];
                      const clave = `${id}>${requerido}`;
                      return (
                        <li key={id}>
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
                  <p className="ciclo-ayuda">
                    {ciclo.ids.length === 1
                      ? 'Un proceso no puede necesitarse a sí mismo. Esa dependencia sobra.'
                      : 'Al menos una de estas dependencias está de más. Quiten la que no corresponde y el orden se recalcula.'}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {planes.length > 0 && (
        <div className="ciclos-bloque">
          <h3>Orden de preparación por producto</h3>
          <div className="planes">
            {planes.map((plan) => (
              <article className={plan.etapas ? 'plan' : 'plan bloqueado'} key={plan.producto.id}>
                <h4>{plan.producto.nombre}</h4>
                {plan.etapas ? (
                  <ol className="plan-pasos">
                    {plan.etapas.map((etapa, i) => (
                      <li key={etapa.join('+')}>
                        <span className="plan-numero" aria-hidden="true">{i + 1}</span>
                        <span className="plan-texto">
                          {listar(etapa.map(nombre))}
                          {etapa.length > 1 && <small>Se pueden hacer a la vez</small>}
                          <Insumos graph={graph} procesos={etapa} />
                        </span>
                      </li>
                    ))}
                    <li className="plan-final">
                      <span className="plan-numero" aria-hidden="true">✓</span>
                      <span className="plan-texto">{plan.producto.nombre} listo</span>
                    </li>
                  </ol>
                ) : (
                  <p className="plan-bloqueo">
                    Sin orden posible: usa {plan.bloqueado_por.length === 1 ? 'el ciclo' : 'los ciclos'}{' '}
                    {plan.bloqueado_por.map((i) => ciclos[i].ids.map(nombre).join(' → ')).join(' y ')}.
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      {sinProcesos.length > 0 && (
        <p className="ciclos-nota">
          {listar(sinProcesos.map((p) => p.nombre))}{' '}
          {sinProcesos.length === 1 ? 'todavía no tiene' : 'todavía no tienen'} procesos registrados:
          solo se conocen sus insumos.
        </p>
      )}
    </section>
  );
}

/** Insumos que consume una etapa, para que el paso se entienda sin abrir el mapa. */
function Insumos({ graph, procesos }: { graph: Grafo; procesos: string[] }) {
  const usados = graph.aristas
    .filter((a) => procesos.includes(a.origen))
    .map((a) => graph.nodos.find((n) => n.id === a.destino))
    .filter((n) => n?.capa === 'insumo')
    .map((n) => n!.nombre);
  if (usados.length === 0) return null;
  return <small>Usa {listar([...new Set(usados)].map((n) => n.toLowerCase()))}</small>;
}

/** El ciclo dibujado como un anillo: las flechas muestran quién espera a quién. */
function AnilloCiclo({ ciclo, nombre }: { ciclo: Ciclo; nombre: (id: string) => string }) {
  const tamano = 220;
  const centro = tamano / 2;
  const radio = ciclo.ids.length === 1 ? 0 : 68;
  const radioNodo = 9;
  const puntos = ciclo.ids.map((id, i) => {
    const angulo = -Math.PI / 2 + (i * 2 * Math.PI) / ciclo.ids.length;
    return { id, x: centro + radio * Math.cos(angulo), y: centro + radio * Math.sin(angulo), angulo };
  });
  const titulo = `${ciclo.ids.map(nombre).join(' necesita ')} necesita ${nombre(ciclo.ids[0])}`;

  return (
    <svg className="ciclo-anillo" viewBox={`-40 0 ${tamano + 80} ${tamano}`} role="img" aria-label={titulo}>
      <defs>
        <marker id="flecha-ciclo" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
        </marker>
      </defs>
      {ciclo.ids.length === 1 ? (
        <path
          d={`M ${centro - 6} ${centro - radioNodo} C ${centro - 40} ${centro - 70}, ${centro + 40} ${centro - 70}, ${centro + 6} ${centro - radioNodo - 2}`}
          className="ciclo-arco"
          markerEnd="url(#flecha-ciclo)"
        />
      ) : (
        puntos.map((p, i) => {
          const sig = puntos[(i + 1) % puntos.length];
          // Arco suave entre nodos vecinos, recortado para no tapar los círculos.
          const dx = sig.x - p.x;
          const dy = sig.y - p.y;
          const largo = Math.hypot(dx, dy);
          const ux = dx / largo;
          const uy = dy / largo;
          const x1 = p.x + ux * (radioNodo + 6);
          const y1 = p.y + uy * (radioNodo + 6);
          const x2 = sig.x - ux * (radioNodo + 4);
          const y2 = sig.y - uy * (radioNodo + 4);
          const cx = (x1 + x2) / 2 + (centro - (x1 + x2) / 2) * -0.35;
          const cy = (y1 + y2) / 2 + (centro - (y1 + y2) / 2) * -0.35;
          // "p necesita sig": la flecha va de sig a p, igual que en el mapa
          // (sigue el camino de lo que se entrega).
          return (
            <path
              key={p.id}
              d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
              className="ciclo-arco"
              markerStart="url(#flecha-ciclo)"
            />
          );
        })
      )}
      {puntos.map((p) => {
        // Etiqueta centrada: arriba del nodo en la mitad superior del anillo, abajo en la inferior.
        const abajo = ciclo.ids.length === 1 || Math.sin(p.angulo) > -0.2;
        return (
          <g key={p.id}>
            <circle cx={p.x} cy={p.y} r={radioNodo} className="ciclo-nodo" />
            <text x={p.x} y={p.y + (abajo ? 28 : -17)} textAnchor="middle" className="ciclo-etiqueta">
              {nombre(p.id)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** "a", "a y b", "a, b y c" */
function listar(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}
