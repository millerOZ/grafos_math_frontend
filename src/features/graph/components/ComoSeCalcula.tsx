/**
 * "¿Cómo se calcula?": explica, en lenguaje del negocio, qué algoritmo usa el
 * back para cada consulta y por qué sirve para responderla. Va plegado para no
 * tapar el resultado; se abre durante la demo cuando lo preguntan.
 */

export function ExplicacionImpacto() {
  return (
    <details className="como-se-calcula">
      <summary>¿Cómo se calcula el impacto?</summary>
      <p>
        <strong>Recorrido en anchura (BFS)</strong> desde el elemento que falla, siguiendo las
        flechas <em>al revés</em>: de lo que se necesita hacia quien lo necesita.
      </p>
      <ol>
        <li>Se pone en una fila el elemento que falla (nivel 0).</li>
        <li>Se saca el primero de la fila y se buscan los elementos que lo <em>requieren</em>.</li>
        <li>Los que no se habían visitado entran a la fila con un nivel más y su camino.</li>
        <li>Se repite hasta vaciar la fila.</li>
      </ol>
      <p className="como-se-calcula-porque">
        <strong>Por qué sirve:</strong> una falla se propaga como fichas de dominó, así que
        todo lo que el recorrido <em>alcanza</em> es lo que se detiene. BFS avanza por niveles:
        primero lo afectado directamente y después lo afectado a través de otros, y guarda el
        camino que explica el "vía". Cada elemento se visita una sola vez, aunque le llegue la
        falla por dos caminos.
      </p>
      <p className="como-se-calcula-costo">
        <strong>Costo:</strong> O(V + E), proporcional a elementos (V) más dependencias (E).
        La red se guarda como <em>lista de adyacencia</em> invertida (quién me requiere) y una
        fila (cola) para avanzar por niveles.
      </p>
    </details>
  );
}

export function ExplicacionOrden() {
  return (
    <details className="como-se-calcula">
      <summary>¿Cómo se calcula el orden y el ciclo?</summary>
      <p>
        <strong>1. Orden topológico (algoritmo de Kahn).</strong> Para cada proceso se cuenta
        cuántos procesos requiere que aún no están hechos. Los que tienen 0 forman la etapa
        actual; al terminarlos se descuenta 1 a quienes los esperaban, y se repite.
      </p>
      <p className="como-se-calcula-porque">
        <strong>Por qué sirve:</strong> "A requiere B" obliga a hacer B antes que A, y Kahn
        solo pone un proceso cuando ya está hecho todo lo que necesita. Los procesos de una
        misma etapa se pueden hacer a la vez. Si en algún paso ningún proceso queda en 0, hay
        procesos esperándose entre sí: no se inventa un orden falso.
      </p>
      <p>
        <strong>2. Ubicar el ciclo (algoritmo de Tarjan).</strong> Kahn dice que hay un ciclo
        pero no cuál. Tarjan agrupa los procesos desde los que se puede ir y volver siguiendo
        las flechas: cada grupo contiene un ciclo, y su ciclo más corto se marca en rojo.
      </p>
      <p className="como-se-calcula-porque">
        <strong>Por qué sirve:</strong> separa los procesos que <em>forman</em> el ciclo de los
        que solo quedan bloqueados por él. Dentro de cada grupo se busca el ciclo más corto
        (BFS), que es la contradicción mínima: basta con quitar una de sus dependencias.
      </p>
      <p className="como-se-calcula-costo">
        <strong>Costo:</strong> Kahn y Tarjan son O(V + E) cada uno sobre los procesos y sus
        dependencias. Se usa una <em>lista de adyacencia</em> (qué requiere cada proceso), un
        contador de pendientes por proceso y una pila para Tarjan.
      </p>
    </details>
  );
}
