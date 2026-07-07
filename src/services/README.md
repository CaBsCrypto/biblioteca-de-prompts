# Servicios Firestore

Capa de servicios que centraliza las operaciones Firestore por dominio. La meta
es sacar la logica de I/O de los hooks (`src/hooks/*`) para que estos se queden
solo con concerns de React (estado, efectos, callbacks) y deleguen en servicios
probables y reutilizables.

## Patron

- **Hook**: orquesta estado React, llama al servicio, maneja notificaciones.
- **Servicio**: recibe `Firestore db` + parametros, ejecuta la operacion, no
  conoce React ni UI.
- **Mapper**: (`src/utils/firestoreMappers.ts`) transforma documentos a tipos
  del dominio.

## Migracion (estado)

| Hook       | Servicio objetivo      | Estado  |
|------------|------------------------|---------|
| `usePromptLibrary` | `promptsService` | Done |
| `useFolders`       | `foldersService`  | TODO   |
| `useAuthProfile`   | `usersService`    | TODO   |
| `useSocialFavorites` | `socialFavoritesService` | TODO |
| `useConnections`   | `connectionsService` | TODO |
| `useConnectionChats` | `chatsService`    | TODO |
| `useCommunityPosts` | `communityPostsService` | TODO |
| `useBriefings`     | `briefingsService` | TODO |
| `useHackathons`    | `hackathonsService` | TODO |
| `useNews`          | `newsService`     | TODO |
| `useSavedIdeas`    | `savedIdeasService` | TODO |
| `usePromptEvents`  | `promptEventsService` | TODO |
| `useContentSafety` | `moderationService` | TODO |
| `useModerationReview` | `moderationService` | TODO |
| `useClassroomAccess` | `classroomsService` | TODO |
| `useAdminDashboard` | `adminService`    | TODO |
| `useCommunity`      | variados          | TODO |

## Convencion de nombres

- Archivos: `src/services/firestore/<dominio>Service.ts`
- Funciones: `createX`, `updateX`, `deleteX`, `fetchXOnce`, helpers de dominio.
- Tipos: `XSeed` (datos para crear), `XAuthorIdentity` cuando aplique.
- Subcolecciones: cada servicio expone funciones para sus propias
  subcolecciones (p.ej. `prompts/{id}/versions` pertenece a `promptsService`).
- Errores: el hook decide como notificar a la UI; el servicio solo lanza.

## Reglas

- No importar nada de React dentro de un servicio.
- No leer `firebase-applet-config.json` desde el servicio; la instancia `db`
  la pasa el hook.
- No mutar `Prompt` etc. que lleguen por parametro; construir payloads nuevos.
- Usar `serverTimestamp()` para `createdAt`/`updatedAt`; validar
  `createdAt == request.time` y `updatedAt == request.time` en reglas
  (`firestore.rules`).

## Referencia

Ver `promptsService.ts` + `usePromptLibrary.ts` para el patron completo.