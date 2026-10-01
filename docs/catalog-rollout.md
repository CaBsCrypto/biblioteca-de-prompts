# Catálogo comunitario: operación y lanzamiento

## Datos y aprobación

`catalogDrafts` guarda el trabajo privado del autor. `catalogSubmissions` guarda una copia inmutable del borrador postulado, visible al autor y al fundador. `catalogResources` contiene exclusivamente la ficha pública de la versión aprobada. `catalogPayloads` contiene el texto entregable, en un documento con el mismo ID del recurso. Explorar descarga metadatos; el entregable se obtiene al abrir la ficha.

La aprobación actualiza decisión, ficha y entregable en una transacción. Las reglas comparan los snapshots exactos y usan `getAfter` para impedir aprobar parcialmente, sustituir contenido revisado, publicar una decisión rechazada o editar una publicación sin nueva revisión. El autor puede actualizar su borrador mientras la versión anterior permanece publicada. Una decisión ya resuelta no se puede editar. Retirar cambia únicamente `state` y `updatedAt`; la ficha y el entregable dejan de estar disponibles al público. Republicar exige otra postulación aprobada.

El rol `founder` se provisiona mediante acceso administrativo a Firebase en `users/{uid}.role`. Los clientes no pueden crear ese rol ni cambiarlo. El fundador puede revisar su propia oferta inicial y las postulaciones de otros; sigue obligado a la misma transacción y a revisar cada versión. No tiene acceso a borradores privados de otros autores. Sí puede ver sus postulaciones, incluidas decisiones y motivos privados.

Las skills guardadas en `users/{uid}/savedCatalogSkills` son copias privadas con atribución y versión. Permanecen disponibles para ese usuario después de cambios o retiradas. Los remixes de prompts siguen viviendo en la biblioteca privada existente.

## Recursos iniciales y enlaces anteriores

No se importan ni publican recursos automáticamente. El marcador legacy `isShared` no concede lectura pública sobre `prompts` ni `folders`; únicamente propietario, fundador y colaboradores autorizados de carpeta mantienen su acceso. Los antiguos likes y comentarios públicos sobre esos documentos no habilitan lectura ni escritura a terceros. La configuración de carpetas administra colaboración privada; compartir su enlace exige recursos aprobados en el catálogo.

Para convertir un recurso existente, su autor debe preparar su ficha completa, ejemplos de entrada y salida, condiciones de uso y una nueva postulación. La ficha aprobada preserva `sourcePromptId` o `sourceFolderId` para resolver enlaces anteriores. Si no hay una publicación aprobada vigente, esos enlaces presentan «no disponible». No se muestra el documento privado como fallback.

## Skills y revisión

Se acepta texto o un archivo `SKILL.md`, preservando los bytes de texto decodificados como UTF-8. El cliente valida Agent Skills: frontmatter YAML, nombre, descripción y campos opcionales. Los requisitos adicionales, scripts o referencias requieren un repositorio público GitHub, un SHA completo de 40 caracteres y la ruta de la carpeta (o `.` para raíz). Se compara el `SKILL.md` remoto de ese commit con el snapshot postulado tanto al enviar como al aprobar.

Las reglas limitan tamaño y forma, dominio GitHub, pin y rutas; la validación de YAML y la consulta del repositorio se realizan en el servicio cliente del autor y del revisor. Firestore no consulta servicios externos. La aprobación representa una revisión humana de contenido y coherencia del ejemplo; no certifica ejecución en todos los modelos. No se ejecutan scripts ni se aloja el paquete completo.

## Validación y lanzamiento

1. Ejecutar `npm run lint`, `npm run build` y `npm run qa`. El QA debe pasar antes de considerar terminado el cambio. Ejecutar también las 37 pruebas unitarias de catálogo, validación de Agent Skills y rutas con `npm run test:unit`.
2. Con JDK 21 disponible, ejecutar `npm run test:rules`: usa `firebase.emulators.json`, el proyecto de demostración `demo-biblioteca` y la base local `(default)`, sin modificar Firebase real. CI instala Java y ejecuta el emulador junto a las 27 pruebas legacy y de catálogo. Cubren aislamiento, autoría comunitaria, colaboración privada, identidad de chats, snapshots, privilegios, decisión atómica, IDs cruzados, revisiones, retirada, copias privadas y el recorrido con los servicios reales.
3. En Vercel Preview comprobar visitante, autor y fundador: explorar, filtrar, abrir muestra, copiar/rellenar variables, descargar o guardar skill; crear borrador, postular, rechazar con motivo y aprobar. Verificar una nueva revisión pendiente mientras la anterior sigue pública y la retirada posterior.
4. Ejecutar `npm run smoke:vercel -- <url-preview>`: home y rutas compartibles resuelven el frontend, y `/api/ai/crear` responde 401 sin autenticación. El smoke HTTP no sustituye la comprobación de contenido y autorización en navegador.
5. Antes del lanzamiento coordinar frontend, reglas e índices de esta misma versión. La configuración de producción `firebase.json` apunta a la base nombrada `ai-studio-5f50136d-4015-4979-b593-f4848a9de141`, del proyecto `gen-lang-client-0423104260`; corresponde a `firestoreDatabaseId` en la configuración de la aplicación. No desplegar a `(default)` ni usar `firebase.emulators.json` para producción. Aplicar los dos índices de catálogo para enlaces legacy en esa base y esperar su disponibilidad.
6. Provisionar o confirmar el UID del fundador mediante acceso administrativo, sin exponer credenciales en el repositorio. Revisar y publicar manualmente la oferta inicial. El catálogo vacío debe mostrar instrucciones de aportación útiles.

El rollback del frontend debe mantener las nuevas reglas de privacidad y la separación del catálogo: restaurar lectura pública legacy reabriría recursos sin aprobación. No borrar bibliotecas privadas ni decisiones históricas para volver atrás. Ante un problema de contenido, retirar la publicación afectada y preparar una nueva versión revisada.

## Comprobaciones posteriores

Confirmar que el catálogo solo muestra publicaciones vigentes; que un visitante no puede leer borradores, postulaciones, rechazos o documentos legacy; y que no aparecen errores `permission-denied`, índices faltantes o bloqueos CSP al usar GitHub. Los pagos, ejecución dentro de la web y API para agentes quedan fuera de esta entrega.
