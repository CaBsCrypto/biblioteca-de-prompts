# Prueba de uso para cerrar la beta de Biblioteca

Estado: preparada; sesiones humanas pendientes. Preparada el 11 de octubre de 2026.

Objetivo: comprobar que una persona encuentra un recurso, entiende el resultado esperado, lo utiliza y recupera una copia privada con atribución. Esta prueba evalúa la experiencia; una muestra del catálogo no certifica la ejecución de un recurso en todos los modelos.

Sitio: https://biblioteca.browns.studio/. Oferta inicial: cinco prompts y la skill de texto `documentar-codigo`. Antes de cada sesión, el coordinador registra la versión desplegada y confirma que siguen disponibles.

## Participantes y alcance

- Invitar a 3–5 personas que ya utilicen un asistente de IA. Buscar variedad entre uso frecuente y ocasional, y entre ordenador y móvil. La primera cohorte P01–P03 incluye al menos una persona interesada en aportar recursos; P04 y P05 son opcionales.
- Asignar alias P01–P05. El usuario confirmó que compartirá la invitación con 3–5 personas; los agentes no contactan ni reclutan participantes.
- Cada participante realiza las cuatro tareas comunes en una sesión de 15–20 minutos. La sesión de creador y moderación es una extensión separada de 25–35 minutos, con el founder disponible.
- T1–T3 se realizan en la web como visitante, sin login. T4 requiere una cuenta de Google propia y el consentimiento de la persona para probar el guardado privado; no pedir que cree una cuenta ni que utilice una ajena. La prueba del plugin es opcional y solo se realiza en una cuenta que ya tenga Biblioteca instalada. El plugin personal no se ofrecerá a participantes externos ni se compartirán cuentas.
- No contar smokes, agentes, emuladores, la sesión del founder ni repeticiones de una misma persona como participantes humanos independientes.

## Preparación del facilitador

1. Confirmar acceso al dominio, fichas públicas y obtención de contenido; registrar URL y SHA/versión. Si hay un fallo conocido de acceso o privacidad, resolverlo antes de invitar.
2. Tener abierto [registro-pruebas.csv](registro-pruebas.csv). Las cinco filas comienzan pendientes: no son sesiones realizadas.
3. Facilitar el fragmento ficticio de abajo. No pedir código de trabajo, documentos privados ni archivos del equipo del participante.
4. Preparar un editor de texto para comprobar lo copiado. El participante utiliza su propio asistente habitual, sin compartir contraseña ni pantalla de autenticación. Acordar voluntariamente si quiere probar T4 con una cuenta de Google que ya tenga; una negativa no impide realizar T1–T3.
5. Reservar al founder para revisar la postulación del creador. La skill más completa preparada para este sprint espera su revisión aparte; no se publica como parte automática de la investigación.

## Apertura y consentimiento breve — 2 minutos

Leer o adaptar:

> Estamos probando Biblioteca, no tus conocimientos. Quiero observar si puedes encontrar y usar un recurso sin explicarte dónde están los controles. Puedes pensar en voz alta, saltar una tarea o parar cuando quieras. Usaremos datos ficticios. Tomaré notas con un alias, sin nombres, correos, contraseñas ni contenido privado. No grabaremos esta sesión. ¿Te parece bien participar?

Anotar `si` o `no`; si responde que no, detener la sesión y dejar las tareas sin realizar. No grabar audio, vídeo ni pantalla por defecto. Si el participante comparte algo privado por accidente, no copiarlo al registro ni conservarlo como evidencia.

Preguntas de contexto, sin recoger identificadores:

- ¿Para qué sueles usar un asistente de IA?
- ¿Has utilizado una plantilla de prompt o una skill antes?
- ¿Hoy estás en móvil o en ordenador?

## Tareas comunes — 14–16 minutos

Presentar una tarea cada vez. No mencionar etiquetas de botones, rutas específicas, filtros correctos ni el título exacto del recurso antes de que la persona lo intente. Las verificaciones siguientes son para el facilitador, no instrucciones para leer al participante.

### T1. Encontrar y entender — 3 minutos

Leer:

> Vas a compartir una función pequeña con otra persona y quieres explicar qué recibe, qué devuelve y cómo se usa. Encuentra en Biblioteca algo que te ayude. Muéstrame qué resultado esperas conseguir y qué necesitarías aportar.

