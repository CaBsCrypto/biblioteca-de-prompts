# Estado del cierre — 2026-10-01

## Destinos comprobados

- Repositorio: https://github.com/CaBsCrypto/biblioteca-de-prompts
- PR #2 abierta en borrador. Versión de aplicación inspeccionada: `d2e703b0fda9be73f0a45ea127da1c359e41d560`.
- Proyecto Vercel: `biblioteca-de-prompts`, `prj_IwjWxOBALAN3FiGu0pPkR0EaPzAc`, equipo `cabscryptocontacto-6028s-projects`.
- Production sigue `main`; asignación automática de dominios marcada. Consola interna accesible; conector administrativo continúa con 403.
- Discrepancia pendiente: el despliegue `GwoR7SLxoiCi2TWWrD5j4q89VwmN` muestra `biblioteca.browns.studio` y fuente `refactor/arquitectura-seguridad`, commit `665c3bf`. Los ajustes actuales de Domains/Production solo muestran `biblioteca-de-prompts-ashen.vercel.app`. No asumir que fusionar moverá el dominio personalizado.
- Firebase: `gen-lang-client-0423104260`, base `ai-studio-5f50136d-4015-4979-b593-f4848a9de141`. Sesión de consola: cuenta founder autorizada.

## Cambios realizados

- Añadido exclusivamente `biblioteca-de-prom-git-9f2d9c-cabscryptocontacto-6028s-projects.vercel.app` a dominios autorizados de Authentication; verificado que todos los dominios previos permanecen.
- Desplegados los siete índices versionados con `firebase.json` contra la base nombrada; verificados como Habilitado en la consola interna.
- Conservado respaldo local previo de reglas e índices en `build/firebase-before-catalog*.json`; este es un respaldo de configuración, no una exportación de documentos. Lista anterior de dominios guardada en `build/auth-domains-before-beta.json`. Archivos ignorados, sin subir credenciales al repositorio.
- Preparadas seis fichas y entregables en `recursos-revision.json` y `recursos-revision.md`; skill en `SKILL.md`. Validan como postulaciones completas. Creados seis borradores privados por la interfaz del Preview con la sesión normal del founder y enviadas seis postulaciones inmutables. Cola Revisiones: Pendientes · 6. Ningún recurso aprobado ni publicado.
- Login normal de CaBs confirmado; la cola muestra el UID founder autorizado `[UID omitido en la copia de migración]`, handle cabscrypto y panel founder.
- Reglas versionadas de la PR desplegadas exitosamente mediante CLI con la configuración de la base nombrada. Preview recargado: catálogo legible, sin aviso de permisos insuficientes.
- Cliente Firebase sin autenticar contra producción: denegadas lecturas de catalogDrafts, catalogSubmissions y skills guardadas privadas; consulta de catálogo publicado permitida, con cero publicaciones. Evidencia UI en `build/beta-revisiones.png`.
- Preparado protocolo y registro de prueba con 3–5 participantes en `prueba-usuarios.md`.
- Verificación local de esta sesión: `npm run lint`, `npm run build` y `npm run qa` aprobados; smoke HTTP del Preview aprobado (home/ficha/enlace heredado 200, API IA sin token 401). El smoke no sustituye las pruebas autenticadas pendientes. Las suites de 37 unitarias y 27 reglas permanecen respaldadas por el CI de la versión inspeccionada; no se modificó la aplicación ni las reglas.

## Pendientes para continuar

1. Founder revisa las seis postulaciones ya cargadas. Falta su aprobación explícita del contenido y muestras antes de hacerlas públicas.
2. Completar recorrido de aprobación y obtención real después de esa revisión; validar actualización y retirada.
3. Resolver asociación del dominio a Production, fusionar versión validada y comprobar despliegue/smoke público.
4. Founder revisa cada ficha y muestra; publicar por el flujo moderado, sin aprobación automática por el agente.
5. Registrar al menos tres recorridos humanos completos. No hay todavía resultados de participantes.

## Despliegue al dominio principal

Por petición explícita del usuario, PR #2 fusionada a main con head esperado d2e703b. Commit de merge: `d614492ab05ba9127b6703898c54a000831ea48c`. Vercel confirmó Production Ready, fuente main, despliegue `HbhBG8rW9W4SdoVuk2YQv7fjJFd1`, URL inmutable `biblioteca-de-prompts-lekvwlury.vercel.app`.

Se vinculó el dominio existente `biblioteca.browns.studio` al entorno Production desde la consola. Vercel recomienda actualizar DNS, pero el dominio resuelve con HTTPS y sirve correctamente la versión nueva; no se cambiaron registros DNS. Smoke público aprobado: home, ficha y enlace heredado 200; API IA sin token 401. Catálogo público carga sin errores de permisos y muestra cero recursos porque las seis postulaciones siguen pendientes de aprobación founder. Evidencias: `build/beta-produccion.png` y `build/beta-despliegue.png`.

Frontend nuevo operativo en el dominio principal. Pendientes: revisión y publicación de seis recursos, pruebas de obtención/actualización/retirada en producción y al menos tres recorridos humanos. Si hace falta revertir el frontend, conservar reglas de privacidad y bibliotecas personales.

## Secciones Prompts y Skills — 4 de octubre de 2026

PR #3 fusionada: https://github.com/CaBsCrypto/biblioteca-de-prompts/pull/3. Head validado `9ed230421a8bae2238fb13aa7844079d95988598`; merge en main `deaf4fb5d26f6db9311f304969238ac8b1fc6870`. Deployment Production de biblioteca-de-prompts registrado en GitHub con estado success e inmutable https://biblioteca-de-prompts-9bcv6k3j2.vercel.app.

Dominio comprobado: https://biblioteca.browns.studio/prompts y https://biblioteca.browns.studio/skills. Navegación principal con ambas entradas; tipo seleccionado desde router/store. Mi Biblioteca tiene pestañas Prompts y Skills con URL y navegación por teclado. Sin cambios de datos, reglas ni APIs.

Validación: lint, build y qa locales aprobados; 39 pruebas unitarias; suite de reglas Firestore y smoke de Preview aprobados en CI (run 37240579482). Smoke del dominio público aprobado. Navegación directa, recarga y atrás/adelante de secciones, pestañas y teclado comprobados en Preview. Ambas secciones comprobadas en producción, sin errores de consola. Evidencia: build/evidence/secciones-produccion.png.

Lectura administrativa de estado: seis postulaciones pending (cinco prompts y documentar-codigo), cero fichas públicas. Las comprobaciones del catálogo vacío no sustituyen los recorridos de copiar/guardar/descargar autenticados con recursos publicados. Pendientes: revisión individual founder y publicación de aprobadas, recorrido real tras publicar, tres participantes humanos registrados. La beta todavía no cumple su criterio de cierre.
