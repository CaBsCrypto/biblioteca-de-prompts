# Continuar Biblioteca en la notebook

Trabajá solo sobre este repositorio. Antes de ejecutar código, leé README-MIGRACION.md, INVENTARIO-MIGRACION.txt y MANIFIESTO-SHA256.json. Recuperá el SHA final del resumen del agente emisor y verificá git rev-parse HEAD contra él; no inventes ese SHA.

## Recepción en carpeta nueva
Con autorización de acceso a GitHub, usá:
```powershell
git clone --branch migracion/biblioteca-2026-10-21 --single-branch https://github.com/CaBsCrypto/biblioteca-de-prompts.git Biblioteca
cd Biblioteca
git rev-parse HEAD
git status --short
```
Un clon single-branch necesita traer explícitamente otras ramas después. Si ya hay un clon, primero inspeccioná estado, índice, ramas y worktrees; no sobrescribas trabajo ni hagas reset/clean/stash. Preferí una carpeta nueva.
Verificá todos los hashes antes de ejecutar código:
```powershell
$migracionManifest = Get-Content MANIFIESTO-SHA256.json -Raw | ConvertFrom-Json
foreach ($item in $migracionManifest.files) {
  if ((Get-FileHash -LiteralPath $item.path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $item.sha256) { throw "Hash incorrecto: $($item.path)" }
}
```
Si Git cambia finales de línea, los hashes de archivos pueden diferir: verificá primero bytes de blobs Git o repetí en clon nuevo con core.autocrlf=false, sin normalizar el original a ciegas. SHA del commit sigue siendo obligatorio.

## Instalación y uso, solo tras autorización local
Usar Node 22.x y npm compatible con lockfile. Java 21 si se autorizan emuladores/reglas. En la raíz: npm ci instala dependencias y puede ejecutar scripts de paquetes; revisar antes de autorizar. Copiar .env.example a .env.local y recuperar claves por canal seguro, nunca GitHub ni chat. Iniciar sesión con la misma cuenta no configura herramientas, variables ni emuladores. No regenerar claves ni resetear bases. No recuperar cookies ni perfiles de la PC original.
Para pruebas sintéticas, mantener VITE_FIREBASE_EMULATORS=true y MCP_FIRESTORE_EMULATOR=true; en terminal separada:
```powershell
npx firebase emulators:start --config firebase.emulators.json --project demo-biblioteca --only firestore,auth
```
Este comando puede descargar herramientas. Tras autorización para escribir exclusivamente en emuladores, npx tsx scripts/seed-catalog-emulator.ts prepara fixtures ficticios en localhost. No usar firebase.json para apuntar pruebas a producción. Luego npm run dev inicia Express/Vite en http://localhost:3000; puede consultar servicios según el flujo y las claves configuradas.

## Checklist de validación
- Ejecutar npm run lint, npm run build y npm run qa. Si qa falla, no declarar completado. Build escribe dist/server.mjs y widget; el README histórico menciona server.cjs pero el script actual genera mjs.
- npm run test:unit; reglas solo con Java y emuladores mediante npm run test:rules.
- Comprobar catálogo ficticio, buscar, abrir ficha, copiar prompt, descargar skill, login sintético, guardar y recuperar con atribución; comprobar privacidad y retirada sin datos reales.
- Widget MCP: ajustes, lista/cartas, texto grande, copia/uso/reducción y reapertura; navegador y móvil reales para teclado/compositor.
- Repetir con PC original apagada/desconectada, manteniendo internet para servicios remotos autorizados. Anotar resultados y límites; no confundir preview con validación local.
- No desplegar, publicar recursos, enviar invitaciones, cambiar producción ni ejecutar migraciones de datos. Un preview nuevo requiere autorización propia en la notebook.

## Trabajo posterior y futura integración
Crear rama de continuación basada en la migración: git switch -c codex/continuacion-notebook. Commits/pushes solo autorizados y tras revisar sus automatizaciones.
Login no conecta una rama a main: las ramas comparten historial y se integran mediante revisión. Comprobar primero la rama predeterminada en GitHub (main al emitir este paquete). Para traerla en el clon single-branch:
```powershell
git fetch origin refs/heads/main:refs/remotes/origin/main
git merge-base origin/main HEAD
git log --oneline --left-right origin/main...HEAD
git diff --stat origin/main...HEAD
```
Fetch trae referencias sin mezclar archivos; merge sí puede modificarlos y generar conflictos. Conservar el original como respaldo. Un futuro PR tendrá base main y compare migracion/biblioteca-2026-10-21 o la continuación elegida; revisar diferencias, checks, conflictos y despliegues antes. No crear PR sin autorización separada; autorizado sin más detalle será borrador. No push directo a main, force-push, auto-merge ni merge automático.
