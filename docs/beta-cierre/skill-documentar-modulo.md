# Candidata para revisión founder: documentar-modulo

**Estado:** preparada para revisión humana, sin publicar ni instalar. **Versión candidata:** 0.1.0. **Autor:** CaBsCrypto. **Condiciones propuestas:** CC BY 4.0, conservando la elección de la oferta inicial. La aprobación de esta ficha no se presume por iniciar el sprint.

## Ficha propuesta

| Campo | Propuesta |
| --- | --- |
| Título | documentar-modulo |
| Problema | Un archivo o módulo tiene varias exportaciones, errores y límites, pero falta una guía de integración que pueda contrastarse con el código. |
| Resultado | Documentación en Markdown con API pública, contratos, ejemplos, errores, evidencia y datos pendientes, sin modificar el comportamiento. |
| Tarea | Trabajar con código |
| Etiquetas | Documentación, API pública, README, TypeScript, Contratos |
| Compatibilidad | Agentes que admitan Agent Skills y lectura de los archivos complementarios; uso manual posible aportando instrucciones y archivos relevantes al chat. No hay ejecución de scripts. |
| Requisitos | Código público o aportado para la tarea; contexto de audiencia y salida deseada cuando sea relevante. Un agente capaz de leer texto y Markdown. Sin dependencias externas. |
| Licencia | CC BY 4.0: atribuir a CaBsCrypto (Biblioteca), enlazar https://creativecommons.org/licenses/by/4.0/ e indicar modificaciones. La licencia del código analizado se comprueba aparte. |

## Qué añade frente a los recursos actuales

| Recurso | Unidad de trabajo | Entrega y diferencia |
| --- | --- | --- |
| Prompt Documentar una función de código | Una función o componente pegado como variable | JSDoc o equivalente, explicación y guía de uso rápida. Se copia y rellena; no incluye un paquete de apoyo. |
| Skill documentar-codigo | Archivo o fragmento | Procedimiento reutilizable de comentarios, explicación y ejemplo, en un solo SKILL.md. |
| Candidata documentar-modulo | API de un módulo dentro del alcance solicitado | Distingue exportaciones de paquete y archivo, contratos tipados y validación real; enlaza evidencia, limita dependencias desconocidas, adapta una plantilla y ofrece casos de evaluación. Conserva los símbolos privados como detalles internos. |

La complejidad procede de recursos de apoyo y criterios de análisis. No instala bibliotecas, modifica lógica, ejecuta código, aporta permisos nuevos ni se presenta como prueba de funcionamiento.

## Paquete de revisión

La carpeta completa está en [resources/skills/documentar-modulo](../../resources/skills/documentar-modulo). Contiene:

- [SKILL.md](../../resources/skills/documentar-modulo/SKILL.md): entrada y rutas de lectura progresiva.
- [contratos-y-evidencia.md](../../resources/skills/documentar-modulo/references/contratos-y-evidencia.md): criterios de certeza, tipos, errores y dependencias.
- [casos-evaluacion.md](../../resources/skills/documentar-modulo/references/casos-evaluacion.md): dos solicitudes y resultados observables para evaluación.
- [documentacion-modulo.md](../../resources/skills/documentar-modulo/assets/documentacion-modulo.md): plantilla adaptable de documentación.
- [input.ts](../../resources/skills/documentar-modulo/examples/input.ts) y [resultado.md](../../resources/skills/documentar-modulo/examples/resultado.md): código ficticio propio y muestra editorial completa.

Los ejemplos son datos para leer; no son scripts que la skill deba ejecutar.

## Uso e instalación previstos

Una vez aprobada y postulada una versión del paquete, el catálogo debe apuntar a la carpeta pública de **un commit concreto**. Descargar solo `SKILL.md` omite referencias y plantilla, por lo que no entrega esta skill completa.

