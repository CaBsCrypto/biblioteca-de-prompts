# Biblioteca · Prompts y skills

Catálogo comunitario gratuito para encontrar una capacidad, ver su resultado y obtener un prompt o una skill. Conserva la biblioteca personal y las herramientas existentes en React, Vite, Firebase y Vercel.

## Funcionalidades

- Login con Google mediante Firebase Auth.
- Biblioteca personal de prompts con favoritos, carpetas, etiquetas y busqueda.
- Explorar por tarea, tipo, herramienta compatible y creador, con muestras de entrada y resultado.
- Fichas compartibles `/recurso/prompt/:id` y `/recurso/skill/:id`, sin leer entregables al explorar.
- Borradores privados, postulaciones inmutables y revisión exclusiva del fundador.
- Nueva versión pendiente sin alterar la publicación aprobada, rechazo con motivo y retirada por el autor.
- Descarga de `SKILL.md` o acceso a su carpeta GitHub pública fijada a un commit.
- Remixes privados con atribución y skills guardadas por versión en Mi Biblioteca.
- Enlaces heredados resueltos solo a publicaciones aprobadas; los recursos sin ficha muestran «no disponible».
- Relleno interactivo de variables `{{variable}}`.
- Exportacion de prompts como Markdown o mediante dialogo de impresion/PDF.
- Asistente IA para crear u optimizar prompts usando Gemini desde el backend Express.

## Stack

- React 19 + Vite 6
- TypeScript
- Tailwind CSS 4
- Firebase Auth + Firestore
- Express + `@google/genai`

## Configuracion local

1. Instala dependencias:

```bash
npm ci
```

2. Crea `.env.local` a partir de `.env.example` y configura:

```bash
GEMINI_API_KEY="tu_api_key"
GEMINI_MODEL="gemini-3.5-flash"
APP_URL="http://localhost:3000"
```

3. Revisa `firebase-applet-config.json` y habilita Google Auth en Firebase.

4. Ejecuta la app:

```bash
npm run dev
```

La aplicacion queda disponible en `http://localhost:3000`.

## Scripts

- `npm run dev`: levanta Express con Vite en modo middleware.
- `npm run lint`: corre TypeScript sin emitir archivos.
- `npm run build`: genera el frontend y empaqueta el servidor en `dist/server.cjs`.
- `npm run start`: ejecuta el build de produccion.
- `npm run qa`: ejecuta lint y build, el QA obligatorio actual.
- `npm run smoke:vercel -- <url>`: valida home y rutas compartibles, y exige `401` en la API IA sin token.
- `npm run test:unit`: valida catálogo, Agent Skills y rutas.
- `npm run test:rules`: ejecuta pruebas de aislamiento y aprobación con Firestore Emulator; requiere JDK 21.

## QA y Vercel

- El flujo principal de QA funcional vive en `QA_VERCEL.md`.
- Vercel Preview valida la app desplegada, incluyendo frontend, rutas API, Firebase Auth, Firestore y Gemini.
- CI exige tipos, build, pruebas unitarias y reglas en emulador con JDK 21.
- El modelo, las condiciones de aprobación y el lanzamiento coordinado están documentados en [docs/catalog-rollout.md](docs/catalog-rollout.md). No se publican recursos anteriores automáticamente.

## Comprobación local del catálogo

Con JDK 21 y dos terminales, usa el proyecto aislado `demo-biblioteca`:

```bash
npx firebase emulators:start --config firebase.emulators.json --project demo-biblioteca --only firestore,auth
```

En `.env.local`, configura `VITE_FIREBASE_EMULATORS=true` y ejecuta `npm run dev`. Luego prepara las cuentas y dos fichas ficticias:

```bash
npx tsx scripts/seed-catalog-emulator.ts
```

El seed solo acepta localhost en 8080/9099 y nunca modifica producción. Las cuentas `creador@biblioteca.test` y `fundador@biblioteca.test` permiten comprobar publicación y revisión. El modo emulador está limitado al servidor de desarrollo; no se activa en builds de producción.

## Notas de continuidad

- Las reglas de Firestore viven en `firestore.rules`.
- Los prompts semilla estan en `src/data/founderPrompts.ts` y se re-exportan desde `src/data.ts`.
- La UI principal esta concentrada en `src/App.tsx`; conviene extraer hooks y componentes antes de sumar flujos grandes.
- El backend IA esta en `server.ts` y usa `GEMINI_MODEL` para evitar hardcodear cambios de modelo.
