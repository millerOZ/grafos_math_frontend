/**
 * Sonido de la alerta de ciclo.
 *
 * Reproduce public/sounds/alerta-ciclo.mp3 (por ejemplo, un fragmento corto
 * descargado de Suno). Si ese archivo no está, suena un tono generado con
 * Web Audio, así la alerta funciona aunque todavía no se haya puesto el mp3.
 */
const RUTA_SONIDO = '/sounds/alerta-ciclo.mp3';
const VOLUMEN = 0.6;

export async function reproducirAlertaCiclo(): Promise<void> {
  try {
    const audio = new Audio(RUTA_SONIDO);
    audio.volume = VOLUMEN;
    await audio.play();
  } catch (err) {
    // NotAllowedError: el navegador bloquea el audio hasta que la persona
    // interactúe con la página. El tono de respaldo también se bloquearía.
    if (err instanceof DOMException && err.name === 'NotAllowedError') return;
    tonoDeRespaldo();
  }
}

/** Dos pitidos descendentes, para que se distinga de un clic normal. */
function tonoDeRespaldo(): void {
  const Contexto =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Contexto) return;

  const ctx = new Contexto();
  const inicio = ctx.currentTime;
  [880, 660].forEach((frecuencia, i) => {
    const t = inicio + i * 0.22;
    const osc = ctx.createOscillator();
    const ganancia = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = frecuencia;
    ganancia.gain.setValueAtTime(0.0001, t);
    ganancia.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    osc.connect(ganancia).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  });
  setTimeout(() => void ctx.close(), 800);
}
