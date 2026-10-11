# Sprint 01: Biblioteca compacta y uso rápido

## Objetivo

Encontrar, preparar, copiar y utilizar los cinco prompts y la skill publicados dentro de ChatGPT, con una presentación discreta. La web y el catálogo conservan su identidad y sus contratos. Sin nuevas APIs, colecciones, permisos, OAuth ni ejecución de scripts.

El agente principal actúa como coordinador: ordena el backlog, reparte archivos, integra y verifica. Puede convocar hasta tres colaboradores simultáneos. Cada ticket pasa por pendiente, en curso, revisión y terminado. La aceptación incluye pruebas dentro de ChatGPT; un build aprobado por sí solo no cierra el sprint.

## Backlog

| Ticket | Responsable | Estado | Criterios |
|---|---|---|---|
| UI-01: presentación compacta | Interfaz | terminado | Inicio inline con buscador, tabs y dos cartas; Ver todos indica el total; artículos con botones hermanos; muestras en ficha; controles de 44 px y temas del host. |
| UI-02: ficha y reducción | Interfaz | terminado | Inline sustituye catálogo; ampliado tiene dos columnas adaptables; una zona principal de scroll; reducir y reabrir preservan selección; compositor no tapa acciones. |
| INT-01: estado y capacidades | Interacción | terminado | Snapshots antiguos compatibles; flags privados de reducción; variables fuera de session fallback; dimensiones y zona segura del host; ningún PiP supuesto. |
| INT-02: copiar y usar | Interfaz + interacción | terminado | Original, preparado y enlace exactos; copia rápida desde carta; revisión de versión; instantánea y bloqueo durante acciones; foco en variables pendientes; envío confirmado reduce; errores preservan preparación. |
| INT-03: navegación consistente | Interfaz | terminado | Una ficha directa no sustituye los resultados; volver conserva filtros/conteo/preparación del mismo recurso; respuestas atrasadas y doble clic no cambian otra selección ni duplican mensajes. |
| QA-01: regresión | QA | terminado | Unitarias relevantes y host local cubren restauración, privacidad, faltantes, errores, límites, foco, móvil y acciones asíncronas. |
| REL-01: integración y lanzamiento | Coordinador | terminado | Lint, build, qa, unitarias, reglas en CI, Preview y ChatGPT; PR revisada; producción con smokes y evidencia. |

## Entrega y aceptación

- Seis recursos accesibles y tipos separados.
- Copiar original/preparado/enlace/SKILL.md confirma éxito real o muestra selección manual.
- Usar en este chat envía solo tras clic y preparación válida; reduce tras confirmación.
- Biblioteca se recupera conservando la preparación en su instancia; no comparte variables entre chats.
- Ficha directa, filtros y catálogo mantienen conteos coherentes.
- Teclado, Escape, foco y viewport de 375 px funcionan sin acciones ocultas.
- Versiones cambiadas y retiradas se bloquean; catálogo privado permanece inaccesible.

## Evidencia

Validación local del 11 de octubre de 2026: lint, build, qa y 138 pruebas unitarias aprobados (55 del widget). Arranque del servidor compilado y smoke MCP v5 aprobados contra emuladores. Revisión independiente corrigió la restauración de una selección reducida.

El host local comprobó variables pendientes con foco, copia preparada y enlace con recibos de éxito del navegador, copia manual al bloquear ambas vías, envío rechazado conservando campos, envío confirmado con reducción, cierre/reapertura con preparación, ficha directa → catálogo con conteo correcto y respuesta antigua descartada al cambiar de selección. Skill de prueba copiada y descargada con el mismo texto. A 375 px: sin overflow horizontal, todos los botones de 44 px, tema oscuro y ningún scroll interno en las muestras. La zona reservada al compositor se conserva en todos los estados.

