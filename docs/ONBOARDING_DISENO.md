# Onboarding — Biblioteca de Prompts (para el equipo de diseño)

> Guia tecnica para acoplarse al proyecto. Cubre proposito, stack, mapeo del
> codigo, endpoints de la API REST, modelo de datos Firestore, reglas de
> seguridad y requisitos para levantar el entorno local.

---

## 1. Que es el producto

Aplicacion full-stack para **guardar, clasificar, compartir y optimizar prompts
con IA**. Combina:

- **Biblioteca personal**: prompts privados con favoritos, carpetas, etiquetas y
  busqueda.
- **Red social de prompts**: comunidad publica con likes, comentarios, follows,
  favoritos sociales y **remixes privados**.
- **Vitrina publica**: explorar prompts antes de iniciar sesion.
- **Perfil hub de creador** con prompts originales, colecciones y remixes.
- **Asistente IA** (Gemini) para crear y optimzar prompts desde el backend.
- **Briefings / News / Hackathons / Forum / Classrooms**: superficies secundarias
  orientadas a creadores.

### Usuarios y roles

| Rol       | Permisos                                                            |
|-----------|--------------------------------------------------------------------|
| `member`  | Usuario base (registro por Google Auth)                            |
| `creator` | Usuario con perfil publico activo                                 |
| `founder` | Acceso administrativo (moderacion, classes, briefings, stats)     |

Estados posibles de un `UserProfile`: `active` | `hidden` | `blocked`.

---

## 2. Stack

| Capa        | Tecnologia                                                          |
|-------------|--------------------------------------------------------------------|
| Frontend    | React 19 + Vite 6 + TypeScript + Tailwind CSS 4                    |
| UI kits     | `lucide-react` (iconos), `motion` (animaciones)                   |
| Backend     | Express (server.ts) — tambien serverless en `api/[...path].js`     |
| IA          | `@google/genai` (Gemini)                                           |
| Auth        | Firebase Auth (Google) — verificacion RS256 en el servidor         |
| Base datos  | Cloud Firestore (reglas en `firestore.rules`)                      |
| Deploy      | Vercel (preview + produccion)                                      |
| Tests/QA    | `tsc --noEmit`, `vite build`, `vitest`, `firebase emulators`       |

---

## 3. Mapeo del proyecto

```
elegant-lavoisier/
├── server.ts                  # API Express + Gemini + verificacion Firebase
├── api/
│   └── [...path].js           # Handler serverless para Vercel (reusa server.ts)
├── vercel.json                # Builds + rutas SPA + rewrite a /api/[...path].js
├── firebase-applet-config.json# Configcliente Firebase (projectId, etc.)
├── firebase.json
├── firestore.indexes.json
├── firestore.rules            #Reglas de seguridad (843 lineas, muy estrictas)
├── index.html                 # Entry HTML del SPA
├── vite.config.ts
├── tsconfig.json
├── package.json
├── scripts/
│   └── smoke-vercel.mjs       # Smoke test post-deploy (home 200, /api 401)
├── tests/
│   └── firestore.rules.test.ts# Tests de reglas (requiere Java; dormido)
├── docs/
└── src/
    ├── main.tsx               # Bootstrap React
    ├── App.tsx               # UI principal (monolitica — extraer a futuro)
    ├── index.css             # Tailwind base
    ├── firebase.ts           # Cliente Firebase (auth + firestore)
    ├── data.ts               # Re-export de seeds + helpers de datos
    ├── data/
    │   └── founderPrompts.ts # 80 prompts semilla del Pack Fundador
    ├── types.ts              # Tipos: Prompt, Folder, UserProfile, Social, etc.
    ├── typesCommunity.ts    # Tipos de superficies comunitarias
    ├── hooks/                # Hooks de UI (busqueda, recommendations, etc.)
    ├── utils/                # Utilidades (formato, tokens, validaciones)
    └── components/           # 44 componentes
        ├── ActivationChecklist.tsx
        ├── AdminDashboard.tsx
        ├── AIHelperPanel.tsx
        ├── AnalyticsDashboardView.tsx
        ├── AppDeferredSurfaces.tsx     # Lazy loading de superficies pesadas
        ├── AppTopNav.tsx
        ├── BetaInvitePanel.tsx
        ├── CategoryPromptsModal.tsx
        ├── ClassroomAdminSummary.tsx
        ├── ClassroomView.tsx
        ├── CommentsSection.tsx
        ├── CommunityExplore.tsx
        ├── CommunityPostCard.tsx
        ├── ConnectionsPanel.tsx
        ├── CopyFilledModal.tsx
        ├── CreateFolderModal.tsx
        ├── CreateHackathonModal.tsx
        ├── CreatePostModal.tsx
        ├── CreatorGrowthPanel.tsx
        ├── DailyMissionPanel.tsx
        ├── DailyWorkspace.tsx
        ├── FolderTreeView.tsx
        ├── ForumCommentsSection.tsx
        ├── ForumSection.tsx
        ├── HackathonsSection.tsx
        ├── JoinClassModal.tsx
        ├── LibraryWorkspaceView.tsx
        ├── NewsSection.tsx
        ├── ProfileModal.tsx
        ├── PromptCard.tsx
        ├── PromptFillerModal.tsx
        ├── PromptFormModal.tsx
        ├── PromptPlaylistPlayer.tsx
        ├── PublicBriefingView.tsx
        ├── PublicProfileView.tsx
        ├── PublicPromptDetailModal.tsx
        ├── QuickSwitcherModal.tsx
        ├── RecommendationModal.tsx
        ├── SeedPackModal.tsx
        ├── SharedPromptModal.tsx
        ├── ShareFolderModal.tsx
        ├── ShowcaseSection.tsx
        ├── TrustModerationPanel.tsx
        └── WelcomeHeroSection.tsx
```