Comprobar si encuentra un prompt apropiado —por ejemplo, «Documentar una función de código»—, abre su ficha y utiliza la muestra, requisitos o instrucciones para explicar el resultado. Registrar si distingue el ejemplo del contenido que obtendrá. No exigir conocimientos de programación.

### T2. Preparar, copiar y aplicar — 4 minutos

Leer:

> Usa el recurso que elegiste para explicar este fragmento ficticio a alguien que está aprendiendo JavaScript. Deja el texto listo para usar en tu asistente habitual y prueba a pedirle la documentación. Comprueba si lo obtenido te sirve o si falta algo.

Material que puede copiar el participante:

```javascript
export function totalPedido(precioUnitario, cantidad) {
  return precioUnitario * cantidad;
}
```

Contexto ficticio: explicación para una persona que está aprendiendo JavaScript. El código no valida valores negativos ni tipos de entrada; no modificarlo ni afirmar que se ha ejecutado.

Comprobar que prepara las variables necesarias, obtiene el texto y lo pega en un editor o en su propio asistente sin marcadores pendientes. Para dar la tarea por completada, observar también una solicitud enviada con el fragmento ficticio y una respuesta que el participante pueda revisar. Registrar por separado un fallo de Biblioteca y una limitación del asistente externo; no atribuir ambos al catálogo.

Registrar el nombre del asistente solo como herramienta utilizada, sin enlace privado de conversación ni contenido completo de la respuesta. Una respuesta incorrecta es un hallazgo sobre el recurso; copiar correctamente no garantiza la calidad del resultado.

### T3. Entender y obtener una skill — 3 minutos

Leer:

> Ahora quieres repetir este trabajo en un agente que admita skills. Encuentra una opción en Biblioteca, explica qué necesitas para usarla y consigue el archivo correspondiente. ¿En qué se diferencia de la plantilla que acabas de utilizar?

Comprobar si encuentra `documentar-codigo`, entiende los requisitos e instrucciones, descarga `SKILL.md` y puede identificar el archivo. No pedir instalación, ejecución de código ni configuración de otro producto. La tarea se completa al obtener el archivo y explicar dónde lo usaría; una skill no se instala automáticamente al descargarla.

### T4. Conservar y recuperar recursos privados — 5 minutos

Leer:

> Si quieres probar también la parte privada con una cuenta de Google propia, imagina que quieres conservar ese prompt y esa skill para otra ocasión. Guarda ambos y vuelve a encontrarlos en tu espacio personal. En la copia del prompt, haz una pequeña adaptación ficticia y comprueba de quién procede. Sal de la ficha y vuelve a la copia para comprobar que puedes retomarla.

Comprobar login, guardado del remix privado y de la skill, recuperación desde Mi Biblioteca y atribución del autor original. La adaptación sugerida, solo si el participante pide un caso, es añadir «Explica los términos para una persona que empieza» a su copia privada. No pedir que publique su remix.

El guardado puede conservar la plantilla original; no suponer que los valores temporales del rellenador se persisten. Comprobar que la persona entiende qué quedó guardado. Si ya tenía una copia, recuperar y adaptar esa copia es válido; no exigir un duplicado.

No leer otras entradas privadas del participante. No exportar su biblioteca, recoger su correo ni fotografiar la pantalla de login. Registrar únicamente si puede guardar, recuperar y reconocer la atribución. Si no quiere iniciar sesión, registrar T4 como `no_realizada` por elección de la persona, conservar los resultados públicos y no pedir que cree una cuenta o transfiera contenido sensible. Esta sesión pública no demuestra el guardado privado ni cuenta como recorrido T1–T4 completo.

## Cierre — 2 minutos

- ¿Qué fue lo más difícil o inesperado?
- ¿Qué diferencia viste entre un prompt y una skill?
- ¿En qué tarea tuya lo usarías de nuevo?
- Si pudieras cambiar una sola cosa, ¿cuál sería?

Anotar observaciones breves y hechos observables. «No vio la descarga durante 40 segundos» permite actuar; «no entiende la tecnología» no describe un fallo de producto. Una cita corta solo se conserva si no contiene datos personales o privados.

