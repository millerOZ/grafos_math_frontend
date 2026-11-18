import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import DependencyRegister from "./components/DependencyRegister";
import musicaFondo from "./assets/New York Autumn Coffee Jazz ☕🍂 Relaxing Jazz Music for Cozy Days.mp3";
import { VisualizationPage } from "./features/graph/components/VisualizationPage";
import { HomePage, type DestinoSitio } from "./features/site/HomePage";
import { NosotrosPage } from "./features/site/NosotrosPage";
import { VisitanosPage } from "./features/site/VisitanosPage";
import { MOCK_GRAFO } from "./features/graph/data/mockGraph";
import { getGrafo } from "./features/graph/hooks/getProducts";
import { useOrdenProduccion } from "./features/graph/hooks/useOrdenProduccion";
import { useAlertaCiclo } from "./features/graph/hooks/useAlertaCiclo";
import type { Grafo } from "./features/graph/types";

type VistaPublica = "inicio" | "nosotros" | "visitanos";
type VistaPanel = "registro" | "red" | "impacto" | "orden";
type View = VistaPublica | VistaPanel;
type Rol = "compras" | "produccion";

/** Páginas del sitio de la panadería: las ve cualquiera, sin importar el rol. */
const VISTAS_PUBLICAS: { id: VistaPublica; label: string }[] = [
  { id: "inicio", label: "Inicio" },
  { id: "nosotros", label: "Nosotros" },
  { id: "visitanos", label: "Visítanos" },
];

/**
 * Panel del equipo. Cada usuario del brief ve solo lo que necesita:
 * - Responsable de compras: registra proveedores, insumos y dependencias.
 * - Coordinador de producción: consulta impacto y orden de preparación.
 * Por ahora el rol se elige con un switch (no hay autenticación).
 */
const ROLES: Record<Rol, { label: string; vistas: { id: VistaPanel; label: string }[] }> = {
  compras: {
    label: "Compras",
    vistas: [
      { id: "registro", label: "Registro" },
      { id: "red", label: "Red" },
    ],
  },
  produccion: {
    label: "Producción",
    vistas: [
      { id: "impacto", label: "Impacto" },
      { id: "orden", label: "Orden y ciclos" },
    ],
  },
};

const esPublica = (vista: View): vista is VistaPublica =>
  VISTAS_PUBLICAS.some((v) => v.id === vista);

const ROL_DESCRIPCION: Record<Rol, string> = {
  compras: "Responsable de compras",
  produccion: "Coordinador de producción",
};

const ROL_STORAGE_KEY = "abastecepyme.rol";

function leerRolGuardado(): Rol {
  try {
    return localStorage.getItem(ROL_STORAGE_KEY) === "produccion" ? "produccion" : "compras";
  } catch {
    return "compras";
  }
}

