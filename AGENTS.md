## Comandos obligatorios

Antes de considerar una tarea completa, ejecutar:

```bash
npm run lint   # tsc --noEmit
npm run build  # vite build + esbuild server
npm run qa     # = lint && build — equivale al flujo de QA del proyecto
```

Si falla `npm run qa`, NO marcar la tarea como completada.

## Tests

- `npm run test:rules` — pruebas de reglas Firestore (requiere Java; no forma
  parte del flujo local actual). Solo corre si el環境 tiene JDK y se levanta
  `firebase emulators:exec --only firestore`.
- Smoke test post-deploy: `npm run smoke:vercel -- <url>` valida home 200 +
  `/api/ai/crear` 401.

## Convenciones

- Refactor gradual sin breaking: no romper APIs/hooks existentes mientras se
  introducen capas nuevas (`src/services/`, `src/store/`, `src/router/`).
- Tipos: cualquier componente nuevo debe typechecker con `tsc --noEmit`.
- Estado: el nuevo `src/store/appStore.tsx` es aditivo; el estado monolitico en
  `src/App.tsx` se migra surface por surface, manteniendolo en el store
  definitivamente (no duplicar).
- Servicios Firestore (`src/services/firestore/*`): un servicio por dominio,
  no importan React, reciben `db` por parametro. Ver `src/services/README.md`.
- Sanitizacion: para cualquier HTML inline (templates de impresion, plugin
  windows) usar `escapeHtml` de `src/utils/sanitize.ts`. No crear funciones
  locales de escape.
- Seguridad: las nuevas cabeceras de Vercel viven en `vercel.json` (CSP,
  HSTS, X-Frame-Options, etc.). Cualquier origen externo nuevo (API, CDN,
  iframe) debe agregarse a la CSP.