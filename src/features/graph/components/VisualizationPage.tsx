import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { EJEMPLOS_IMPACTO, resolverConsulta } from "../domain/consultaImpacto";
import { nodosDeOrden, resaltarCiclos } from "../domain/ordenVista";
import { useImpacto } from "../hooks/useImpacto";
import { useMovimiento } from "../hooks/useMovimiento";
import { AFECTADO, CAPA_HOJA, CAPA_NODO, CICLO } from "../paleta";
import type { Capa, Grafo, ImpactoResponse, Nodo, OrdenProduccionResponse } from "../types";
import Graph3D from "../../../components/Graph3D";
import { CiclosView } from "./CiclosView";
import { ExplicacionImpacto, ExplicacionOrden } from "./ComoSeCalcula";
import { ReiniciarDemo } from "./ReiniciarDemo";

/**
 * - "red": vista del responsable de compras. Muestra la red y, al tocar un nodo,
 *   qué necesita y qué habilita (sin análisis de impacto).
 * - "impacto": vista del coordinador de producción. Simula una falla.
 * - "orden": vista del coordinador de producción. Solo la cadena de procesos, con
 *   el ciclo en rojo si lo hay, y al lado el orden o qué dependencia quitar.
 */
export type ModoVisualizacion = "red" | "impacto" | "orden";

/** Qué es cada capa, dicho para alguien que no conoce de grafos. */
const LEGEND: { layer: Capa | "afectado"; color: string; label: string; detalle: string }[] = [
  { layer: "proveedor", color: CAPA_NODO.proveedor, label: "Proveedor", detalle: "quien nos vende" },
  { layer: "insumo", color: CAPA_NODO.insumo, label: "Insumo", detalle: "lo que compramos" },
  { layer: "proceso", color: CAPA_NODO.proceso, label: "Proceso", detalle: "lo que hacemos en la planta" },
  { layer: "producto", color: CAPA_NODO.producto, label: "Producto", detalle: "lo que vendemos" },
  { layer: "afectado", color: AFECTADO, label: "Afectado", detalle: "se detiene por la falla" },
];

const LEGEND_ORDEN: { layer: "proceso" | "producto" | "ciclo"; color: string; label: string }[] = [
  { layer: "proceso", color: CAPA_NODO.proceso, label: "Paso de preparación" },
  { layer: "producto", color: CAPA_NODO.producto, label: "Producto" },
  { layer: "ciclo", color: CICLO, label: "En ciclo" },
];

const CAPA_META: Record<Capa, { color: string; label: string }> = {
  producto: { color: CAPA_NODO.producto, label: "Producto" },
  proceso: { color: CAPA_NODO.proceso, label: "Proceso" },
  insumo: { color: CAPA_NODO.insumo, label: "Insumo" },
  proveedor: { color: CAPA_NODO.proveedor, label: "Proveedor" },
};

function textoConsecuencia(capa: Capa, cantidad: number) {
  if (cantidad === 0) {
    return "Nada más depende de esto. La falla se queda aquí.";
  }
  if (capa === "proveedor") {
    return cantidad === 1
      ? "Si este proveedor deja de entregar, se detiene:"
      : "Si este proveedor deja de entregar, se detienen:";
  }
  if (capa === "insumo") {
    return "Si este insumo falta, no se puede hacer:";
  }
  if (capa === "proceso") {
    return "Si este proceso se detiene, no se puede completar:";
  }
  return "Si sale de servicio, también se ve afectado:";
}

interface VisualizationPageProps {
  modo: ModoVisualizacion;
  graph: Grafo;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Respuesta de GET /orden-produccion (la consulta vive en App). */
  ordenProduccion: { orden: OrdenProduccionResponse | null; error: string | null; cargando: boolean };
  /** Vuelve a pedir GET /grafo después de quitar dependencias en el back. */
  onGuardado: () => Promise<void>;
  onBack: () => void;
  /** Solo existe para el rol que puede registrar (compras). */
  onOpenRegistro?: () => void;
}