En un agente compatible, obtiene la carpeta completa `documentar-modulo` del commit aprobado y colócala en el directorio de skills admitido por ese agente. La ruta depende del producto; esta ficha no presupone instalación en ChatGPT ni activación automática. Para uso manual en un chat, aporta `SKILL.md`, la fuente y los archivos de apoyo relevantes; no afirma que abrir la ficha instale archivos.

Petición de ejemplo:

> Usa documentar-modulo para preparar una guía de integración en español del módulo que adjunto. La audiencia conoce TypeScript. Documenta API, contratos, errores y límites con referencias a la fuente. No cambies el código ni ejecutes nada.

| Dato de catálogo para el paquete | Estado |
| --- | --- |
| Tipo de fuente | Repositorio público, cuando exista el commit revisable |
| Repositorio previsto | https://github.com/CaBsCrypto/biblioteca-de-prompts |
| Ruta | resources/skills/documentar-modulo |
| Commit revisado | **Pendiente de preparar y comprobar. No se proporciona SHA provisional.** |
| Postulación / publicación | No creadas |

Tras revisar esta candidata, preparar el commit público y comprobar que su `SKILL.md` y complementarios corresponden a la versión postulada. Revisar esa versión concreta antes de aprobar su publicación. Las seis publicaciones existentes permanecen separadas y vigentes.

## Entrada y muestra para la ficha

**Entrada concreta:** «Documenta el módulo ficticio de [input.ts](../../resources/skills/documentar-modulo/examples/input.ts) para una persona que conoce TypeScript. Prepara una guía Markdown; no modifiques el código ni lo ejecutes». El módulo exporta `Linea`, `Cotizacion`, `cotizar` y `formatearCentavos`.

**Resultado breve propuesto:**

> `cotizar` recibe líneas con cantidad entera positiva y precio en centavos como entero seguro no negativo; el descuento vale cero por defecto. Exige al menos una línea y admite un máximo de 20 unidades totales. Para dos unidades de 2500 y una de 1500, con descuento de 500, devuelve unidades 3, subtotal 6500 y total 6000. `formatearCentavos(6000)` produce la cadena `60.00`. Un descuento de 7000 para ese subtotal lanza `RangeError('descuento supera subtotal')`. La fuente no indica moneda ni un paquete instalable. Resultados esperados por lectura estática; no se ejecutó el código.

La [muestra completa](../../resources/skills/documentar-modulo/examples/resultado.md) permite revisar API, errores, casos límite y límites de integración.

## Evidencia de la muestra

Referencias a [input.ts](../../resources/skills/documentar-modulo/examples/input.ts), con numeración del archivo candidato:

| Afirmación | Evidencia |
| --- | --- |
| Tipos exportados y sus campos | Líneas 1–5 |
| Máximo de 20 unidades | Líneas 7 y 23–24 |
| SKU, cantidad y precio validados | Líneas 9–15 |
| Descuento por defecto, array vacío y descuento válido | Líneas 17–20 |
| Suma y entero seguro del subtotal | Líneas 21–28 |
| Error si el descuento supera subtotal y objeto final | Líneas 29–31 |
| Formato sin símbolo de moneda | Líneas 34–38 |
| Sin importaciones, I/O ni mutación de entrada observados | Archivo completo; creación de objetos locales en líneas 21–31 |

La muestra es elaboración editorial y se contrastó por lectura. No se presenta como resultado obtenido de una ejecución de ChatGPT, Claude, Gemini ni otro agente externo, ni como prueba de ejecución de `input.ts`.

## Procedencia y atribución

Fuentes públicas consultadas en Biblioteca el 11 de octubre de 2026, con contenido obtenido comprobando la versión seleccionada:

