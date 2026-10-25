import { useEffect, useRef, useState } from "react";
import "./App.css";
import DependencyRegister from "./components/DependencyRegister";
import { HomePage } from "./features/graph/components/HomePage";
import { VisualizationPage } from "./features/graph/components/VisualizationPage";
import { MOCK_GRAFO } from "./features/graph/data/mockGraph";
import { getAristas, getInsumos, getProducts, getProveedores } from "./features/graph/hooks/getProducts";
import type { Arista, Grafo } from "./features/graph/types";

type View = "inicio" | "visualizacion" | "registro";

function App() {
  const [view, setView] = useState<View>("inicio");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [graph, setGraph] = useState<Grafo>(MOCK_GRAFO);
  const hasLoadedData = useRef(false);

  const openView = (nextView: View) => {
    setSelectedId(null);
    setView(nextView);
  };

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
     aristas.map(item => {
      addDependency(item)
     })
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
      loadInsumos(),
      loadProveedores(),
      loadAristas(),
    ]);
  }, []);

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
          <button
            className={view === "inicio" ? "nav-link active" : "nav-link"}
            type="button"
            onClick={() => openView("inicio")}
          >
            Inicio
          </button>
          <button
            className={
              view === "visualizacion" ? "nav-link active" : "nav-link"
            }
            type="button"
            onClick={() => openView("visualizacion")}
          >
            Visualización
          </button>
          <button
            className={view === "registro" ? "nav-link active" : "nav-link"}
            type="button"
            onClick={() => openView("registro")}
          >
            Registro
          </button>
        </nav>
        <span className="course-label">Matemáticas para la información</span>
      </header>
      {view === "inicio" && (
        <HomePage onOpenVisualization={() => openView("visualizacion")} />
      )}
      {view === "registro" && (
        <DependencyRegister grafo={graph} onAdd={addDependency} />
      )}
      {view === "visualizacion" && (
        <VisualizationPage
          graph={graph}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onBack={() => openView("inicio")}
        />
      )}
    </div>
  );
}

export default App;