## Extensión para creador y founder — 25–35 minutos aparte

Esta extensión comprueba una primera contribución real. La sesión C01 corresponde al rol de creador de una persona de P01–P05 —por ejemplo, P03—; no exige un cuarto participante ni sustituye las cuatro tareas comunes. Si el creador no completa las tareas comunes, su moderación no aumenta el número de recorridos principales satisfactorios. Utilizar [qa-creador.md](qa-creador.md) como guía detallada para los pasos y evidencias de esta sesión; el resumen siguiente orienta al facilitador.

### Creador: preparar y postular

Leer:

> Imagina que quieres ofrecer a otras personas un recurso propio para convertir notas ficticias en una lista de próximos pasos. Prepara una ficha con un ejemplo, conserva un borrador, vuelve a abrirlo y envíalo a revisión cuando te parezca listo. Explica qué crees que ocurre a continuación.

El creador utiliza material propio o redactado para la prueba, con condiciones de uso que pueda declarar. No reutilizar recursos externos sin permiso o licencia compatible. Si quiere publicar una skill con archivos adicionales, debe aportar repositorio público, commit concreto y ruta; esta prueba básica puede realizarse con un prompt o una skill de texto.

Comprobar creación de borrador, recuperación, campos obligatorios, ejemplo de entrada y resultado, condiciones de uso y postulación pendiente. No conceder permisos founder al participante. Registrar el tipo de recurso y el identificador de su postulación, sin contenido privado ni datos de la cuenta.

### Founder: resolver la postulación y devolver una explicación

El founder revisa la versión realmente postulada, decide aprobar o rechazar y confirma la decisión. El agente no aprueba contenido en su nombre. Si hay un defecto real, el rechazo debe describirlo y permitir una corrección; no inventar un defecto ni un rechazo para rellenar la prueba.

El creador vuelve a la aplicación y comprueba el estado. Si recibió rechazo, debe poder localizar el motivo y explicar qué corregiría. Si recibió aprobación, debe comprobar la ficha pública; registrar que no hubo rechazo y que esa rama sigue pendiente de validar con un caso real o con una prueba funcional separada en emulador. No presentar una publicación aprobada como evidencia de recepción de un motivo de rechazo.

Si el founder no está disponible, guardar la postulación pendiente y completar la segunda parte posteriormente; la extensión queda pendiente. No publicar la skill nueva propuesta por el agente sin la revisión explícita del founder.

## Extensión del plugin — opcional, sin ampliar el mínimo de personas

Solo en la cuenta personal con Biblioteca instalada: abrir las cartas dentro del mensaje, seleccionar un prompt, preparar sus variables y usarlo en la conversación. Consultar la skill, reducir y reabrir Biblioteca conservando la selección. Registrar por separado el host y sus capacidades de presentación; una ficha en panel lateral no prueba la ubicación inline.

No incluir esta extensión en la invitación general ni pedir a terceros acceso a la cuenta del founder. Su éxito no sustituye un recorrido común web.

## Resultados, ayuda y abandonos

Para cada tarea usar uno de estos valores en el CSV:

| Resultado | Significado |
|---|---|
| `pendiente` | No se ha observado la tarea. |
| `sin_ayuda` | Alcanzó las verificaciones de la tarea sin pistas sobre la interfaz. |
| `con_ayuda` | La persona realizó las acciones y alcanzó el resultado después de una pista o explicación del facilitador. |
| `fallo` | Lo intentó, pero un fallo impidió el resultado. |
| `abandono` | Decidió dejar la tarea; anotar el motivo observable sin inferirlo. |
| `no_realizada` | No se intentó por tiempo, consentimiento o condiciones externas. |

Usar `ninguna`, `aclaracion_escenario`, `pista_interfaz` o `intervencion` en la columna de ayuda. Aclarar el escenario o repetirlo no es una pista de navegación; registrar igualmente la aclaración. Si después de 60–90 segundos no progresa, preguntar «¿Qué esperabas que ocurriera?» antes de ofrecer ayuda. Si se da una pista, anotar el resultado anterior y el tipo de pista; no convertirlo en `sin_ayuda`. Si el facilitador ejecuta acciones por la persona, registrar `intervencion` y no considerar esa tarea completada por el participante; separar el fallo original de una eventual repetición posterior.