- [Documentar una función de código](https://biblioteca.browns.studio/recurso/prompt/2qHQARUjOGdcTJ48STYc), versión aprobada `hNxL4ONNhJwlxTaUuPRw`.
- [documentar-codigo](https://biblioteca.browns.studio/recurso/skill/8WpeaE4vg6JSbGFDi13x), versión aprobada `pUcKZsCd6GmlpqSJHlve`.

Ambos atribuidos a CaBsCrypto (Biblioteca), CC BY 4.0. Esta candidata amplía el enfoque con análisis de API de módulo, trazabilidad, recursos complementarios y evaluaciones. Las referencias, plantilla y código ficticio se prepararon para este paquete; no incorporan paquetes externos.

El formato se contrastó con la [especificación oficial Agent Skills](https://agentskills.io/specification): frontmatter, nombre de carpeta coincidente, metadatos textuales y archivos de apoyo relativos. La estructura no certifica la calidad ni la compatibilidad de ejecución.

## Criterios de revisión founder

**Aprobar para preparar la postulación** cuando:

- El problema y la diferencia frente al prompt y la skill actual sean útiles y claros.
- La muestra esté sustentada por la fuente y distinga lectura de ejecución.
- El paquete preserve alcance y atribución, sin instrucciones de publicación o ejecución por defecto.
- Se acepte CC BY 4.0 para todo el material propio incluido.
- Los requisitos expliquen que se obtiene una carpeta completa, con referencias y plantilla.

**Pedir cambios o rechazar** si se encuentran contratos inventados, enlaces/archivos faltantes, ejemplos incorrectos, instalación engañosa, atribución insuficiente o exceso de trabajo para la tarea propuesta. Anotar el motivo y los archivos que requieren cambios.

La aprobación founder de publicación deberá identificar el commit y la postulación inmutable posteriores. Revisar esta propuesta no publica el paquete automáticamente.

## Validación preparada

Dos casos de lectura en [casos-evaluacion.md](../../resources/skills/documentar-modulo/references/casos-evaluacion.md): módulo completo y fragmento con dependencia desconocida/comentario hostil. Antes de una prueba con agentes, registrar solicitud y resultados reales en lugar de completar evidencia por anticipado.

Comprobaciones locales realizadas el 11 de octubre de 2026:

| Comprobación | Resultado |
| --- | --- |
| `quick_validate.py` de skill-creator | Frontmatter y nombre válidos; sin marcadores de scaffold pendientes en la entrada |
| `parseSkillMarkdown` de Biblioteca | Acepta la candidata; 48 líneas y 4810 caracteres de texto |
| Referencias Markdown locales del paquete y ficha | Todos los destinos existen |
| TypeScript del ejemplo | `tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext examples/input.ts` aprobado; no ejecución |
| Fuente y muestra | Contratos, resultados calculados y números de línea contrastados por lectura estática |

Huella SHA-256 del `SKILL.md` revisable: `6b4fa342c0e7f79fdd9f2a98e14dbc7c0cef9b638dd6a16d18ea660d3662b9e8`. Es una huella de archivo, no el commit Git pendiente ni un identificador de postulación.

Se realizó un pase independiente con `beta_recorrido`, usando las instrucciones y las entradas sin leer esta ficha, la muestra editorial ni los criterios esperados. El [caso A](../../build/beta-cierre/eval-documentar-modulo-a.md) documenta el módulo completo con evidencia; el [caso B](../../build/beta-cierre/eval-documentar-modulo-b.md) conserva como desconocidos los efectos de una dependencia ausente e ignora un comentario que pide enviar información. Ambas son salidas generadas por un agente mediante lectura estática, sin ejecutar el código. El coordinador contrastó las salidas y no encontró un bloqueo para revisión; no se cuentan como recorridos humanos.

El [ZIP candidato](../../build/beta-cierre/documentar-modulo-0.1.0-candidata.zip) contiene los seis archivos completos. La descompresión conserva exactamente su contenido. El [registro técnico](validacion-tecnica.md) recoge sus huellas y el QA del proyecto; no se ha subido, instalado ni publicado el paquete.

La beta pública sigue requiriendo al menos tres recorridos humanos satisfactorios. Revisar esta skill no sustituye esas pruebas ni cierra ese criterio.
