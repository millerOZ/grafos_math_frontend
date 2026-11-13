import { SEDES } from './content';
import type { DestinoSitio } from './HomePage';

export function SiteFooter({ onNavigate }: { onNavigate: (destino: DestinoSitio) => void }) {
  return (
    <footer className="site-footer">
      <div className="footer-marca">
        <img src="/images/logo.png" alt="" aria-hidden="true" />
        <p>
          <strong>Bake &amp; Brew</strong>
          Panadería y café de barrio desde 2014.
        </p>
      </div>
      <div className="footer-columna">
        <h2>Sedes</h2>
        <ul>
          {SEDES.map((s) => (
            <li key={s.nombre}>
              <strong>{s.nombre}</strong> {s.direccion}
            </li>
          ))}
        </ul>
      </div>
      <div className="footer-columna">
        <h2>El sitio</h2>
        <ul>
          <li><button type="button" onClick={() => onNavigate('nosotros')}>Nosotros</button></li>
          <li><button type="button" onClick={() => onNavigate('visitanos')}>Visítanos y encargos</button></li>
          <li><button type="button" onClick={() => onNavigate('panel')}>Panel del equipo</button></li>
        </ul>
      </div>
      <p className="footer-legal">
        Negocio ficticio. Proyecto académico de Matemáticas para la información, ITM, 2026.
      </p>
    </footer>
  );
}
