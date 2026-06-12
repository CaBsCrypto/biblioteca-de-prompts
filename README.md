# Biblioteca de Prompts

Aplicacion full-stack para guardar, clasificar, compartir y optimizar prompts con React, Firebase y Gemini.

## Funcionalidades

- Login con Google mediante Firebase Auth.
- Biblioteca personal de prompts con favoritos, carpetas, etiquetas y busqueda.
- Comunidad de prompts publicos con likes, comentarios y clonacion.
- Enlaces publicos para prompts y colecciones compartidas.
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
- `npm run smoke:vercel -- <url>`: valida que la home responda `200` y que `/api/ai/crear` rechace llamadas sin token con `401`.
- `npm run test:rules`: prueba futura opcional con Firestore Emulator; requiere Java/JDK y no forma parte del flujo local actual.

## QA y Vercel

- El flujo principal de QA funcional vive en `QA_VERCEL.md`.
- Vercel Preview valida la app desplegada, incluyendo frontend, rutas API, Firebase Auth, Firestore y Gemini.
- Firestore Emulator queda preparado pero dormido; se activara mas adelante en CI o staging cuando queramos pruebas automaticas de reglas sin instalar Java local.

## Notas de continuidad

- Las reglas de Firestore viven en `firestore.rules`.
- Los prompts semilla estan en `src/data.ts`.
- La UI principal esta concentrada en `src/App.tsx`; conviene extraer hooks y componentes antes de sumar flujos grandes.
- El backend IA esta en `server.ts` y usa `GEMINI_MODEL` para evitar hardcodear cambios de modelo.
