import { useMemo, useState, type FormEvent } from 'react';
import type { Capa, Grafo, Nodo } from '../types';
import { siguienteCapa } from '../domain/dependencyRules';
import { crearInsumo, crearProceso, crearProducto, crearProveedor } from './getProducts';

/**
 * Cada elemento se crea enlazado a la capa de la que depende:
 * - proveedor: no requiere nada.
 * - proceso: se crea sin conexiones; se conecta luego con "Conectar".
 * - insumo: requiere exactamente un proveedor.
 * - producto: requiere al menos un insumo.
 */
interface ElementRegistrationState {
  layer: Capa;
  id: string;
  name: string;
  category: string;
  requiredIds: string[];
  requiredLayer: Capa | null;
  candidates: Nodo[];
  message: string;
  /** Define el color del mensaje: error en rojo, aviso en ámbar, ok en verde. */
  messageType: TipoMensaje;
  sending: boolean;
  submit: (event: FormEvent<HTMLFormElement>) => void;
  setLayer: (layer: Capa) => void;
  setId: (id: string) => void;
  setName: (name: string) => void;
  setCategory: (category: string) => void;
  setProviderId: (id: string) => void;
  toggleInsumo: (id: string) => void;
}

export type TipoMensaje = 'ok' | 'error' | 'aviso';

export function useElementRegistration(
  graph: Grafo,
  /** Vuelve a pedir GET /grafo; trae el nodo nuevo y las aristas que creó el back. */
  onGuardado: () => Promise<void>,
): ElementRegistrationState {
  const [layer, setLayerState] = useState<Capa>('proveedor');
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [requiredIds, setRequiredIds] = useState<string[]>([]);
  const [message, setMessageText] = useState('');
  const [messageType, setMessageType] = useState<TipoMensaje>('error');
  const setMessage = (texto: string, tipo: TipoMensaje = 'error') => {
    setMessageText(texto);
    setMessageType(tipo);
  };
  const [sending, setSending] = useState(false);
  const requiredLayer = siguienteCapa(layer);
  const candidates = useMemo(
    () => (requiredLayer ? graph.nodos.filter((node) => node.capa === requiredLayer) : []),
    [graph.nodos, requiredLayer],
  );

  const setLayer = (nextLayer: Capa) => {
    setLayerState(nextLayer);
    setRequiredIds([]);
    setMessage('');
  };

  const setProviderId = (providerId: string) => {
    setRequiredIds(providerId ? [providerId] : []);
  };

  const toggleInsumo = (insumoId: string) => {
    setRequiredIds((current) => (
      current.includes(insumoId)
        ? current.filter((item) => item !== insumoId)
        : [...current, insumoId]
    ));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const datos = {
      id: id.trim(),
      nombre: name.trim(),
      categoria: category.trim() || undefined,
    };
    if (!datos.id || !datos.nombre) {
      setMessage('El identificador y el nombre son obligatorios.');
      return;
    }
    if (layer === 'insumo' && requiredIds.length !== 1) {
      setMessage('Selecciona el proveedor que abastece este insumo.');
      return;
    }
    if (layer === 'producto' && requiredIds.length === 0) {
      setMessage('Selecciona al menos un insumo que requiera este producto.');
      return;
    }

    setSending(true);
    setMessage('');
    try {
      let node: Nodo;
      if (layer === 'proveedor') {
        node = await crearProveedor(datos);
      } else if (layer === 'proceso') {
        node = await crearProceso(datos);
      } else if (layer === 'insumo') {
        node = await crearInsumo({ ...datos, proveedor_id: requiredIds[0] });
      } else {
        node = await crearProducto({ ...datos, insumo_ids: requiredIds });
      }
      setId('');
      setName('');
      setCategory('');
      setRequiredIds([]);
      // El back también registró las dependencias del nuevo elemento (nuevo → requerido)
      // con sus propios ids: se piden de nuevo en vez de armarlas aquí.
      try {
        await onGuardado();
        setMessage(`${node.nombre} quedó guardado en el catálogo.`, 'ok');
      } catch {
        setMessage(`${node.nombre} quedó guardado, pero no se pudo actualizar la red. Recarga la página.`, 'aviso');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo registrar el elemento.');
    } finally {
      setSending(false);
    }
  };

  return {
    layer,
    id,
    name,
    category,
    requiredIds,
    requiredLayer,
    candidates,
    message,
    messageType,
    sending,
    submit: (event) => void submit(event),
    setLayer,
    // El back exige ids en mayúsculas (PRV-MOLINO); se convierten mientras se escribe.
    setId: (value: string) => setId(value.toUpperCase()),
    setName,
    setCategory,
    setProviderId,
    toggleInsumo,
  };
}
