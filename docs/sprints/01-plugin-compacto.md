# Sprint 01: Biblioteca compacta y uso rápido

## Objetivo

Encontrar, preparar, copiar y utilizar los cinco prompts y la skill publicados dentro de ChatGPT, con una presentación discreta. La web y el catálogo conservan su identidad y sus contratos. Sin nuevas APIs, colecciones, permisos, OAuth ni ejecución de scripts.

El agente principal actúa como coordinador: ordena el backlog, reparte archivos, integra y verifica. Puede convocar hasta tres colaboradores simultáneos. Cada ticket pasa por pendiente, en curso, revisión y terminado. La aceptación incluye pruebas dentro de ChatGPT; un build aprobado por sí solo no cierra el sprint.

## Backlog

| Ticket | Responsable | Estado | Criterios |
|---|---|---|---|
| UI-01: presentación compacta | Interfaz | en curso | Inicio inline con buscador, tabs y dos cartas; Ver todos indica el total; artículos con botones hermanos; muestras en ficha; controles de 44 px y temas del host. |
| UI-02: ficha y reducción | Interfaz | en curso | Inline sustituye catálogo; ampliado tiene dos columnas adaptables; una zona principal de scroll; reducir y reabrir preservan selección; compositor no tapa acciones. |
| INT-01: estado y capacidades | Interacción | en curso | Snapshots antiguos compatibles; flags privados de reducción; variables fuera de session fallback; dimensiones y zona segura del host; ningún PiP supuesto. |
| INT-02: copiar y usar | Interfaz + interacción | en curso | Original, preparado y enlace exactos; copia rápida desde carta; revisión de versión; instantánea y bloqueo durante acciones; foco en variables pendientes; envío confirmado reduce; errores preservan preparación. |
| INT-03: navegación consistente | Interfaz | en curso | Una ficha directa no sustituye los resultados; volver conserva filtros/conteo/preparación del mismo recurso; respuestas atrasadas y doble clic no cambian otra selección ni duplican mensajes. |
| QA-01: regresión | QA | en curso | Unitarias relevantes y host local cubren restauración, privacidad, faltantes, errores, límites, foco, móvil y acciones asíncronas. |
| REL-01: integración y lanzamiento | Coordinador | pendiente | Lint, build, qa, unitarias, reglas en CI, Preview y ChatGPT; PR revisada; producción con smokes y evidencia. |

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

Pendientes de aceptación: CI de reglas, Preview, ChatGPT real y lanzamiento. Los recursos del emulador son ficticios; la oferta publicada se comprobará en el candidato y en producción.

## Continuidad

Tras aceptar el plugin, planificar la adaptación de estos patrones a la web. La beta pública conserva pendientes tres recorridos humanos satisfactorios, independientes de la aceptación técnica del sprint.