###convenciones de codigo

- `npm run lint` ejecuta `tsc --noEmit` (no emite JS). Todo tipo debe checkerar.
- El QA obligatorio es `npm run qa` (= `lint` + `build`). Antes de un deploy,
  corre esto.
- El bundling hace **chunks manuales** de Firebase y vendors para reducir el
  bundle inicial; las superficies grandes se cargan via `AppDeferredSurfaces`.
- Espanol neutro en todo el contenido y mensajes al usuario.

---

## 4. Mapa de superficies UI

Conceptos que aparecen en la app — utiles para disenar contra ellos:

|Vista / Ruta virtual                  | Componente principal             | Acceso      |
|--------------------------------------|-----------------------------------|-------------|
| Welcome / Vitrina publica            | `WelcomeHeroSection`              | Publico     |
| Explorar comunidad                   | `CommunityExplore`                | Publico     |
| Detalle de prompt publica            | `PublicPromptDetailModal`         | Publico     |
| Perfil hub de creador                | `PublicProfileView`               | Publico     |
| Briefing publica                     | `PublicBriefingView`              | Publico     |
| Mi biblioteca (workspace)            | `LibraryWorkspaceView`            | Autenticado |
| Workspace diario                     | `DailyWorkspace`                  | Autenticado |
| Mixer / Llenar variables             | `PromptFillerModal`               | Autenticado |
| Form / Editar prompt                 | `PromptFormModal`                 | Autenticado |
| Carpeta compartida                   | `ShareFolderModal`                | Autenticado |
| Prompt compartido (?share=)          | `SharedPromptModal`               | Autenticado |
| Asistente IA                         | `AIHelperPanel`                   | Autenticado |
| Recomendaciones                      | `RecommendationModal`             | Autenticado |
| Conexiones (follows)                 | `ConnectionsPanel`                | Autenticado |
| Foro                                 | `ForumSection` + `ForumComments` | Autenticado |
| Hackathons                           | `HackathonsSection`               | Autenticado |
| News                                 | `NewsSection`                     | Autenticado |
| Clase / Classroom                    | `ClassroomView`                   | Miembro     |
| Admin founder                        | `AdminDashboard` + resumenes       | Founder     |
| Moderacion / Confianza               | `TrustModerationPanel`            | Founder     |
| Analytics                            | `AnalyticsDashboardView`          | Founder     |
| Crecimiento de creador               | `CreatorGrowthPanel`             | Autenticado |
| Misiones diarias                     | `DailyMissionPanel`              | Autenticado |
| Playlist de prompts                  | `PromptPlaylistPlayer`           | Autenticado |
| Checklist de activacion               | `ActivationChecklist`            | Autenticado |
| Quick switcher                       | `QuickSwitcherModal`             | Autenticado |
| Pack Fundador (semillas)              | `SeedPackModal`                  | Autenticado |
| Invitaciones beta                    | `BetaInvitePanel`                | Founder     |

