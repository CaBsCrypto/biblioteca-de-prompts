# Scrum Swarm

Este documento define como vamos a trabajar la Biblioteca de Prompts como producto: primero biblioteca personal y vitrina publica, luego comunidad, y finalmente red social/recomendador de prompts.

## Vision del producto

Crear una biblioteca de prompts curada por el fundador que permita guardar, organizar, mejorar y compartir prompts. La evolucion natural es una comunidad donde otros usuarios puedan crear cuentas, clonar prompts, publicar los suyos, seguir creadores y recibir recomendaciones.

## Roles del enjambre

### Scrum Master

- Mantiene el backlog priorizado.
- Define objetivos de sprint y criterios de aceptacion.
- Divide tareas entre agentes sin solapar archivos.
- Integra hallazgos y decide el siguiente incremento verificable.
- Protege el foco: primero utilidad personal y publica, luego red social.

### Agente Producto/Diseno

- Disena flujos de usuario y arquitectura de informacion.
- Define experiencia para biblioteca privada, vitrina publica y comunidad.
- Revisa claridad de CTA, estados vacios, filtros, colecciones y perfil publico.
- Entrega wireframes textuales, criterios de UI y riesgos de experiencia.

### Agente Programacion Frontend

- Implementa componentes, rutas, vistas y estados de UI.
- Extrae `src/App.tsx` en piezas mantenibles.
- Mejora accesibilidad, responsive y performance visual.
- Trabaja con ownership claro por componente o carpeta.

### Agente Programacion Backend/IA

- Implementa endpoints Express.
- Valida respuestas de Gemini antes de guardarlas.
- Crea APIs para recomendaciones, scoring y mejoras de prompts.
- Registra metadatos de generacion y costo aproximado.

### Agente Base de Datos/Firebase

- Disena colecciones Firestore, indices y reglas.
- Audita permisos para prompts privados, publicos, likes, comentarios y perfiles.
- Define migraciones incrementales sin romper datos existentes.
- Documenta queries esperadas para evitar reglas imposibles de cumplir.

### Agente QA/Seguridad

- Busca bugs, riesgos de permisos, abuso de API y problemas de datos.
- Propone pruebas unitarias, integracion y flujos manuales.
- Revisa performance, bundle, limites de Firestore y abuso social.
- Bloquea features que filtren datos privados o expongan API keys.

## Linea de producto

### Fase 1 - Modo Fundador

Objetivo: que el fundador use la app como biblioteca privada y pueda publicar colecciones gratuitas.

Criterios:

- El fundador puede crear, editar, organizar y compartir prompts.
- Un visitante puede abrir una coleccion publica sin iniciar sesion.
- Las paginas publicas explican el valor y ofrecen copiar/usar prompts.
- El login se presenta como accion secundaria para crear biblioteca propia.

### Fase 2 - Recomendador

Objetivo: que la biblioteca ayude a decidir que prompt usar y como mejorarlo.

Criterios:

- El usuario puede pedir recomendaciones segun objetivo, categoria y contexto.
- La respuesta devuelve prompts existentes relevantes antes de generar uno nuevo.
- El recomendador explica por que sugiere cada prompt.
- La app registra metadatos basicos de recomendacion sin guardar datos sensibles innecesarios.

### Fase 3 - Comunidad Controlada

Objetivo: habilitar participacion de otros usuarios sin perder curadoria.

Criterios:

- Usuarios pueden publicar prompts propios.
- La comunidad permite likes, comentarios, clonar y seguir autores.
- Hay reportes/moderacion basica antes de escalar visibilidad publica.
- Los prompts privados nunca aparecen en resultados publicos.

### Fase 4 - Red de Prompts

Objetivo: convertir la comunidad en red social especializada.

Criterios:

- Perfiles publicos de creadores.
- Rankings y colecciones destacadas.
- Feed personalizado por intereses.
- Recomendaciones basadas en comportamiento permitido y contenido publico.

## Arquitectura del recomendador

### Nivel 1 - Recomendacion local sin costo

Usar datos ya cargados en cliente:

- categoria
- tags
- titulo
- descripcion
- favoritos
- fecha
- likes publicos

Entrega rapida: ranking simple y explicacion basada en coincidencias.

### Nivel 2 - Recomendacion Gemini bajo demanda

Endpoint propuesto:

`POST /api/ai/recomendar`

Entrada:

- objetivo del usuario
- contexto opcional
- categorias/tags preferidas
- lista reducida de prompts candidatos

Salida:

- ids recomendados
- razon de recomendacion
- ajustes sugeridos
- prompt nuevo solo si no hay buen candidato

### Nivel 3 - Perfil semantico persistente

Guardar campos derivados:

- `useCases`
- `difficulty`
- `targetAudience`
- `contentFormat`
- `aiSummary`
- `qualityScore`

Estos datos permiten mejores filtros y recomendaciones sin enviar todo el prompt a Gemini en cada uso.

## Backlog inicial

### Sprint 0 - Blindaje antes de crecer

- Proteger endpoints `/api/ai/*` con token Firebase, limite de payload y rate limit.
- Cortar XSS en exportacion/impresion de prompts generados por usuarios.
- Blindar reglas Firestore para impedir que un usuario inserte prompts en carpetas publicas ajenas.
- Evitar likes manipulables; migrar a operacion atomica o subcoleccion por usuario.
- Definir consentimiento para usar biblioteca privada como contexto de recomendaciones.

Aceptacion:

- Un visitante sin sesion no puede consumir Gemini.
- Un usuario autenticado tiene cuota temporal clara.
- Contenido de prompts no ejecuta HTML al imprimir/exportar.
- Un prompt privado no aparece publicamente solo por estar dentro de una carpeta compartida sin confirmacion explicita.
- Las metricas sociales no son fuente directa de fraude para rankings.

### Sprint 1 - Base de producto fundador

- Crear constantes compartidas de categorias.
- Extraer servicios Firestore.
- Crear pagina/vista publica para colecciones destacadas.
- Mejorar README y docs operativas.
- Agregar estados vacios para biblioteca, comunidad y filtros.

### Sprint 2 - Recomendador v1

- Crear utilidad de ranking local de prompts.
- Crear modal/panel "Recomendarme un prompt".
- Mostrar explicacion de coincidencias.
- Agregar endpoint `/api/ai/recomendar` como mejora opcional.
- Registrar metadatos de recomendaciones.

### Sprint 3 - Comunidad segura

- Crear perfiles publicos.
- Agregar reportes de prompts/comentarios.
- Agregar reglas Firestore para moderacion.
- Preparar indices y queries para feed publico.
- Agregar limites anti-abuso en UI y backend.

## Reglas de trabajo para agentes

- Cada agente debe tener ownership claro de archivos.
- Ningun agente revierte cambios de otro.
- Cada entrega debe incluir archivos tocados, pruebas ejecutadas y riesgos.
- No se agrega feature sin criterio de aceptacion verificable.
- La integracion final pasa por Scrum Master.

## Definicion de terminado

- `npm run lint` pasa.
- `npm run build` pasa.
- Las reglas de privacidad se mantienen: privado es privado.
- La UI principal funciona en desktop y mobile.
- El cambio esta documentado cuando afecta arquitectura, datos o flujo principal.
