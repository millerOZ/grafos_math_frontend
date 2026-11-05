import { useMemo } from 'react';
import type { Arista, Grafo, Nodo } from '../features/graph/types';
import { esDependenciaPermitida } from '../features/graph/domain/dependencyRules';
import DependencyConnect from './DependencyConnect';
import DependencyTable from './DependencyTable';
import ElementRegister from './ElementRegister';

/**
 * Vista del responsable de compras. Reúne solo lo que necesita para mantener
 * el catálogo al día: quiénes somos, cuándo se recibe mercancía, qué falta
 * por completar, los formularios de registro y la hoja de proveedores.
 *
 * Dirección de las aristas: "origen REQUIERE destino"
 * (producto → insumo → proveedor; producto/proceso → proceso).
 */
export default function DependencyRegister({
  grafo,
  onAdd,
  onAddNode,
}: {
  grafo: Grafo;
  onAdd: (arista: Arista) => void;
  onAddNode: (nodo: Nodo) => void;
}) {
  const porId = useMemo(() => new Map(grafo.nodos.map((n) => [n.id, n])), [grafo.nodos]);

  const validEdges = useMemo(() => grafo.aristas.flatMap((arista) => {
    const origen = porId.get(arista.origen);
    const destino = porId.get(arista.destino);
    return origen && destino && esDependenciaPermitida(origen, destino)
      ? [{ arista, origen, destino }]
      : [];
  }), [grafo.aristas, porId]);

  const conteo = useMemo(() => ({
    proveedor: grafo.nodos.filter((n) => n.capa === 'proveedor').length,
    insumo: grafo.nodos.filter((n) => n.capa === 'insumo').length,
    producto: grafo.nodos.filter((n) => n.capa === 'producto').length,
  }), [grafo.nodos]);

  // Hoja de proveedores: qué insumos entrega cada uno y en cuántos productos se usan.
  const proveedores = useMemo(() => grafo.nodos
    .filter((n) => n.capa === 'proveedor')
    .map((proveedor) => {
      const insumos = grafo.aristas
        .filter((a) => a.destino === proveedor.id)
        .map((a) => porId.get(a.origen))
        .filter((n): n is Nodo => n?.capa === 'insumo');
      // Sube por quienes requieren esos insumos (también a través de procesos).
      const productos = new Set<string>();
      const visitados = new Set<string>(insumos.map((i) => i.id));
      const pila = [...visitados];
      while (pila.length > 0) {
        const actual = pila.pop()!;
        grafo.aristas.forEach((a) => {
          if (a.destino !== actual || visitados.has(a.origen)) return;
          visitados.add(a.origen);
          if (porId.get(a.origen)?.capa === 'producto') productos.add(a.origen);
          pila.push(a.origen);
        });
      }
      return { proveedor, insumos, productos: productos.size };
    })
    .sort((a, b) => b.productos - a.productos), [grafo, porId]);

  // Lo que el catálogo tiene incompleto, dicho como tarea.
  const pendientes = useMemo(() => {
    const tieneSalida = (id: string) => grafo.aristas.some((a) => a.origen === id);
    const tieneEntrada = (id: string) => grafo.aristas.some((a) => a.destino === id);
    const lista: { id: string; texto: string }[] = [];
    grafo.nodos.forEach((n) => {
      if (n.capa === 'proveedor' && !tieneEntrada(n.id)) {
        lista.push({ id: n.id, texto: `${n.nombre} no entrega ningún insumo todavía.` });
      }
      if (n.capa === 'insumo' && !tieneSalida(n.id)) {
        lista.push({ id: n.id, texto: `${n.nombre} no tiene proveedor asignado.` });
      }
      if (n.capa === 'insumo' && !tieneEntrada(n.id)) {
        lista.push({ id: n.id, texto: `${n.nombre} no se usa en ningún producto ni proceso.` });
      }
      if (n.capa === 'proceso' && !tieneEntrada(n.id) && !tieneSalida(n.id)) {
        lista.push({ id: n.id, texto: `El proceso ${n.nombre.toLowerCase()} está sin conectar.` });
      }
    });
    return lista;
  }, [grafo]);

  return (
    <main className="register-view">
      <header className="registro-cabecera">
        <h1>Catálogo de compras</h1>
        <p>
          Aquí se registra a quién le compramos, qué nos entrega y en qué se usa. Con esto
          producción sabe qué se detiene si un proveedor falla.
        </p>
      </header>

      <section className="recepcion" aria-label="Datos para proveedores">
        <div>
          <h2>Recepción de mercancía</h2>
          <p>Lunes a sábado, de 5:00 a 9:00 a. m., por la puerta de cargue.</p>
        </div>
        <div>
          <h2>Pedidos a proveedores</h2>
          <p>Lunes y jueves antes de las 10:00 a. m. Lácteos y levadura, a diario.</p>
        </div>
        <div>
          <h2>Dirección</h2>
          <p>Cra. 70 #44-21, Laureles, Medellín</p>
        </div>
      </section>

      <section className="catalogo-estado" aria-labelledby="estado-title">
        <div className="estado-resumen">
          <h2 id="estado-title">Estado del catálogo</h2>
          <p>
            {conteo.proveedor === 0
              ? "Todavía no hay proveedores registrados. Empieza por el formulario de abajo."
              : <>Hoy compramos <strong>{conteo.insumo}</strong> insumos a <strong>{conteo.proveedor}</strong> proveedores, y con ellos preparamos <strong>{conteo.producto}</strong> productos.</>}
          </p>
        </div>
        <div className="estado-pendientes">
          <h3>Por completar</h3>
          {grafo.nodos.length === 0 ? (
            <p className="seccion-vacia">Cuando registres elementos, aquí verás lo que les falte por conectar.</p>
          ) : pendientes.length === 0 ? (
            <p className="estado-ok">Todo el catálogo está conectado. No hay nada pendiente.</p>
          ) : (
            <ul>
              {pendientes.slice(0, 5).map((p) => <li key={`${p.id}-${p.texto}`}>{p.texto}</li>)}
              {pendientes.length > 5 && <li className="estado-mas">y {pendientes.length - 5} más.</li>}
            </ul>
          )}
        </div>
      </section>

      <div className="register-forms">
        <ElementRegister grafo={grafo} onAddNode={onAddNode} onAddEdge={onAdd} />
        <DependencyConnect grafo={grafo} onAddEdge={onAdd} />
      </div>

      <section className="hoja-proveedores" aria-labelledby="hoja-title">
        <h2 id="hoja-title">Proveedores y lo que nos entregan</h2>
        <p className="seccion-ayuda">
          Ordenados por cuántos productos dependen de ellos. Los primeros son los que más
          conviene tener con un proveedor alterno.
        </p>
        {proveedores.length === 0 ? (
          <p className="seccion-vacia">Registra el primer proveedor con el formulario de arriba.</p>
        ) : (
          <ul className="hoja-lista">
            {proveedores.map(({ proveedor, insumos, productos }) => (
              <li key={proveedor.id}>
                <div className="hoja-nombre">
                  <strong>{proveedor.nombre}</strong>
                  {proveedor.categoria && <span>{proveedor.categoria}</span>}
                </div>
                <p className="hoja-insumos">
                  {insumos.length > 0
                    ? insumos.map((i) => i.nombre).join(', ')
                    : 'Sin insumos asignados'}
                </p>
                <p className="hoja-uso">
                  {productos === 1 ? '1 producto' : `${productos} productos`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DependencyTable filas={validEdges} />
    </main>
  );
}