> El routing es por estado en `App.tsx` (no router separado). Enlaces
> compartibles via querystring: `?share=<promptId>`, `?folder=<folderId>`,
> `?profile=<handle>`.

---

## 5. API REST — Endpoints

Todo el backend vive en `server.ts` y se reusa tal cual en el handler
serverless `api/[...path].js` para Vercel. Base URL local: `http://localhost:3000`.

### 5.1 Autenticacion

Las rutas `/api/ai/*` y `/api/news` requieren un **Firebase ID Token** en el
header:

```
Authorization: Bearer <firebase_id_token>
```

El servidor verifica el token RS256 manualmente (sin Admin SDK), usando los
certificados publicos de `securetoken@system.gserviceaccount.com` y el
`projectId` de `firebase-applet-config.json`. Caches los certificados segun el
`max-age` de Google.

| Error | Significado                                          |
|-------|------------------------------------------------------|
| 401   | Token ausente, expirado o firma invalida             |
| 429   | Rate limit IA alcanzado                              |
| 400   | Validacion de campos requeridos o largo excedido     |
| 500   | Error de Gemini o error interno                      |

### 5.2 Rate limit IA

Configurable via env:

| Env                          | Default | Descripcion                       |
|------------------------------|---------|-----------------------------------|
| `AI_RATE_LIMIT_WINDOW_MS`    | 600000  | Ventana de 10 min                 |
| `AI_RATE_LIMIT_MAX`          | 20      | Peticiones por usuario/IP en ventana |

### 5.3 Endpoints disponibles

---

#### `GET /api/news`

Noticias curadas (Hacker News + GNews) por categoria e idioma.

- **Auth**: NO requerida (es publica).
- **Query params**:
  - `category` — `ai` | `tech` | `startups` | `devtools` | `design` | `hackathons` (default `ai`)
  - `language` — `en` | `es` | `all` (default `all`)
- **Respuesta 200**:
```json
{
  "category": "ai",
  "language": "all",
  "hasPremiumSource": true,
  "items": [
    {
      "id": "hn-12345",
      "title": "...",
      "summary": "...",
      "summaryEs": "...",
      "url": "https://...",
      "source": "Hacker News",
      "imageUrl": "https://...",
      "publishedAt": "2026-07-01T...",
      "language": "en",
      "category": "ai",
      "tags": ["ia", "llm", "agentes"]
    }
  ]
}
```
- **Cache**: `Cache-Control: public, max-age=300, s-maxage=600`. Cache en
  memoria 10 min por `categoria:idioma`.
- **Requiere**: `GNEWS_API_KEY` para contenido premium (si no esta, solo Hacker
  News).
- **Errores**: `500` si fallan todas las fuentes.

---

#### `POST /api/ai/crear`

Genera un prompt nuevo a partir de una descripcion en lenguaje natural.

- **Auth**: REQUERIDA (`Bearer <firebase_id_token>`).
- **Rate limit**: Si (contador IA por usuario).
- **Body**:
```json
{
  "description": "Prompt para resumir videos de YouTube",
  "targetRole": "Asistente de contenido",
  "channelContext": "Canal de IA para principiantes"
}
```
- **Validaciones**:
  - `description` (string, 1..1000, requerido)
  - `targetRole` (string, opcional, max 120)
  - `channelContext` (string, opcional, max 250)
- **Respuesta 200** (`GeneratedPromptPayload`):
```json
{
  "title": "...",
  "description": "...",
  "promptText": "...con {{tema}} y {{estilo}}...",
  "category": "YouTube",
  "tags": ["video", "seo"],
  "suggestedVariables": [
    { "name": "tema", "description": "...", "defaultValue": "..." }
  ]
}
```
- **Categoria** debe ser uno de: `YouTube`, `Marketing`, `Programacion`,
  `Redaccion`, `IA Agentes`, `IA Imagenes`, `IA Videos`, `Acompanante
  Personal`, `Asistente de Prompts`, `Refactorizacion`, `Seguridad`, `Buenas
  Practicas`, `General`. (Se aceptan aliases como `Coding` -> `Programacion`.)

---

#### `POST /api/ai/optimizar`

Mejora un prompt existente.

- **Auth**: REQUERIDA.
- **Rate limit**: Si.
- **Body**:
```json
{
  "originalPromptText": "Actua como ...",
  "comments": "Hazlo mas corto y agrega variables"
}
```
- **Validaciones**:
  - `originalPromptText` (string, 1..10000, requerido)
  - `comments` (string, opcional, max 500)
