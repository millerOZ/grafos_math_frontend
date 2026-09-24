import { useState } from 'react';
import './App.css';
import DependencyRegister from './components/DependencyRegister';
import { HomePage } from './features/graph/components/HomePage';
import { VisualizationPage } from './features/graph/components/VisualizationPage';
import { MOCK_GRAFO } from './features/graph/data/mockGraph';
import type { Arista, Grafo } from './features/graph/types';

type View = 'inicio' | 'visualizacion' | 'registro';

function App() {
  const [view, setView] = useState<View>('inicio');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [graph, setGraph] = useState<Grafo>(MOCK_GRAFO);

  const openView = (nextView: View) => {
    setSelectedId(null);
    setView(nextView);
  };

  const addDependency = (edge: Arista) => {
    setGraph((current) => ({ ...current, aristas: [...current.aristas, edge] }));
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => openView('inicio')}><span className="brand-mark" aria-hidden="true">∿</span><span>Grafos</span></button>
        <nav className="main-nav" aria-label="Navegación principal">
          <button className={view === 'inicio' ? 'nav-link active' : 'nav-link'} type="button" onClick={() => openView('inicio')}>Inicio</button>
          <button className={view === 'visualizacion' ? 'nav-link active' : 'nav-link'} type="button" onClick={() => openView('visualizacion')}>Visualización</button>
          <button className={view === 'registro' ? 'nav-link active' : 'nav-link'} type="button" onClick={() => openView('registro')}>Registro</button>
        </nav>
        <span className="course-label">Matemáticas para la información</span>
      </header>
      {view === 'inicio' && <HomePage onOpenVisualization={() => openView('visualizacion')} />}
      {view === 'registro' && <DependencyRegister grafo={graph} onAdd={addDependency} />}
      {view === 'visualizacion' && <VisualizationPage graph={graph} selectedId={selectedId} onSelect={setSelectedId} onBack={() => openView('inicio')} />}
    </div>
  );
}

export default App;
