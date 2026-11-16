import { afterEach, describe, expect, it, vi } from 'vitest';
import { getImpacto } from './getProducts';

function responder(status: number, cuerpo: unknown) {
  const fetcher = vi.fn(async () => new Response(JSON.stringify(cuerpo), { status }));
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getImpacto', () => {
  it('devuelve el cuerpo del back cuando responde 200', async () => {
    const cuerpo = {
      origen: { id: 'PRD-PAN', nombre: 'Pan tajado', capa: 'producto' },
      caso: 'sin_dependencias',
      mensaje: 'Nadie depende de él',
      visitados: ['PRD-PAN'],
      afectados: [],
    };
    responder(200, cuerpo);

    await expect(getImpacto('PRD-PAN')).resolves.toEqual(cuerpo);
  });

  it('convierte el 404 en el caso "inexistente" con el mensaje del back', async () => {
    responder(404, { detail: "No existe el elemento 'PRV-NO-EXISTE' en el catálogo." });

    const r = await getImpacto('PRV-NO-EXISTE');

    expect(r.caso).toBe('inexistente');
    expect(r.mensaje).toBe("No existe el elemento 'PRV-NO-EXISTE' en el catálogo.");
    expect(r.origen).toBeNull();
    expect(r.afectados).toEqual([]);
  });

  it('convierte el 422 en "id_invalido" y lee el motivo de la lista de errores', async () => {
    responder(422, {
      detail: [{ type: 'id_invalido', loc: ['path', 'elemento_id'], msg: "El id 'prv quim' no puede contener espacios.", input: 'prv quim' }],
    });

    const r = await getImpacto('prv quim');

    expect(r.caso).toBe('id_invalido');
    expect(r.mensaje).toBe("El id 'prv quim' no puede contener espacios.");
    expect(r.origen).toBeNull();
  });

  it('codifica el id en la URL para que espacios y símbolos lleguen al back', async () => {
    const fetcher = responder(422, { detail: [{ msg: 'inválido' }] });

    await getImpacto('prv quim/');

    expect(fetcher).toHaveBeenCalledWith(expect.stringMatching(/\/impacto\/prv%20quim%2F$/));
  });

  it('lanza error ante otros fallos del servidor', async () => {
    responder(500, {});

    await expect(getImpacto('PRD-PAN')).rejects.toThrow('Error HTTP: 500');
  });
});