- **Respuesta**: mismo `GeneratedPromptPayload` que `/crear`.

---

#### `POST /api/ai/recomendar`

Capa opcional de ranking sobre el recomendador local.

- **Auth**: REQUERIDA.
- **Rate limit**: Si.
- **Body**:
```json
{
  "goal": "Quiero crear contenido para Instagram",
  "candidates": [
    { "id": "p-001", "title": "...", "description": "...", "category": "Marketing", "tags": ["social"], "score": 0.7, "reasons": ["..."] }
  ],
  "filters": {
    "category": "Marketing",
    "tags": ["social"]
  }
}
```
- **Validaciones**:
  - `goal` (string, 1..500, requerido)
  - `candidates` (array, hasta 8 items con `id` + `title`)
  - `filters` (opcional; `category` max 50, `tags` max 8)
- **Respuesta 200** (`AIRecommendationPayload`):
```json
{
  "recommendations": [
    { "id": "p-001", "reason": "...", "confidence": 80 }
  ],
  "gapAnalysis": "...",
  "suggestedNewPrompt": { /* igual que GeneratedPromptPayload, opcional */ }
}
```
- **Politicas**:
  - Solo se recomiendan IDs presentes en `candidates` (no se inventan).
  - `confidence` acotado a 0..100.
  - `gapAnalysis` se trunca a 1000 chars.

---

### Otras superficies (sin endpoint dedicado)

Las siguientes operaciones **no exponen endpoints REST**: el cliente escribe
directamente a Firestore tras las reglas de `firestore.rules`:

- Crear/editar/eliminar prompts y carpetas
- Likes, comentarios, follows, conexiones
- Remixesprivados (crear fork con `forkedFrom...`)
- Favoritos sociales y `hiddenPrompts`
- Briefings, hackathons, saved ideas, events, chat
- Moderacion founder (status, stats)

> Para disenar flujos sobre estas superficies hay que entender las colecciones
> y los campos validados (ver seccion 6).

---

## 6. Modelo de datos (Firestore)

Reglas en `firestore.rules` definen que cada documento puede tener y quien lo
puede tocar. Resumen de colecciones principales:

### 6.1 `prompts/{promptId}`

Documento central. Validaciones (extracto):

| Campo                  | Tipo     | Restricciones                                |
|------------------------|----------|----------------------------------------------|
| `userId`               | string   | == `auth.uid` (propietario)                  |
| `title`                | string   | 1..150                                       |
| `promptText`           | string   | 1..10000                                     |
| `category`             | string   | <= 50                                        |
| `description`          | string   | opcional, <= 1000                            |
| `tags`                 | array    | opcional, <= 10                             |
| `isFavorite`           | bool     |                                              |
| `notas`                | string   | <= 6000                                      |
| `isShared`             | bool     | si `true`, se vuelve publico                |
| `authorName`           | string   | <= 200                                       |
| `authorAvatar`         | string   | <= 1000                                      |
| `authorHandle`         | string   | <= 40                                        |
| `likedBy`              | array    | <= 1000 UIDs                                 |
| `likesCount`           | int      | == `likedBy.length`                          |
| `suggestedVariables`   | array    | ver PromptVariable en `src/types.ts`        |
| `forkedFrom*`          | string   | campos de proveniencia del remix            |
| `folderId`             | string   | debe pertenecer al propietario               |
| `sourceClassId/Title`  | string   | origen Classroom                            |
| `createdAt/updatedAt`  | timestamp | `createdAt` inmutable, `updatedAt` = now   |

Subcolecciones:
- `prompts/{id}/comments/{commentId}` — comentarios publicos.
- `prompts/{id}/reports/{reporterId}` — reportes de prompts publicos.
- `prompts/{id}/versions/{versionId}` — historial de versiones (owner only).

Reglas destacadas:
- **read**: founder, o `isShared == true`, o propietario.
- **update**: propietario (campos core), o likes social con diff limitado a
  `likedBy`, `likesCount`, `updatedAt`.

### 6.2 `folders/{folderId}`

Carpetas (con colaboradores):

