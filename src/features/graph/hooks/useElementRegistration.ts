import { useMemo, useState, type FormEvent } from 'react';
import type { Arista, Grafo, Nodo } from '../types';
import { crearInsumo, crearProveedor } from './getProducts';

export type ElementLayer = 'proveedor' | 'insumo';

interface ElementRegistrationState {
  layer: ElementLayer;
  id: string;
  name: string;
  category: string;
  providerId: string;
  message: string;
  sending: boolean;
  providers: Nodo[];
  submit: (event: FormEvent<HTMLFormElement>) => void;
  setLayer: (layer: ElementLayer) => void;
  setId: (id: string) => void;
  setName: (name: string) => void;
  setCategory: (category: string) => void;
  setProviderId: (id: string) => void;
}

export function useElementRegistration(
  graph: Grafo,
  onAddNode: (node: Nodo) => void,
  onAddEdge: (edge: Arista) => void,
): ElementRegistrationState {
  const [layer, setLayerState] = useState<ElementLayer>('proveedor');
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [providerId, setProviderId] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const providers = useMemo(
    () => graph.nodos.filter((node) => node.capa === 'proveedor'),
    [graph.nodos],
  );

  const setLayer = (nextLayer: ElementLayer) => {
    setLayerState(nextLayer);
    setProviderId('');
    setMessage('');
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
    if (layer === 'insumo' && !providerId) {
      setMessage('Selecciona el proveedor que abastece este insumo.');
      return;
    }

    setSending(true);
    setMessage('');
    try {
      if (layer === 'proveedor') {
        onAddNode(await crearProveedor(datos));
      } else {
        const node = await crearInsumo({ ...datos, proveedor_id: providerId });
        onAddNode(node);
        // El back también registra la dependencia insumo → proveedor.
        onAddEdge({
          id: `e${String(graph.aristas.length + 1).padStart(2, '0')}`,
          origen: node.id,
          destino: providerId,
          tipo: 'REQUIERE',
        });
      }
      setId('');
      setName('');
      setCategory('');
      setMessage(`${layer === 'proveedor' ? 'Proveedor' : 'Insumo'} registrado correctamente.`);
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
    providerId,
    message,
    sending,
    providers,
    submit: (event) => void submit(event),
    setLayer,
    setId,
    setName,
    setCategory,
    setProviderId,
  };
}
