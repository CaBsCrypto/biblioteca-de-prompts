# Migración Biblioteca — 21 de octubre de 2026

## Procedencia y destino
Repositorio verificado por GitHub y gh: https://github.com/CaBsCrypto/biblioteca-de-prompts (PUBLIC, propietario CaBsCrypto, permiso ADMIN). Rama predeterminada main; SHA remoto observado f2e747322d1520c6a6df7f89f2aaa3d648d5c0f4.
Rama nueva: migracion/biblioteca-2026-10-21.
Origen: codex/beta-cierre-sprint, ba65785fc5f7ebc687c161952a55376f36dc00b7; upstream origin/main, un commit propio aún sin publicar. Raíz original C:/Users/MGC/Documents/ChatGPT/Biblioteca, repositorio común .git. Sin HEAD separado ni stashes.

## Trabajo preservado
Commit de cierre beta original, ocho archivos modificados del widget MCP v7, preferencias y compatibilidad v5/v6; siete archivos nuevos de documentación beta, sprint 05 y preparación de recursos. Índice original sin cambios staged; no había versiones intermedias staged que conservar. Copia Git independiente fuera del proyecto; el original no se cambia.
Inventario de ramas y worktrees en INVENTARIO-MIGRACION.txt. El segundo worktree build/ajustes-preview está limpio, rama codex/plugin-ajustes-movil, d78e078feb7ab1068b657ede128c480b5a57a8b9, igual al remoto verificado. No se combinó con esta rama. Las demás ramas locales ya están alcanzables desde ramas remotas o historial de main; main local está atrasada. No se requieren ramas adicionales de rescate.

## Exclusiones y revisión
No se copian build/, dist/, node_modules/, logs Firebase/Firestore, sesiones, configuración de herramientas ni credenciales fuera del proyecto. build/ contiene evidencias, respaldos de configuración y otro worktree: siguen únicamente en la PC original; no se exportan automáticamente. No hay .env local encontrado en la raíz, solo .env.example. Las credenciales disponibles en Vercel o almacenes de usuario no se consideran recuperadas.
Saneamiento: se omitió un UID personal de docs/beta/estado-lanzamiento.md y se actualizó .env.example con placeholders y modo emulador. Firebase web config ya versionada es pública del cliente; no es una credencial administrativa. Se revisaron patrones de claves privadas/tokens/asignaciones en el árbol y en los 26 objetos salientes del commit original; ejemplos sintéticos y placeholder de startup descartados como falsos positivos. Registro beta CSV sin resultados personales. Esta revisión no garantiza ausencia absoluta de secretos.
No hay submódulos, symlinks versionados, reglas LFS ni objetos faltantes detectados; ningún archivo trasladado supera 10 MiB. No se habilita LFS ni almacenamiento adicional.

## Requisitos y dependencias
React 19, Vite 6, TypeScript 5.8, Express, Firebase, MCP; package-lock.json incluido. package.json y CI piden Node 22.x; esta PC tiene Node 24.14.0/npm 11.9.0 y Vercel declara 24.x: usar 22.x local y registrar la discrepancia antes de modificar requisitos. Java 21 para reglas Firestore. No se identificaron Docker, volúmenes, modelos externos ni claves de cifrado ligadas al equipo necesarias para código; cookies/login y preferencias del navegador no migran.
Firebase Auth/Firestore remotos: proyecto gen-lang-client-0423104260, base ai-studio-5f50136d-4015-4979-b593-f4848a9de141. Compartir cuenta no migra datos locales ni autoriza escrituras remotas. No se exportaron datos, ejecutaron seeds ni migraciones. Emuladores demo-biblioteca en puertos 8080/9099; app 3000. Gemini/OpenRouter/GNews requieren claves por canal seguro para funciones respectivas, y pueden producir costos. El código puede probarse con datos sintéticos y emuladores sin la PC original.

## Automatizaciones y estado
GitHub: ramas sin protección observada, lista de rulesets vacía y webhooks de repositorio vacíos. No hooks locales activos; filtro LFS global instalado sin atributos de uso. CI versionado se dispara en main, refactor/** y codex/**; esta rama migracion/** no coincide. No se altera CI para evitarlo.
GitHub registra previews automáticos en Vercel biblioteca-de-prompts y elegant-lavoisier. El usuario autorizó expresamente el push y posibles previews en ambos proyectos el 21/10/2026. No se crea deploy manual ni se cambian ajustes. Hosting y servicios externos pueden seguir automatismos propios; consultar resumen posterior para efectos observados.
Preparación NOT VERIFIED: sin npm ci, lint, build, qa ni ejecución de aplicación en esta tarea por restricción explícita del pedido. AGENTS exige lint/build/qa antes de declarar completo: quedan pendientes de autorización, y no se declara QA aprobado. Las evidencias históricas en docs no son pruebas de esta migración. Notebook aún no verificada.
SHA final y verificación de publicación se entregan fuera del commit en el resumen. MANIFIESTO-SHA256.json cubre los bytes de todos los archivos trasladados salvo sí mismo y metadatos Git; no certifica datos remotos.

Finales de línea: archivos sin cambios lógicos conservan los bytes del blob de origen para evitar convertir LF a CRLF. El manifiesto corresponde a esos bytes Git; clonar con core.autocrlf=false.