| Campo          | Tipo     | Restricciones                            |
|----------------|----------|------------------------------------------|
| `userId`       | string   | == `auth.uid` al crear                  |
| `name`         | string   | 1..100                                   |
| `description`  | string   | <= 500                                   |
| `isShared`     | bool     | si `true`, lista publica                |
| `parentId`     | string   | <= 128 o null (jerarquia)                |
| `collaborators`| map      | `{ uid: { type, role } }`               |

### 6.3 `users/{userId}`

Perfil publico:

| Campo         | Tipo     | Restricciones                                  |
|---------------|----------|------------------------------------------------|
| `uid`         | string   | == path `userId`                              |
| `displayName` | string   | 1..120                                        |
| `handle`      | string   | 1..40, regex `^[a-z0-9][a-z0-9_-]*$`          |
| `photoURL`    | string   | <= 1000                                       |
| `bio`         | string   | <= 500                                        |
| `role`        | enum     | `founder` | `creator` | `member`              |
| `status`      | enum     | `active` | `hidden` | `blocked`            |
| `stats`       | map      | contadores publicos (followers, etc.)         |

Subcolecciones de `users/{uid}/`:
- `following/{creatorId}` — follows.
- `connections/{connectionId}` — 1:1 connects (pending -> connected).
- `blockedUsers/{targetUid}` — bloqueos.
- `events/{eventId}` — telemetry del usuario (recommendation_open, copy, edit...).
- `savedIdeas/{ideaId}` — ideas guardadas de news/hackathons.
- `favorites/{promptId}` — favoritos sociales (copia ID + meta del prompt).
- `hiddenPrompts/{promptId}` — prompts ocultos del feed del usuario.

### 6.4 Colecciones comunitarias

- `communityPosts/{postId}` — `type`: `idea` | `question` | `team` |
  `showcase`, `title` <= 140, `body` <= 4000, `tags` <= 12. Con
  `communityPosts/{id}/comments/{commentId}`.
- `chats/{chatId}/messages/{messageId}` — chat 1:1 entre conexiones.
- `chats/{chatId}/reports/{reporterId}` — reportes de chat.
- `briefings/{briefingId}` — boletines publicados (`isPublished: bool`).
- `hackathons/{hackathonId}` — retos, `deadline`, `mode`, `tags`, `rolesNeeded`.
- `classes/{classId}/members/{memberId}` — aulas founder-only.

### 6.5 Reglas generales

- Deny por default (`allow read, write: if false`).
- `isFounder()` se calcula leyendo `users/{auth.uid}.role == 'founder'`.
- IDs validados con regex `^[a-zA-Z0-9_\\-]+$`, max 128 chars.
- Timestamps: `createdAt == request.time` al crear, `updatedAt == request.time`
  al actualizar, `createdAt` inmutable en updates.

---

## 7. Requisitos para acoplarse al entorno

### 7.1 Cuentas y acceso

- **Vercel** project (deploy + previews + env vars).
- **Firebase** project con:
  - **Authentication > Google provider** habilitado.
  - **Firestore Database** en modo produccion.
  - Dominios autorizados para Auth (localhost:3000 + dominio Vercel).
  - Service Account Tongle no es necesario: el servidor usa certificados
    publicos para verificar tokens.
- **Google AI Studio / Gemini** API key (`GEMINI_API_KEY`).
- **GNews** API key (opcional, `GNEWS_API_KEY`) para noticias premium.

### 7.2 Variables de entorno (.env.local)

Copia de `.env.example`:

```bash
GEMINI_API_KEY="..."        # Requerido para /api/ai/*
GEMINI_MODEL="gemini-3.5-flash"
APP_URL="http://localhost:3000"

# Opcionales
GNEWS_API_KEY="..."
AI_RATE_LIMIT_WINDOW_MS="600000"
AI_RATE_LIMIT_MAX="20"
```

> En Vercel, configurarlas en Project Settings > Environment Variables. El
> `APP_URL` y `GEMINI_API_KEY` suelen inyectarse en runtime.

### 7.3 Setup local

```bash
# 1. Instalar dependencias
npm ci

# 2. Crear .env.local (ver arriba)
# 3. Revisar firebase-applet-config.json y habilitar Google Auth en Firebase

# 4. Levantar dev
npm run dev      # http://localhost:3000 (Express + Vite middleware)

# 5. QA obligatorio antes de deployar
npm run qa       # = tsc --noEmit + vite build + esbuild server

# 6. Build completo y start produccion
npm run build
npm start

# 7. Smoke test contra un deploy Vercel
npm run smoke:vercel -- <url>
```