function App() {
  const [rol, setRol] = useState<Rol>(leerRolGuardado);
  const [view, setView] = useState<View>("inicio");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [graph, setGraph] = useState<Grafo>(MOCK_GRAFO);
  const ultimaRecarga = useRef(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Se consulta aquí (y no en la vista) porque la navegación también avisa los ciclos.
  const ordenProduccion = useOrdenProduccion(graph);
  const totalCiclos = ordenProduccion.orden?.ciclos.length ?? 0;
  useAlertaCiclo(ordenProduccion.orden ? totalCiclos : null);

  const resumen = useMemo(() => ({
    proveedores: graph.nodos.filter((n) => n.capa === "proveedor").length,
    insumos: graph.nodos.filter((n) => n.capa === "insumo").length,
    productos: graph.nodos.filter((n) => n.capa === "producto").length,
  }), [graph.nodos]);

  const openView = (nextView: View) => {
    setSelectedId(null);
    setView(nextView);
    window.scrollTo({ top: 0 });
  };

  const cambiarRol = (siguiente: Rol) => {
    if (siguiente === rol) return;
    setRol(siguiente);
    try {
      localStorage.setItem(ROL_STORAGE_KEY, siguiente);
    } catch {
      // Sin almacenamiento disponible: el rol solo dura esta sesión.
    }
    // Las páginas públicas no cambian; si estaba en el panel, abre la primera vista del nuevo rol.
    if (!esPublica(view)) openView(ROLES[siguiente].vistas[0].id);
  };

  const navegarSitio = (destino: DestinoSitio) =>
    openView(destino === "panel" ? ROLES[rol].vistas[0].id : destino);

  /**
   * Vuelve a pedir GET /grafo y reemplaza el grafo completo. Se llama al
   * cargar y después de cada POST o DELETE: el front nunca arma nodos ni
   * aristas por su cuenta, así los ids siempre son los que asignó el back.
   *
   * Si llegan dos recargas casi juntas, solo se aplica la más reciente.
   * Rechaza si el back falla, para que quien la llamó pueda avisarlo.
   */
  const recargarGrafo = useCallback(async () => {
    const pedido = ++ultimaRecarga.current;
    const grafo = await getGrafo();
    if (pedido === ultimaRecarga.current) setGraph(grafo);
  }, []);

  useEffect(() => {
    recargarGrafo().catch((err) => console.error("No se pudo cargar el grafo:", err));
  }, [recargarGrafo]);

  const verGrafo =
    (rol === "compras" && view === "red") ||
    (rol === "produccion" && (view === "impacto" || view === "orden"));

  // Reproducir música: intenta siempre, y sigue intentando en cada interacción
  useEffect(() => {
    let reproduciendo = false;

    const iniciarMusica = () => {
      if (audioRef.current && !reproduciendo) {
        audioRef.current.volume = 0.5;
        audioRef.current.play()
          .then(() => {
            reproduciendo = true;
            // Una vez reproduciendo, quitar listeners
            document.removeEventListener("click", iniciarMusica);
            document.removeEventListener("scroll", iniciarMusica);
            document.removeEventListener("keydown", iniciarMusica);
            document.removeEventListener("touchstart", iniciarMusica);
            document.removeEventListener("mousemove", iniciarMusica);
          })
          .catch(() => {
            // Navegador bloqueó, seguir intentando en próxima interacción
          });
      }
    };

    // Intentar reproducir inmediatamente
    iniciarMusica();

    // Agregar listeners para interacciones
    document.addEventListener("click", iniciarMusica);
    document.addEventListener("scroll", iniciarMusica);
    document.addEventListener("keydown", iniciarMusica);
    document.addEventListener("touchstart", iniciarMusica);
    document.addEventListener("mousemove", iniciarMusica, { once: true });

    return () => {
      document.removeEventListener("click", iniciarMusica);
      document.removeEventListener("scroll", iniciarMusica);
      document.removeEventListener("keydown", iniciarMusica);
      document.removeEventListener("touchstart", iniciarMusica);
      document.removeEventListener("mousemove", iniciarMusica);
    };
  }, []);

  return (
    <div className="app-shell">
      <audio
        ref={audioRef}
        src={musicaFondo}
        loop
        style={{ display: "none" }}
      />
      <header className="topbar">
        <button
          className="brand"
          type="button"
          onClick={() => openView("inicio")}
        >
          <img
            className="brand-mark"
            src="/images/logo.png"
            alt=""
            aria-hidden="true"
          />
          <span>Bake & Brew</span>
        </button>
        <nav className="main-nav" aria-label="Navegación principal">
          {VISTAS_PUBLICAS.map((vista) => (
            <button
              key={vista.id}
              className={view === vista.id ? "nav-link active" : "nav-link"}
              type="button"
              onClick={() => openView(vista.id)}
            >
              {vista.label}
            </button>
          ))}
          <span className="nav-separador" aria-hidden="true" />
          <span className="nav-grupo">Panel</span>
          {ROLES[rol].vistas.map((vista) => (
            <button
              key={vista.id}
              className={view === vista.id ? "nav-link active" : "nav-link"}
              type="button"
              onClick={() => openView(vista.id)}
            >
              {vista.label}
              {vista.id === "orden" && totalCiclos > 0 && (
                <span className="nav-alerta" aria-label={`${totalCiclos} ciclos`}>
                  {totalCiclos}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="role-switch" role="radiogroup" aria-label="Ver la aplicación como">
          {(Object.keys(ROLES) as Rol[]).map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={rol === id}
              title={ROL_DESCRIPCION[id]}
              className={rol === id ? "role-option active" : "role-option"}
              onClick={() => cambiarRol(id)}
            >
              {ROLES[id].label}
            </button>
          ))}
        </div>
      </header>
      {view === "inicio" && <HomePage onNavigate={navegarSitio} resumen={resumen} />}
      {view === "nosotros" && <NosotrosPage onNavigate={navegarSitio} />}
      {view === "visitanos" && <VisitanosPage onNavigate={navegarSitio} />}
      {rol === "compras" && view === "registro" && (
        <DependencyRegister grafo={graph} onGuardado={recargarGrafo} />
      )}
      {verGrafo && (
        <VisualizationPage
          modo={view as "red" | "impacto" | "orden"}
          graph={graph}
          selectedId={selectedId}
          onSelect={setSelectedId}
          ordenProduccion={ordenProduccion}
          onGuardado={recargarGrafo}
          onBack={() => openView("inicio")}
          onOpenRegistro={rol === "compras" ? () => openView("registro") : undefined}
        />
      )}
    </div>
  );
}

export default App;
