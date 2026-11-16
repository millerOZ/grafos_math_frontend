import { useEffect, useRef } from 'react';
import { reproducirAlertaCiclo } from '../../../lib/alertaCiclo';

/**
 * Suena cuando aparece un ciclo nuevo (el total de ciclos sube).
 *
 * La primera respuesta del back no suena: si la demo ya arranca con un ciclo,
 * no se reproduce nada al abrir la página (además el navegador lo bloquearía).
 * `totalCiclos` es null mientras no ha llegado ninguna respuesta.
 */
export function useAlertaCiclo(totalCiclos: number | null): void {
  const anterior = useRef<number | null>(null);

  useEffect(() => {
    if (totalCiclos === null) return;
    if (anterior.current !== null && totalCiclos > anterior.current) {
      void reproducirAlertaCiclo();
    }
    anterior.current = totalCiclos;
  }, [totalCiclos]);
}
