# Gratis permanente en la web

Gratis incluye tres prompts de hasta 2.500 caracteres para cuentas de Google. La biblioteca queda disponible sin código ni fecha de vencimiento. Una cuenta que vuelve de Pro a Gratis conserva sus prompts y puede leerlos, exportarlos o eliminarlos. Para guardar uno nuevo debe estar por debajo del cupo.

## Activación en Preview

1. Usa un proyecto de Firebase de pruebas separado de producción y una base aislada de la que usa P01. Configura Google Auth y autoriza el dominio elegido para el Preview. En Vercel, vincula el proyecto de pruebas y la identidad de servidor mediante las variables de Preview descritas en `.env.example`.
2. Si usas una base con nombre, configura el mismo identificador en `BIBLIOTECA_PILOT_FIRESTORE_DATABASE_ID` y en `firestoreDatabaseId` del JSON público de Firebase. El archivo `firebase.json` del repositorio apunta a la base de producción. Usa una configuración de despliegue que especifique el proyecto y la base de pruebas al instalar `firestore.rules` y sus índices.
3. Antes de desplegar la aplicación, comprueba las reglas de la base elegida y configura el documento `_bibliotecaConfig/library` con `enforced: true` y `mode: commercial`. Conserva las reglas y la configuración de acceso del piloto P01.
4. Activa `BIBLIOTECA_LIBRARY_COMMERCIAL_ENABLED` y `VITE_BIBLIOTECA_LIBRARY_COMMERCIAL_ENABLED` en el Preview nuevo. Deja desactivadas las dos variables de modo beta y `BIBLIOTECA_BILLING_ENABLED`. Mantén la protección de Vercel durante la prueba web.

## Criterios de aceptación

- Una cuenta de Google nueva entra en Mi Biblioteca, ve Gratis y empieza en **0 de 3** sin invitación.
- Se pueden guardar tres prompts, incluido uno de exactamente 2.500 caracteres. Un cuerpo de 2.501 caracteres y un cuarto prompt se rechazan conservando lo ya guardado.
- Después de recargar, se muestran la misma cuenta, los tres prompts y **3 de 3**.
- Con un permiso Pro temporal de prueba se puede guardar un cuarto prompt. Al vencer, siguen disponibles los cuatro para lectura y exportación y se bloquean nuevas creaciones por encima del cupo.
- Una cuenta distinta ve su propia biblioteca. La verificación independiente de P01 comprueba el recorrido web y ChatGPT en ambos sentidos con la cuenta del piloto.

En local, `npm run test:unit`, `npm run test:rules` y `npm run test:pilot` cubren el límite, las reglas de acceso y el vencimiento del permiso Pro. Para probar la publicación también hacen falta el Preview aislado y una cuenta de Google real. La prueba del precio Pro de US$2,99 al mes queda en el entorno de pruebas de Dodo.
