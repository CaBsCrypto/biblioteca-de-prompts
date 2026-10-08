# Biblioteca en ChatGPT

El complemento personal `biblioteca` versión `0.1.0` añade búsqueda, fichas y uso de prompts y skills publicados. La interfaz se entrega como recurso MCP App desde `https://biblioteca.browns.studio/api/mcp`; la web y el complemento consultan el mismo catálogo aprobado.

## Alcance y privacidad

Las cuatro herramientas (`search_resources`, `get_resource`, `get_resource_content`, `open_library`) son de lectura. El servidor consulta Firebase de forma anónima bajo las reglas existentes y no utiliza Firebase Admin. Los borradores, postulaciones, rechazos y bibliotecas privadas no se entregan al complemento.

La instalación personal limita quién tiene instalado el complemento, pero el endpoint HTTPS es público y devuelve únicamente recursos ya publicados. El paquete no contiene credenciales ni copias del catálogo. Los valores rellenados permanecen en el widget hasta que el usuario elige **Usar en esta conversación**; esa acción comparte el recurso seleccionado con ChatGPT. Los textos descargados conservan su licencia y autoría.

No se guardan remixes, ejecutan scripts, instalan paquetes ni publican recursos desde este complemento. Una skill con archivos complementarios enlaza la carpeta del commit revisado. Las muestras pertenecen a sus creadores y no certifican ejecución en todos los modelos.

## Preparación y pruebas

Después de instalar las dependencias del repositorio:

```bash
npm run lint
npm run build
npm run qa
npm run test:unit
npm run smoke:vercel -- https://URL-DEL-PREVIEW
npm run smoke:mcp -- https://URL-DEL-PREVIEW/api/mcp
```

Las pruebas de reglas usan Java y emuladores en CI. Para validar el MCP contra los emuladores del proyecto, iniciar Firestore y Auth con `firebase.emulators.json` y el proyecto `demo-biblioteca`, preparar las muestras con `npx tsx scripts/seed-catalog-emulator.ts` e iniciar el servidor con `MCP_FIRESTORE_EMULATOR=true`. Después ejecutar `npm run smoke:mcp -- http://localhost:3000/api/mcp demo-prompt-resumen`. Mantener estos recursos separados de producción.

Para las comprobaciones de interfaz, compilar el host con `node scripts/build-mcp-harness.mjs` y abrir `/__mcp-test` en ese servidor. La ruta solo existe cuando el emulador MCP está activo y fuera de producción. Sus registros comprueban las solicitudes del widget; no sustituyen la prueba en ChatGPT.

El smoke usa el cliente oficial MCP para inicializar Streamable HTTP, descubrir las cuatro herramientas, comprobar filtros por tipo y leer `ui://biblioteca/library-v1.html`. El argumento opcional de ID comprueba también la ficha y su entregable fijado a una postulación. No imprime entregables ni variables.

Un Preview protegido requiere la sesión existente del equipo: `npm run smoke:mcp -- https://URL-DEL-PREVIEW/api/mcp --vercel-auth` utiliza Vercel CLI sin exportar sus credenciales. En Windows configurar `VERCEL_CLI_ENTRY` con el archivo JS de la instalación oficial; `VERCEL_SCOPE` selecciona el equipo si hace falta. La producción se comprueba sin esta opción. CI ejecuta el smoke remoto MCP solo si ya existe el secreto `VERCEL_AUTOMATION_BYPASS_SECRET`; sin él, la comprobación autenticada del Preview es manual. No desactivar la protección del proyecto para pasar el smoke.

## Crear el paquete

La fuente portable está en `plugins/biblioteca`: manifiesto raíz `plugin.json`, `mcp.json` con transporte `streamable-http` y una skill `usar-biblioteca`. Generar una copia portable para revisar:

```bash
npm run package:plugin -- --portable
```

Se crea `build/plugin/biblioteca-0.1.0-portable.zip`. La lista de archivos permitidos del script evita añadir `.env`, respaldos, borradores, `node_modules` o datos del catálogo aunque existan cerca de la fuente.

Para crear el ZIP personal, registrar primero la conexión real en ChatGPT y pasar su ID:

```bash
npm run package:plugin -- --app-id plugin_asdk_app_ID_REAL
```

El script requiere un ID real con formato válido; no comprueba su existencia en ChatGPT. Añade únicamente al ZIP la referencia `extensions.com.openai.apps: "./.app.json"` y la correspondencia `apps.biblioteca.id`. El prefijo `plugin_` de la URL identifica el complemento; la correspondencia utiliza el ID subyacente `asdk_app_…`. El ID personal no se guarda en los archivos fuente. Resultado: `build/plugin/biblioteca-0.1.0-personal.zip`.

## Activación personal

1. Con QA y Preview aprobados, fusionar la misma versión y comprobar el smoke del MCP en producción.
2. En el navegador interno, abrir **Complementos → Añadir → Crear servidor MCP personalizado**. Nombre **Biblioteca**, URL `https://biblioteca.browns.studio/api/mcp`, autenticación **Ninguna**. Revisar la advertencia que presenta ChatGPT y crear la conexión como complemento.
3. Confirmar que descubre las cuatro herramientas. Copiar el identificador técnico `plugin_asdk_app_…` de la URL visible y generar el ZIP personal con ese valor.
4. En **Complementos → Añadir → Subir archivo comprimido**, seleccionar el ZIP personal. Instalarlo solo en la cuenta del propietario, sin envío al directorio público. Si ChatGPT presenta una conexión ya registrada, reutilizarla.
5. Abrir un chat nuevo, seleccionar `@Biblioteca` y pedir que abra el catálogo. Buscar un recurso aprobado, consultar la muestra y elegir **Usar en esta conversación**.

ChatGPT decide cómo mostrar el widget. Comprobar los modos disponibles, cierre y reapertura preservando filtros y selección; en móvil un modo compacto puede mostrarse de otra forma. No dar por activado el complemento solo porque la conexión MCP existe o el ZIP se generó.

## Criterio de aceptación y registro

La activación queda comprobada cuando el complemento está instalado en la cuenta y un prompt aprobado puede buscarse, rellenarse y usarse en el chat; una skill aprobada puede consultarse y descargarse; y el widget puede cerrarse y recuperarse sin perder la selección.

Si el catálogo está vacío, presentar las seis fichas iniciales para revisión del founder y publicar únicamente las aprobadas expresamente. Un smoke con cero resultados valida el protocolo, pero no sustituye estos recorridos reales. Mantener pendiente el cierre de la beta pública hasta registrar tres pruebas humanas satisfactorias.

Registrar fecha, commit desplegado, URL del MCP, identificador real de la conexión y del complemento instalado, recursos/versiones usados, evidencia de los recorridos y pendientes. No anotar tokens, variables privadas ni credenciales.

## Referencias oficiales

- [Formato portable y conexiones registradas](https://developers.openai.com/plugins/build/plugins).
- [Servidor MCP](https://developers.openai.com/plugins/build/mcp-server).
- [Interfaz MCP App](https://developers.openai.com/plugins/build/chatgpt-ui).
- [Modos de presentación y extensiones](https://developers.openai.com/plugins/build/extensions).
- [Ejemplo oficial de correspondencias de aplicaciones](https://github.com/openai/plugins/blob/main/plugins/figma/.app.json).
