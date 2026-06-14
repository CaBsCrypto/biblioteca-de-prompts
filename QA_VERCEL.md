# QA en Vercel sin Java local

Este proyecto usa Vercel Preview como entorno principal de QA funcional por ahora.

## Decision actual

- No instalamos Java localmente.
- No bloqueamos el avance por Firestore Emulator.
- `npm run test:rules` queda preparado, pero dormido y opcional.
- Las pruebas obligatorias antes de un deploy son `npm run lint` y `npm run build`.
- Las pruebas en Vercel usan el Firebase configurado en `firebase-applet-config.json`; por eso deben hacerse con datos controlados.

## Flujo recomendado

1. Ejecutar QA local basica:

```bash
npm run qa
```

2. Crear Vercel Preview.

3. Confirmar que el Preview quedo `Ready`:

```bash
vercel inspect <preview-url>
```

4. Probar con una cuenta Google de QA o datos claramente descartables.

5. Al desplegar produccion o un dominio publico, ejecutar smoke HTTP:

```bash
npm run smoke:vercel -- https://biblioteca-de-prompts-ashen.vercel.app
```

El smoke valida dos cosas minimas: la home responde `200` y `/api/ai/crear` responde `401` sin token, confirmando que la API existe y sigue protegida.

6. Revisar manualmente que los endpoints `/api/ai/crear`, `/api/ai/optimizar` y `/api/ai/recomendar` respondan solo con sesion iniciada.

## Deployment Protection

El proyecto Vercel puede responder `401 Unauthorized` antes de cargar la app si Deployment Protection esta activo.

Estado observado:

- `ssoProtection.deploymentType = "all_except_custom_domains"`.
- Los dominios `*.vercel.app` requieren acceso del equipo.
- `vercel curl` puede verificar deployments protegidos porque genera un bypass token.
- `npm run smoke:vercel -- <url>` requiere una URL accesible por HTTP normal; usarlo con el alias publico o dominio custom, no con previews protegidos por SSO.

Para probar la vitrina como visitante real hay dos caminos:

- Desactivar Deployment Protection desde el dashboard de Vercel para este proyecto.
- Asignar un dominio custom publico, ya que la proteccion actual excluye custom domains.

## Notas de despliegue

- El adapter Vercel usa `api/[...path].js` y carga `dist/server.cjs`.
- Si Vercel muestra `FUNCTION_INVOCATION_FAILED`, revisar logs con:

```bash
vercel logs <deployment-url> --no-follow --since 30m --level error --expand
```

- Si aparece `api-deployments-free-per-day`, la cuenta alcanzo el limite diario de deploys con funciones; esperar 24 horas o usar otro proyecto/cuenta.

## Checklist funcional en Vercel

- Visitante sin login ve la vitrina publica.
- Visitante puede copiar o usar prompts publicos.
- Visitante entiende que `Guardar` crea un remix privado editable despues de login.
- Perfil publico muestra CTA claro para seguir creador y guardar un prompt inicial.
- Perfil publico muestra `Mejores recursos para empezar` y rutas por categorias cuando hay prompts.
- Enlace `?share=<promptId>` explica probar, guardar remix privado y publicar manualmente si aporta.
- Login con Google funciona.
- Editar perfil actualiza nombre, handle y bio.
- Crear prompt privado.
- Publicar prompt individual.
- Verificar que el centro de confianza aparece en Mi Biblioteca cuando hay publicaciones, ocultos o reportes.
- Reportar un prompt de otro creador exige login, crea reporte y lo oculta del feed del usuario.
- Ocultar un prompt lo remueve del feed sin borrar ni despublicar el recurso.
- Detalle de prompt muestra estado `Recurso vivo`, original conocido y remixes conocidos cuando existan.
- Si el usuario no es autor, el historial de versiones no intenta leerse como dato publico.
- Perfil publico separa prompts originales, colecciones y remixes publicados.
- Compartir carpeta no publica prompts privados por defecto.
- Publicacion masiva de carpeta requiere marcar la casilla explicita.
- Seguir creador persiste en `/users/{uid}/following/{creatorUid}`.
- Filtro `Siguiendo` muestra solo creadores seguidos.
- Recomendador local funciona sin Gemini.
- `Mejorar con Gemini` requiere sesion y no rompe el recomendador local si falla.
- Eventos de uso/copia/edicion se registran en `/users/{uid}/events`.

## Pendiente futuro

Cuando el producto tenga mas usuarios o datos sensibles, crear un proyecto Firebase staging y conectar Vercel Preview a ese proyecto. Luego activar `npm run test:rules` en CI con JDK 11+ instalado, sin requerir Java en la maquina local.
