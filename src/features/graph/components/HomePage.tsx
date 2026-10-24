import { Suspense } from 'react';
import { FloatingElements3D } from './FloatingElements3D';

interface HomePageProps {
  onOpenVisualization: () => void;
}

export function HomePage({ onOpenVisualization }: HomePageProps) {
  return (
    <main className="home-content-new">
      <div className="hero-section">
        <div className="hero-photo-wrap" aria-hidden="true">
          <img
            className="hero-photo"
            src="/images/home-buffet.jpg"
            alt=""
          />
          <div className="hero-photo-veil" />
        </div>

        <div className="hero-3d-background">
          <Suspense fallback={null}>
            <FloatingElements3D />
          </Suspense>
        </div>

        <div className="hero-content">
          <h1 className="hero-title">
            Cada producto cuenta<br />
            una historia de conexiones
          </h1>

          <p className="hero-subtitle">
            Desde el grano de café hasta tu taza. Desde la harina hasta el pan recién horneado.
            Cada elemento en tu negocio está conectado en una red de dependencias.
          </p>

          <button className="cta-button" type="button" onClick={onOpenVisualization}>
            Explorar la red
          </button>
        </div>
      </div>

      <section className="value-proposition">
        <div className="value-card">
          <h2>Trazabilidad completa</h2>
          <p>
            Rastrea cada insumo desde su origen. Conoce qué proveedores impactan
            tus productos y cómo una interrupción afecta tu inventario.
          </p>
        </div>

        <div className="value-card">
          <h2>Decisiones informadas</h2>
          <p>
            Identifica dependencias críticas antes de que se conviertan en problemas.
            Optimiza tu cadena de suministro visualizando el panorama completo.
          </p>
        </div>

        <div className="value-card">
          <h2>Relaciones visibles</h2>
          <p>
            Transforma datos complejos en redes claras. Descubre patrones ocultos
            y entiende cómo cada pieza encaja en el sistema.
          </p>
        </div>
      </section>

      <div className="context-note">
        <p>
          Esta herramienta te permite mapear y visualizar redes de dependencia
          en cualquier contexto: cadenas de suministro, infraestructura técnica,
          o relaciones entre componentes de un sistema.
        </p>
      </div>
    </main>
  );
}
