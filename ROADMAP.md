# Roadmap de continuidad

## Estado actual

- La app compila correctamente con `npm run lint` y `npm run build`.
- El producto base ya tiene autenticacion, biblioteca privada, comunidad, carpetas, comentarios, likes, enlaces publicos, exportacion y asistente IA.
- La mayor deuda tecnica esta en `src/App.tsx`, que concentra demasiada logica de estado, consultas Firestore y renderizado.

## Prioridad 1 - Estabilizar base

- Extraer constantes compartidas para categorias, filtros y mensajes.
- Crear hooks para Auth, prompts, carpetas, comunidad y enlaces compartidos.
- Centralizar operaciones Firestore en un modulo de servicios.
- Agregar manejo visual de errores para operaciones que hoy solo registran en consola.
- Revisar indices requeridos de Firestore para busquedas y filtros usados en comunidad.

## Prioridad 2 - Mejorar experiencia de usuario

- Agregar importacion/exportacion JSON de la biblioteca.
- Crear vista de detalle de prompt con historial de versiones.
- Mejorar busqueda con filtros combinados persistentes.
- Agregar estados vacios especificos por filtro, carpeta y comunidad.
- Convertir la gestion de carpetas en una experiencia de navegacion mas clara.

## Prioridad 3 - Robustecer IA

- Validar y normalizar la respuesta de Gemini antes de guardarla.
- Permitir seleccionar modelo desde configuracion de administrador.
- Agregar streaming o estado de progreso para generaciones largas.
- Guardar metadatos de generacion: modelo, fecha, modo usado y prompt fuente.
- Crear plantillas IA especializadas por categoria.

## Prioridad 4 - Calidad y despliegue

- Agregar pruebas unitarias para utilidades de variables `{{variable}}`.
- Agregar pruebas de componentes para formularios principales.
- Reducir el bundle inicial mediante lazy loading de modales y panel IA.
- Documentar despliegue Firebase/Vercel/Cloud Run segun destino final.
- Agregar CI con `npm ci`, `npm run lint` y `npm run build`.

## Observaciones tecnicas

- El build advierte que el chunk principal supera 500 kB; Firebase y la app monolitica son los principales candidatos a dividir.
- `src/firebase.ts` importa Firestore dinamica y estaticamente, por eso Vite avisa que ese import dinamico no separa chunk.
- El backend IA ya usa `GEMINI_MODEL`, lo que permite actualizar modelos sin editar codigo.
