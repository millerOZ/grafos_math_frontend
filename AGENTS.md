# Guía de uso de Skills para Claude Code

Este proyecto utiliza Skills de Claude Code ubicados en `.claude/skills/` para tareas especializadas.

## Skills disponibles

### 1. Frontend Design (`frontend-design`)

**Cuándo usar**: Para diseñar o mejorar interfaces de usuario con un enfoque distintivo y profesional.

**Características**:
- Proporciona guías de diseño profesional
- Evita diseños genéricos o "templated"
- Enfoque en tipografía intencional
- Diseño basado en el contexto del negocio
- Principios de diseño visual avanzado

**Ejemplo de uso**:
```
usa el skill de diseño para mejorar la página de inicio
```

**Principios clave que sigue**:
- Diseños específicos al subject matter (no genéricos)
- Evita defaults comunes (ALL CAPS labels, números decorativos 01/02/03, → en botones)
- Tipografía como elemento de diseño activo
- Paletas de color intencionales y específicas
- Motion sutil y con propósito

### 2. Three.js con React Three Fiber (`threejs-impl-react-three-fiber`)

**Cuándo usar**: Para implementar escenas 3D en React usando React Three Fiber.

**Características**:
- Implementación declarativa con R3F
- Previene errores comunes de mezclar código imperativo Three.js con R3F
- Patterns correctos para useFrame, useThree, useLoader
- Sistema de eventos 3D
- Optimización de performance

**Ejemplo de uso**:
```
usa el skill de three.js para agregar animaciones 3D
```

**Principios clave que sigue**:
- Código declarativo (JSX) en lugar de imperativo
- No crear objetos dentro de useFrame
- Usar Suspense para loaders
- Event system de R3F en lugar de raycasters manuales

## Cómo invocar un Skill

Los Skills se invocan automáticamente cuando Claude detecta que la tarea lo requiere, o puedes invocarlos explícitamente:

```
usa el skill [nombre-del-skill] para [tarea específica]
```

## Ejemplo de uso combinado

Este proyecto actual usa ambos skills:
- **frontend-design**: Para crear una página de inicio con diseño distintivo inspirado en un negocio de cafetería
- **threejs-impl-react-three-fiber**: Para agregar elementos 3D flotantes sutiles que representan nodos de un grafo

El resultado es una interfaz visualmente atractiva que evita clichés de diseño y usa animaciones 3D de forma apropiada y sutil.