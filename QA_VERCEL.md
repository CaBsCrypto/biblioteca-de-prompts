# QA del catálogo y Vercel Preview

Biblioteca usa QA local, pruebas de reglas en emulador y comprobación funcional en Vercel Preview. Una compilación correcta o un smoke HTTP no sustituyen el recorrido del catálogo ni las pruebas de aislamiento.

## Comprobaciones obligatorias

Antes de considerar completo un cambio, ejecutar:

```bash
npm run lint
npm run build
npm run qa
npm run test:unit
npm run test:rules
```

`npm run qa` equivale a lint y build. Las 37 pruebas unitarias de catálogo y rutas validan Agent Skills, archivos, repositorios fijados a un commit, URLs, búsqueda, atribución y enlaces compartibles. Las 23 pruebas de reglas validan los permisos legacy y del catálogo, decisiones atómicas, snapshots inmutables, IDs cruzados, revisiones, retirada, copias privadas y el recorrido con los servicios reales. Si falla QA o cualquiera de estas suites, el cambio no está listo para lanzamiento.

CI ejecuta typecheck, pruebas unitarias y build; otro job instala Temurin JDK 21 y ejecuta `npm run test:rules`. El job de smoke depende de ambos. Un job de smoke omitido por falta de acceso al Preview no cuenta como una validación funcional aprobada: completar esa comprobación manualmente.

### Java local sin instalación global

Las reglas ya forman parte del QA obligatorio. Para correrlas localmente basta un JDK 21 portátil configurado durante la sesión; no hace falta instalar Java globalmente. Ejemplo en PowerShell, sustituyendo la ruta por la del JDK disponible:

```powershell
$env:JAVA_HOME = 'C:\ruta\al\jdk-21'
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
npm run test:rules
```

El script usa `firebase.emulators.json`, el proyecto de demostración `demo-biblioteca` y la base local `(default)`. No despliega reglas ni escribe en Firebase real. Para comprobar el navegador local con Auth y Firestore, levantar ambos emuladores con esa configuración y ejecutar el servidor de desarrollo con `VITE_FIREBASE_EMULATORS=true`. Esa opción solo se habilita en desarrollo.

## Firebase y lanzamiento coordinado

Vercel Preview usa el mismo Firebase real que producción mediante `firebase-applet-config.json`: proyecto `gen-lang-client-0423104260`, base nombrada `ai-studio-5f50136d-4015-4979-b593-f4848a9de141`. Preview no es una base de datos de staging: crear, publicar, retirar o editar desde él puede afectar datos reales. Usar el emulador para los recorridos completos con datos desechables y realizar en Preview únicamente operaciones deliberadas con cuentas y recursos controlados.

No autosembrar el catálogo ni convertir automáticamente recursos legacy en publicaciones de producción. La oferta inicial se completa y aprueba manualmente. El modelo, la migración y la operación del catálogo están documentados en [catalog-rollout.md](docs/catalog-rollout.md): borrador privado, postulación inmutable, ficha pública y entregable separado.

Coordinar frontend, reglas e índices de esta misma versión al lanzar. `firebase.json` identifica la base nombrada de producción; `firebase.emulators.json` es exclusivamente local. Desplegar a `(default)` no protege la base que utiliza la aplicación. Las nuevas reglas cierran la lectura pública de documentos legacy mediante `isShared`; los enlaces anteriores resuelven únicamente snapshots aprobados. Mantener ese cierre de privacidad también durante un rollback y conservar las bibliotecas privadas.

## Preview y Deployment Protection

1. Crear Vercel Preview y confirmar que está `Ready` con `vercel inspect <preview-url>`.
2. Abrirlo mediante el acceso autorizado del equipo, un enlace compartido de ese deployment o un token de bypass existente y limitado al Preview. Conservar Deployment Protection; no desactivarlo para hacer QA ni exponer otro dominio para eludirlo.
3. Probar los recorridos de visitante, autor y fundador descritos abajo. La autorización para entrar al deployment y la sesión Firebase de la aplicación son independientes: un visitante de la aplicación debe seguir viendo solo recursos aprobados.
4. Ejecutar el smoke contra una URL accesible por el proceso de prueba:

