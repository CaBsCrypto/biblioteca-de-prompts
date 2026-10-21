# Sprint 05: ajustes del plugin y uso en celular

Estado: implementación y QA local en revisión; sin publicar en producción. Fecha de preparación: 15 de octubre de 2026, America/Santiago.

## Alcance implementado

- Cartas dentro del mensaje como presentación preferida. Seleccionarlas abre la ficha en el mismo widget; ampliar sigue siendo una acción explícita.
- Ajustes: cartas/lista compacta, 2/4/6 resultados iniciales, texto normal/grande y reducción automática después de un envío confirmado.
- Preferencias compatibles con snapshots antiguos: cartas, dos recursos, texto normal y reducción activada por defecto. Los valores preparados siguen solo en el snapshot privado; no pasan al fallback compartido ni al contexto del modelo por cambiar ajustes.
- Ficha de una columna en celular, vista previa y ejemplo plegados inicialmente, acciones de copia y uso agrupadas y accesibles durante la preparación. Campos de 16 px en anchos móviles; controles de al menos 44 px.
- Copia bloqueada: instrucción para mantener pulsado en celular o usar teclado en ordenador. Nunca se confirma Copiado si fallan ambos mecanismos.
- Nueva URI `ui://biblioteca/library-v7.html`, conservando alias v6 y v5. No cambia identidad, conexión, permisos ni acceso al catálogo.

## Validación local observada

Host MCP local con seis recursos ficticios y lector en memoria: no se escribieron datos reales ni se enviaron conversaciones a ChatGPT. Usa el transporte MCP y el host de prueba existentes. No sustituye una prueba en la aplicación móvil real.

| Recorrido | Resultado observado |
| --- | --- |
| Apertura | Dos cartas iniciales y total de seis recursos. |
| Ajustes | Lista, seis recursos, texto grande y reducción desactivada se aplican; cuatro recursos también comprobados. |
| Cerrar/reabrir el host | Conserva selección, preferencias y valores preparados mediante el snapshot privado. |
| Copiar prompt preparado | Texto exacto contrastado en el portapapeles y recibo del host. |
| Usar con reducción desactivada | El host recibe la solicitud y la preparación permanece abierta. |
| Usar con reducción activada | Se reduce solo después del recibo de éxito. |
| Envío rechazado | Error visible y campos conservados; no se reduce. |
| Portapapeles bloqueado | Texto seleccionable e instrucciones móviles; sin confirmación falsa. |
| Filtro Skills | Una skill ficticia, ficha y copia exacta de SKILL.md. |
| Anchos 320, 375, 430 y 900 px | Sin overflow horizontal; botones visibles de al menos 44 px. Campos finales comprobados a 16 px. |
| Tema oscuro | Contexto del host aplicado y controles disponibles. |

La inspección visual detectó una regla de especificidad que mantenía los campos en 13 px. Se corrigió y se recargó el host para comprobar el CSS nuevo; no se confundió la versión cacheada con la corregida.

Se añadieron pruebas de preferencias antiguas/hostiles, snapshots que solo contienen ajustes, privacidad al persistirlos y compatibilidad con las URI anteriores. QA final aprobado: `npm run lint`, `npm run build`, `npm run qa`, 177 unitarias y smoke MCP v7 con el cliente oficial contra el host ficticio. CI y Preview pendientes al preparar la PR. Evidencia local: `build/plugin-ajustes-movil.png`; los recursos ficticios no se publican.

## Antes de publicar

1. QA obligatorio, suite unitaria y CI con reglas aprobados para el commit candidato.
2. Preview contra el catálogo público y smoke MCP v7; no confundir recursos ficticios con los seis publicados.
3. Prueba del candidato en ChatGPT: cartas dentro del mensaje, ficha, copia, uso, reducción opcional y reapertura.
4. Comprobar teclado y compositor en Android/iPhone reales. La emulación de ancho no certifica ese comportamiento.
5. Fusionar y desplegar después de completar esas comprobaciones; repetir smokes de producción.

No se autoriza por este documento cambiar la protección de Vercel. Una excepción nueva para probar en ChatGPT debe identificar el hostname concreto y revocarse al terminar. No se publica la candidata documentar-modulo ni se altera la biblioteca privada o los remixes.
