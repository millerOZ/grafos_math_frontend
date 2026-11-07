import { Suspense, lazy, useState } from 'react';
import { DIA_OBRADOR, TESTIMONIOS, VITRINA, formatoPrecio } from './content';
import { useParallax, useReveal, useScrollProgress } from './useScrollEffects';
import { SiteFooter } from './SiteFooter';
import './site.css';

// La escena 3D pesa; se carga solo cuando se llega a esa sección.
const FloatingElements3D = lazy(() =>
  import('../graph/components/FloatingElements3D').then((m) => ({ default: m.FloatingElements3D })),
);

export type DestinoSitio = 'nosotros' | 'visitanos' | 'panel';

interface HomePageProps {
  onNavigate: (destino: DestinoSitio) => void;
  resumen: { proveedores: number; insumos: number; productos: number };
}

const TICKER = [
  'Pan de masa madre', 'Croissant de mantequilla', 'Pandebono caliente', 'Tinto de Jardín',
  'Rollo de canela', 'Baguette de las 3:00', 'Chocolate santafereño', 'Torta de zanahoria',
];

export function HomePage({ onNavigate, resumen }: HomePageProps) {
  const heroRef = useParallax<HTMLElement>(0.35);
  const bandaRef = useParallax<HTMLElement>(0.25);
  const historiaRef = useParallax<HTMLDivElement>(0.12);

  const irAVitrina = () =>
    document.getElementById('vitrina')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <main className="site home">
      <section className="home-hero" ref={heroRef}>
        <div className="home-hero-foto" aria-hidden="true" />
        <div className="home-hero-contenido">
          <p className="home-hero-saludo">Panadería y café de barrio en Medellín</p>
          <h1 className="home-hero-titulo">
            <span>El horno se prende</span>
            <span>a las 3:30 a. m.</span>
            <span>Tú solo llega con hambre.</span>
          </h1>
          <p className="home-hero-texto">
            Pan de masa madre, repostería del día y café de una finca de Jardín, Antioquia.
            Tres sedes, un solo obrador y la vitrina llena desde la primera hora.
          </p>
          <div className="home-hero-acciones">
            <button className="boton boton-claro" type="button" onClick={irAVitrina}>
              Ver la vitrina de hoy
            </button>
            <button className="boton boton-borde-claro" type="button" onClick={() => onNavigate('visitanos')}>
              Encontrar una sede
            </button>
          </div>
        </div>
        <p className="home-hero-aviso">
          Croissants recién horneados a las 6:30 a. m. Se acaban antes de las 8:00.
        </p>
      </section>

      <div className="ticker" aria-hidden="true">
        <div className="ticker-pista">
          {[...TICKER, ...TICKER].map((item, i) => (
            <span key={i} className="ticker-item">
              {item}
              <svg className="ticker-espiga" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M8 1v14M8 4c-2 0-3-1-3-2.5C7 1.5 8 3 8 4zm0 0c2 0 3-1 3-2.5C9 1.5 8 3 8 4zm0 4c-2 0-3-1-3-2.5C7 5.5 8 7 8 8zm0 0c2 0 3-1 3-2.5C9 5.5 8 7 8 8zm0 4c-2 0-3-1-3-2.5C7 9.5 8 11 8 12zm0 0c2 0 3-1 3-2.5C9 9.5 8 11 8 12z" />
              </svg>
            </span>
          ))}
        </div>
      </div>

      <section className="home-historia">
        <div className="home-historia-texto">
          <h2>Amamos madrugar, y se nota en la miga.</h2>
          <p>
            Bake &amp; Brew empezó en 2014 como un horno de leña en un garaje de Laureles.
            Hoy horneamos para tres sedes, pero el pan se sigue formando a mano y la masa
            madre es la misma que alimentamos desde el primer día.
          </p>
          <p>
            Trabajamos con pocos proveedores y los conocemos por su nombre: el molino, la
            finca de café, la lechería. Por eso sabemos, antes de abrir, si algo va a faltar.
          </p>
          <button className="boton boton-oscuro" type="button" onClick={() => onNavigate('nosotros')}>
            Conocer nuestra historia
          </button>
        </div>
        <div className="home-historia-fotos" ref={historiaRef} aria-hidden="true">
          <div className="foto-recorte foto-croissant" />
          <div className="foto-recorte foto-panal" />
          <div className="foto-recorte foto-mermelada" />
        </div>
      </section>

      <Vitrina />

      <section className="home-banda" ref={bandaRef}>
        <div className="home-banda-foto" aria-hidden="true" />
        <p className="home-banda-frase">
          Hornear bien es cuestión de tiempo. Y de no quedarse nunca sin harina.
        </p>
      </section>

      <DiaEnElObrador />

      <DetrasDeLaVitrina resumen={resumen} onNavigate={onNavigate} />

      <Testimonios />

      <section className="home-encargos">
        <div>
          <h2>¿Cumpleaños el sábado?</h2>
          <p>
            Encarga tu torta con 48 horas en cualquier sede. Las de dos pisos, con cinco días.
            Te la entregamos empacada y lista para la foto.
          </p>
        </div>
        <button className="boton boton-oscuro" type="button" onClick={() => onNavigate('visitanos')}>
          Ver cómo encargar
        </button>
      </section>

      <SiteFooter onNavigate={onNavigate} />
    </main>
  );
}