export function VisualizationPage({
  modo,
  graph,
  selectedId,
  onSelect,
  ordenProduccion,
  onGuardado,
  onBack,
  onOpenRegistro,
}: VisualizationPageProps) {
  const esImpacto = modo === "impacto";
  // Id escrito a mano que no está en la red (inexistente o mal formado). Se consulta
  // igual en el back para mostrar su respuesta; tocar el mapa lo descarta.
  const [idManual, setIdManual] = useState<string | null>(null);
  const consultado = esImpacto ? (selectedId ?? idManual) : null;
  // El impacto solo se consulta en la vista de producción.
  const { impacto, ultimoImpacto, error, cargando } = useImpacto(consultado, graph);
  const [movimiento, alternarMovimiento] = useMovimiento();
  const selectedNode = graph.nodos.find((node) => node.id === selectedId);

  const seleccionar = (id: string | null) => {
    setIdManual(null);
    onSelect(id);
  };

  const consultarId = (idEscrito: string) => {
    const consulta = resolverConsulta(graph, idEscrito);
    if (consulta.tipo === "seleccionar") {
      seleccionar(consulta.id);
    } else {
      onSelect(null);
      setIdManual(consulta.id);
    }
  };
  // Nivel de contagio por nodo (origen = 0), tal como lo devuelve el back, para animar el grafo.
  const niveles = useMemo(() => {
    if (!impacto?.origen) return null;
    return new Map<string, number>([
      [impacto.origen.id, 0],
      ...impacto.afectados.map((item) => [item.id, item.nivel] as [string, number]),
    ]);
  }, [impacto]);

  // Con un nodo seleccionado solo se ven él y lo que impacta. Mientras llega la respuesta
  // se conserva el subgrafo anterior, para que el mapa completo no parpadee entre clics.
  const visibles = useMemo(() => {
    const referencia = impacto ?? ultimoImpacto;
    if (!referencia?.origen) return null;
    return new Set([referencia.origen.id, ...referencia.afectados.map((item) => item.id)]);
  }, [impacto, ultimoImpacto]);

  if (modo === "orden") {
    return (
      <VistaOrden
        graph={graph}
        ordenProduccion={ordenProduccion}
        movimiento={movimiento}
        alternarMovimiento={alternarMovimiento}
        onGuardado={onGuardado}
        onOpenRegistro={onOpenRegistro}
      />
    );
  }

  return (
    <main className="visualization-view">
      <div className="graph-stage">
        <Graph3D
          grafo={graph}
          visibles={visibles}
          seleccionado={selectedId}
          niveles={esImpacto ? niveles : null}
          movimiento={movimiento}
          onSelect={seleccionar}
        />
        <p className="graph-hint">
          {esImpacto && selectedId
            ? "Haz clic en un espacio vacío para volver al mapa completo."
            : "Arrastra para mover el mapa. Usa la rueda del mouse para acercarte."}
        </p>
        <button className="graph-movimiento" type="button" onClick={alternarMovimiento}>
          {movimiento ? "Pausar movimiento" : "Activar movimiento"}
        </button>
      </div>
      <aside className="graph-panel">
        {esImpacto && <ConsultaPorId onConsultar={consultarId} />}
        {esImpacto && !selectedNode && idManual !== null && (
          <ConsultaSinNodo id={idManual} impacto={impacto} error={error} cargando={cargando} />
        )}
        {selectedNode && esImpacto && (
          <ImpactTicket
            node={selectedNode}
            graph={graph}
            impacto={impacto}
            error={error}
            cargando={cargando}
          />
        )}
        {selectedNode && !esImpacto && <NodeDetail node={selectedNode} graph={graph} />}
        {!selectedNode && idManual === null && (
          <div className="empty-selection">
            <p>
              {esImpacto
                ? "Elige un punto del mapa para ver qué se cae con él."
                : "Elige un punto del mapa para ver sus dependencias directas."}
            </p>
          </div>
        )}
        {esImpacto && <ExplicacionImpacto />}
        {!esImpacto && onOpenRegistro && (
          <button className="ciclos-accion" type="button" onClick={onOpenRegistro}>
            Registrar elemento o dependencia
          </button>
        )}
        <div className="legend">
          <h2 className="legend-title">Cómo leer el mapa</h2>
          <p className="legend-intro">
            Las flechas siguen el camino del abastecimiento: del proveedor hasta el producto.
          </p>
          {LEGEND.map((item) => (
            <div className="legend-item" key={item.layer}>
              <span style={{ background: item.color }} />
              <strong>{item.label}</strong>
              <small>{item.detalle}</small>
            </div>
          ))}
        </div>
        <button className="back-button" type="button" onClick={onBack}>
          Volver al inicio
        </button>
      </aside>
    </main>
  );
}

const sinSeleccion = () => {};

/**
 * Vista de orden: el mapa muestra solo la cadena de preparación (procesos y los
 * productos que los usan) y, si hay un ciclo, lo marca en rojo. El panel dice
 * el orden o qué dependencia quitar. Nada más, para que se lea de un vistazo.
 */
