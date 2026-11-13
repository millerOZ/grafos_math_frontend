import { VALORES } from './content';
import type { DestinoSitio } from './HomePage';
import { SiteFooter } from './SiteFooter';
import { useParallax } from './useScrollEffects';
import './site.css';

export function NosotrosPage({ onNavigate }: { onNavigate: (destino: DestinoSitio) => void }) {
  const portadaRef = useParallax<HTMLElement>(0.3);

  return (
    <main className="site nosotros">
      <section className="pagina-portada" ref={portadaRef}>
        <div className="pagina-portada-foto" aria-hidden="true" />
        <div className="pagina-portada-texto">
          <h1>Empezamos con un horno de leña en un garaje</h1>
          <p>Doce años después seguimos formando el pan a mano.</p>
        </div>
      </section>

      <section className="historia-cronica">
        <div className="historia-columna">
          <h2>Nuestra historia</h2>
          <p>
            En 2014, Lucía Restrepo dejó su trabajo en un banco para hornear el pan que comía
            de niña en la casa de su abuela en Jardín. El primer horno fue de leña, en el
            garaje de su casa en Laureles, y los primeros clientes fueron los vecinos de la cuadra.
          </p>
          <p>
            En 2017 llegó Andrés, barista, con un costal de café de la finca de su familia.
            Desde ese día la panadería se volvió también cafetería, y el tinto de la casa
            se sirve en pocillo, como debe ser.
          </p>
          <p>
            Hoy somos 34 personas en tres sedes. El obrador sigue en Laureles y todavía
            alimentamos la misma masa madre de 2014. La llamamos Doña Rosa.
          </p>
        </div>
        <aside className="historia-hitos" aria-label="Momentos de la panadería">
          <dl>
            <div><dt>2014</dt><dd>Primer horno, en un garaje de Laureles.</dd></div>
            <div><dt>2017</dt><dd>Abre la barra de café con grano de Jardín.</dd></div>
            <div><dt>2020</dt><dd>Domicilios a todo el barrio durante la pandemia.</dd></div>
            <div><dt>2022</dt><dd>Abre la sede del parque de Envigado.</dd></div>
            <div><dt>2025</dt><dd>Abre la sede de Provenza, en El Poblado.</dd></div>
          </dl>
        </aside>
      </section>

      <section className="pizarra pizarra-sitio" aria-labelledby="pizarra-title">
        <h2 id="pizarra-title" className="pizarra-marca">
          Bake &amp; Brew
          <small>Lo que nos mueve cada madrugada</small>
        </h2>
        <div className="pizarra-bloque">
          <h3>Misión</h3>
          <p>
            Hornear todos los días pan, repostería y café honestos para nuestro barrio,
            con insumos de proveedores que conocemos por su nombre, para que la vitrina
            esté llena desde la primera hora.
          </p>
        </div>
        <div className="pizarra-bloque">
          <h3>Visión</h3>
          <p>
            Ser en 2030 la panadería y cafetería de referencia de Medellín por su frescura
            y su constancia: ningún producto fuera de la vitrina porque nos faltó un insumo.
          </p>
        </div>
      </section>

      <section className="valores" aria-labelledby="valores-titulo">
        <h2 id="valores-titulo">Cómo trabajamos</h2>
        <div className="valores-lista">
          {VALORES.map((v) => (
            <article key={v.titulo} className="valor">
              <h3>{v.titulo}</h3>
              <p>{v.texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-encargos">
        <div>
          <h2>Ven a conocernos</h2>
          <p>El obrador de Laureles tiene una ventana a la calle. Desde ahí se ve cómo se forma el pan.</p>
        </div>
        <button className="boton boton-oscuro" type="button" onClick={() => onNavigate('visitanos')}>
          Ver sedes y horarios
        </button>
      </section>

      <SiteFooter onNavigate={onNavigate} />
    </main>
  );
}