`recorrido_principal` se calcula manualmente a partir de T1–T4:

- `completo_sin_ayuda`: las cuatro tareas son `sin_ayuda`, sin pistas de interfaz ni intervenciones.
- `completo_con_ayuda`: las cuatro llegan al resultado, pero alguna necesitó ayuda de interfaz.
- `incompleto`: alguna termina en fallo, abandono o no realizada.
- `pendiente`: la sesión no se ha completado.

El total humano debe informar ambas categorías de completos por separado. El criterio acordado exige al menos tres personas distintas que completen el recorrido principal; se cuentan completos sin ayuda o con pistas solo cuando la persona realizó las acciones. Un recorrido completado con pistas identifica fricción: registrar el hallazgo y repetir la tarea tras una corrección cuando corresponda, sin contar a esa misma persona como una nueva participante. Una intervención que hace los pasos por la persona no cuenta como recorrido humano completo.

## Incidencias y correcciones

Asignar identificadores H01, H02… y registrar en las columnas `incidencias` y `observacion_breve` el paso, comportamiento esperado, comportamiento observado y si se reproduce. Si hay varias, separarlas con `;` dentro de una celda CSV entre comillas. Registrar la versión afectada y la versión de la corrección; no incluir capturas con datos privados.

| Severidad | Ejemplos | Decisión |
|---|---|---|
| `acceso_privacidad` | Login imposible de forma general; una cuenta ve contenido privado de otra; borrador o rechazo accesible a un tercero. | Detener la prueba afectada y bloquear cierre hasta corregir y verificar. No copiar contenido expuesto a la evidencia. |
| `bloqueo_uso_central` | No puede copiar o descargar, guardar o recuperar; valores pendientes enviados; ficha equivocada; versión retirada entregada. | Corregir y repetir el recorrido afectado antes de cerrar. |
| `menor` | Texto poco claro, espacio excesivo, etiqueta o paso adicional que no impide completar. | Registrar responsable y prioridad; puede quedar en backlog con decisión explícita. |

Para priorizar, agrupar hallazgos por tarea y registrar cuántas personas los encontraron. Separar fallo del producto, problema de contenido y condición externa. Corregir el bloqueo observado, verificarlo funcionalmente y repetir solo las tareas afectadas; no ampliar el alcance con funciones que nadie necesitó en la prueba.

## Uso del registro y criterio de cierre

El CSV del repositorio es una plantilla pendiente, no analítica automática ni evidencia de sesiones realizadas. Para completar resultados y notas humanas, usar una copia local fuera de los archivos versionados: no subirla al GitHub público ni adjuntar allí notas individuales. Completar fecha/hora en America/Santiago, alias, perfil general, dispositivo, navegador, URL y SHA. Dejar vacío lo no observado. No incluir nombres, correos, UID, cookies, tokens, enlaces de conversaciones privadas ni variables personales. No añadir trackers. Las notas humanas permanecen locales; cualquier síntesis para el repositorio debe ser agregada, sin identificadores ni contenido privado.

Un registro pendiente, una visita o una prueba técnica no prueba éxito humano. El coordinador solo propone el cierre cuando:

1. Los seis recursos iniciales siguen publicados y utilizables.
2. Al menos tres participantes distintos completan T1–T4 por sí mismos, registrando si hubo pistas de interfaz; se conservan los hallazgos de las 3–5 sesiones y el desglose de ayuda.
3. Una contribución de un creador recorre borrador → postulación → revisión founder → resultado visible. La recepción de motivo de rechazo se registra únicamente si se observó; su rama funcional debe comprobarse aparte si no aparece un caso real.
4. La skill más completa tiene ficha y paquete preparados para revisión, y solo se publica después de aprobación explícita del founder.
5. No quedan incidencias abiertas de `acceso_privacidad` o `bloqueo_uso_central`. Los menores tienen una decisión y un responsable.
6. La entrega registra URL, versión desplegada, evidencia de correcciones y resultados humanos reales.

Handoff confirmado: el usuario compartirá [invitacion.md](invitacion.md) con 3–5 personas. Pendiente al preparar este kit: observar las sesiones, completar el CSV, resolver hallazgos y realizar la revisión founder. La beta no se considera cerrada todavía.
