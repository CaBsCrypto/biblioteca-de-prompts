# Store y Router (Fase 2)

Capas aditivas para reducir dependencia del estado monolitico en `src/App.tsx`.

- `src/store/appStore.tsx` — Context + reducer con seccion activa, modal
  abierto, prompt en edicion, autor seleccionado, scope de comunidad, filtros
  de biblioteca, deep links y notificaciones con auto-dismiss.
- `src/router/useAppRouter.ts` — Hook que sincroniza el estado del store con
  la URL via `?share=`, `?folder=`, `?profile=`, `?briefing=`. Soporta
  `popstate` y `replaceState` (no crea historial nuevo salvo el cambio real).

## Como adoptar (sin breaking)

1. En `src/main.tsx`, envolver `<App />` con `<AppStoreProvider>`.
2. En `src/App.tsx`:
   - Reemplazar los `useState` de section/modal/editingPrompt por lecturas
     de `useAppStore()`.
   - Integrar `useAppRouter()` para resolver deep links abriendo modales
     correspondientes (`share` -> `SharedPromptModal`, `profile` -> vista de
     perf, etc).
3. Sustituir el sistema local de notificaciones por `notify(message, type)` y
   `dismiss(id)` del store.

La adopcion puede ser parcial: el store y el router conviven con el estado
actual mientras se migra componente por componente. La regla es no duplicar
estado: si algo entra al store, deja de leerse del `useState` local.

## Estado posterior

- Migracion gradual de los 2718 lineas de `App.tsx` al store+router. No
  forzar hoy para no romper flujos; documentar migrated surfaces aqui.
- Siguiente paso: extraer `LibraryWorkspaceView` y `CommunityExplore` a
  lecturas del store.