```bash
npm run smoke:vercel -- <url-preview>
```

El smoke comprueba home 200, rutas `/recurso/skill/...` y enlaces legacy servidos por el frontend, y `/api/ai/crear` 401 sin token Firebase. No verifica el contenido de una ficha ni los permisos de Firestore.

Un `401` de Deployment Protection antes de cargar la app es distinto del `401` esperado de la API IA. El script HTTP no inicia sesión en Vercel; para un Preview protegido usar `vercel curl` autenticado o el mecanismo de compartir/bypass ya autorizado en el cliente de prueba, sin imprimir ni guardar secretos en archivos del proyecto. Verificar entonces los mismos cuatro estados HTTP y completar la prueba en navegador. El resultado debe indicar qué acceso al deployment se utilizó y qué comprobaciones se ejecutaron.

## Recorridos funcionales

- **Visitante:** explorar, buscar por tarea y filtrar tipo, categoría, compatibilidad y autor; abrir fichas y sus muestras; copiar prompts, rellenar variables y descargar `SKILL.md`. Verificar que contenido, tipo e ID de versión corresponden a la ficha. Guardar debe pedir sesión.
- **Creadores y enlaces:** abrir recursos de un creador y compartir una ficha por `/recurso/{tipo}/{id}`. Los enlaces `?share=` y `?collection=` muestran únicamente versiones aprobadas; los inexistentes, pendientes o retirados presentan «no disponible».
- **Autor:** crear borradores incompletos privados, importar un prompt propio, cargar o pegar `SKILL.md`, completar ejemplos y condiciones, y postular. Guardar un prompt crea un remix privado con atribución; guardar una skill conserva su versión en Mi Biblioteca.
- **Fundador:** confirmar acceso al rol provisionado administrativamente, revisar texto, muestras, requisitos y condiciones; verificar GitHub público, SHA completo, carpeta y coincidencia exacta de `SKILL.md`; aprobar o rechazar con motivo privado. Un autor sin ese rol no puede aprobarse ni publicar directamente.
- **Revisiones y retirada:** editar el borrador o postular una actualización mientras la versión anterior sigue pública. Aprobar debe reemplazar ficha y entregable juntos. Retirar corta lectura pública de ambos; las copias privadas ya guardadas siguen disponibles para su propietario. Republicar requiere nueva aprobación.
- **Aislamiento y contenido hostil:** visitante y otra cuenta no pueden leer borradores, postulaciones, rechazos ni prompts legacy privados. Markdown se muestra como texto; archivos inválidos, repositorios inaccesibles y URLs inseguras no se aprueban. No mezclar muestras o entregables de distintas versiones.
- **Funciones conservadas:** login Google, perfil y biblioteca privada siguen operativos. Los endpoints `/api/ai/crear`, `/api/ai/optimizar` y `/api/ai/recomendar` requieren sesión; el recomendador local funciona cuando la opción IA falla. La IA existente permanece en navegación secundaria.

## Diagnóstico

El adaptador Vercel usa `api/[...path].js` y carga `dist/server.cjs`. Ante `FUNCTION_INVOCATION_FAILED`, revisar los logs del deployment:

```bash
vercel logs <deployment-url> --no-follow --since 30m --level error --expand
```

Los errores de Firestore pueden indicar reglas no desplegadas en la base nombrada o índices de catálogo pendientes. Los bloqueos CSP al comprobar GitHub deben revisarse en `vercel.json`, que permite `api.github.com` y `raw.githubusercontent.com`.

Un futuro Firebase de staging puede aislar Vercel Preview de producción. Las pruebas de reglas ya están activas en CI con JDK 21 y deben mantenerse obligatorias.
