# Sprint 04: cerrar la beta con uso real

Objetivo: obtener evidencia de que al menos tres personas encuentran, entienden, obtienen y conservan un recurso; comprobar una primera contribución externa con moderación; dejar una skill más completa preparada para revisión founder.

El usuario compartirá la invitación con 3–5 personas. La skill candidata no se publica antes de su revisión. No se añaden pagos, ejecución, OAuth del plugin ni nuevas APIs o colecciones.

## Backlog y responsables

| Ticket | Responsable | Estado | Entrega y criterio |
| --- | --- | --- | --- |
| BETA-01 Línea de base | Coordinador | terminado | Catálogo público consultado: cinco prompts y una skill; versión de aplicación `f2e7473`. |
| BETA-02 Kit de prueba | beta_prueba | terminado | Invitación, guion de 15–20 minutos y cinco filas anónimas pendientes. |
| BETA-03 Skill documentar-modulo | beta_skill + coordinador | revisión | Paquete de seis archivos validado, ZIP local y dos casos independientes; pendiente de revisión founder. |
| BETA-04 Recorrido de creador | beta_recorrido | terminado | Guion C01, límites de privacidad y decisión founder real; sin bloqueo técnico identificado. |
| BETA-05 Sesiones humanas | Usuario + participantes | pendiente | 3–5 invitados; al menos tres recorridos principales completos, con ayuda registrada. |
| BETA-06 Revisión de la candidata | Usuario, founder | pendiente | Revisar contenido, muestra y licencia; elegir aprobar o pedir cambios. |
| BETA-07 Contribución externa C01 | Participante creador + founder | pendiente | Borrador propio, postulación y decisión comprendida por el autor; entrega pública si la aprueba. |
| BETA-08 Síntesis y correcciones | Coordinador y agentes | pendiente | Priorizar los problemas observados, corregir bloqueos y repetir solo los pasos afectados. |

## Material para usar ahora

1. Compartir [invitación](../beta-cierre/invitacion.md).
2. Realizar [prueba de uso](../beta-cierre/prueba-usuarios.md) y registrar en [CSV](../beta-cierre/registro-pruebas.csv).
3. Elegir una persona creadora para [C01](../beta-cierre/qa-creador.md). Puede ser P03; P04 y P05 son opcionales. Una persona no cuenta dos veces por realizar dos sesiones.
4. Revisar la [ficha de documentar-modulo](../beta-cierre/skill-documentar-modulo.md) y su [ZIP candidato local](../../build/beta-cierre/documentar-modulo-0.1.0-candidata.zip). La prueba común usa la skill publicada `documentar-codigo`; la candidata no aparece en el catálogo público.

El plugin personal puede probarse en la cuenta que ya lo tiene instalado. La web es el recorrido común de los participantes; no se requieren cuentas compartidas ni instalación de un plugin privado.

## Criterio de cierre

- Al menos tres personas distintas completan el recorrido principal según el guion. Registrar por separado completado sin ayuda, completado con pistas y no completado. Si el facilitador ejecuta las acciones, esa sesión no prueba que la persona complete el recorrido.
- Se observa una contribución externa y una decisión founder, sin rechazos inventados ni aprobaciones automáticas.
- No quedan fallos de acceso, privacidad u obtención/guardado básico sin resolver. Los fallos de servicios externos y del contenido del recurso se distinguen de fallos de Biblioteca.
- La skill candidata tiene ficha, entregable, muestra y evidencia para revisión. Publicarla requiere aprobación humana y después fijar una versión accesible en repositorio para sus archivos complementarios.
- Registrar URL, versión, hallazgos, correcciones y repetición. Los problemas menores quedan con responsable.

## Estado inicial de evidencia

Consulta pública del 11 de octubre de 2026: seis recursos aprobados disponibles. El [registro técnico de este sprint](../beta-cierre/validacion-tecnica.md) documenta lint, build, qa, 174 unitarias y smokes de producción aprobados. CI de la versión publicada confirmada en verde; las 27 pruebas de reglas pertenecen a esa línea de base, no a una ejecución local nueva. La ubicación inline ya se comprobó en ChatGPT en el lanzamiento anterior; no se cuenta como sesión humana de esta beta.

Sesiones humanas completadas: **0 registradas**. Contribuciones externas observadas: **0 registradas**. Revisión founder de `documentar-modulo`: **pendiente**. No se ha declarado cerrada la beta.

El paquete y sus notas se conservarán localmente para revisar antes de publicarlos. Las observaciones humanas no se subirán a un repositorio público; si se comparte una síntesis, se retirarán datos personales y fragmentos privados.
