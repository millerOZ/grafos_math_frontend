# AbastecePyme — Frontend (grafos_math_frontend)

Interfaz web de **Bake & Brew** para el caso AbastecePyme. Muestra la red de
abastecimiento de la panadería en 3D y permite registrar dependencias, simular la falla
de un elemento y consultar el orden de producción o la alerta de ciclo.

- Producción: https://grafos-math.netlify.app
- API que consume: [grafos_math_back](../grafos_math_back/README.md) — https://grafos-math-back.onrender.com
- Brief del cliente: [05-brief-abastecepyme.md](../05-brief-abastecepyme.md)

## Contenido

1. [Propósito](#propósito)
2. [Instalación](#instalación)
3. [Ejecución](#ejecución)
4. [Endpoints que consume](#endpoints-que-consume)
5. [Decisiones de diseño](#decisiones-de-diseño)

---

## Propósito

Cuando un proveedor falla, el equipo de la panadería necesita ver rápido qué productos se
afectan y en qué orden preparar. El front es la cara de la API para los dos usuarios del brief:

| Rol | Vistas del panel | Qué hace |
|---|---|---|
| **Compras** (responsable de compras) | Registro, Red | Registra proveedores, insumos, procesos, productos y dependencias; ve la red y, al tocar un nodo, qué necesita y qué habilita |
| **Producción** (coordinador de producción) | Impacto, Orden y ciclos | Elige un elemento que falla y ve qué se afecta y por qué camino; ve las etapas de preparación o la alerta de ciclo con el botón para quitar la dependencia |

Además tiene las páginas públicas del sitio de la panadería: Inicio, Nosotros y Visítanos.

| Feature del brief | En la interfaz |
|---|---|
| F1 — Catálogo | Vista **Registro**: formularios de elementos y de dependencias, y la tabla de dependencias guardadas |
| F2 — Impacto | Vista **Impacto**: los afectados se resaltan en el grafo 3D con su camino. También se puede escribir el id, con ejemplos de los cuatro casos (afecta cadena, sin dependientes, inexistente, dato inválido) |
| F3 — Orden y ciclos | Vista **Orden y ciclos**: el mapa muestra solo la cadena de procesos y marca el ciclo en rojo (procesos y flechas). Al lado, los pasos numerados o "Alerta: ciclo" con las dependencias y un botón para quitar cada una. El menú muestra cuántos ciclos hay |
| F4 — Tablero | Integra las anteriores sobre el mismo grafo, con **Reiniciar demo** y aviso sonoro de ciclo |

### Stack

React 19 · TypeScript · Vite · React Three Fiber / drei (Three.js) · Vitest · ESLint.

### Estructura

```
src/
  App.tsx                      navegación, roles y carga del grafo (GET /grafo)
  components/                  registro (ElementRegister, DependencyConnect, DependencyTable) y Graph3D
  features/graph/
    components/                VisualizationPage (red / impacto / orden), CiclosView, ReiniciarDemo
    hooks/getProducts.ts       cliente de la API (todas las llamadas fetch)
    hooks/use*.ts              useImpacto, useOrdenProduccion, useElementRegistration, useAlertaCiclo, useMovimiento
    domain/dependencyRules.ts  reglas de capas para guiar los formularios
    services/graphService.ts   carga de GET /grafo (con su prueba)
    types.ts                   tipos que reflejan los modelos del back
  features/site/               páginas públicas de la panadería
  lib/alertaCiclo.ts           sonido de la alerta de ciclo
public/
  images/                      logo y fotos
  sounds/alerta-ciclo.mp3      (opcional) sonido de la alerta
```

---

## Instalación

Requisitos: **Node.js 20.19 o superior** (probado con Node 22) y npm.

```bash
cd grafos_math_frontend
npm install
```

---

## Ejecución

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor de desarrollo en http://localhost:5173 |
| `npm run build` | Revisa tipos (`tsc -b`) y genera `dist/` |
| `npm run preview` | Sirve `dist/` para probar el build |
| `npm run test` | Pruebas con Vitest |
| `npm run lint` | ESLint |

### A qué back se conecta

La URL de la API sale de la variable `VITE_API_URL`; si no está definida se usa el back de
Render. Para trabajar con el back local, crear `.env.local`:

```
VITE_API_URL=http://127.0.0.1:8000
```

y levantar el back (`uvicorn main:app --reload --port 8000`, ver su README). El origen
`http://localhost:5173` ya está permitido en CORS.

### Sonido de la alerta de ciclo

Al aparecer un ciclo nuevo suena `public/sounds/alerta-ciclo.mp3`. Si el archivo no existe,
suena un tono generado con Web Audio, así que la alerta funciona sin él. Para usar un sonido
propio (por ejemplo, un fragmento de Suno), recortarlo a 1–2 segundos y guardarlo con ese
nombre:

```bash
ffmpeg -i descarga.mp3 -t 2 -af "afade=t=out:st=1.5:d=0.5" public/sounds/alerta-ciclo.mp3
```

Con el plan gratuito de Suno el audio solo puede usarse sin fines comerciales; citar la
fuente en la entrega.

### Despliegue

Netlify: build `npm run build`, carpeta de publicación `dist`, variable `VITE_API_URL` si se
quiere apuntar a otro back.

---

## Endpoints que consume

Todas las llamadas están en `src/features/graph/hooks/getProducts.ts`.

| Llamada | Cuándo |
|---|---|
| `GET /grafo` | Al cargar la app y después de **cada** POST o DELETE |
| `POST /proveedores` · `/insumos` · `/productos` · `/procesos` | Formularios de la vista Registro |
| `POST /dependencias` | Formulario "conectar" del Registro |
| `DELETE /dependencias/{id}` | Tabla de dependencias y botón "quitar" de la alerta de ciclo |
| `GET /impacto/{id}` | Al elegir un elemento en la vista Impacto o escribir su id (y otra vez si el grafo cambia) |
| `GET /orden-produccion` | Cada vez que cambia el grafo |
| `POST /demo/reset` (header `X-Demo-Token`) | Botón **Reiniciar demo** |

Cómo se interpretan las respuestas:

- `GET /impacto`: 404 → caso `inexistente`, 422 → caso `id_invalido`; 200 trae
  `sin_dependencias` o `afecta_cadena`.
- Errores de POST/DELETE: se muestra el motivo que manda el back (`detail`, o los `msg` si
  `detail` es una lista de errores de validación).

---

## Decisiones de diseño

### 1. El back es la única fuente de verdad

El front no calcula impacto ni orden, ni arma nodos o aristas por su cuenta: después de cada
cambio vuelve a pedir `GET /grafo` (`recargarGrafo` en `App.tsx`). Antes se agregaban aristas
con ids inventados en el navegador, que no coincidían con los del back y rompían el
`DELETE`. Por la misma razón se eliminó `src/lib/impact.ts`, que duplicaba el BFS del back:
dos implementaciones del mismo recorrido terminan dando resultados distintos.

Si llegan dos recargas casi juntas, solo se aplica la más reciente (un contador de pedidos),
para que una respuesta lenta no pise a una nueva.

### 2. Consultas que se actualizan con la red

`useImpacto` y `useOrdenProduccion` dependen del grafo: si alguien registra o quita una
dependencia, el impacto y el orden se vuelven a consultar solos y no queda un resultado viejo
en pantalla. Mientras llega la respuesta nueva se conserva la anterior para que la vista no
parpadee.

### 3. Roles con un switch, sin autenticación

El brief define dos usuarios, y cada uno ve solo las vistas que necesita. Como no hay
autenticación en el alcance, el rol se elige con un switch y se recuerda en `localStorage`.
Es una separación de vistas, no de permisos: el back no distingue roles.

### 4. Validación: el back decide, el front ayuda

La regla del dato inválido (formato `PREFIJO-NOMBRE`, prefijo de la capa, nombre obligatorio)
vive en el back y responde 422 en todos los endpoints con el mismo mensaje. El front solo
facilita el dato correcto (pasa el id a mayúsculas mientras se escribe, ofrece en los
selects solo las capas permitidas según `dependencyRules.ts`) y muestra el mensaje del back
tal cual. Así no hay dos reglas que se puedan contradecir.

En la vista Impacto, el campo **Simular falla por id** es la excepción a "facilitar el dato
correcto": envía el id **tal cual se escribió** (sin recortar ni pasar a mayúsculas), porque
su objetivo es mostrar en la demo que el back distingue un dato inválido (422, `prv quim`)
de un elemento inexistente (404, `PRV-NO-EXISTE`). Si el id está en la red, se selecciona en
el mapa como si se hubiera tocado el nodo (`domain/consultaImpacto.ts`).

### 5. Reinicio de la demo protegido

**Reiniciar demo** pide la clave al presentador, la envía en `X-Demo-Token` y luego recarga el
grafo. La clave no está en el código (cualquiera puede leer el JavaScript del sitio): se
guarda en `sessionStorage` solo mientras dure la pestaña.

### 6. Visualización 3D por capas

La red se dibuja con React Three Fiber en columnas por capa (proveedor → insumo → proceso →
producto), con un color por capa y otro para los afectados. Los procesos ocupan una columna
por paso de la cadena, así el orden de preparación también se ve en la posición. La leyenda explica cada capa en
lenguaje del negocio ("quien nos vende", "lo que compramos", "lo que hacemos en la planta",
"lo que vendemos"). El movimiento se puede apagar y respeta `prefers-reduced-motion`.

### 7. Alerta de ciclo visible y audible

El menú muestra un contador de ciclos en "Orden y ciclos" desde cualquier vista, y suena una
alerta cuando el número de ciclos **sube** (por ejemplo, al registrar la dependencia que lo
cierra). No suena al abrir la página aunque la demo ya traiga un ciclo, porque el navegador
bloquea el audio antes de la primera interacción, ni al quitar un ciclo.

En la vista Orden y ciclos el ciclo también se ve en el mapa: sus procesos y las flechas que
lo forman se pintan en rojo y laten (`domain/ordenVista.ts` arma lo que se resalta a partir de
`ciclos` de `GET /orden-produccion`). El mapa oculta proveedores e insumos, que no se ordenan,
y el panel muestra solo lo necesario: el estado, los pasos o las dependencias a quitar, y qué
productos quedan sin orden.