function VistaOrden({
  graph,
  ordenProduccion,
  movimiento,
  alternarMovimiento,
  onGuardado,
  onOpenRegistro,
}: {
  graph: Grafo;
  ordenProduccion: VisualizationPageProps["ordenProduccion"];
  movimiento: boolean;
  alternarMovimiento: () => void;
  onGuardado: () => Promise<void>;
  onOpenRegistro?: () => void;
}) {
  const cadena = useMemo(() => nodosDeOrden(graph), [graph]);
  const ciclo = useMemo(() => resaltarCiclos(ordenProduccion.orden), [ordenProduccion.orden]);
  // Con un ciclo, por defecto el mapa muestra solo los procesos que lo forman.
  const [soloCiclo, setSoloCiclo] = useState(true);
  const verSoloCiclo = Boolean(ciclo) && soloCiclo;
  const visibles = verSoloCiclo && ciclo ? ciclo.nodos : cadena;

  return (
    <main className="visualization-view">
      <div className="graph-stage">
        <Graph3D
          grafo={graph}
          visibles={visibles}
          seleccionado={null}
          niveles={null}
          ciclo={ciclo}
          movimiento={movimiento}
          onSelect={sinSeleccion}
        />
        {ciclo && (
          <div className="vista-ciclo" role="radiogroup" aria-label="Qué parte del mapa ver">
            {[
              { valor: true, texto: "Solo el ciclo" },
              { valor: false, texto: "Toda la cadena" },
            ].map((opcion) => (
              <button
                key={opcion.texto}
                type="button"
                role="radio"
                aria-checked={soloCiclo === opcion.valor}
                className={soloCiclo === opcion.valor ? "activa" : undefined}
                onClick={() => setSoloCiclo(opcion.valor)}
              >
                {opcion.texto}
              </button>
            ))}
          </div>
        )}
        <p className="graph-hint">
          {verSoloCiclo
            ? "Solo los pasos que se esperan entre sí. Quita una de sus dependencias para romper el ciclo."
            : ciclo
              ? "En rojo: los pasos que se esperan entre sí."
              : "Las flechas van del primer paso al producto terminado."}
        </p>
        <button className="graph-movimiento" type="button" onClick={alternarMovimiento}>
          {movimiento ? "Pausar movimiento" : "Activar movimiento"}
        </button>
      </div>
      <aside className="graph-panel">
        <CiclosView graph={graph} {...ordenProduccion} onGuardado={onGuardado} onOpenRegistro={onOpenRegistro} />
        <ExplicacionOrden />
        <div className="legend legend-corta">
          {LEGEND_ORDEN.filter((item) => item.layer !== "ciclo" || ciclo).map((item) => (
            <div className="legend-item" key={item.layer}>
              <span style={{ background: item.color }} />
              <strong>{item.label}</strong>
            </div>
          ))}
        </div>
        <div className="orden-reinicio">
          <ReiniciarDemo onGuardado={onGuardado} />
        </div>
      </aside>
    </main>
  );
}

/**
 * Ficha de consulta para compras: solo relaciones directas.
 * Las aristas son "origen REQUIERE destino" (producto → insumo → proveedor),
 * así que las salientes son "lo que necesita" y las entrantes "a quién abastece".
 */
function NodeDetail({ node, graph }: { node: Nodo; graph: Grafo }) {
  const meta = CAPA_META[node.capa];
  const porId = (id: string) => graph.nodos.find((item) => item.id === id);
  const necesita = graph.aristas
    .filter((a) => a.origen === node.id)
    .map((a) => porId(a.destino))
    .filter((n): n is Nodo => Boolean(n));
  const habilita = graph.aristas
    .filter((a) => a.destino === node.id)
    .map((a) => porId(a.origen))
    .filter((n): n is Nodo => Boolean(n));

  const lista = (nodos: Nodo[], vacio: string) =>
    nodos.length === 0 ? (
      <p className="impact-consequence">{vacio}</p>
    ) : (
      <ul className="impact-list">
        {nodos.map((item) => (
          <li key={item.id}>
            <span className="impact-stitch" style={{ background: CAPA_META[item.capa].color }} />
            <span className="impact-item-name">{item.nombre}</span>
            <span className="impact-item-capa">{CAPA_META[item.capa].label}</span>
          </li>
        ))}
      </ul>
    );

  return (
    <article
      className="impact-card"
      aria-live="polite"
      style={{ "--hoja-capa": CAPA_HOJA[node.capa] } as CSSProperties}
    >
      <header className="impact-head">
        <h3 className="impact-name">{node.nombre}</h3>
        <p className="impact-kind">
          <span className="impact-stitch" style={{ background: meta.color }} />
          {meta.label} · <code>{node.id}</code>
        </p>
      </header>
      <p className="impact-consequence">
        <strong>Para producir {node.nombre} necesito:</strong>
      </p>
      {lista(necesita, "No requiere ningún elemento registrado.")}
      <p className="impact-consequence node-detail-gap">
        <strong>{node.nombre} abastece a:</strong>
      </p>
      {lista(habilita, "Todavía no abastece a ningún elemento.")}
    </article>
  );
}

interface ImpactTicketProps {
  node: Nodo;
  graph: Grafo;
  impacto: ImpactoResponse | null;
  error: string | null;
  cargando: boolean;
}

