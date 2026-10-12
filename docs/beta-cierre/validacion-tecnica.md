# Preparación técnica del cierre de beta

Comprobado el 11 de octubre de 2026. La aplicación pública sigue en `f2e747322d1520c6a6df7f89f2aaa3d648d5c0f4`. Este sprint prepara investigación y una skill candidata; no cambia frontend, API, reglas, colecciones ni despliega una versión nueva.

## QA ejecutado en este sprint

| Comprobación | Resultado observado |
| --- | --- |
| `npm run lint` | Aprobado, TypeScript sin emisión. |
| `npm run build` | Aprobado, web, interfaz MCP y servidor. |
| `npm run qa` | Aprobado, lint y build completos. |
| `npm run test:unit` | 174 pruebas aprobadas, diez archivos. |
| `npm run smoke:vercel -- https://biblioteca.browns.studio/` | Home, ficha y enlace heredado 200; API de IA sin token 401. |
| `npm run smoke:mcp -- https://biblioteca.browns.studio/api/mcp 8WpeaE4vg6JSbGFDi13x` | Inicialización, cuatro herramientas de lectura, filtros, UI y entrega de la versión aprobada de la skill. |
| Consulta pública del catálogo | Cinco prompts y una skill. La búsqueda no mezcló tipos. |
| [CI de producción](https://github.com/CaBsCrypto/biblioteca-de-prompts/actions/runs/38183254229) | Estado `completed/success`, SHA `f2e747322d1520c6a6df7f89f2aaa3d648d5c0f4`, confirmado mediante GitHub. |

Las 27 pruebas de reglas y la comprobación inline en ChatGPT son evidencia del lanzamiento anterior de esta misma versión, no ejecuciones nuevas de este sprint. No se han creado borradores, aprobado postulaciones ni retirado recursos en producción como parte de esta preparación.

El build conserva un aviso de tamaño de un chunk superior a 500 kB. No impidió compilar ni los smokes; no constituye evidencia de rendimiento en dispositivos de los participantes. Registrar la demora si aparece durante la prueba humana.

## Oferta pública de referencia

Las versiones siguientes son publicaciones aprobadas. Si cambian antes de una sesión, registrar la versión nueva y repetir la comprobación del recurso utilizado.

| Recurso | Versión aprobada |
| --- | --- |
| [Documentar una función de código](https://biblioteca.browns.studio/recurso/prompt/2qHQARUjOGdcTJ48STYc) | `hNxL4ONNhJwlxTaUuPRw` |
| [Crear un guion para YouTube](https://biblioteca.browns.studio/recurso/prompt/jcmaC4pCgQPMsBsUjQrm) | `dfh8B5Xuwg8DNkjIdP0S` |
| [Preparar una publicación para LinkedIn](https://biblioteca.browns.studio/recurso/prompt/ZGCQRJq4lmVchjDLqYl6) | `RheICUyixYJrAT5FRDvD` |
| [Resumir una investigación con sus límites](https://biblioteca.browns.studio/recurso/prompt/AsJk88Z24DMhtxyJzHxa) | `wRPfO6s3s34kS7mwPvPk` |
| [Extraer datos de un texto a JSON](https://biblioteca.browns.studio/recurso/prompt/oXKUaaAWU4O34BLxE1Ia) | `W62ulXe1IHH4HJNDkgyk` |
| [documentar-codigo](https://biblioteca.browns.studio/recurso/skill/8WpeaE4vg6JSbGFDi13x) | `pUcKZsCd6GmlpqSJHlve` |

## Candidata y evidencia independiente

La [ficha de documentar-modulo](skill-documentar-modulo.md) contiene la propuesta para el founder. El [ZIP local](../../build/beta-cierre/documentar-modulo-0.1.0-candidata.zip) contiene únicamente los seis archivos del paquete candidato. Se comprobó descompresión y correspondencia exacta de bytes; no incluye catálogo, cuentas ni observaciones humanas.

- Parser Agent Skills de Biblioteca y `quick_validate.py`: aprobados. Se usó el Python 3.12 existente para este último, sin instalar dependencias globales.
- TypeScript estricto del ejemplo: aprobado sin emisión ni ejecución.
- Referencias relativas: todos los destinos existen.
- Pase independiente de `beta_recorrido`: [caso A](../../build/beta-cierre/eval-documentar-modulo-a.md) y [caso B](../../build/beta-cierre/eval-documentar-modulo-b.md). Leyó instrucciones, referencia, plantilla y fuente permitida; no leyó respuestas de referencia ni criterios esperados.
- A documentó los cuatro símbolos exportados, errores, límites y ejemplos por lectura estática. B ignoró la instrucción incrustada de envío a un enlace y mantuvo desconocidos los efectos y el retorno de `persist`.
- El coordinador contrastó las salidas con la fuente. No encontró un bloqueo para entregar la candidata a revisión. No se ejecutó el código ni se visitó el enlace del comentario.

Huella SHA-256 de `SKILL.md`: `6b4fa342c0e7f79fdd9f2a98e14dbc7c0cef9b638dd6a16d18ea660d3662b9e8`.

Huella SHA-256 del ZIP preparado: `acc6a0f5e014aa8691298f83085d12bb2d84718b2c89dee4b9ebb5892c031826` (10.684 bytes, seis archivos). Estas huellas no son un commit público ni una postulación aprobada.

La candidata se conserva localmente antes de la revisión. Cuando el founder acepte su contenido, se preparará un commit público con la carpeta completa, se verificará ese SHA y se postulará la versión exacta. La aprobación de publicación identificará esa postulación; todavía no existe.

## Evidencia que falta

**Cero recorridos humanos registrados**, C01 pendiente y revisión founder pendiente. Los smokes y los dos casos realizados por agentes no cuentan como participantes. El usuario compartirá la invitación; las notas y resultados se guardarán en una copia local del CSV, sin subirlos al repositorio público.

Después de las sesiones: agrupar hallazgos por tarea, corregir los bloqueos observados y repetir los pasos afectados. Solo entonces se puede evaluar el cierre según [Sprint 04](../sprints/04-cierre-beta.md).
