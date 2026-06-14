# Sprint Log

## Sprint 0 - Blindaje inicial

Estado: en progreso.

### Completado

- Proteccion de endpoints `/api/ai/*` con token Firebase.
- Rate limit configurable para llamadas Gemini.
- Limite de payload JSON para el backend.
- Normalizacion de respuestas Gemini antes de llegar a la UI.
- Escape de contenido de usuario en impresion/exportacion PDF.
- Documento de operacion del enjambre en `SCRUM_SWARM.md`.

### Sprint 1 - Blindaje Firestore

Estado: iniciado.

### Completado

- Las colecciones compartidas ahora consultan solo prompts con `isShared == true`.
- Las reglas impiden asignar un prompt a una carpeta que no pertenece al usuario autenticado.
- Los likes usan `arrayUnion`/`arrayRemove` e incremento atomico en cliente.
- Las reglas restringen likes para que un usuario solo agregue o quite su propio UID.
- Los prompts creados desde IA y prompts semilla nacen con `likedBy: []` y `likesCount: 0`.
- Compartir carpeta usa comportamiento mixto: seguro por defecto y publicacion masiva solo con casilla explicita.

### Validacion

- `npm run lint`: OK.
- `npm run build`: OK.

### Pendiente QA

- Ejecutar Firestore Emulator para probar reglas con casos:
  - carpeta propia vs carpeta ajena,
  - carpeta publica ajena,
  - prompt privado dentro de carpeta compartida,
  - like/unlike legitimo,
  - intento de manipular likes de otros usuarios,
  - prompts legacy sin `likedBy`.

## Proximo Sprint Propuesto

Sprint 2 - Perfiles y publicacion consciente.

Objetivo:

- Crear base de perfiles publicos en `/users/{uid}`.
- Empezar a separar biblioteca privada de vitrina publica.
- Preparar `visibility` como reemplazo gradual de `isShared`.

### Iniciado

- Agregado tipo `UserProfile`.
- Al iniciar sesion, la app crea o actualiza `/users/{uid}` con nombre, avatar, handle, rol, estado y contadores base.
- Reglas Firestore permiten leer perfiles activos y editar solo el perfil propio.
- Nuevos prompts, clones y publicaciones de carpeta usan la identidad del perfil actual.
- Header autenticado muestra `@handle` del perfil.
- Agregado modal de edicion de perfil publico para `displayName`, `handle` y `bio`.
- El guardado valida handles duplicados antes de actualizar `/users/{uid}`.
- Seguimiento de creadores migrado desde `localStorage` a `/users/{uid}/following/{creatorUid}`.
- Reglas Firestore impiden seguir/dejar de seguir en nombre de otro usuario.
- Agregado filtro de Comunidad `Todos` / `Siguiendo`.
- El feed `Siguiendo` muestra solo prompts publicos de creadores seguidos y tiene estados vacios especificos.
- Agregado recomendador v1 local sin costo IA.
- El recomendador rankea prompts propios por objetivo, categoria activa, etiquetas, favoritos, texto y senales sociales.
- Cada recomendacion muestra razones y acciones para usar, copiar o editar.
- Agregada primera capa de eventos en `/users/{uid}/events`.
- Se registran aperturas del recomendador y acciones `use`, `copy`, `edit`, `recommendation_use`, `recommendation_copy`.
- Reglas Firestore permiten crear eventos propios y bloquean edicion/borrado.
- El recomendador local ahora usa los eventos recientes para subir prompts con historial real de uso, copia o edicion.

Pregunta de producto:

- Cuando compartes una carpeta, quieres que el usuario tenga que marcar cada prompt como publico, o prefieres un flujo que pregunte: "hacer publicos todos los prompts de esta carpeta"?

## Sprint 3 - QA y seguridad de reglas

Estado: preparado, dormido por decision de producto.

### Completado

- Agregadas dependencias de QA: `vitest`, `@firebase/rules-unit-testing` y `firebase-tools`.
- Agregado `firebase.json` para ejecutar Firestore Emulator.
- Agregado `firestore.indexes.json` con indices documentados para prompts, folders, follows y eventos.
- Agregada suite `tests/firestore.rules.test.ts`.
- Casos cubiertos:
  - perfil propio vs perfil ajeno,
  - bloqueo de rol `founder` desde cliente,
  - follows propios y bloqueo de follows ajenos,
  - eventos propios y bloqueo de edicion,
  - carpeta propia y prompt en carpeta ajena,
  - prompt privado dentro de carpeta compartida,
  - lectura publica solo de prompt `isShared`,
  - edicion/borrado solo por owner,
  - like/unlike legitimo y bloqueo de likes falsificados.

### Validacion

- `npm run test:rules`: preparado para futuro CI/staging con JDK, pero no obligatorio en el flujo local actual.
- `npm run lint`: OK.
- `npm run build`: OK.

## Sprint 3.5 - QA en Vercel sin Java local

Estado: implementado.

### Completado

