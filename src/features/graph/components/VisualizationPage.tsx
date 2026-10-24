import { useGraphImpact } from "../hooks/useGraphImpact";
import type { Capa, Grafo, Nodo } from "../types";
import Graph3D from "../../../components/Graph3D";

const LEGEND = [
  { layer: "producto", color: "#3478f6", label: "Producto" },
  { layer: "insumo", color: "#e3a52f", label: "Insumo / infraestructura" },
  { layer: "proveedor", color: "#36a269", label: "Proveedor" },
  { layer: "afectado", color: "#e05252", label: "Afectado por el fallo" },
];

const CAPA_META: Record<Capa, { color: string; label: string }> = {
  producto: { color: "#3478f6", label: "Producto" },
  insumo: { color: "#e3a52f", label: "Insumo" },
  proveedor: { color: "#36a269", label: "Proveedor" },
};

function textoConsecuencia(capa: Capa, cantidad: number) {
  if (cantidad === 0) {
    return "Nadie más en la red depende de esto. El fallo se queda aquí.";
  }
  if (capa === "proveedor") {
    return cantidad === 1
      ? "Si este proveedor se detiene, queda sin abastecer:"
      : "Si este proveedor se detiene, quedan sin abastecer:";
  }
  if (capa === "insumo") {
    return "Si este insumo falta, no se puede elaborar:";
  }
  return "Si sale de servicio, también se ve afectado:";
}

interface VisualizationPageProps {
  graph: Grafo;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onBack: () => void;
}

export function VisualizationPage({
  graph,
  selectedId,
  onSelect,
  onBack,
}: VisualizationPageProps) {
  const impacted = useGraphImpact(graph, selectedId) ?? new Set<string>();
  const selectedNode = graph.nodos.find((node) => node.id === selectedId);
  const impactedNodes = graph.nodos.filter(
    (node) => impacted.has(node.id) && node.id !== selectedId,
  );

  

  return (
    <main className="visualization-view">
      <div className="graph-stage">
        <div className="graph-heading">
          <p className="eyebrow">Visualización</p>
          <h1>Red de dependencias</h1>
          <p>Selecciona un nodo para descubrir qué elementos dependen de él.</p>
        </div>
        <Graph3D grafo={graph} seleccionado={selectedId} onSelect={onSelect} />
      </div>
      <aside className="graph-panel">
        <div>
          <p className="panel-kicker">Mapa interactivo</p>
          <h2>Analiza el sistema</h2>
          <p className="panel-description">
            Haz clic en un nodo. El grafo resaltará todos los elementos que
            podrían verse afectados.
          </p>
        </div>
        <div className="legend">
          <p className="panel-label">Capas</p>
          {LEGEND.map((item) => (
            <div className="legend-item" key={item.layer}>
              <span style={{ background: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
        {selectedNode ? (
          <ImpactTicket node={selectedNode} afectados={impactedNodes} />
        ) : (
          <div className="empty-selection">
            <p>Toca un punto de la red para ver qué se cae con él.</p>
          </div>
        )}
        <button className="back-button" type="button" onClick={onBack}>
          Volver al inicio
        </button>
      </aside>
    </main>
  );
}

function ImpactTicket({ node, afectados }: { node: Nodo; afectados: Nodo[] }) {
  const meta = CAPA_META[node.capa];
  const consecuencia = textoConsecuencia(node.capa, afectados.length);

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
              <span className="impact-item-name">{item.nombre}</span>
              <span className="impact-item-capa">{CAPA_META[item.capa].label}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
