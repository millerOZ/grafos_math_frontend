import { useMemo, useState, type FormEvent } from 'react';
import type { Arista, Capa, Grafo, Nodo } from '../types';
import { siguienteCapa } from '../domain/dependencyRules';
import { crearInsumo, crearProducto, crearProveedor } from './getProducts';

/**
 * Cada elemento se crea enlazado a la capa de la que depende:
 * - proveedor: no requiere nada.
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
  sending: boolean;
  submit: (event: FormEvent<HTMLFormElement>) => void;
  setLayer: (layer: Capa) => void;
  setId: (id: string) => void;
  setName: (name: string) => void;
  setCategory: (category: string) => void;
  setProviderId: (id: string) => void;
  toggleInsumo: (id: string) => void;
}

export function useElementRegistration(
  graph: Grafo,
  onAddNode: (node: Nodo) => void,
  onAddEdge: (edge: Arista) => void,
): ElementRegistrationState {
  const [layer, setLayerState] = useState<Capa>('proveedor');
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [requiredIds, setRequiredIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
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
      } else if (layer === 'insumo') {
        node = await crearInsumo({ ...datos, proveedor_id: requiredIds[0] });
      } else {
        node = await crearProducto({ ...datos, insumo_ids: requiredIds });
      }
      onAddNode(node);
      // El back también registra las dependencias del nuevo elemento (nuevo → requerido).
      requiredIds.forEach((requiredId, index) => {
        onAddEdge({
          id: `e${String(graph.aristas.length + 1 + index).padStart(2, '0')}`,
          origen: node.id,
          destino: requiredId,
          tipo: 'REQUIERE',
        });
      });
      setId('');
      setName('');
      setCategory('');
      setRequiredIds([]);
      setMessage(`${node.nombre} quedó registrado en el catálogo.`);
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
    sending,
    submit: (event) => void submit(event),
    setLayer,
    setId,
    setName,
    setCategory,
    setProviderId,
    toggleInsumo,
  };
}
