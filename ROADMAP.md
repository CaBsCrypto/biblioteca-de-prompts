# Roadmap de continuidad

## Estado actual

- La app esta en `main` y se valida con `npm run qa` antes de deploy.
- El producto ya tiene biblioteca privada, comunidad, perfiles publicos, follows, favoritos sociales, comentarios, likes, ocultar/reportar, remixes privados y enlaces publicos.
- El Pack Fundador tiene 80 prompts semilla privados por usuario.
- La vitrina publica permite explorar, copiar, usar y guardar prompts como remix despues de login.
- El feed social ya incluye `Para ti`, `Creadores para seguir`, `Destacados`, `Recientes`, `Mas guardados` y `Remixeables`.
- Mi Biblioteca ya funciona como workspace diario con accesos rapidos, remixes recientes, favoritos y candidatos para publicar.
- El detalle publico presenta el prompt como `Recurso vivo`, con original conocido, remixes conocidos y estado de copia propia.
- El perfil publico funciona como hub de creador con CTA de seguir, mejores recursos para empezar, rutas por categoria, colecciones y remixes publicados.
- Los enlaces `?share=` explican que guardar crea un remix privado editable y que publicar sigue siendo manual.
- El bundle inicial ya fue reducido con lazy loading de superficies grandes y chunks manuales de Firebase/vendors.

## Prioridad 1 - Producto confiable

- Mantener `npm run qa` como puerta local obligatoria.
- Mantener `npm run test:rules` dormido hasta CI/staging con Java/JDK.
- Usar `QA_VERCEL.md` como checklist funcional antes de invitar usuarios.
- Reforzar confianza social: reportes, ocultar, señales de calidad, estados privados/publicos y revision de publicaciones propias.
- Confirmar que prompts privados no aparecen en vitrina, colecciones ni perfiles publicos.

## Prioridad 2 - Red social de prompts

- Seguir puliendo la narrativa publica: guardar, remixear, publicar y seguir creadores.
- Mejorar enlaces compartibles por perfil, prompt y coleccion sin crear router nuevo.
- Preparar el siguiente paso de moderacion founder sin cambiar el flujo de creadores.

## Prioridad 3 - Workspace diario

- Mejorar busqueda combinada por texto, autor, tags, categoria y estado.
- Agregar importacion/exportacion JSON cuando la biblioteca personal crezca.
- Seguir extrayendo logica de `src/App.tsx` hacia hooks y componentes.
- Centralizar operaciones Firestore en servicios cuando el producto estabilice flujos sociales.

## Prioridad 4 - IA opcional

- Mantener recomendador local primero.
- Usar Gemini solo como mejora explicita y tolerante a errores.
- No enviar `promptText` completo salvo que el usuario pida analisis profundo.
- Futuro: sugerir huecos de biblioteca, plantillas nuevas y mejoras de prompts existentes.

## Pendiente futuro

- Proyecto Firebase staging para pruebas intensas con datos descartables.
- CI con `npm ci`, `npm run qa` y Firestore Emulator.
- Moderacion global real para founder/admin si la comunidad empieza a crecer.
- Monetizacion, equipos o marketplace solo despues de validar retencion y uso social.
