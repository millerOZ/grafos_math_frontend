import { useMemo, useState } from 'react';
import './App.css';
import Graph3D from './components/Graph3D';
import { MOCK_GRAFO } from './data/mockGraph';
import { calcularImpacto } from './lib/impact';

type Vista = 'inicio' | 'visualizacion';

const LEYENDA = [
  { capa: 'servicio', color: '#3478f6', label: 'Servicio' },
  { capa: 'insumo', color: '#e3a52f', label: 'Insumo / infraestructura' },
  { capa: 'proveedor', color: '#36a269', label: 'Proveedor' },
  { capa: 'afectado', color: '#e05252', label: 'Afectado por el fallo' },
];

function App() {
  const [vista, setVista] = useState<Vista>('inicio');
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  const afectados = useMemo(
    () => (seleccionado ? calcularImpacto(MOCK_GRAFO, seleccionado) : new Set<string>()),
    [seleccionado],
  );
  const nodoSel = MOCK_GRAFO.nodos.find((n) => n.id === seleccionado);
  const listaAfectados = MOCK_GRAFO.nodos.filter(
    (n) => afectados.has(n.id) && n.id !== seleccionado,
  );

  const abrirVisualizacion = () => {
    setSeleccionado(null);
    setVista('visualizacion');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => setVista('inicio')}>
          <span className="brand-mark" aria-hidden="true">∿</span>
          <span>Grafos</span>
        </button>
        <nav className="main-nav" aria-label="Navegación principal">
          <button className={vista === 'inicio' ? 'nav-link active' : 'nav-link'} type="button" onClick={() => setVista('inicio')}>
            Inicio
          </button>
          <button className={vista === 'visualizacion' ? 'nav-link active' : 'nav-link'} type="button" onClick={abrirVisualizacion}>
            Visualización
          </button>
        </nav>
        <span className="course-label">Matemáticas para la información</span>
      </header>

      {vista === 'inicio' ? (
        <main className="home-content">
          <section className="hero-copy">
            <p className="eyebrow">Explora las conexiones</p>
            <h1>Comprende el mundo<br /><em>a través de sus grafos.</em></h1>
            <p className="hero-description">
              Visualiza redes de dependencia, identifica relaciones y descubre qué elementos se ven afectados cuando algo falla.
            </p>
            <button className="primary-button" type="button" onClick={abrirVisualizacion}>
              Abrir visualización <span aria-hidden="true">→</span>
            </button>
          </section>

          <section className="home-preview" aria-label="Vista previa del grafo">
            <div className="preview-grid" aria-hidden="true" />
            <div className="preview-line line-one" aria-hidden="true" />
            <div className="preview-line line-two" aria-hidden="true" />
            <div className="preview-line line-three" aria-hidden="true" />
            <div className="preview-node node-a">A</div>
            <div className="preview-node node-b">B</div>
            <div className="preview-node node-c">C</div>
            <div className="preview-node node-d">D</div>
            <p>Red de dependencias</p>
          </section>

          <div className="feature-row">
            <div><strong>01</strong><span>Explora</span><p>Recorre cada nodo y sus conexiones.</p></div>
            <div><strong>02</strong><span>Analiza</span><p>Selecciona un elemento para ver su impacto.</p></div>
            <div><strong>03</strong><span>Comprende</span><p>Encuentra patrones en redes complejas.</p></div>
          </div>
        </main>
      ) : (
        <main className="visualization-view">
          <div className="graph-stage">
            <div className="graph-heading">
              <p className="eyebrow">Visualización</p>
              <h1>Red de dependencias</h1>
              <p>Selecciona un nodo para descubrir qué elementos dependen de él.</p>
            </div>
            <Graph3D grafo={MOCK_GRAFO} seleccionado={seleccionado} onSelect={setSeleccionado} />
          </div>
          <aside className="graph-panel">
            <div>
              <p className="panel-kicker">Mapa interactivo</p>
              <h2>Analiza el sistema</h2>
              <p className="panel-description">Haz clic en un nodo. El grafo resaltará todos los elementos que podrían verse afectados.</p>
            </div>
            <div className="legend">
              <p className="panel-label">Capas</p>
              {LEYENDA.map((item) => (
                <div className="legend-item" key={item.capa}>
                  <span style={{ background: item.color }} />{item.label}
                </div>
              ))}
            </div>
            {nodoSel ? (
              <div className="impact-card">
                <p className="panel-label">Nodo seleccionado</p>
                <h3>{nodoSel.nombre}</h3>
                <p>Si falla, afecta a <strong>{listaAfectados.length}</strong> elementos.</p>
                <ul>{listaAfectados.map((n) => <li key={n.id}>{n.nombre}</li>)}</ul>
              </div>
            ) : (
              <div className="empty-selection"><span aria-hidden="true">＋</span><p>Selecciona un nodo para comenzar</p></div>
            )}
            <button className="back-button" type="button" onClick={() => setVista('inicio')}>← Volver al inicio</button>
          </aside>
        </main>
      )}
    </div>
  );
}

export default App;
