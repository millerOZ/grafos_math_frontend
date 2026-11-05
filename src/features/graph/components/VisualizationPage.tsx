import { useMemo } from "react";
import { useImpacto } from "../hooks/useImpacto";
import { analizarProcesos } from "../domain/ciclos";
import type { Capa, Grafo, ImpactoResponse, Nodo } from "../types";
import Graph3D from "../../../components/Graph3D";
import { CiclosView } from "./CiclosView";

/**
 * - "red": vista del responsable de compras. Muestra la red y, al tocar un nodo,
 *   qué necesita y qué habilita (sin análisis de impacto).
 * - "impacto": vista del coordinador de producción. Simula una falla.
 * - "orden": vista del coordinador de producción. Orden de preparación y ciclos.
 */
export type ModoVisualizacion = "red" | "impacto" | "orden";

/** Qué es cada capa, dicho para alguien que no conoce de grafos. */
const LEGEND: { layer: Capa | "afectado"; color: string; label: string; detalle: string }[] = [
  { layer: "proveedor", color: "#36a269", label: "Proveedor", detalle: "quien nos vende" },
  { layer: "insumo", color: "#e3a52f", label: "Insumo", detalle: "lo que compramos" },
  { layer: "proceso", color: "#8a5cd6", label: "Proceso", detalle: "lo que hacemos en la planta" },
  { layer: "producto", color: "#3478f6", label: "Producto", detalle: "lo que vendemos" },
  { layer: "afectado", color: "#c45c4a", label: "Afectado", detalle: "se detiene por la falla" },
];

const CAPA_META: Record<Capa, { color: string; label: string }> = {
  producto: { color: "#3478f6", label: "Producto" },
  proceso: { color: "#8a5cd6", label: "Proceso" },
  insumo: { color: "#e3a52f", label: "Insumo" },
  proveedor: { color: "#36a269", label: "Proveedor" },
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
  onBack: () => void;
  /** Solo existe para el rol que puede registrar (compras). */
  onOpenRegistro?: () => void;
}

export function VisualizationPage({
  modo,
  graph,
  selectedId,
  onSelect,
  onBack,
  onOpenRegistro,
}: VisualizationPageProps) {
  const analisis = useMemo(() => analizarProcesos(graph), [graph]);
  // El impacto solo se consulta en la vista de producción.
  const { impacto, error, cargando } = useImpacto(modo === "impacto" ? selectedId : null);
  const selectedNode = graph.nodos.find((node) => node.id === selectedId);
  // Nivel de contagio por nodo (origen = 0), tal como lo devuelve el back, para animar el grafo.
  const niveles = useMemo(() => {
    if (!impacto?.origen) return null;
    return new Map<string, number>([
      [impacto.origen.id, 0],
      ...impacto.afectados.map((item) => [item.id, item.nivel] as [string, number]),
    ]);
  }, [impacto]);

  const esImpacto = modo === "impacto";

  return (
    <main className={`visualization-view ${modo === "orden" ? "solo" : ""}`}>
      {modo !== "orden" ? (
        <>
          <div className="graph-stage">
            <Graph3D
              grafo={graph}
              seleccionado={selectedId}
              niveles={esImpacto ? niveles : null}
              onSelect={onSelect}
            />
            <p className="graph-hint">Arrastra para mover el mapa. Usa la rueda del mouse para acercarte.</p>
          </div>
          <aside className="graph-panel">
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
            {!selectedNode && (
              <div className="empty-selection">
                <p>
                  {esImpacto
                    ? "Elige un punto del mapa para ver qué se cae con él."
                    : "Elige un punto del mapa para ver sus dependencias directas."}
                </p>
              </div>
            )}
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
        </>
      ) : (
        <div className="ciclos-stage">
          <CiclosView graph={graph} analisis={analisis} onOpenRegistro={onOpenRegistro} />
        </div>
      )}
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
    <article className="impact-card" aria-live="polite">
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
  } else if (impacto?.caso === "inexistente") {
    consecuencia = impacto.mensaje;
  } else {
    consecuencia = textoConsecuencia(node.capa, afectados.length);
  }
  const nombreDe = (id: string) =>
    graph.nodos.find((item) => item.id === id)?.nombre ?? id;

  return (
    <article className="impact-card" aria-live="polite">
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