function ImpactTicket({ node, graph, impacto, error, cargando }: ImpactTicketProps) {
  const meta = CAPA_META[node.capa];
  const afectados = impacto?.afectados ?? [];
  let consecuencia: string;
  if (cargando) {
    consecuencia = "Consultando el impacto…";
  } else if (error) {
    consecuencia = `No se pudo consultar el impacto (${error}).`;
  } else if (impacto?.caso === "inexistente" || impacto?.caso === "id_invalido") {
    consecuencia = impacto.mensaje;
  } else {
    consecuencia = textoConsecuencia(node.capa, afectados.length);
  }
  const nombreDe = (id: string) =>
    graph.nodos.find((item) => item.id === id)?.nombre ?? id;

  return (
    <article
      className="impact-card"
      aria-live="polite"
      style={{ "--hoja-capa": CAPA_HOJA[node.capa] } as CSSProperties}
    >
      <header className="impact-head">
        <h3 className="impact-name">{node.nombre}</h3>
        <p className="impact-kind">
          <span className="impact-stitch" style={{ background: meta.color }} />
          {meta.label}
        </p>
      </header>
      <p className="impact-consequence">{consecuencia}</p>
      {afectados.length > 0 ? (
        <ul className="impact-list">
          {afectados.map((item) => (
            <li key={item.id}>
              <span
                className="impact-stitch"
                style={{ background: CAPA_META[item.capa].color }}
              />
              <span className="impact-item-name">
                {item.nombre}
                {item.nivel > 1 && (
                  <small className="impact-item-via">
                    vía {item.camino.slice(1, -1).map(nombreDe).join(" → ")}
                  </small>
                )}
              </span>
              <span className="impact-item-capa">{CAPA_META[item.capa].label}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

/**
 * Consulta escribiendo el id, además de tocar el mapa. Así se pueden mostrar en
 * la demo los cuatro casos de GET /impacto, incluidos los que no están en el
 * mapa: un elemento inexistente (404) y un dato inválido (422).
 */
function ConsultaPorId({ onConsultar }: { onConsultar: (id: string) => void }) {
  const [id, setId] = useState("");

  const enviar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onConsultar(id);
  };

  return (
    <form className="consulta-id" onSubmit={enviar}>
      <label htmlFor="consulta-id">Simular falla por id</label>
      <div className="consulta-id-fila">
        <input
          id="consulta-id"
          value={id}
          placeholder="PRV-QUIM"
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => setId(event.target.value)}
        />
        <button type="submit">Consultar</button>
      </div>
      <p className="consulta-id-ejemplos">
        <span>Probar:</span>
        {EJEMPLOS_IMPACTO.map((ejemplo) => (
          <button
            key={ejemplo.id}
            type="button"
            title={ejemplo.etiqueta}
            onClick={() => {
              setId(ejemplo.id);
              onConsultar(ejemplo.id);
            }}
          >
            <code>{ejemplo.id}</code>
          </button>
        ))}
      </p>
    </form>
  );
}

const TITULO_SIN_NODO: Partial<Record<ImpactoResponse["caso"], string>> = {
  id_invalido: "Dato inválido",
  inexistente: "No está en el catálogo",
};

const EXPLICACION_SIN_NODO: Partial<Record<ImpactoResponse["caso"], string>> = {
  id_invalido: "El id está mal escrito, así que no se buscó en el catálogo. Revisa el formato antes de volver a consultar.",
  inexistente: "El id está bien escrito, pero ningún elemento del catálogo lo usa. No hay nada que se detenga.",
};

/**
 * Respuesta para un id que no está en el mapa: el back dice si es un dato
 * inválido (422) o un elemento inexistente (404), y se muestran distinto.
 */
function ConsultaSinNodo({
  id,
  impacto,
  error,
  cargando,
}: {
  id: string;
  impacto: ImpactoResponse | null;
  error: string | null;
  cargando: boolean;
}) {
  const caso = impacto?.caso;
  const titulo = (caso && TITULO_SIN_NODO[caso]) ?? impacto?.origen?.nombre ?? "Consulta";
  let texto: string;
  if (cargando) texto = "Consultando el impacto…";
  else if (error) texto = `No se pudo consultar el impacto (${error}).`;
  else texto = impacto?.mensaje ?? "";

  return (
    <article className={`impact-card consulta-aviso ${caso ?? ""}`} aria-live="polite">
      <header className="impact-head">
        <h3 className="impact-name">{titulo}</h3>
        <p className="impact-kind">
          <code>{id === "" ? "(vacío)" : `"${id}"`}</code>
        </p>
      </header>
      <p className="impact-consequence">{texto}</p>
      {!cargando && !error && caso && EXPLICACION_SIN_NODO[caso] && (
        <p className="consulta-aviso-ayuda">{EXPLICACION_SIN_NODO[caso]}</p>
      )}
    </article>
  );
}
