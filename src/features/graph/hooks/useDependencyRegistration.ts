import { useMemo, useState, type FormEvent } from 'react';
import type { Arista, Grafo, Nodo } from '../types';
import { esDependenciaPermitida, siguienteCapa } from '../domain/dependencyRules';

interface DependencyRegistrationState {
  originId: string;
  targetId: string;
  message: string;
  origin: Nodo | undefined;
  origins: Nodo[];
  targets: Nodo[];
  validEdges: Arista[];
  submit: (event: FormEvent<HTMLFormElement>) => void;
  setOriginId: (id: string) => void;
  setTargetId: (id: string) => void;
}

export function useDependencyRegistration(
  graph: Grafo,
  onAdd: (edge: Arista) => void,
): DependencyRegistrationState {
  const [originId, setOriginIdState] = useState('');
  const [targetId, setTargetIdState] = useState('');
  const [message, setMessage] = useState('');
  const origin = graph.nodos.find((node) => node.id === originId);
  const origins = useMemo(
    () => graph.nodos.filter((node) => node.capa !== 'proveedor'),
    [graph.nodos],
  );
  const targets = useMemo(() => {
    const targetLayer = origin ? siguienteCapa(origin.capa) : null;
    return targetLayer ? graph.nodos.filter((node) => node.capa === targetLayer) : [];
  }, [graph.nodos, origin]);
  const validEdges = useMemo(() => graph.aristas.filter((edge) => {
    const edgeOrigin = graph.nodos.find((node) => node.id === edge.origen);
    const edgeTarget = graph.nodos.find((node) => node.id === edge.destino);
    return Boolean(edgeOrigin && edgeTarget && esDependenciaPermitida(edgeOrigin, edgeTarget));
  }), [graph.aristas, graph.nodos]);

  const setOriginId = (id: string) => {
    setOriginIdState(id);
    setTargetIdState('');
    setMessage('');
  };

  const setTargetId = (id: string) => {
    setTargetIdState(id);
    setMessage('');
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const edgeOrigin = graph.nodos.find((node) => node.id === originId);
    const edgeTarget = graph.nodos.find((node) => node.id === targetId);
    if (!edgeOrigin || !edgeTarget || !esDependenciaPermitida(edgeOrigin, edgeTarget)) {
      setMessage('Selecciona una combinación válida de elementos.');
      return;
    }
    if (graph.aristas.some((edge) => edge.origen === originId && edge.destino === targetId)) {
      setMessage('Esta dependencia ya está registrada.');
      return;
    }
    onAdd({
      id: `e${String(graph.aristas.length + 1).padStart(2, '0')}`,
      origen: originId,
      destino: targetId,
      tipo: 'REQUIERE',
    });
    setTargetIdState('');
    setMessage('Dependencia registrada correctamente.');
  };

  return {
    originId,
    targetId,
    message,
    origin,
    origins,
    targets,
    validEdges,
    submit,
    setOriginId,
    setTargetId,
  };
}