### 7.4 Requisitos para disenar contra la API

1. **Autenticacion Firebase con Google**. El cliente obtiene un `idToken` y lo
   envia en `Authorization: Bearer <token>`.
2. **Headers**: `Content-Type: application/json` (Express limita body a 64 kb).
3. **CORS**: el servidor y el frontend corean en el mismo origen (middleware
   Vite en dev, mismo host en Vercel). No hay configuracion CORS explicita.
4. **Categorias**: deben venir del enumerado exacto del servidor; si no, se
   mapea a `General`.
5. **Variables `{{...}}`**: el servidor detecta tokes `{{name}}` en
   `promptText` y solo accepta `suggestedVariables` que coincidan (o todos si
   no se detecta ninguno).
6. **No inventar IDs** en `/api/ai/recomendar`: el servidor filtra los IDs que
   no existan en `candidates`.
7. **Rate limit**: respetar 20 peticiones / 10 min por usuario; mostrar el
   mensaje `429` al usuario si ocurre.

### 7.5 Donde tocar para disenar

- **Tokens de disenio**: editar `src/index.css` (Tailwind 4 usa directivas
  `@theme` y variables CSS).
- **Iconografia**: `lucide-react` (no introducir otro set sin acordar).
- **Animaciones**: `motion` (framer-motion).
- **Modales**: ver `PromptFormModal`, `SharedPromptModal`, `PublicPromptDetailModal`
  como referencia de estructura y estilos.
- **Cards de lista**: `PromptCard`, `CommunityPostCard`.
- **Layout de workspace**: `LibraryWorkspaceView`, `DailyWorkspace`.
- **Header / nav**: `AppTopNav`, `QuickSwitcherModal`.

### 7.6 Limites y consideraciones de UX

- Body de peticiones: **64 kb**. longitud de prompts: 10 mil chars.
- Noticisas: cache cliente 5 min (s-maxage 600 en CDN).
- Likes: uses `likedBy` array (max 1000) + `likesCount` denormalizado que el
  servidor valida igual a la longitud.
- `isShared` activa visibilidad publica de promps y carpetas: disenio debe腾
  hacer explicito este compromiso.
- `?share=` y `?folder=` son los actuales deep links. Pensarlo bien antes de
  cambiar formato.

---

## 8. Comandos utiles

| Comando                  | Que hace                                                  |
|--------------------------|-----------------------------------------------------------|
| `npm run dev`            | Express + Vite (middleware) en :3000                     |
| `npm run lint`           | `tsc --noEmit` — typecheck                                  |
| `npm run build`          | Frontend + empaqueta `dist/server.cjs`                    |
| `npm run start`          | Servidor de produccion (node dist/server.cjs)            |
| `npm run qa`             | lint + build — QA obligatorio                              |
| `npm run smoke:vercel`   | Smoke test contra URL Vercel                              |
| `npm run test:rules`     | Tests de Firestore rules (requiere Java; dormido)        |

---

## 9. Glosario rapido

- **Remix**: copia privada de un prompt publico, con `forkedFrom*` refs al
  original. El remix es editable y permanece privado hasta publicar manualmente.
- **Pack Fundador**: 80 prompts semilla privados por usuario
  (`src/data/founderPrompts.ts`).
- **Trust center**: conjunto de paneles para revisar publicaciones propias,
  reportes recibidos y prompts ocultos (`TrustModerationPanel`).
- **Briefing**: boletin editorial con items curados de news/hackathons, tiene
  `isPublished`, `stats` (opens, linkCopies, ideaSaves, promptCreates,
  forumPosts).
- **Connection**: relacion 1:1 con estado (pending_sent/pending_received/
  connected); necesaria para chatear.

---

## 10. Contacto y siguientes pasos

- Para cambios grandes en UI, primero revisa el tipo correspondiente en
  `src/types.ts` o `src/typesCommunity.ts`.
- Antes de sumar un nuevo endpoint REST, acuerda el esquema con el backend:
  `verifyFirebaseIdToken` y los schemas Gemini (`Type.OBJECT`) son sensibles.
- Antes de sumar una coleccion Firestore nueva, agregar reglas en
  `firestore.rules`: el default es deny.
- Quedan pendientes (ver `ROADMAP.md`): extraer logica de `App.tsx`, CI con
  Firestore Emulator y moderacion global founder.