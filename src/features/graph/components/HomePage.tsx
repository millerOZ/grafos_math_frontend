interface HomePageProps {
  onOpenVisualization: () => void;
}

export function HomePage({ onOpenVisualization }: HomePageProps) {
  return (
    <main className="home-content">
      <section className="hero-copy">
        <p className="eyebrow">Explora las conexiones</p>
        <h1>Comprende el mundo<br /><em>a través de sus grafos.</em></h1>
        <p className="hero-description">
          Visualiza redes de dependencia, identifica relaciones y descubre qué elementos
          se ven afectados cuando algo falla.
        </p>
        <button className="primary-button" type="button" onClick={onOpenVisualization}>
          Abrir visualización <span aria-hidden="true">→</span>
        </button>
      </section>
      <section className="home-preview" aria-label="Vista previa del grafo">
        <div className="preview-grid" aria-hidden="true" />
        <div className="preview-line line-one" aria-hidden="true" />
        <div className="preview-line line-two" aria-hidden="true" />
        <div className="preview-line line-three" aria-hidden="true" />
        <div className="preview-node node-a">A</div><div className="preview-node node-b">B</div>
        <div className="preview-node node-c">C</div><div className="preview-node node-d">D</div>
        <p>Red de dependencias</p>
      </section>
      <div className="feature-row">
        <div><strong>01</strong><span>Explora</span><p>Recorre cada nodo y sus conexiones.</p></div>
        <div><strong>02</strong><span>Analiza</span><p>Selecciona un elemento para ver su impacto.</p></div>
        <div><strong>03</strong><span>Comprende</span><p>Encuentra patrones en redes complejas.</p></div>
      </div>
    </main>
  );
}