function Vitrina() {
  const [activa, setActiva] = useState(VITRINA[0].id);
  const categoria = VITRINA.find((c) => c.id === activa) ?? VITRINA[0];

  return (
    <section className="vitrina" id="vitrina" aria-labelledby="vitrina-titulo">
      <div className="vitrina-cabecera">
        <h2 id="vitrina-titulo">La vitrina de hoy</h2>
        <p>Precios en todas las sedes. Lo marcado con hora sale caliente del horno.</p>
      </div>
      <div className="vitrina-filtros" role="tablist" aria-label="Categorías de la vitrina">
        {VITRINA.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={c.id === activa}
            aria-controls="vitrina-lista"
            className={c.id === activa ? 'vitrina-filtro activo' : 'vitrina-filtro'}
            onClick={() => setActiva(c.id)}
          >
            {c.nombre}
          </button>
        ))}
      </div>
      <div className="vitrina-tablero" id="vitrina-lista" role="tabpanel" key={categoria.id}>
        <p className="vitrina-intro">{categoria.intro}</p>
        <ul className="vitrina-lista">
          {categoria.items.map((item, i) => (
            <li key={item.nombre} style={{ animationDelay: `${i * 45}ms` }}>
              <div className="vitrina-item-texto">
                <strong>{item.nombre}</strong>
                <span>{item.detalle}</span>
              </div>
              <span className="vitrina-relleno" aria-hidden="true" />
              <div className="vitrina-item-precio">
                {item.sale && <small>Sale a las {item.sale}</small>}
                <span>{formatoPrecio(item.precio)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function DiaEnElObrador() {
  const ref = useScrollProgress<HTMLOListElement>();
  return (
    <section className="obrador" aria-labelledby="obrador-titulo">
      <div className="obrador-cabecera">
        <h2 id="obrador-titulo">Un día en el obrador</h2>
        <p>
          Antes de que abras los ojos ya pasaron muchas cosas. Este es el orden en que
          ocurren, todos los días.
        </p>
      </div>
      <ol className="obrador-linea" ref={ref}>
        {DIA_OBRADOR.map((paso) => <PasoObrador key={paso.hora} {...paso} />)}
      </ol>
    </section>
  );
}

function PasoObrador({ hora, titulo, texto }: { hora: string; titulo: string; texto: string }) {
  const [ref, visible] = useReveal<HTMLLIElement>(0.6);
  return (
    <li ref={ref} className={visible ? 'obrador-paso visible' : 'obrador-paso'}>
      <time className="obrador-hora">{hora}</time>
      <div>
        <h3>{titulo}</h3>
        <p>{texto}</p>
      </div>
    </li>
  );
}

function DetrasDeLaVitrina({
  resumen,
  onNavigate,
}: {
  resumen: HomePageProps['resumen'];
  onNavigate: HomePageProps['onNavigate'];
}) {
  const [ref, visible] = useReveal<HTMLElement>(0.15);
  return (
    <section className="detras" ref={ref} aria-labelledby="detras-titulo">
      <div className="detras-escena" aria-hidden="true">
        {visible && (
          <Suspense fallback={null}>
            <FloatingElements3D
              colores={['#f2af48', '#4ab494', '#a584dc', '#3ca2e0', '#e66e6d']}
              linea="#272727"
            />
          </Suspense>
        )}
      </div>
      <div className="detras-texto">
        <h2 id="detras-titulo">Detrás de cada croissant hay una red</h2>
        <p>
          Un croissant necesita harina del molino, mantequilla de la lechería, un empaque
          y cuatro pasos en el obrador. Si cualquiera falla, no sale.
        </p>
        {resumen.proveedores > 0 ? (
          <p>
            Por eso tenemos mapeado cómo depende cada cosa de la otra. Hoy son
            {' '}<strong>{resumen.proveedores} proveedores</strong>,
            {' '}<strong>{resumen.insumos} insumos</strong> y
            {' '}<strong>{resumen.productos} productos</strong> conectados. Si un camión no llega,
            sabemos en segundos qué no va a estar en la vitrina y qué preparar primero.
          </p>
        ) : (
          <p>
            Por eso tenemos mapeado cómo depende cada cosa de la otra. Si un camión no llega,
            sabemos en segundos qué no va a estar en la vitrina y qué preparar primero.
          </p>
        )}
        <button className="boton boton-claro" type="button" onClick={() => onNavigate('panel')}>
          Abrir el panel del equipo
        </button>
      </div>
    </section>
  );
}

function Testimonios() {
  return (
    <section className="testimonios" aria-labelledby="testimonios-titulo">
      <h2 id="testimonios-titulo">Lo que dicen en la fila</h2>
      <div className="testimonios-lista">
        {TESTIMONIOS.map((t) => (
          <figure key={t.autor} className="testimonio">
            <blockquote>{t.cita}</blockquote>
            <figcaption>
              <strong>{t.autor}</strong>
              <span>{t.lugar}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