Entrega de código: `a07c02f`, [PR #8](https://github.com/CaBsCrypto/biblioteca-de-prompts/pull/8). [CI de PR](https://github.com/CaBsCrypto/biblioteca-de-prompts/actions/runs/38113061946) aprobó QA, unitarias, reglas en emulador y smoke web. Smoke MCP manual autenticado aprobado en [Preview inmutable](https://biblioteca-de-prompts-r262e8l9j.vercel.app/api/mcp): cinco prompts, una skill, URI v5 y entregable aprobado de `documentar-codigo`. El alias de rama no se usa para MCP porque no está en la lista de hosts del servidor.

Se preparó un candidato del mismo código sin promocionar los dominios: `dpl_G5jFQzqqpvSVhGp2NvNuUtuwDWiU`, [hostname inmutable](https://biblioteca-de-prompts-1q0g56eph.vercel.app). Al ser un despliegue staged de producción, Vercel rechazó añadirlo a las excepciones de Preview. El propietario autorizó específicamente `Publicly accessible` para el enlace compartido de ese hostname, su revocación al terminar y el lanzamiento condicionado a la prueba.

El 11 de octubre se activó ese enlace, se conectó Biblioteca Validación y se comprobó el widget v5 en [ChatGPT real](https://chatgpt.com/c/6acb2587-f684-83e9-b828-69e6d593070b): dos cartas iniciales, Ver todos con seis recursos, pestañas con cinco prompts y una skill, ficha, variables pendientes con foco, confirmación de copia original/preparada/enlace/SKILL.md, envío y reducción inline. ChatGPT recibió un valor distinto de la muestra (`triplicar(valor)`) y lo identificó en su respuesta. Reabrir conservó el código preparado; cerrar y reabrir conservó la reducción y selección; recargar restauró la skill seleccionada y su filtro. La descarga solicitó el enlace público de la versión aprobada y se confirmó la apertura en el host. El evento de descarga del navegador interno no observa esa apertura externa; el cliente HTTP verificó sus bytes exactos. La preferencia de desarrollo preexistente de ChatGPT tenía CSP desactivada y no se modificó.

El cliente MCP oficial verificó las seis fichas y sus entregables frente a la revisión, paginación 2+2+2, filtros, búsqueda vacía, seis versiones obsoletas rechazadas y un ID no disponible. UI v5: SHA-256 `d130d09edd4702da61ef797d9684c252259882fc386d6013a43723b8f7973aec`. Descarga `SKILL.md`: 1434 bytes, SHA-256 `ad02f530f868edfa6b65fb9e48b667b840150ed6654ce82ef42a8b74bf2d1deb`, con attachment, no-store y nosniff. Recibos y capturas locales en `build/sprint-compacto/`, sin claves de acceso, cookies ni valores privados en los recibos.

Se revocó el enlace restaurando `Only people with access` antes de fusionar. Comprobación con sesiones anónimas nuevas: el hostname limpio y el enlace antiguo devuelven home 302 a autenticación y MCP 401; ningún contenido accesible. No se desactivó la protección del proyecto ni se agregó una excepción permanente.

Lectura anónima de producción: las seis versiones aprobadas coinciden con sus entregables y se rechazaron seis solicitudes con versiones antiguas. Producción continúa ofreciendo URI v4; no se confunde esta verificación de datos con el lanzamiento de la interfaz nueva.

Sprint aceptado y publicado: [PR #8](https://github.com/CaBsCrypto/biblioteca-de-prompts/pull/8) fusionada tras [CI completo](https://github.com/CaBsCrypto/biblioteca-de-prompts/actions/runs/38117622762), commit de `main` `be60489e101cb21fff4d50906ec314f340f9b2fe`. Vercel `dpl_F7tNF6K3rFX1PmJoY3UzNkVGxgXX`, [despliegue inmutable](https://biblioteca-de-prompts-n9ohaeweu.vercel.app), sirve [biblioteca.browns.studio](https://biblioteca.browns.studio/). Smoke web aprobado: home/ficha/heredado 200 y API IA 401. Smoke MCP de producción aprobado: seis fichas, entregables exactos, versiones antiguas bloqueadas, UI v5 idéntica al candidato y descarga de la skill con la huella anterior. Recibo `build/sprint-compacto/production-release-receipt.json`.

Se actualizaron las herramientas de la conexión habitual y se abrió [un chat de producción](https://chatgpt.com/c/6acb2b27-e99c-83e9-8b1a-b715fa623074): catálogo breve con dos cartas y seis recursos, ficha con variable preparada, envío confirmado y reducción inline. El modelo pudo documentar el código preparado sin volver a recibirlo; reabrir conserva la preparación. Se dejó el catálogo breve visible junto al compositor. Captura: `build/sprint-compacto/chatgpt-produccion-inline.jpg`.

Los recursos del emulador son ficticios y permanecen separados de la oferta pública. Se conservan la identidad del plugin personal (`Plugin_c2ac96c4d8c88191aa032001aeefecd6`), su conexión (`asdk_app_6ac7206812a4819186b6ecbb15afbafe`), permisos y paquete 0.1.0; la interfaz es v5. Tras autorización específica, se desinstaló la conexión temporal `asdk_app_6acb25357a7081919aaa68c30ba86973`; su enlace ya estaba revocado. No se eliminó permanentemente su registro. El archivo local con la clave del enlace se retiró.

## Continuidad

Tras aceptar el plugin, planificar la adaptación de estos patrones a la web. La beta pública conserva pendientes tres recorridos humanos satisfactorios, independientes de la aceptación técnica del sprint.
