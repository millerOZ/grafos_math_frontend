import { useState, type FormEvent } from 'react';
import { reiniciarDemo } from '../hooks/getProducts';

const CLAVE_STORAGE_KEY = 'abastecepyme.clave-reset';

function leerClaveGuardada(): string {
  try {
    return sessionStorage.getItem(CLAVE_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

/**
 * Botón "Reiniciar demo": POST /demo/reset y luego GET /grafo.
 * Deja la red con los datos iniciales para empezar la demo desde cero.
 * Pide la clave antes de borrar y la recuerda solo durante la sesión.
 */
export function ReiniciarDemo({ onGuardado }: { onGuardado: () => Promise<void> }) {
  const [abierto, setAbierto] = useState(false);
  const [clave, setClave] = useState(leerClaveGuardada);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const reiniciar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!clave) {
      setAviso({ tipo: 'error', texto: 'Escribe la clave de reinicio.' });
      return;
    }
    setEnviando(true);
    setAviso(null);
    try {
      await reiniciarDemo(clave);
    } catch (err) {
      setAviso({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo reiniciar la demo.' });
      setEnviando(false);
      return;
    }
    try {
      sessionStorage.setItem(CLAVE_STORAGE_KEY, clave);
    } catch {
      // Sin almacenamiento disponible: se vuelve a pedir la clave la próxima vez.
    }
    try {
      await onGuardado();
      setAviso({ tipo: 'ok', texto: 'La demo volvió a los datos iniciales.' });
    } catch {
      setAviso({ tipo: 'error', texto: 'Se reinició en el back, pero no se pudo actualizar la red. Recarga la página.' });
    }
    setAbierto(false);
    setEnviando(false);
  };

  return (
    <div className="reinicio">
      {abierto ? (
        <form onSubmit={(e) => void reiniciar(e)}>
          <label htmlFor="reinicio-clave">Se borra todo lo registrado. Clave:</label>
          <input
            id="reinicio-clave"
            type="password"
            value={clave}
            autoComplete="off"
            onChange={(e) => setClave(e.target.value)}
            autoFocus
          />
          <button type="submit" className="reinicio-boton peligro" disabled={enviando}>
            {enviando ? 'Reiniciando…' : 'Reiniciar'}
          </button>
          <button
            type="button"
            className="reinicio-boton"
            disabled={enviando}
            onClick={() => {
              setAbierto(false);
              setAviso(null);
            }}
          >
            Cancelar
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="reinicio-boton"
          onClick={() => {
            setAbierto(true);
            setAviso(null);
          }}
        >
          Reiniciar demo
        </button>
      )}
      {aviso && (
        <p className={aviso.tipo === 'ok' ? 'reinicio-aviso' : 'reinicio-aviso error'} role="status">
          {aviso.texto}
        </p>
      )}
    </div>
  );
}
