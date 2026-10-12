# C01 · Primera contribución externa y moderación

Preparado el 11 de octubre de 2026. Estado: **pendiente de participante y observación humana**. La revisión de código descrita aquí fue de solo lectura; no creó perfiles, borradores ni publicaciones en producción.

## Resultado que buscamos

Una persona externa al equipo de agentes aporta un recurso propio, guarda un borrador, lo postula y comprende la decisión del founder. Si se aprueba, otra persona puede encontrarlo y obtener su versión aprobada. La preparación de una skill por los agentes no sustituye esta contribución humana.

C01 identifica la sesión y el rol de creador, no una persona adicional. Registrar qué participante P01–P05 realiza esta sesión: puede ser P03 dentro de la cohorte mínima de tres; P04 y P05 son opcionales. No contar dos veces a quien participa también en el recorrido de uso. Reservar 25–35 minutos para creador y founder. La actualización y la retirada se pueden comprobar en una continuación breve; anotar cada paso pendiente sin dar el recorrido por terminado.

## Preparación del facilitador

1. Acordar con una persona que quiera aportar un prompt propio o una skill propia. Pedirle una tarea que conozca, un ejemplo de entrada y un resultado que pueda explicar. El contenido y la licencia deben ser decisiones del creador; no copiar ni publicar material ajeno para completar la prueba.
2. Usar [Biblioteca de producción](https://biblioteca.browns.studio/). El creador entra con su cuenta de Google; el founder revisa desde su cuenta habitual en una sesión separada. Una ventana de visitante sirve para verificar el catálogo público.
3. Antes de postular, avisar al creador de que su nombre, ficha, ejemplo, licencia y entregable quedarán públicos si el founder aprueba. Confirmar que quiere compartir esa versión. No hace falta otorgarle permisos founder.
4. Explicar: «Queremos observar cómo funciona Biblioteca. Intenta hacerlo sin ayuda y cuéntanos qué esperas que ocurra». No mostrarle el formulario cumplimentado ni dictarle las acciones durante el primer intento. Si necesita ayuda, registrarla.

Accesos directos para el facilitador: [Publicar](https://biblioteca.browns.studio/?section=publicar) y [Revisiones](https://biblioteca.browns.studio/?section=revisiones). El segundo requiere la cuenta founder.

## Guion humano

| Paso | Consigna para la persona | Qué registrar |
| --- | --- | --- |
| 1 · Entrada | «Entra a Biblioteca y empieza a compartir un recurso que sea tuyo». | Si encuentra Publicar, puede ingresar y entiende Prompt/Skill; dispositivo y ayuda requerida. |
| 2 · Borrador | «Guarda lo que tengas, aunque todavía no hayas terminado». | Aparece en Mis borradores; al recargar puede continuar. Preguntar quién cree que puede verlo. El visitante no encuentra el recurso en el catálogo. |
| 3 · Ficha y ejemplo | «Completa lo que otra persona necesita para entenderlo y usarlo». | Título, problema, resultado, tarea, compatibilidad, requisitos, instrucciones, licencia, entrada y muestra coherentes. Requisitos puede decir que no necesita herramientas adicionales. |
| 4 · Postulación | «Envíalo a revisión. ¿Qué crees que ocurrirá ahora?» | Mis postulaciones muestra Pendiente de revisión; el recurso sigue ausente del catálogo público. Copiar el identificador de la postulación desde la revisión o registro técnico del facilitador, sin guardar credenciales. |
| 5 · Decisión | El founder revisa la versión exacta, texto, ejemplo y condiciones. | Decisión humana, versión, fecha y motivo si necesita cambios. Para una skill con archivos, verifica repositorio público, commit y coincidencia de SKILL.md antes de aprobar. |
| 6 · Respuesta | «Revisa el resultado de tu postulación. ¿Qué harías a continuación?» | El autor entiende Aprobada o Necesita cambios. Si hubo rechazo, ve un motivo accionable y puede corregir el borrador y postular una nueva versión. |
| 7 · Publicación | Otra persona abre el enlace público, encuentra la ficha y copia o descarga. | URL canónica `/recurso/prompt/<id>` o `/recurso/skill/<id>`, autor, licencia, versión aprobada y uso satisfactorio. |
| 8 · Actualización | «Mejora un detalle útil de tu publicación y envía esa nueva versión». | En Mis publicaciones usa Nueva versión. Guardar o postular no modifica la entrega pública anterior. Comparar el mismo fragmento de texto antes y después desde una sesión visitante recién recargada. |
| 9 · Nueva revisión | El founder aprueba o solicita cambios con motivo real. | Hasta aprobar, la ficha y el contenido públicos conservan la versión anterior. Al aprobar, ambos muestran juntos la nueva versión en el mismo enlace. |
| 10 · Retirada | Cuando el creador quiera comprobar la retirada, usa Retirar sobre su recurso. | Estado Retirada en su panel; visitante no puede abrir ni obtener el recurso desde el enlace anterior tras recargar. Volver a publicarlo requiere una nueva postulación aprobada. |

Si la primera postulación está lista, se aprueba. **No inventar un rechazo** para completar la tabla. La rama de rechazo se observa cuando el founder detecta una mejora necesaria real, por ejemplo que el resultado prometido no coincide con la muestra. Si no ocurre, marcarla «no observada en C01; cubierta por pruebas de reglas», no «éxito humano».

La retirada final se acuerda con el creador: puede dejar el aporte retirado o postular de nuevo para conservarlo en la oferta pública. La prueba no exige retirar ninguno de los seis recursos actuales. Una retirada impide nuevas entregas públicas; las copias privadas ya obtenidas siguen perteneciendo a sus usuarios.

## Revisión founder

La revisión usa **Revisar recursos**. Para aprobar, completar las tres comprobaciones del formulario: contenido y archivos, coherencia del ejemplo y condiciones de publicación gratuita. Una muestra es aportada por su creador; aprobarla no certifica ejecución en todos los modelos.

Para solicitar cambios, escribir una observación concreta y una corrección comprobable antes de pulsar **Solicitar cambios**. Por ejemplo, si ese es el problema real: «El ejemplo entrega siete puntos, pero las instrucciones exigen cinco. Ajusta el ejemplo o explica cuándo cambia ese número». El motivo queda accesible al autor y al founder; no es una ficha pública.

Para paquetes, el formulario usa **Carpeta con scripts o referencias en GitHub**, URL del repositorio público, SHA completo de 40 caracteres y ruta de carpeta sin `SKILL.md` al final (`.` para la raíz). El texto postulado debe coincidir exactamente con el archivo de ese commit. **Verificar repositorio y contenido** y **Examinar carpeta completa** ayudan a revisar la versión; no ejecutan sus scripts.

## Evidencia técnica existente y límites

Referencia de lanzamiento previa: PR [#9](https://github.com/CaBsCrypto/biblioteca-de-prompts/pull/9) para la web compacta y PR [#10](https://github.com/CaBsCrypto/biblioteca-de-prompts/pull/10) para cartas inline; versión de referencia comunicada al iniciar este sprint: `f2e7473`. La aceptación previa registra **174 pruebas unitarias y 27 pruebas de reglas**, además de CI y smokes. No se presenta ese resultado histórico como una ejecución nueva ni como participación humana. El coordinador registra el QA de este sprint en su entrega.

| Propiedad | Evidencia de implementación/prueba | Estado humano |
| --- | --- | --- |
| Borrador privado propio | `catalogDrafts` permite al dueño; `catalog.rules.test.ts` deniega lecturas de visitantes, otro autor y founder. | Pendiente de observación de guardado/recarga en C01. |
| Postulación exacta e inmutable | `submitCatalogDraft` guarda un snapshot separado; reglas exigen igualdad con borrador y deniegan cambios de contenido incluso al founder. | Pendiente de postulación C01. |
| Autor sin rol founder no publica ni eleva su rol | Reglas de postulaciones, ficha, entregable y users; prueba «solo founder aprueba; el autor no puede publicar o elevar su rol». El founder puede revisar recursos propios mediante la misma aprobación atómica. | No pedir al participante que manipule permisos; observar el flujo normal. |
| Decisión y rechazo privados | Lectura de `catalogSubmissions` para dueño/founder; motivo obligatorio al rechazar y decisión posterior inmutable. | Pendiente; rechazo solo si sucede de verdad. |
| Aprobación coherente | Transacción reemplaza decisión, ficha y entregable; reglas bloquean aprobación sin ficha/entregable o con contenido diferente. | Pendiente de revisión founder y entrega pública C01. |
| Actualización conserva la versión vigente | Prueba «una nueva postulación mantiene la versión aprobada y reemplaza ficha/entrega juntas». | Pendiente de comparación de versión anterior y nueva. |
| Retirada corta entrega pública | `withdrawCatalogResource`, reglas y prueba de retirada; las lecturas públicas usan servidor y se comprueba `submissionId` antes de entregar. | Pendiente de enlace retirado C01. |
| Biblioteca privada y remixes | Pruebas de reglas para skills guardadas; `web.account.test.ts` y `web.remix.test.ts` para cambio de cuenta, escritura privada y atribución. | Los recorridos humanos de uso y guardado se registran en el protocolo general. |
| Skill con archivos fijados | Validación de SHA/ruta, `verifySkillRepository`, pruebas de repositorio inaccesible/privado y contenido diferente. | Pendiente de revisión de la skill preparada y de un paquete si C01 lo elige. |

Código revisado: `src/typesCatalog.ts`, `src/components/catalog/CatalogEditor.tsx`, `CatalogReview.tsx`, `CatalogWorkspace.tsx`, `src/hooks/useCatalog.ts`, `useAuthProfile.ts`, `src/services/firestore/catalogService.ts`, `src/utils/catalog.ts`, `firestore.rules` y las pruebas anteriores. El editor se monta con clave por UID; los snapshots privados se ocultan al cambiar de cuenta. El alta normal crea un perfil creator, y el catálogo no requiere una concesión administrativa adicional para crear o postular.

**No se encontró un bloqueo concreto en el código que impida convocar e iniciar C01.** La revisión sololectura no confirma por sí sola el login de una persona nueva ni sustituye la prueba en producción.

## Registro de C01

Estado inicial: **pendiente; ninguna sesión humana realizada**.

- Sesión/rol: C01, creador externo.
- Participante P01–P05: pendiente; puede ser P03. Nombre de crédito elegido por la persona, sin anotar correo ni UID en el registro compartido.
- Fecha/hora (America/Santiago), duración, dispositivo y navegador:
- URL y SHA desplegado al probar:
- Tarea y tipo de recurso elegidos por el creador:
- Borrador guardado y recuperado tras recarga: pendiente.
- Postulación enviada; `resourceId` y `submissionId`: pendiente.
- Decisión founder, fecha y motivo si corresponde: pendiente.
- Consentimiento del creador para publicar esa versión y condiciones declaradas: pendiente.
- Otra persona pudo abrir ficha y obtener contenido: pendiente.
- Actualización pendiente conservó versión anterior; revisión nueva: pendiente.
- Retirada y enlace no disponible; estado final acordado: pendiente.
- Dificultades observadas y ayuda exacta facilitada:
- Resultado: pendiente / completado sin ayuda / completado con ayuda / no completado.
- Evidencia acordada: captura de interfaz o notas de observación; evitar capturar entradas privadas de Google, credenciales o contenido que el creador no haya consentido compartir.

C01 completa la contribución externa cuando existe una postulación real y una decisión founder comprendida por su autor. La actualización y retirada se marcan por separado. Solo una sesión observada con un participante real puede cambiar estos estados; no rellenarlos con simulaciones del agente.
