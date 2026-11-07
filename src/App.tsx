import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import DependencyRegister from "./components/DependencyRegister";
import { VisualizationPage } from "./features/graph/components/VisualizationPage";
import { HomePage, type DestinoSitio } from "./features/site/HomePage";
import { NosotrosPage } from "./features/site/NosotrosPage";
import { VisitanosPage } from "./features/site/VisitanosPage";
import { MOCK_GRAFO } from "./features/graph/data/mockGraph";
import { getAristas, getInsumos, getProcesos, getProducts, getProveedores } from "./features/graph/hooks/getProducts";
import { useOrdenProduccion } from "./features/graph/hooks/useOrdenProduccion";
import type { Arista, Grafo } from "./features/graph/types";

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
  const hasLoadedData = useRef(false);

  // Se consulta aquí (y no en la vista) porque la navegación también avisa los ciclos.
  const ordenProduccion = useOrdenProduccion(graph);
  const totalCiclos = ordenProduccion.orden?.ciclos.length ?? 0;

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

  const addDependency = (edge: Arista) => {
    setGraph((current) => ({
      ...current,
      aristas: [...current.aristas, edge],
    }));
  };

  const appendNodes = (nodes: Grafo["nodos"]) => {
    setGraph((current) => ({
      ...current,
      nodos: [...current.nodos, ...nodes],
    }));
  };

  const loadProducts = async () => {
    try {
      const products = await getProducts();
      console.log("Producto", products);
      appendNodes(products);
    } catch (error) {
      console.error("No se pudieron cargar los productos:", error);
    }
  };
  const loadProcesos = async () => {
    try {
      appendNodes(await getProcesos());
    } catch (err) {
      console.error(err);
    }
  };
  const loadInsumos = async () => {
    try {
      const insumos = await getInsumos();
      console.log("Insumo ", insumos);
      appendNodes(insumos);
    } catch (err) {
      console.error(err);
    }
  };
  const loadProveedores = async () => {
    try {
      const proveedores = await getProveedores();
      console.log("Proveedor ", proveedores);
      appendNodes(proveedores);
    } catch (err) {
      console.error(err);
    }
  };
  const loadAristas = async () => {
    try {
      const aristas = await getAristas();
      console.log("Aristas ", aristas);
      aristas.forEach((item) => addDependency(item));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (hasLoadedData.current) {
      return;
    }

    hasLoadedData.current = true;
    void Promise.all([
      loadProducts(),
      loadProcesos(),
      loadInsumos(),
      loadProveedores(),
      loadAristas(),
    ]);
  }, []);

  const verGrafo =
    (rol === "compras" && view === "red") ||
    (rol === "produccion" && (view === "impacto" || view === "orden"));

  return (
    <div className="app-shell">
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
        <DependencyRegister
          grafo={graph}
          onAdd={addDependency}
          onAddNode={(node) => appendNodes([node])}
        />
      )}
      {verGrafo && (
        <VisualizationPage
          modo={view as "red" | "impacto" | "orden"}
          graph={graph}
          selectedId={selectedId}
          onSelect={setSelectedId}
          ordenProduccion={ordenProduccion}
          onBack={() => openView("inicio")}
          onOpenRegistro={rol === "compras" ? () => openView("registro") : undefined}
        />
      )}
    </div>
  );
}

export default App;
