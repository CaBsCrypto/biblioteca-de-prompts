# Sprint 03: cartas dentro del mensaje

Petición: mostrar cartas de Biblioteca en el mensaje del chat y abrir la ficha completa al pulsarlas, conservando copiar, preparar, atribución y descarga.

## Cambio

- El recurso MCP declara `preferredDisplayMode: inline`; la herramienta `open_library` declara `preferredModelDisplayMode: inline`.
- Se mantienen los modos inline y fullscreen. La entrada manual `thread` al panel lateral permanece opcional; no se solicita fullscreen al montar o abrir una carta.
- La superficie completa de cada carta es un botón nativo. Copiar y Ver y preparar son controles hermanos, sin botones anidados ni propagación que abra una ficha al copiar. Se conserva el foco al volver.
- Nueva URI `ui://biblioteca/library-v6.html` para evitar plantilla antigua en caché. La URI v5 continúa sirviendo la interfaz compatible para mensajes y definiciones de herramientas anteriores.
- Sin cambios de catálogo, permisos, entregables, conexión, identidad del plugin ni biblioteca privada.

## Evidencia y aceptación

11 de octubre de 2026: lint, build, qa, arranque compilado y 174 unitarias aprobados. Las 27 pruebas de reglas pasaron con el emulador demo-biblioteca. El contrato MCP comprueba ambas preferencias de presentación y que v5 sigue resolviendo el mismo HTML y permisos.

Navegador con host MCP local: carta de prompt → ficha completa sin solicitud de fullscreen; volver restaura foco en carta; copiar desde carta entrega la plantilla y no abre la ficha; Espacio abre la carta de skill. Se comprobaron el área del título mediante hit testing y el modo `library-mode-inline`. Los datos del host son ficticios y no se publican.

El host decide la ubicación definitiva. La presencia de una ficha en un panel de Codex no prueba que esté dentro del mensaje. La validación nativa debe invocar `open_library` desde el modelo, después de refrescar los metadatos, y comprobar cartas y ficha en el flujo de la conversación. El acceso manual de tipo `thread` usa el panel por diseño.

Referencias: [interfaz](https://developers.openai.com/plugins/build/chatgpt-ui), [extensiones](https://developers.openai.com/plugins/build/extensions), [contrato de display modes](https://github.com/openai/mcp-extensions/blob/main/docs/spec.md#display-modes).

CI, Preview, publicación y validación nativa: pendientes. La PR registrará URL, SHA y evidencia final.
