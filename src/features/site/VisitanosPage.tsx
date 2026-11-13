import { PREGUNTAS, SEDES } from './content';
import type { DestinoSitio } from './HomePage';
import { SiteFooter } from './SiteFooter';
import './site.css';

const mapa = (direccion: string, barrio: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${direccion}, ${barrio}`)}`;

export function VisitanosPage({ onNavigate }: { onNavigate: (destino: DestinoSitio) => void }) {
  return (
    <main className="site visitanos">
      <section className="visitanos-cabecera">
        <h1>Te esperamos con el tinto servido</h1>
        <p>
          Tres sedes en Medellín y Envigado. El pan sale del mismo obrador y llega a todas
          antes de abrir.
        </p>
      </section>

      <section className="sedes" aria-label="Sedes">
        {SEDES.map((sede) => (
          <article key={sede.nombre} className="sede">
            <h2>{sede.nombre}</h2>
            <p className="sede-direccion">
              {sede.direccion}
              <span>{sede.barrio}</span>
            </p>
            <ul className="sede-horario">
              {sede.horario.map((h) => <li key={h}>{h}</li>)}
            </ul>
            <p className="sede-telefono">{sede.telefono}</p>
            {sede.nota && <p className="sede-nota">{sede.nota}</p>}
            <a
              className="boton boton-borde"
              href={mapa(sede.direccion, sede.barrio)}
              target="_blank"
              rel="noreferrer"
            >
              Cómo llegar
            </a>
          </article>
        ))}
      </section>

      <section className="encargos-pasos" aria-labelledby="encargos-titulo">
        <h2 id="encargos-titulo">Encargar una torta</h2>
        <ol>
          <li>
            <h3>Llama a tu sede</h3>
            <p>Dinos el sabor, el tamaño y para cuántas personas es.</p>
          </li>
          <li>
            <h3>Abona la mitad</h3>
            <p>En efectivo, con tarjeta o por transferencia. Te confirmamos el día y la hora.</p>
          </li>
          <li>
            <h3>Recógela lista</h3>
            <p>Sale empacada y con vela, si la pides. A domicilio en un radio de 3 km.</p>
          </li>
        </ol>
      </section>

      <section className="preguntas" aria-labelledby="preguntas-titulo">
        <h2 id="preguntas-titulo">Preguntas frecuentes</h2>
        {PREGUNTAS.map((item) => (
          <details key={item.p} className="pregunta">
            <summary>{item.p}</summary>
            <p>{item.r}</p>
          </details>
        ))}
      </section>

      <SiteFooter onNavigate={onNavigate} />
    </main>
  );
}
