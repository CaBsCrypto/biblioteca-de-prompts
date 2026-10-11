# Sprint 02: Biblioteca web compacta

Objetivo: trasladar las cartas compactas y el uso rápido del plugin a la web, con Prompts y Skills y conservando biblioteca privada, remixes, atribución y moderación.

## Diseño

Conservar Outfit y la paleta de la aplicación: superficie blanca o pizarra según tema, texto con contraste, bordes discretos e índigo y verde como acentos de tipo. Cartas con título, tipo, descripción breve y autor; las muestras completas pasan a la ficha. Acciones de al menos 44 px, foco visible y movimiento reducido. Ficha con dos columnas en escritorio y una en móvil, sin scrolls internos de muestras y texto.

## Backlog

| Ticket | Responsable | Estado | Criterio |
| --- | --- | --- | --- |
| WEB-01 Catálogo compacto | web_catalog_ui | terminado | Seis recursos visibles, filtros por tipo, Ver y preparar y Copiar |
| WEB-02 Preparación y copia | web_interaction | terminado | Original, preparado, enlace y SKILL.md exactos; fallback manual; versión vigente |
| WEB-03 Biblioteca privada | web_private_ui | terminado | Cartas compactas, edición y filtros; remixes privados con atribución |
| WEB-04 Navegación y guardado | coordinador | terminado | Ficha vuelve a sección, filtros y página de origen; espera guardado real |
| WEB-05 Aceptación y entrega | coordinador | terminado | lint, build, qa, unitarias, reglas CI, navegador y Preview |

No se añaden APIs, colecciones ni migraciones. Las bibliotecas privadas no se publican automáticamente. Se conserva la interfaz MCP v5 y el plugin instalado.

## Aceptación

- Prompts y Skills separados; búsqueda, ficha, cierre, atrás/adelante y recarga coherentes.
- Copia rápida de carta y ficha; variables como texto literal, campos pendientes enfocados y bloqueo de operaciones duplicadas.
- Revalidación de publicación y versión antes de copiar, descargar o guardar; retirada o cambio interrumpe la operación.
- Remix y skill se guardan en la biblioteca del usuario con su atribución y versión; otro usuario no puede leerlos.
- Tema claro/oscuro, teclado y pantalla de 375 px sin acciones cortadas ni desbordamiento horizontal.
- Evidencia local y Preview; pruebas con datos ficticios privadas separadas de producción.

## Evidencia

Validación local del 11 de octubre de 2026: 174 pruebas unitarias y 27 pruebas de reglas Firestore aprobadas. JDK 21 existente y emuladores demo-biblioteca; los recursos y cuentas ficticios permanecen separados de producción.

En navegador interno: búsqueda en Prompts → ficha → variables pendientes enfocadas → copia preparada → cierre con búsqueda conservada; guardado de remix → editor privado con atribución; copia, descarga y guardado de skill → pestaña Skills conservada tras recarga; cambio de cuenta oculta la biblioteca anterior. Pantalla de 375 px sin desbordamiento horizontal, controles nuevos de 44 px, tema claro/oscuro y Escape. Los filtros avanzados se abren bajo Filtros para dejar visibles antes las cartas.

El harness React local comprobó copia original, preparada y enlace, portapapeles bloqueado sin falso éxito, petición lenta/doble clic, cambio de selección y cuenta, retirada, actualización, fallos de conexión y guardado conservando preparación, y enlace de repositorio con SHA concreto. Registro local ignorado: `build/web-detail-behavior.json`. La API de portapapeles conserva el texto; el fallback de textarea utiliza los saltos de línea normalizados por el navegador. Los seis recursos actuales usan LF.

La revisión independiente detectó y corrigió el cierre del editor tras guardar y la exposición temporal de snapshots privados al cambiar cuenta. Las lecturas de publicación y entregable usan `getDocFromServer`; sin conexión no se entrega una copia almacenada como si fuera la versión vigente.

Preview validado: https://biblioteca-de-prompts-a7t4z24u0.vercel.app, commit de aplicación `79b53d8387ddf1386f97226655af129b6def8b76`. Se comprobaron los seis recursos reales (cinco prompts y una skill), copia rápida, copia preparada con texto literal, enlace, descarga de SKILL.md, filtros, atrás/adelante, recarga de ficha directa y regreso al catálogo con conteo coherente. A 375 px: ancho del documento 375 px y las cuatro acciones de skill de 44 px. Se corrigió la selección de filtros al cambiar de tipo: una compatibilidad activa continúa visible aunque no haya coincidencias.

CI de esa versión aprobado: https://github.com/CaBsCrypto/biblioteca-de-prompts/actions/runs/38119672562. Incluye 174 unitarias, build, arranque compilado, 27 pruebas de reglas en emulador y smoke web del Preview. El smoke MCP con cliente oficial comprueba herramientas de lectura, cinco prompts/una skill, ficha/entregable aprobado y URI de interfaz v5.

Entrega: https://github.com/CaBsCrypto/biblioteca-de-prompts/pull/9. Destino: https://biblioteca.browns.studio/. El SHA fusionado, despliegue y resultado de smokes de producción se registran en esa PR después de la publicación. Este registro de aceptación describe la versión revisada antes de fusionar.

Los tres recorridos humanos para el cierre de la beta continúan pendientes.
