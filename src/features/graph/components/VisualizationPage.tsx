import { useGraphImpact } from '../hooks/useGraphImpact';
import type { Grafo } from '../types';
import Graph3D from '../../../components/Graph3D';

const LEGEND = [
  { layer: 'producto', color: '#3478f6', label: 'Producto' },
  { layer: 'insumo', color: '#e3a52f', label: 'Insumo / infraestructura' },
  { layer: 'proveedor', color: '#36a269', label: 'Proveedor' },
  { layer: 'afectado', color: '#e05252', label: 'Afectado por el fallo' },
];

interface VisualizationPageProps {
  graph: Grafo;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onBack: () => void;
}

export function VisualizationPage({ graph, selectedId, onSelect, onBack }: VisualizationPageProps) {
  const impacted = useGraphImpact(graph, selectedId) ?? new Set<string>();
  const selectedNode = graph.nodos.find((node) => node.id === selectedId);
  const impactedNodes = graph.nodos.filter(
    (node) => impacted.has(node.id) && node.id !== selectedId,
  );

  return (
    <main className="visualization-view">
      <div className="graph-stage">
        <div className="graph-heading"><p className="eyebrow">Visualización</p><h1>Red de dependencias</h1><p>Selecciona un nodo para descubrir qué elementos dependen de él.</p></div>
        <Graph3D grafo={graph} seleccionado={selectedId} onSelect={onSelect} />
      </div>
      <aside className="graph-panel">
        <div><p className="panel-kicker">Mapa interactivo</p><h2>Analiza el sistema</h2><p className="panel-description">Haz clic en un nodo. El grafo resaltará todos los elementos que podrían verse afectados.</p></div>
        <div className="legend"><p className="panel-label">Capas</p>{LEGEND.map((item) => <div className="legend-item" key={item.layer}><span style={{ background: item.color }} />{item.label}</div>)}</div>
        {selectedNode ? <div className="impact-card"><p className="panel-label">Nodo seleccionado</p><h3>{selectedNode.nombre}</h3><p>Si falla, afecta a <strong>{impactedNodes.length}</strong> elementos.</p><ul>{impactedNodes.map((node) => <li key={node.id}>{node.nombre}</li>)}</ul></div> : <div className="empty-selection"><span aria-hidden="true">＋</span><p>Selecciona un nodo para comenzar</p></div>}
        <button className="back-button" type="button" onClick={onBack}>← Volver al inicio</button>
      </aside>
    </main>
  );
}