- Agregado `QA_VERCEL.md` con checklist funcional para Vercel Preview.
- Agregado script `npm run qa` como puerta obligatoria actual: lint + build.
- `test:rules` queda como herramienta futura opcional, no como requisito del sprint.
- Agregado adapter serverless `api/[...path].js` para que Vercel sirva `/api/*` con Express desde `dist/server.cjs`.
- Agregado `vercel.json` para separar API serverless y frontend estatico.
- `server.ts` ahora exporta `createApp()` y solo hace `listen()` fuera de Vercel.
- Vercel project creado y conectado a GitHub: `cabscryptocontacto-6028s-projects/biblioteca-de-prompts`.
- Deployment inicial quedo protegido por SSO de Vercel (`all_except_custom_domains`).
- `vercel curl /` confirmo que el frontend se sirve detras del bypass.
- Se detecto y corrigio fallo de API por import ESM de `server.ts`; el adapter ahora apunta a `dist/server.cjs`.
- Redeploy final quedo bloqueado por limite diario Vercel Hobby: `api-deployments-free-per-day`.

## Sprint 4 - Recomendador Gemini opcional

Estado: implementado.

### Completado

- Nuevo endpoint protegido `POST /api/ai/recomendar`.
- Reusa token Firebase, rate limit y payload limit de `/api/ai/*`.
- Entrada limitada a objetivo, filtros activos y candidatos reducidos del recomendador local.
- El backend normaliza recomendaciones y descarta IDs que no existan en los candidatos.
- La UI agrega boton explicito `Mejorar con Gemini` dentro del recomendador local.
- Errores Gemini se muestran como aviso y no rompen el ranking local.
- Gemini puede devolver analisis de huecos y sugerencia de prompt nuevo.

## Sprint 5 - Vitrina publica fundador

Estado: primera version implementada.

### Completado

- La pantalla sin login muestra una vitrina real: `Biblioteca gratuita de prompts`.
- Visitantes pueden explorar prompts publicos destacados sin iniciar sesion.
- Visitantes pueden copiar o usar prompts publicos.
- CTA secundario: `Crear mi biblioteca`.
- El dashboard privado sigue separado para usuarios autenticados.

## Sprint 6 - Refactor de App

Estado: iniciado.

### Completado

- Extraido el algoritmo del recomendador local a `src/utils/recommendations.ts`.
- `App.tsx` queda menos cargado y el recomendador puede evolucionar sin tocar el layout principal.

### Pendiente

- Extraer hooks de auth/perfil, prompts, comunidad, follows y eventos.
- Extraer modales grandes de perfil, recomendador y compartir carpeta.
- Resolver warning de bundle grande con code splitting o manual chunks.

## Sprint 7 - Red social confiable

Estado: implementado.

### Completado

- Roadmap actualizado para reflejar estado real: vitrina publica, feed `Para ti`, perfil hub, workspace diario, recurso vivo y code splitting.
- Agregado centro de confianza en Mi Biblioteca para publicaciones propias:
  - conteo de prompts publicos,
  - conteo de prompts ocultos del feed,
  - reportes recibidos por prompts propios,
  - accesos para ver, editar o despublicar recursos reportados.
- Reglas Firestore permiten leer reportes solo al dueno del prompt o a perfiles con rol `founder`.
- Las tarjetas muestran mejor estado social:
  - privado/publicado,
  - remix,
  - remixes conocidos.
- El detalle publico ahora muestra remixes conocidos navegables y evita leer historial privado de versiones cuando el usuario no es el autor.
- El perfil publico separa mejor prompts originales y remixes publicados.
- El checklist de activacion refuerza la narrativa: guardar, usar, remixear, organizar y publicar.

### Validacion esperada

- `npm run qa`.
- `npm run smoke:vercel -- https://biblioteca-de-prompts-ashen.vercel.app` despues de deploy.
- Prueba manual de visitante, login, guardar remix, reporte/ocultar, centro de confianza y perfil publico.

## Sprint 8 - Creator Hub V2

Estado: implementado.

### Completado

- Perfil publico convertido en mini-home de creador mas clara:
  - CTA principal `Seguir creador`,
  - CTA secundario para guardar un prompt inicial,
  - bloque `Mejores recursos para empezar`,
  - rutas por categorias frecuentes,
  - copy para visitantes explicando remix privado.
- Los enlaces directos `?share=` muestran un modal de recurso publico con:
  - autor,
  - estado de remix,
  - pasos probar / guardar remix privado / publicar si aporta,
  - aviso de que guardar no modifica el original.
- La vitrina publica refuerza que guardar crea una copia privada editable.
- Se mantiene el modelo Firestore actual, sin router nuevo, sin IA nueva y sin cambios de monetizacion.

### Validacion esperada

- `npm run qa`.
- `npm run smoke:vercel -- https://biblioteca-de-prompts-ashen.vercel.app` despues de deploy.
- Prueba manual de visitante: home publica, perfil `?user=uid`, prompt `?share=promptId`, guardar remix y vista movil.
