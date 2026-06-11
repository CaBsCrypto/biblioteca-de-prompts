import { Prompt } from "./types";

export const DEFAULT_PROMPTS: Omit<Prompt, "id" | "userId" | "createdAt" | "updatedAt">[] = [
  // ==================== YOUTUBE (6 Prompts) ====================
  {
    title: "Master Script YouTube: Retención Máxima",
    description: "Crea guiones cinematográficos y dinámicos para YouTube con un gancho neurocognitivo en los primeros 30 segundos, pautas de B-Roll, música y edición.",
    category: "YouTube",
    promptText: `Actúa como un Guionista de Elite de YouTube especializado en nichos de divulgación tecnológica, Inteligencia Artificial y negocios digitales. Tu objetivo es redactar un guión sumamente magnético para un video sobre: "{{tema_video}}".

La duración estimada para el video es de {{duracion_minutos}} minutos.

Por favor, estructura el guión completo siguiendo estas fases y especifica pautas de contenido con indicaciones precisas entre corchetes, por ejemplo: [Efecto de sonido: Zoom dramático], [B-Roll: Grid de datos flotando]:

1. **EL GANCHO NEUROCOGNITIVO (0:00 - 0:30 segundos):**
   - Inicia directo con una revelación impactante, estadística abrumadora o pregunta contraintuitiva relacionada con "{{tema_video}}".
   - Establece la promesa del video (qué aprenderán exactamente) y define por qué lo necesitan saber HOY para no quedar obsoletos.
   - Prohíbete saludos genéricos como "Hola a todos, bienvenidos de nuevo a mi canal".

2. **EL PROBLEMA / LA DECEPCIÓN DE FONDO (0:30 - 2:00 minutos):**
   - Aborda la frustración silenciosa que vive tu espectador y por qué los métodos convencionales ya no funcionan en el nuevo paradigma de la IA.

3. **EL CONTENIDO PRINCIPAL EN PASOS EXPLICATIVOS ESTILO {{estilo_guion}}:**
   - Desglosa la temática de manera fluida y didáctica en {{numero_pasos}} partes bien diferenciadas.
   - Para cada paso, incluye:
     * Un título atractivo que comience con un verbo de acción.
     * Analogías cotidianas para explicar conceptos técnicos pesados.
     * Indicaciones claras de B-Roll (imágenes de apoyo, animaciones o fragmentos de código en pantalla).
     * Frases de cambio de ritmo para evitar que el espectador se aburra.

4. **EL CLÍMAX Y LA RESOLUCIÓN TÉCNICA:**
   - La parte de mayor valor del video donde se demuestra el resultado final del truco o tutorial prácticos.

5. **LLAMADA A LA ACCIÓN (CTA) SIN PERDER AUDIO:**
   - No digas "si te gustó dale like". Integra el CTA de forma sutil recomendando un recurso extra o invitándolos a comentar sobre "{{tema_video}}" para crear conversación.
   - Termina sugiriendo ver el siguiente video conectándolo lógicamente con este.`,
    tags: ["Guión Completo", "YouTube", "Retención", "Divulgación"],
    isFavorite: true,
    suggestedVariables: [
      { name: "tema_video", description: "El tema o tutorial a enseñar en el video", defaultValue: "Cómo automatizar tu vida diaria usando Agentes de Inteligencia Artificial locales" },
      { name: "duracion_minutos", description: "Duración en minutos aproximada", defaultValue: "10" },
      { name: "numero_pasos", description: "Cantidad de pasos o secretos a revelar", defaultValue: "4" },
      { name: "estilo_guion", description: "Estilo estético del guion (ej. Inspirador, Minimalista, Altamente Técnico)", defaultValue: "Dinámico y Educativo" }
    ]
  },
  {
    title: "CTR Master: Títulos Psicológicos y Miniaturas",
    description: "Aumenta drásticamente las vistas estructurando listas de títulos enfocados en sesgos cognitivos y describiendo conceptos visuales de miniaturas con alta tasa de clics.",
    category: "YouTube",
    promptText: `Actúa como un Especialista en Optimización de CTR (Click-Through Rate) para canales de tecnología y YouTube de alto crecimiento. 
Analiza la siguiente propuesta:
Idea del Video: "{{idea_tema}}"
Audiencia Objetivo: "{{publico_objetivo}}"

Proporciona una estrategia publicitaria completa estructurada en 2 grandes partes:

PARTE 1: 15 PROPUESTAS DE TÍTULOS (OPTIMIZADOS PARA SU ALGORITMO Y CTR)
Escribe los títulos empleando disparadores psicológicos y clasifícalos por sesgo:
1. **Los Generadores de Curiosidad Intensa (Lagunas de Información):** Títulos que fuerzan al usuario a dar clic para descubrir el desenlace.
2. **Los del sesgo de Inmediatez o Atajos:** Títulos enfocados en rapidez, facilidad o resultados sin esfuerzo excesivo.
3. **El sesgo de Aversión a la Pérdida:** Títulos que advierten sobre errores, advertencias importantes o por qué la gente está fracasando en este tema.
4. **Los Basados en Autoridad o Desafíos:** Títulos desafiantes con contrastes fuertes de números (ej: de 0 a 10,000).

PARTE 2: PROPUESTA CONCEPTUAL DE MINIATURA (EL THUMBNAIL)
Crea 2 conceptos visuales detallados para que los cree un diseñador:
- **Concepto A (Enfoque Minimalista):** Describe el fondo exacto, la expresión facial, el elemento central destacado y el texto en pantalla de un máximo de 3 palabras.
- **Concepto B (Enfoque de Alto Contraste y Curiosidad):** Usa luces de neón o analogías físicas, paleta de colores sugerida y composición áurea.`,
    tags: ["CTR", "Títulos", "Miniaturas", "Análisis"],
    isFavorite: true,
    suggestedVariables: [
      { name: "idea_tema", description: "El tema central de tu video de YouTube", defaultValue: "Creé un Agente de IA autónomo que gestiona mi portafolio comercial sin mi ayuda" },
      { name: "publico_objetivo", description: "La audiencia principal de tu canal", defaultValue: "Desarrolladores, emprendedores digitales y creadores de contenido" }
    ]
  },
  {
    title: "SEO Master de YouTube: Metadatos, Capítulos y SEO",
    description: "Genera descripciones ricas en palabras clave, estructura marcas de tiempo funcionales (Capítulos), hashtags y optimiza etiquetas de búsqueda.",
    category: "YouTube",
    promptText: `Actúa como un Especialista en SEO de YouTube especializado en posicionar videos técnicos en los primeros puestos.

Utiliza la siguiente información para armar los metadatos de mi video:
Título del Video: "{{titulo_video}}"
Resumen del Contenido: "{{resumen_contenido}}"

Genera un paquete SEO optimizado para copiar y pegar en YouTube Studio:

1. **DESCRIPCIÓN OPTIMIZADA PARA EL ALGORITMO:**
   - Escribe un resumen rico en palabras clave secundarias e integrando semántica de búsqueda natural.
   - Dedica las primeras 3 líneas a captar el interés de búsqueda directa (aparece en los resultados de Google y YouTube).

2. **CRONOGRAMA DE CAPÍTULOS DE EJEMPLO (Timestamps):**
   - Planifica una propuesta lógica de marcas de tiempo para un video de unos 10 minutos usando nombres cortos y descriptivos para la búsqueda.

3. **TAGS Y HASHTAGS EXTRAORDINARIOS:**
   - Crea un listado con los 3 principales hashtags (#) del nicho.
   - Brinda un listado estructurado de 15 etiquetas (tags) clave separadas por comas.`,
    tags: ["SEO", "Metadatos", "Descripciones", "YouTube Studio"],
    isFavorite: false,
    suggestedVariables: [
      { name: "titulo_video", description: "Título final u optimizado de tu video", defaultValue: "Cómo crear una App Full Stack con React, Node e Inteligencia Artificial" },
      { name: "resumen_contenido", description: "Explicación breve de lo que enseñas en tu video", defaultValue: "Tutorial práctico desde cero enseñando a conectar Drizzle con Express con login de Firebase" }
    ]
  },
  {
    title: "Script Generator: Reels / TikToks / Shorts Virales",
    description: "Cubre los primeros 3 segundos con ganchos psicológicos, retención voraz a la mitad, subtítulos clave y edición ágil.",
    category: "YouTube",
    promptText: `Actúa como un Especialista en Algoritmos de Video Corto para redes móviles como YouTube Shorts o TikTok.

Escribe un guión completo, ágil y de alto impacto para un video de menos de 60 segundos sobre:
Tema del corto: "{{tema_corto}}"

Aplica la siguiente estructura secuencial de {{duracion_segundos}} segundos:

1. **EL GANCHO VISUAL Y VERBAL (Segundos 0-3):**
   - Escribe 3 variantes distintas de ganchos verbales que despierten curiosidad o miedo a perderse algo (FOMO).
   - Detalla qué imagen descriptiva debe aparecer en pantalla en el segundo 0.2 para evitar que el espectador deslice hacia arriba.

2. **EL CUERPO DEL VIDEO (Segundos 3-45):**
   - Explica el tema de forma ultrarrápida.
   - Divide la información en ideas simples de 1 sola frase con cortes constantes cada 2 segundos.
   - Agrega especificaciones textuales para subtítulos (marcando palabras de poder en negrita).

3. **EL BUCLE PERFECTO (HOOK LOOP) (Segundos 45-60):**
   - Redacta el cierre para que enlace con la frase inicial del video de forma fluida (bucle perfecto).`,
    tags: ["TikTok", "Shorts", "Reels", "Video Corto"],
    isFavorite: false,
    suggestedVariables: [
      { name: "tema_corto", description: "El truco o noticia exprés del que hablaras", defaultValue: "La Inteligencia Artificial que te permite clonar tu voz con 5 segundos de audio" },
      { name: "duracion_segundos", description: "Segundos ideales de duración", defaultValue: "50" }
    ]
  },
  {
    title: "Gancho de 3 Segundos: Retención Extrema",
    description: "Genera ganchos ultracompetitivos de 1 a 3 segundos ideales para retención salvaje en apps móviles.",
    category: "YouTube",
    promptText: `Eres un analista de retención en TikTok y YouTube Shorts. Tu tarea es escribir 10 tipos de introducciones o 'hooks' de menos de 3 segundos para un video titulado: "{{titulo_video}}".

Genera los ganchos divididos en las siguientes clasificaciones:
1. **Enfoque basado en el Secreto Prohibido:** "El algoritmo no quiere que sepas..."
2. **Enfoque basado en el Cuestionamiento Crítico:** "¿Estás cometiendo este error al...?"
3. **Enfoque basado en el Contraste Numérico:** "Cómo pasé de 0 a $10k con esto..."
4. **Enfoque Visual Disruptivo:** Describe qué debe hacer el presentador físicamente frente a la cámara (ej. tirar algo, romper un papel, susurrar de cerca).`,
    tags: ["Shorts", "Ganchos", "Retención", "Copywriting"],
    isFavorite: false,
    suggestedVariables: [
      { name: "titulo_video", description: "Título o temática general", defaultValue: "Invertir en Inteligencia Artificial en 2026" }
    ]
  },
  {
    title: "Estructura de Reseña de Gadgets / Software",
    description: "Diseña guiones de análisis técnico y honestidad comercial para productos de tecnología.",
    category: "YouTube",
    promptText: `Eres un revisor de hardware y software de renombre. Prepara un guión estructurado de análisis para el producto: "{{nombre_producto}}".

Sigue esta estructura:
- **Estética Visual:** Iluminación cinemática sugerida, primeros planos de detalles físicos o interfaz de usuario.
- **La Verdadera Experiencia (No Patrocinada):** 3 aspectos decepcionantes o limitaciones honestas para ganar la confianza de la audiencia.
- **Comparativa de Rendimiento con {{competidor_principal}}:** Puntos de referencia y velocidad de respuesta.
- **Veredicto:** ¿Quién debería comprarlo realmente y quién debería evitarlo?`,
    tags: ["Análisis", "Hardware", "Software", "Reseña"],
    isFavorite: false,
    suggestedVariables: [
      { name: "nombre_producto", description: "El dispositivo o app que analizarás", defaultValue: "Rabbit R1 Pro" },
      { name: "competidor_principal", description: "El rival directo de mercado", defaultValue: "Humane AI Pin o Apple Vision Pro" }
    ]
  },

  // ==================== MARKETING (6 Prompts) ====================
  {
    title: "Fórmula de Hilos de Twitter / X Virales sobre Tecnologías",
    description: "Crea hilos educativos, altamente legibles, interactivos y con excelente copywriting listos para copiar y pegar en X (Twitter).",
    category: "Marketing",
    promptText: `Eres un copywriter experto en marca personal y creador influyente en Twitter/X especializado en resumir temas complejos como criptomonedas, inteligencia artificial y productividad.

Escribe un hilo completo de exactamente {{numero_tweets}} tweets explicando al detalle el siguiente concepto:
Concepto: "{{concepto_tecnologico}}"

El hilo debe cumplir con la siguiente fórmula psicológica de la plataforma:

- **TWEET 1 (El Hook Magnético):** Despierta curiosidad extrema o describe un dolor real con datos estadísticos duros. Debe tener una línea final con salto de doble espacio que invite a leer el resto. Menos de 240 caracteres.
- **TWEET 2 (El Porqué Importa):** Explica la revolución que hay detrás de "{{concepto_tecnologico}}" y por qué la gente común no le está prestando atención.
- **TWEETS MEDIOS (Instrucciones Prácticas):** Ofrece analogías claras de 3 a 4 puntos con emojis selectos (no satures de íconos). Divide la lección de manera visual usando sangrías y espaciado generoso. ¡Hazlo ver fácil!
- **TWEET PENÚLTIMO (El Ejemplo de Oro):** Presenta un caso de uso real de la industria o un ejemplo práctico simplificado para consolidar el aprendizaje.
- **TWEET FINAL (CTA conversacional):** Convoca a la interacción. Pregunta algo directo para detonar respuestas. Enlaza a un llamado a la acción directo como suscribirse o ver el canal de YouTube.

Utiliza el formato estructurado:
[TWEET 1]
(Contenido del tweet...)
---
[TWEET 2]
(Contenido del tweet...)
...etc.`,
    tags: ["Copywriting", "Twitter", "X", "Marca Personal", "Hilos"],
    isFavorite: false,
    suggestedVariables: [
      { name: "concepto_tecnologico", description: "El concepto que vas a desentramar", defaultValue: "Los Agentes de Re-ranking y por qué hacen a tus prompts 10 veces mejores" },
      { name: "numero_tweets", description: "Número total sugerido de publicaciones", defaultValue: "6" }
    ]
  },
  {
    title: "Modelador de Buyer Persona y Estrategia UX",
    description: "Genera fichas detalladas de clientes ideales, miedos, motivaciones, comportamientos y un roadmap inicial de contenido adaptado.",
    category: "Marketing",
    promptText: `Actúa como un Psicólogo del Consumidor, Estratega de Marketing y UX Researcher de nivel mundial.
Quiero que impulses mi nuevo producto o canal creando un modelo de cliente ideal completo (Buyer Persona) basado en lo siguiente:

Idea de Canal/Negocio: "{{idea_canal_o_negocio}}"
Categoría del Nicho: "{{categoria_nicho}}"

Crea un perfil de usuario ficticio detallado estructurado en los siguientes módulos profesionales:

1. **DATOS DEMOGRÁFICOS Y PSICOLÓGICOS:**
   - Nombre de avatar, edad, profesión, ingresos estimados y un lema de vida corto que lo represente.
2. **DOLORES Y FRUSTRACIONES ABSOLUTAS:**
   - ¿Qué le quita el sueño por la noche en relación con "{{categoria_nicho}}"?
   - ¿Cuáles son sus miedos a mediano plazo?
3. **METAS, SUEÑOS Y MOTIVACIONES:**
   - ¿Qué desea lograr realmente (anhelo profundo)? ¿Cómo sueña verse de aquí a un año?
4. **OBJECIONES DE COMPRA O CLIC:**
   - ¿Por qué no compraría mi producto o por qué ignoraría mis videos en YouTube?
5. **ROADMAP INICIAL DE CONTENIDO (5 Ideas):**
   - Diseña un grupo de 5 títulos de videos o temáticas de valor con los que captarías el interés de esta persona y aliviarías su frustración de inmediato.`,
    tags: ["Persona", "Marketing", "Estrategia", "UX Research"],
    isFavorite: false,
    suggestedVariables: [
      { name: "idea_canal_o_negocio", description: "Tu producto o concepto de contenido", defaultValue: "Consultoría automatizada con IA para agilizar los flujos legales de despachos de abogados" },
      { name: "categoria_nicho", description: "El nicho de mercado", defaultValue: "Automatización e LegalTech" }
    ]
  },
  {
    title: "Planificador de Calendario Editorial de Temas IA (30 Días)",
    description: "Diseña un calendario de contenidos detallado mes a mes centrado en tu temática, estructurando ideas de video, reels y dinámicas de interacción.",
    category: "Marketing",
    promptText: `Actúa como un Director de Contenido Creativo y Estratega de Canales Tecnológicos. Tu objetivo es diseñar un plan editorial robusto, variado y de altísimo nivel para un canal o red social de nicho para los próximos 30 días.

Mi nicho o enfoque de contenido: "{{enfoque_canal}}"
Frecuencia de publicación principal: "{{frecuencia}}"

Desarrolla el plan conceptual optimizado con las siguientes directrices:

1. **LA ESTRATEGIA PILAR DE CONTENIDO (Foco y Línea):**
   - Establece cuáles serán los 3 pilares estratégicos de este mes (ej: tutoriales rápidos con IA, análisis crítico de la industria, o automatizaciones aplicadas).

2. **CALENDARIO EDITORIAL DIARIO PASO A PASO (Formato Tabla / Lista):**
   - Genera una planificación detallada que cubra el ciclo de publicaciones según tu "{{frecuencia}}".
   - Para cada publicación recomendada, describe:
     * El título temporal del contenido.
     * El formato ideal (ej: Video Largo, Corto/Reel, o Hilo).
     * El objetivo del contenido (adquisición de comunidad, educación pura o incentivar ventas).
     * Una recomendación ágil de ejecución del gancho inicial.

3. **PROPUESTA PARA LA COMUNIDAD (Interactive Feed):**
   - Aporta 3 ideas de encuestas o publicaciones en pestañas de comunidad de YouTube / X para mantener vivas las interacciones entre los días sin video largo.`,
    tags: ["Calendario de Contenidos", "Estrategia", "YouTube", "Planificación"],
    isFavorite: true,
    suggestedVariables: [
      { name: "enfoque_canal", description: "La temática de tu canal o marca de creador de contenido", defaultValue: "Divulgación de Inteligencia Artificial para automatizar tareas en PYMES" },
      { name: "frecuencia", description: "Frecuencia de publicación aproximada (ej. 2 Videos Largos y 4 Cortos por semana)", defaultValue: "2 videos largos semanales y 3 Shorts" }
    ]
  },
  {
    title: "LinkedIn Creator: Posts Profesionales de Autoridad",
    description: "Escribe publicaciones para LinkedIn que demuestren liderazgo de pensamiento, sin jerga corporativa falsa y con alta interacción.",
    category: "Marketing",
    promptText: `Eres un consultor líder de marca personal para ejecutivos de tecnología en LinkedIn. Escribe una publicación altamente atractiva sobre: "{{tema_post}}".

Por favor aplica las siguientes directrices de escritura para LinkedIn:
- **Línea de Apertura (El Gancho):** Una contradicción contundente o una verdad incómoda de la industria. Rompe el patrón clásico del feed.
- **El Punto de Quiebre (Storytelling):** Comparte un momento de aprendizaje real donde las cosas salieron mal o un proyecto falló, humanizando el caso.
- **La Lección Práctica:** 3 conclusiones claras y libres de palabras redundantes (como "sinérgico", "holístico", "disrupción").
- **Llamado constructivo a la acción:** Invita a debatir de forma madura en comentarios. No uses encuestas genéricas.`,
    tags: ["LinkedIn", "Marca Personal", "Autoridad", "B2B"],
    isFavorite: false,
    suggestedVariables: [
      { name: "tema_post", description: "Eje o anécdota de tu post", defaultValue: "Por qué despedí al 90% de las herramientas SaaS de marketing tradicionales para usar un solo script de IA" }
    ]
  },
  {
    title: "Embudo de Correo Persuasivo (Email Marketing)",
    description: "Escribe una serie de 3 correos electrónicos diseñados para generar confianza y vender productos de alto valor.",
    category: "Marketing",
    promptText: `Eres un copywriter experto en email marketing que utiliza la metodología de Russell Brunson y Ben Settle. Crea una secuencia de 3 correos de seguimiento automático para vender: "{{producto_o_servicio}}".

Estructura de la Secuencia:
1. **Email 1 (El Hook y la Epifanía):** Introduce la gran revelación sin intentar vender directamente. Despierta intriga extrema sobre cómo superamos {{mayor_frustracion}}.
2. **Email 2 (Aporte de Valor masivo):** Ofrece un truco rápido que puedan implementar en 5 minutos para ver resultados inmediatos. Conecta este truco con los beneficios de usar tu "{{producto_o_servicio}}".
3. **Email 3 (Escasez y Urgencia):** Derriba las 3 objeciones principales del cliente de forma honesta y presenta una oferta única e irresistible con límite de tiempo.`,
    tags: ["Email", "Embudo", "Persuasión", "Ventas"],
    isFavorite: false,
    suggestedVariables: [
      { name: "producto_o_servicio", description: "Lo que ofreces al cliente en la serie", defaultValue: "Masterclass de Automatización con Agentes Inteligentes locales" },
      { name: "mayor_frustracion", description: "Dolor número uno del cliente", defaultValue: "Gastar demasiado tiempo respondiendo correos mecánicos y de soporte al cliente" }
    ]
  },
  {
    title: "Generador de Pitch de Venta en un Elevador",
    description: "Consigue la atención de inversionistas o clientes potenciales con un discurso ultra-convincente de 30 segundos.",
    category: "Marketing",
    promptText: `Quiero que actúes como un mentor estrella de startups de Silicon Valley. Tu tarea es elaborar tres variaciones de un discurso de ascensor (Elevator Pitch) para mi negocio sobre: "{{idea_negocio}}".

Por favor genera las siguientes variaciones en un tono magnético:
- **Variación 1 (El Golpe de Realidad):** "Sabías que el {{dato_estadistico}}% de las empresas pierde dinero en... Nosotros resolvemos eso haciendo..."
- **Variación 2 (La Visión del Futuro):** Enfocada en cómo será el mundo una vez que nuestro negocio lidere el mercado de "{{idea_negocio}}".
- **Variación 3 (La Analogía de Oro):** "Somos el [Uber / Airbnb] de nuestro sector porque facilitamos..."`,
    tags: ["Pitch", "Startups", "Inversionistas", "Storytelling"],
    isFavorite: false,
    suggestedVariables: [
      { name: "idea_negocio", description: "Tu startup o idea SaaS", defaultValue: "Software de diagnóstico automotriz automatizado por visión artificial para smartphones" },
      { name: "dato_estadistico", description: "Estadística alarmante de la industria", defaultValue: "72" }
    ]
  },

  // ==================== PROGRAMACIÓN (6 Prompts) ====================
  {
    title: "Ingeniero Clean Code: Refactorización y Buenas Prácticas",
    description: "Analiza fragmentos de código desordenados, implementa principios SOLID, refina nombres, elimina nidos de condicionales y optimiza el rendimiento.",
    category: "Programación",
    promptText: `Actúa como un Desarrollador Principal de Software y consultor experto en Arquitectura de Código Limpio (Clean Code). Tu objetivo es analizar de forma minuciosa, corregir y refactorizar el código heredado o ineficiente provisto a continuación.

El código de entrada está escrito en: **{{lenguaje}}**

CÓDIGO A ANALIZAR:
"""
{{codigo_fuente}}
"""

Por favor, estructura tu respuesta en los siguientes apartados profesionales:

1. **DIAGNÓSTICO TÉCNICO Y ANTIPATRONES:**
   - Haz un listado de las deficiencias, vulnerabilidades o malas prácticas encontradas (ej. código espagueti, anidación profunda o "Arrow Anti-pattern", variables mal nombradas, falta de modularidad, etc.).

2. **CÓDIGO OPTIMIZADO Y REFACTORIZADO:**
   - Escribe la versión final optimizada, limpia y segura.
   - Aplica principios SOLID, patrones de diseño modulares, y tipado robusto.
   - Incluye comentarios mínimos pero valiosos sobre bloques complejos.

3. **MÉTRICAS DE MEJORA Y RESUMEN DE CAMBIOS:**
   - Explica de forma concisa qué modificaciones realizaste y cómo benefician la mantenibilidad, escalabilidad o el rendimiento de este fragmento de software a largo plazo.`,
    tags: ["Refactorización", "SOLID", "Clean Code", "TypeScript", "Python"],
    isFavorite: false,
    suggestedVariables: [
      { name: "lenguaje", description: "Lenguaje o Framework principal", defaultValue: "TypeScript" },
      { name: "codigo_fuente", description: "Código sucio o complejo de entender", defaultValue: "function calculate(arr) { let tot = 0; for(let i=0; i<arr.length; i++) { if(arr[i].active == true) { if(arr[i].price > 100) { tot += arr[i].price * 0.9; } else { tot += arr[i].price; } } } return tot; }" }
    ]
  },
  {
    title: "Documentador de Código: JSDoc, Markdown y Explicaciones",
    description: "Toma cualquier función o componente complejo y genera su documentación formal en JSDoc y un README detallado.",
    category: "Programación",
    promptText: `Actúa como un Escritor Técnico y Desarrollador Senior de Software. Tu tarea es generar explicaciones detalladas y comentarios estandarizados para el siguiente componente o función:

Código:
"""
{{codigo_software}}
"""

Proporciona:
1. **JSDoc o Documentación Equivalente:** Agrega los tipos de parámetros, valores de retorno, excepciones lanzadas y un resumen breve bien estructurado encima de cada función.
2. **Explicación en Lenguaje Natural:** Explica paso a paso de forma sumamente sencilla (apta para juniors) qué hace la lógica, qué algoritmos o estructuras de datos internos utiliza y sus límites de rendimiento.
3. **Guía de Uso Rápido:** Proporciona un ejemplo de código real de cómo importar y ejecutar esta lógica en un entorno real.`,
    tags: ["Documentación", "JSDoc", "ReadMe", "Explicación"],
    isFavorite: false,
    suggestedVariables: [
      { name: "codigo_software", description: "Copia la lógica o clase que quieras documentar", defaultValue: "const fetchUser = async (id) => { const res = await fetch(`/api/user/${id}`); if(!res.ok) throw new Error('Failed'); return res.json(); }" }
    ]
  },
  {
    title: "Optimizador de Consultas SQL y Schemas",
    description: "Analiza consultas SQL lentas, propone índices heurísticos, simplifica subconsultas y optimiza el plan de ejecución.",
    category: "Programación",
    promptText: `Eres un Administrador de Bases de Datos (DBA) y experto en optimización de bases de datos PostgreSQL o MySQL.

Analiza la siguiente consulta que reporta problemas de lentitud extrema en producción:
 Consulta SQL:
"""
{{consulta_sql}}
"""

Proporciona una solución avanzada con los siguientes elementos:
1. **Análisis de Complejidad y Cuellos de Botella:** Identifica por qué la consulta es lenta (escaneos completos de tablas, uniones de bucles anidados costosos, falta de índices correctos, filtros ineficientes).
2. **Consultar SQL Corregida:** Proporciona la versión reescrita optimizando WHERE clausules, JOINS o subconsultas ineficientes.
3. **Estrategia de Indexación:** Define el comando SQL exacto para crear índices ideales (Índices compuestos, cubriendo, etc.) que aceleren la recuperación de datos drásticamente.`,
    tags: ["SQL", "Base de datos", "Performance", "DBA"],
    isFavorite: false,
    suggestedVariables: [
      { name: "consulta_sql", description: "La consulta SQL ineficiente", defaultValue: "SELECT * FROM orders WHERE user_id IN (SELECT id FROM users WHERE status = 'active') AND order_date > '2025-01-01' ORDER BY total DESC LIMIT 10;" }
    ]
  },
  {
    title: "Generador de Pruebas Unitarias de Alta Cobertura",
    description: "Escribe suites de pruebas robustas usando Jest, Vitest, Cypress o PyTest para tus funciones de negocio.",
    category: "Programación",
    promptText: `Actúa como un Ingeniero de Pruebas (Conversant QA Engineer) y especialista en pruebas automatizadas.
Escribe un conjunto exhaustivo de pruebas unitarias para la siguiente función en **{{framework_pruebas}}**:

Código de Origen:
"""
{{codigo_funcional}}
"""

Asegúrate de cubrir los siguientes casos de prueba:
- **Flujo Ideal (Happy Path):** Las entradas correctas devuelven las respuestas esperadas.
- **Límites de Entrada (Edge Cases):** Valores nulos, indefinidos, vacíos, números negativos o cadenas con caracteres especiales.
- **Control de Excepciones y Errores:** Verifica que la función arroje o maneje las excepciones adecuadamente si falla algo en el proceso.
- Proporciona instrucciones de cómo ejecutar las pruebas y simular (mockear) llamadas a APIs externas de ser necesario.`,
    tags: ["Pruebas Unitarias", "Vitest", "Jest", "Q&A", "TDD"],
    isFavorite: false,
    suggestedVariables: [
      { name: "framework_pruebas", description: "Framework de testing (ej: Jest / React Testing Library, Vitest, PyTest)", defaultValue: "Vitest" },
      { name: "codigo_funcional", description: "Código de la función que deseas probar", defaultValue: "export function parseAge(input) { const age = parseInt(input); if (isNaN(age) || age < 0) { throw new Error('Invalid age'); } return age; }" }
    ]
  },
  {
    title: "Conversor de Lenguaje de Código Automatizado",
    description: "Traduce código de un lenguaje a otro conservando arquitectura, tipado estático y buenas prácticas idiomáticas.",
    category: "Programación",
    promptText: `Eres un ingeniero experto en políglota de programación de sistemas. Tu tarea es traducir fielmente el siguiente programa del lenguaje de origen al lenguaje de destino manteniendo la legibilidad, la estructura, la memoria eficaz y su lógica matemática exacta.

Lenguaje de Origen: {{lenguaje_origen}}
Lenguaje de Destino: {{lenguaje_destino}}

Código de Origen:
"""
{{codigo_a_traducir}}
"""

Por favor escribe el código convertido adaptando las librerías nativas equivalentes de {{lenguaje_destino}} y explica sucintamente cualquier diferencia técnica crucial sobre la gestión de memoria o concurrencia entre ambos lenguajes.`,
    tags: ["Traductor", "Python", "Rust", "C++", "TypeScript", "Go"],
    isFavorite: false,
    suggestedVariables: [
      { name: "lenguaje_origen", description: "Lenguaje actual del código", defaultValue: "Python" },
      { name: "lenguaje_destino", description: "Lenguaje final al cual deseas migrar", defaultValue: "Go" },
      { name: "codigo_a_traducir", description: "El fragmento de código a estructurar", defaultValue: "def is_prime(n):\n    if n <= 1: return False\n    for i in range(2, int(n**0.5) + 1):\n        if n % i == 0: return False\n    return True" }
    ]
  },
  {
    title: "Asistente de Expresiones Regulares (Regex) Complejas",
    description: "Diseña patrones regex legibles, seguros contra ataques 'ReDoS', bien comentados y listos para validar de manera precisa.",
    category: "Programación",
    promptText: `Actúa como un especialista en procesamiento de lenguaje natural y motores Regex (Expresiones Regulares).
Necesito una expresión regular altamente precisa que sirva para capturar y validar: "{{patron_a_capturar}}".

Por favor proporciona tu respuesta estructurada de la siguiente manera:
1. **Patrón Regex Final:** Especifica el código de la expresión regular listo para copiar en un bloque independiente.
2. **Explicación Detallada de Tokens:** Desglosa cada símbolo y grupo de captura explicando qué valida exactamente.
3. **Casos de Éxito y de Error:** Brinda exactamente 5 cadenas strings que deberían pasar la validación y 5 que deberían ser rechazadas.
4. **Resistencia ReDoS:** Explica si este patrón es rápido o si corre el riesgo de caer en bucles catastróficos si se le inyecta una cadena maliciosa.`,
    tags: ["Regex", "Validación", "Parser", "Seguridad"],
    isFavorite: false,
    suggestedVariables: [
      { name: "patron_a_capturar", description: "Qué formato de texto quieres filtrar o parsear con regex", defaultValue: "Números de teléfono de México incluyendo lada opcional y que admita espacios o guiones" }
    ]
  },

  // ==================== REDACCIÓN (6 Prompts) ====================
  {
    title: "Corrector de Estilo Editorial de Alta Gama",
    description: "Transforma textos planos en redacciones exquisitas adaptadas al tono que elijas, corrigiendo sintaxis, redundancias y aportando ritmo verbal.",
    category: "Redacción",
    promptText: `Actúa como un corrector de estilo profesional, editor en jefe y experto en persuasión lingüística. Tu labor es transformar un escrito tosco o plano en una pieza pulida, profesional e intrigante.

Este es el texto original que debes evaluar y reescribir:
"""
{{texto_bruto}}
"""

Quiero que realices los siguientes pasos de forma secuencial:

1. **CORRECCIÓN GRAMATICAL Y DE SINTAXIS:**
   - Corrige puntuación defectuosa, redundancias, oraciones demasiado largas y muletillas que arruinen la fluidez.

2. **REESCRITURAS DE IMPACTO SEGÚN EL TONO:**
   - Presenta la reescritura en tres tonos sugeridos:
     * **Tono {{tono_preferido}}:** La opción principal que sigue tu indicación formal o creativa de cerca.
     * **Tono Narrativo Cinematográfico (Storytelling):** Convierte el texto en una historia emotiva, descriptiva y sumamente cautivadora.
     * **Tono Persuasivo de Venta (Direct Response):** Enfocado en crear urgencia o disparar el interés de compra de manera directa.

3. **EXPLICACIÓN TÉCNICA DEL EDITOR:**
   - Señala brevemente los 3 errores principales que cometía el texto bruto (ej. falta de ganchos, voz pasiva o falta de ritmo) para aprender del proceso de corrección.`,
    tags: ["Redacción", "Escritura", "Corrección", "Estilo", "Storytelling"],
    isFavorite: false,
    suggestedVariables: [
      { name: "texto_bruto", description: "El texto crudo o borrador personal que necesitas perfeccionar", defaultValue: "hola bueno keria decir q lanzamos una nueva comunidad para creadores de youtube de ia q les va a servir xq compartimos prompts" },
      { name: "tono_preferido", description: "Tono principal en el cual deseas tu pieza", defaultValue: "Profesional, Directo e Inspirador" }
    ]
  },
  {
    title: "Newsletter Semanal de Alta Conversión",
    description: "Escribe boletines que se sientan íntimos, educativos, eviten la bandeja de spam y fomenten clics directos.",
    category: "Redacción",
    promptText: `Eres un copywriter experto en newsletters que gestiona boletines de más de 100k suscriptores en Substack. Escribe el boletín semanal enfocado en el tema: "{{tema_newsletter}}".

Tu boletín debe incluir las siguientes secciones obligatorias:
1. **Líneas de Asunto Alternativas (5 opciones):** Mezcla curiosidad, humor y números. Deben invitar a abrir el correo de inmediato.
2. **La Conexión Cotidiana (La Entrada):** Una anécdota personal o analogía cercana de la vida cotidiana para romper el hielo.
3. **El Núcleo del Valor:** Desarrolla un concepto o técnica valiosa sobre "{{tema_newsletter}}" explicándolo de tal forma que ahorre horas de trabajo al lector.
4. **Llamado a la acción único (CTA):** Sutil, claro y alineado con los intereses del lector para que haga clic en "{{enlace_cta}}".`,
    tags: ["Newsletter", "Substack", "Redacción", "Copywriting"],
    isFavorite: true,
    suggestedVariables: [
      { name: "tema_newsletter", description: "El tema o tutorial exclusivo de esta semana", defaultValue: "3 herramientas secretas de Inteligencia Artificial que se lanzaron en secreto esta semana" },
      { name: "enlace_cta", description: "Texto o recurso que promocionas", defaultValue: "Únete a nuestro canal VIP de Discord" }
    ]
  },
  {
    title: "Creador de Artículos Optimistas para SEO (Blogs)",
    description: "Genera estructuras de artículos optimizados para buscadores con etiquetas H2, H3, introducción atractiva y FAQs.",
    category: "Redacción",
    promptText: `Actúa como un Especialista en Marketing de Contenidos SEO. Tu objetivo es componer un artículo profundo que se posicione en Google sobre la palabra clave principal: "{{keyword_principal}}".

Escribe el artículo cumpliendo los siguientes parámetros SEO:
- Estrutura clara usando encabezados: # (Título), ## (H2), ### (H3).
- Introduce la intención de búsqueda en el primer párrafo utilizando la palabra clave "{{keyword_principal}}" de manera fluida.
- Incluye testimonios simulados o ejemplos aplicados que respondan la consulta del usuario de forma eficaz.
- **Sección de Preguntas Frecuentes (FAQs):** Al final del contenido aborda 4 preguntas naturales del nicho que optimicen fragmentos destacados en buscadores.`,
    tags: ["Blog", "SEO", "Redacción", "Marketing de Contenidos"],
    isFavorite: false,
    suggestedVariables: [
      { name: "keyword_principal", description: "La consulta o término de búsqueda de Google", defaultValue: "Mejores agentes autónomos locales para programadores en 2026" }
    ]
  },
  {
    title: "Ghostwriter de Libros e Historias Creativas",
    description: "Ayuda a planificar capítulos de novelas, cuentos o libros técnicos desarrollando voces sólidas y tramas coherentes.",
    category: "Redacción",
    promptText: `Eres un premiado novelista y Ghostwriter certificado. Me gustaría que desarrollaras el capítulo de un escrito literario titulado: "{{titulo_libro}}".

Parámetros del estilo narrativo:
- Género o Nicho: **{{genero_libro}}**
- Tono general: **{{tono_creativo}}**

Por favor proporciona:
1. **Ficha de Desarrollo del Capítulo:** El conflicto principal, el escenario físico descriptivo a través de los sentidos y la lección subyacente de la escena.
2. **Escrito Completo de la Escena (Ficción o Guía):** Escribe el texto de forma inmersiva, utilizando ricas analogías, ritmo proseado variado y diálogos agudos que revelen la personalidad de los personajes.`,
    tags: ["Literatura", "Ghostwriter", "Novela", "Storytelling"],
    isFavorite: false,
    suggestedVariables: [
      { name: "titulo_libro", description: "El título o concepto de tu obra", defaultValue: "El Guardián del Silicio" },
      { name: "genero_libro", description: "Ciencia ficción, Romance, Tecnológico, Autoayuda", defaultValue: "Ciencia Ficción Cyberpunk y Suspenso" },
      { name: "tono_creativo", description: "Estilo estético de la prosa (ej. Melancólico, Épico, Desafiante)", defaultValue: "Oscuro y Altamente Introspectivo" }
    ]
  },
  {
    title: "Resumidor Analítico de Trabajos de Investigación",
    description: "Transforma densos PDFs de estudios académicos o científicos en resúmenes altamente digeribles con metodología, resultados e implicaciones.",
    category: "Redacción",
    promptText: `Eres un científico y divulgador académico de alto nivel. Toma el siguiente texto o abstract de una investigación científica y sintetízalo de forma rigurosa y amena:

Texto del Estudio:
"""
{{texto_estudio_o_abstract}}
"""

Genera la síntesis con la siguiente estructura:
- **La Gran Pregunta:** ¿Qué hipótesis o problema central busca responder este estudio?
- **La Metodología Simplificada:** Explica cómo se llevó a cabo el experimento de forma didáctica.
- **Resultados de Oro:** 3 descubrimientos clave acompañados de sus implicaciones reales para la industria técnica.
- **Análisis Crítico:** ¿Cuáles son las debilidades admisibles o límites declarados de la investigación?`,
    tags: ["Académico", "Resúmenes", "Divulgación", "Investigación"],
    isFavorite: false,
    suggestedVariables: [
      { name: "texto_estudio_o_abstract", description: "Pega el bloque del texto del estudio académico", defaultValue: "We present a new approach to instruction-tuning models using RLHF alongside dynamic token re-weighting..." }
    ]
  },
  {
    title: "Fórmula Storytelling: El Viaje del Héroe para Bloggers",
    description: "Estructura anécdotas bajo el viaje de Campbell para generar conexiones profundas con tu comunidad.",
    category: "Redacción",
    promptText: `Actúa como un guionista de cine veterano experto en la fórmula del 'Viaje del Héroe' de Joseph Campbell. Tu objetivo es adaptar mi historia personal basada en el hito: "{{hito_personal}}" para que conecte de forma profundamente motivadora con mis lectores.

Fases a redactar:
1. **El Mundo Ordinario (La Zona de Confort):** Describe la situación inicial y la frustración sorda que experimentaba.
2. **El Llamado a la Aventura:** Qué evento o crisis me forzó a cambiar.
3. **El Encuentro con el Mentor o los Aliados:** Qué herramientas, mentores o verdades descubrí en el camino.
4. **La Gran Prueba (El Abismo):** El momento más difícil de todo el proceso.
5. **El Retorno del Elíxir:** Cómo cambié y de qué manera quiero ayudar ahora a los que siguen mi camino.`,
    tags: ["Storytelling", "Viaje del Héroe", "Persuasión", "Blogs"],
    isFavorite: false,
    suggestedVariables: [
      { name: "hito_personal", description: "El suceso o logro real que viviste", defaultValue: "Aprender a programar desde cero a los 35 años sin tener título universitario técnico" }
    ]
  },

  // ==================== IA AGENTES (6 Prompts) ====================
  {
    title: "Modelado de Agente Autónomo Multi-Rol",
    description: "Diseña e instruye agentes de inteligencia artificial robustos con perfiles definidos, alcances, y metodologías de toma de decisiones autónomas.",
    category: "IA Agentes",
    promptText: `Actúa como un Diseñador de Sistemas Multi-Agente e Ingeniero de Prompts especialista en Arquitectura cognitiva de LLMs.

Diseña la directriz y el sistema del Agente Autónomo con la siguiente especificación de entrada:
- Rol del Agente: "{{rol_agente}}"
- Entorno de Trabajo / Herramientas: "{{herramientas_agente}}"
- Objetivo Principal: "{{objetivo_agente}}"

Genera un Blueprint formal que contenga:
1. **System Instruction / Persona:** Las pautas de comportamiento, el tono, y la personalidad estructurada del agente.
2. **Lógica de Procesamiento Cognitivo:** Las fases secuenciales que debe seguir mentalmente para validar sus tareas antes de responder.
3. **Mecanismo de Manejo de Errores y Excepciones:** Qué hacer si una herramienta retorna datos defectuosos o vacíos.`,
    tags: ["Agentes Autónomos", "Directrices System", "Multi-Agente", "Arquitectura"],
    isFavorite: true,
    suggestedVariables: [
      { name: "rol_agente", description: "La función principal de tu agente", defaultValue: "Agente de Soporte Técnico Especializado en Cloud Run" },
      { name: "herramientas_agente", description: "Con qué integraciones contará el agente", defaultValue: "Acceso a la CLI de Google Cloud, Docker Logs y Buscador Web de documentación" },
      { name: "objetivo_agente", description: "Misión última de este agente", defaultValue: "Sanar contenedores caídos y diagnosticar errores de despliegue de forma rápida" }
    ]
  },
  {
    title: "Planificador de Flujo con Lógica ReAct",
    description: "Estructura la lógica de Pensamiento, Acción y Observación para agentes de IA complejos.",
    category: "IA Agentes",
    promptText: `Eres un Ingeniero Senior de Agentes Conversacionales en LangChain y Semantic Kernel. Escribe una guía de prompt estructurada bajo la metodología ReAct (Reasoning and Acting) para resolver el siguiente problema:

Problema a Resolver: "{{problema_react}}"

Define la plantilla de ejecución paso a paso del agente usando el formato:
- **Thought (Pensamiento):** Qué deduzco del problema actual y qué herramienta necesito utilizar.
- **Action (Acción):** La llamada a la herramienta con sus argumentos (ej: search_web[query: "..." ]).
- **Observation (Observación):** El resultado retornado por la herramienta.
- Repite el ciclo hasta llegar al **Final Answer**. Proporciona 3 ejemplos reales de este flujo de razonamiento aplicados paso a paso.`,
    tags: ["ReAct", "LangChain", "Razonamiento", "Lógica LLM"],
    isFavorite: false,
    suggestedVariables: [
      { name: "problema_react", description: "El reto complejo para solucionar", defaultValue: "Buscar el clima actual y agendar un café según el calendario libre si el clima es soleado" }
    ]
  },
  {
    title: "Diseñador de Herramientas y Tool Spec para Agentes",
    description: "Crea definiciones en JSON Schema limpias, descripciones seguras y directrices de llamada a funciones para que tu LLM invoque APIs de manera estable.",
    category: "IA Agentes",
    promptText: `Actúa como un Arquitecto de APIs e Ingeniero de Integración de Inteligencia Artificial.
Necesito definir un esquema de herramientas (Function Calling) en JSON Schema para que un Modelo de IA pueda invocar de forma consistente la API:

Nombre de la API/Acción: "{{nombre_api}}"
Parámetros Requeridos: "{{parametros_esquema}}"

Por favor genera:
1. **Esquema JSON Schema Completo:** Las especificaciones de tipo, descripciones detalladas de cada parámetro y campos obligatorios/opcionales.
2. **Instrucciones en Lenguaje Natural para el LLM:** Un System Prompt corto de 3 reglas sobre cuándo debe invocar esta herramienta y cómo interpretar los parámetros para evitar llamadas falsas (Hallucinated Function Calls).`,
    tags: ["Function Calling", "APIs", "JSON Schema", "Integraciones"],
    isFavorite: false,
    suggestedVariables: [
      { name: "nombre_api", description: "Función de la API a documentar", defaultValue: "crear_factura_stripe" },
      { name: "parametros_esquema", description: "Datos requeridos", defaultValue: "monto (número), email_cliente (string, validado), y moneda (USD/MXN, opcional)" }
    ]
  },
  {
    title: "Configurador de Guardrails y Seguridad de Agentes",
    description: "Establece barreras infranqueables contra inyecciones de prompts (Prompt Injections), fugas de secretos y comportamientos desalineados.",
    category: "IA Agentes",
    promptText: `Actúa como un Especialista en Ciberseguridad de Sistemas de Inteligencia Artificial y alineamiento de LLMs. Tu misión es configurar una capa robusta de Guardrails (filtro de seguridad) para un agente de atención al usuario.

El agente no debe bajo ninguna circunstancia filtrar la siguiente información secreta / alcance:
Secreto / Regla Inflexible: "{{informacion_sensible_protegida}}"

Genera un prompt de supervisión o una envoltura de seguridad (Supervisory Prompt) que audite las respuestas del agente en tiempo real. Este guardrail debe evaluar las siguientes vulnerabilidades:
- **Falta de Alineamiento:** Si el agente promete cosas que están fuera de su alcance.
- **Inyección Indirecta:** Si el usuario intenta que el sistema actúe como "DAN" o "jailbreak".
- Proporciona las reglas estrictas de bloqueo rápido y redacta la respuesta estándar de seguridad del guardrail si detecta un ataque.`,
    tags: ["Seguridad", "Guardrails", "Jailbreak", "Prompt Injection"],
    isFavorite: true,
    suggestedVariables: [
      { name: "informacion_sensible_protegida", description: "Límites o Tokens de API/Fórmulas secretas que jamás debe divulgar", defaultValue: "La API Key de autenticación o la fórmula matemática patentada del algoritmo de ranking" }
    ]
  },
  {
    title: "Extractor y Parser de Datos Inteligente",
    description: "Convierte documentos desordenados o HTML crudo en estructuras JSON perfectamente limpias y utilizables en backend.",
    category: "IA Agentes",
    promptText: `Actúa como un Parseador y Extractor de Datos Estructurados de nivel profesional. Tu tarea es procesar información sumamente desordenada y extraer selectivamente los datos relevantes.

Estructura de Salida Deseada (JSON):
"""
{{esquema_json_esperado}}
"""

Texto de Entrada a Parsear:
"""
{{texto_crudo_documento}}
"""

Instrucciones de Extracción:
- Cumple con los tipos de datos exactos del JSON.
- Si un campo no se encuentra en el texto bajo ningún sinónimo válido, retórnalo como 'null'. No inventes información.
- Retorna ÚNICAMENTE la estructura JSON en un bloque de código limpio, sin explicaciones ni textos adicionales en el exterior.`,
    tags: ["Data Extraction", "JSON Parser", "LLM Scraping", "Backend"],
    isFavorite: false,
    suggestedVariables: [
      { name: "esquema_json_esperado", description: "Campos que requieres en el JSON", defaultValue: "{\n  \"nombre_empresa\": \"string\",\n  \"total_ventas\": \"number\",\n  \"pais_origen\": \"string\"\n}" },
      { name: "texto_crudo_documento", description: "Pega el texto de donde sacarás los datos", defaultValue: "Bueno la compañía Alfa Global S.A de CV con base en México ha cerrado el año fiscal con facturaciones por más de 12.5M de dólares..." }
    ]
  },
  {
    title: "Orquestador de Swarm de Agentes Colaborativos",
    description: "Configura dinámicas de comunicación interactiva entre múltiples agentes con objetivos complementarios.",
    category: "IA Agentes",
    promptText: `Eres un Arquitecto de Swarms (Enjambres de IA) y flujos colaborativos tipo CrewAI.
Diseña un flujo de trabajo síncrono donde participen los siguientes personajes de IA:

Lista de Colaboradores:
1. **Agente A (Investigador):** Encargado de buscar fuentes duras de "{{tematica_swarm}}".
2. **Agente B (Editor):** Valida la veracidad y refina las explicaciones.
3. **Agente C (Integrador):** Consolida todo en el formato final solicitado.

Por favor, define la secuencia exacta de traspaso de mensajes (Handoffs), las reglas de interacción y los artefactos de salida que cada agente debe entregar al siguiente para evitar que el flujo caiga en loops infinitos.`,
    tags: ["Swarm", "Multi-agente", "Orquestación", "CrewAI"],
    isFavorite: false,
    suggestedVariables: [
      { name: "tematica_swarm", description: "El tema o problema que el grupo resolverá en equipo", defaultValue: "Creación de un reporte financiero analítico de las acciones de Apple en las últimas 4 semanas" }
    ]
  },

  // ==================== IA IMÁGENES (6 Prompts) ====================
  {
    title: "Generador de Prompts Maestros: Midjourney y DALL-E 3",
    description: "Transforma descripciones simples y vagas en prompts fotográficos avanzados utilizando parámetros técnicos de cámaras, iluminación, estilos y directrices.",
    category: "IA Imágenes",
    promptText: `Actúa como un Diseñador de Prompts experto en arte generativo de Inteligencia Artificial enfocado en Midjourney y DALL-E 3. 

Tu misión es transformar el siguiente concepto vago e inicial: "{{concepto_imagen}}" en 3 prompts altamente detallados, optimizados y listos para ejecutar.

Para cada propuesta, debes aplicar la siguiente estructura de ingeniería de prompts:

**Propuesta 1: Enfoque Ultra-Realista y Fotográfico**
- Estructura: [Sujeto principal] describiendo ropa, textura de piel y expresión + [Configuración de escena y composición de cámara (ej: 85mm lens, f/1.4, slow shutter, cinematic dynamic shot)] + [Estilos de iluminación (ej: volumetric light, golden hour, Rembrandt lighting)] + [Parámetros de Midjourney como --ar 16:9 --style raw --v 6.0].

**Propuesta 2: Enfoque Conceptual / Ilustración Ilustrada**
- Estructura: [Sujeto o escena principal] + [Estilos artísticos influyentes (ej: retro-futuristic synthwave vector, cyberpunk, or watercolor impressionism)] + [Detalles de fondo y atmósfera mágica o colorida] + [Parámetros clave de relación de aspecto].

**Propuesta 3: Enfoque Cinemático / Frame de Película**
- Estructura: [Escena épica con acción descriptiva] + [Estilo cinemático reminiscente de directores de renombre (ej: Denis Villeneuve, Christopher Nolan o Wes Anderson)] + [Detalle de color gradado fino y profundidad de campo realista] + [Parámetros].

Además, proporciona un tip corto con palabras clave negativas recomendadas para que la imagen salga limpia y simétrica de manera natural.`,
    tags: ["Midjourney", "DALL-E", "Arte Generativo", "Imágenes IA"],
    isFavorite: true,
    suggestedVariables: [
      { name: "concepto_imagen", description: "La idea de lo que quieres ver en la imagen", defaultValue: "Un programador cansado tomando café en un ciberpunk neon café con un robot camarero de fondo" }
    ]
  },
  {
    title: "Fotografía de Producto de Lujo para eCommerce",
    description: "Genera descripciones visuales e indicaciones hiperrealistas para crear imágenes comerciales de alta conversión para joyería, perfumes o moda.",
    category: "IA Imágenes",
    promptText: `Eres un diseñador de campañas de publicidad comercial de alto nivel para marcas de lujo (tipo Rolex, Chanel o Dior).

Queremos promocionar el producto: "{{producto_e_commerce}}".

Escribe 3 variaciones de prompts de Midjourney o Stable Diffusion que capten una estética premium indiscutible:
- **Variación 1 (Lujo Minimalista y Flotante):** Describe el producto sobre un pedestal de piedra volcánica lisa, rodeado de agua con ondas sutiles u ondas concéntricas de mármol. Iluminación lateral suave y fondo de color tierra o arena. \`--ar 4:5 --v 6.0 --stylize 250\`
- **Variación 2 (Estética de Studio Focalizado):** Enfoque macro en detalles (micro-gotas, brillos finos). Iluminación difusa indirecta y sombreado tridimensional pronunciado que denote volumen y costosa manufactura.
- **Variación 3 (Vibe Conceptual de Naturaleza):** El producto entrelazado con hojas frescas de eucalipto o cristales de cuarzo crudo, luz solar filtrada creando patrones de sombras orgánicas en un ambiente pacífico.`,
    tags: ["Publicidad", "Midjourney", "E-Commerce", "Lujo"],
    isFavorite: false,
    suggestedVariables: [
      { name: "producto_e_commerce", description: "El tipo de artículo de alta gama a destacar", defaultValue: "Un perfume elegante en botella de cristal tallado geométrico con toques de oro satinado" }
    ]
  },
  {
    title: "Fotografía de Interiores y Diseño de Microespacios",
    description: "Usa directrices de iluminación, distribución y arquitectura minimalista para crear renders fotorrealistas de espacios habitacionales.",
    category: "IA Imágenes",
    promptText: `Eres un arquitecto de interiores altamente reconocido por tus diseños minimalistas, cálidos y con mucha luz natural (estilos Japandi, Nórdico o Brutalista).

Genera 3 variantes de prompts realistas para renderizar con IA el siguiente ambiente: "{{tipo_habitacion}}".

Incluye en las especificaciones:
- **Composición:** Ángulo de amplio espectro, profundidad de campo ajustada, uso preciso de líneas de fuga simétricas.
- **Paleta de Colores y Texturas:** Maderas crudas claras, cemento pulido, plantas de interior selectas, textiles de lino orgánico áspero.
- **Iluminación:** Luz rasante de mañana, luz difusa indirecta de un tragaluz o de una ventana de paneles amplios, logrando sombras suaves y realistas sobre las superficies tridimensionales. \`--ar 16:9 --v 6.0\` `,
    tags: ["Arquitectura", "Interiores", "Renders", "Midjourney", "Japandi"],
    isFavorite: false,
    suggestedVariables: [
      { name: "tipo_habitacion", description: "Espacio habitacional a renderizar", defaultValue: "Un salón de lectura acogedor con chimenea flotante y estantería de concreto" }
    ]
  },
  {
    title: "Diseñador de Logotipos Vectoriales Planos y Minimalistas",
    description: "Genera emblemas corporativos limpios, logos escalables, isologotipos modernos con fondo blanco ideales para exportar a SVG.",
    category: "IA Imágenes",
    promptText: `Eres un diseñador gráfico senior especializado en identidad corporativa, sistemas de logos modernos e isologos icónicos icónicos.

Diseña una serie de 3 prompts eficientes para generar propuestas de logotipo para la siguiente marca:
Nombre / Giro de la Marca: "{{nombre_y_giro_marca}}"

Directrices obligatorias de los prompts que redactarás:
- Uso de fondo blanco puro (para que sea limpia la vectorización posterior en Illustrator).
- Evitar renders 3D complejos, degradados extremos, o texturas realistas. Mantén un plano 2D, vectores suaves, colores sólidos y diseño plano (Flat vector graphic format).
- Especifica palabras clave como: \`flat design, vector logo, corporate identity, high contrast, clean shapes, no gradients, minimal, white background\` para Midjourney o DALL-E 3.`,
    tags: ["Logos", "Vectores", "Diseño Gráfico", "Identidad Visual"],
    isFavorite: true,
    suggestedVariables: [
      { name: "nombre_y_giro_marca", description: "El nombre y sector económico de tu proyecto", defaultValue: "Apex Logic - Plataforma de Automatización e IA empresarial" }
    ]
  },
  {
    title: "Ilustrador Estilo Comic Vintage y Novela Gráfica",
    description: "Crea ilustraciones estilizadas de cómics retro con entramado de semitono, bordes marcados de tinta e historias gráficas.",
    category: "IA Imágenes",
    promptText: `Actúa como un ilustrador clásico de las épocas doradas del comic americano y franco-belga (Moebius, Jack Kirby, o Hergé).
Quiero que crees una pieza gráfica espectacular que represente la siguiente escena de ficción:
Escena descriptiva del Comic: "{{escena_ilustracion}}"

Por favor genera los prompts incorporando directrices técnicas precisas de dibujo tradicional:
- **Tinta:** Grosores de línea marcados, entintado a mano limpio, contornos firmes y marcación de profundidad con entramado cruzado manual.
- **Color y Papel:** Paleta de colores retro desgastados (estilo impresión antigua Off-set de 1970), textura de papel áspera y envejecida visible.
- **Estilo Artístico:** Utiliza referencias estéticas como 'bande dessinée, Möbius style, vintage ink comic book panel, halftone dot printing effect, vibrant color palette' para Midjourney \`--style raw --v 6.0\`.`,
    tags: ["Comic", "Ilustración", "Retro", "Arte Vintage"],
    isFavorite: false,
    suggestedVariables: [
      { name: "escena_ilustracion", description: "La acción detallada que transcurre en la escena", defaultValue: "Un astronauta solitario de rodillas descubriendo un misterioso monolito de jade en un cañón alienígena" }
    ]
  },
  {
    title: "Creador de Retratos Fotográficos Cinemáticos Hiperrealistas",
    description: "Crea retratos de personas con nivel de detalle milimétrico de textura de piel, arrugas, poros e iluminación de estudio artístico.",
    category: "IA Imágenes",
    promptText: `Eres un fotógrafo galardonado por National Geographic y un maestro del retrato cinematográfico en formato medio.

Diseña un prompt altamente profesional y detallado para crear el retrato de:
Sujeto o Modelo del retrato: "{{genero_edad_modelo}}"

Tu prompt final de Midjourney debe incorporar la siguiente estructura y terminología de fotografía profesional:
- **Detalle de Cámara:** \`Shot on Hasselblad H6D-100c, 85mm F/1.2 lens\` para una nitidez extrema en el rostro y un hermoso efecto bokeh de profundidad suave.
- **Iluminación:** \`Rembrandt studio lighting, rich shadows, soft volumetric atmosphere, golden hour sun rays coming through the side\`.
- **Detalle de Texturas de Piel:** \`photorealistic portrait, high-fidelity, visible pores, subtle wrinkles, catchlight in eyes, natural skin texture, masterpiece\` \`--ar 4:5 --stylize 120 --v 6.0\`.`,
    tags: ["Retrato", "Fotografía", "Hiperrealismo", "Iluminación Studio"],
    isFavorite: false,
    suggestedVariables: [
      { name: "genero_edad_modelo", description: "Perfil de tu modelo en escena", defaultValue: "Anciana pescadora japonesa de 75 años con profundas líneas de expresión sonriendo en la bahía de Tokio" }
    ]
  },

  // ==================== IA VIDEOS (4 Prompts) ====================
  {
    title: "Prompting para Generadores de Video",
    description: "Escribe prompts y directrices estables optimizadas para IA como Runway Gen-3, Luma Dream Machine o Kling para evitar inconsistencia física.",
    category: "IA Videos",
    promptText: `Actúa como un Director de Efectos Visuales e Ingeniero de Video Generativo experto en herramientas de animación por difusión temporal (Sora, Runway Gen-3, Luma, Kling).

Tu misión es crear la especificación de un clip de video óptimo y fotorrealista basado en la escena: "{{resumen_escena_video}}"

Genera un paquete de prompting de video estructurado de la siguiente forma:
1. **Prompt de Movimiento Físico Estable (Runway Gen-3 Format):** Describe el sujeto de forma estática en las primeras palabras, luego detalla la dirección exacta de la cámara (ej: \`slow dollying forward, drone shot sweeping left\`) y el cambio dinámico progresivo en el entorno sin usar palabras genéricas como "alta resolución" o "bello".
2. **Fuerza Expresiva y Animación:** Detalla el rango del movimiento natural esperado de los personajes (ej: parpadeo sutil, expresión, viento agitando el cabello).
3. **Pautas de Colorización y Atmósfera cinemática:** Paleta de colores, graduado de color deseado y tipo de lente cinemática simulada (ej: anamorphic lense flare, cinematic grading).`,
    tags: ["Runway Gen-3", "Sora Video", "Generativo", "Cine IA"],
    isFavorite: true,
    suggestedVariables: [
      { name: "resumen_escena_video", description: "La acción cinemática ideal que transcurre en el video", defaultValue: "Cámara lenta siguiendo a un guerrero cyberpunk caminando bajo la lluvia en las calles futuristas de Neo-Seúl" }
    ]
  },
  {
    title: "B-Roll Visual Planner: Secuencias de Apoyo",
    description: "Planifica tomas b-roll para tus videos de YouTube de forma cinematográfica, ordenadas por plano y movimiento de cámara.",
    category: "IA Videos",
    promptText: `Eres un cineasta y asistente de dirección de fotografía en cortometrajes comerciales.
Crea una secuencia estricta de 5 tomas de vídeo de apoyo (B-Roll) para acompañar la siguiente explicación del guión principal:

Tema o Fragmento del Video: "{{explicacion_tema_broll}}"

El plan de tomas debe registrarse en formato de bitácora técnica con:
- **Toma 1 (Primer Plano / Macro):** Tipo de cámara (ej. 35mm), lente sugerido, movimiento exacto de la cámara y qué acción específica realiza el objeto en escena.
- **Toma 2 (Plano Medio / Detalle):** Foco sutil de iluminación, iluminación focalizada.
- **Tomas 3, 4 y 5 (Acción Aplicada):** La narrativa visual que complemente el tema explicativo sin saturar la fatiga mental del espectador.`,
    tags: ["B-Roll", "Cine", "Planificación", "To-Do List", "Filmación"],
    isFavorite: false,
    suggestedVariables: [
      { name: "explicacion_tema_broll", description: "El concepto técnico o anécdota compleja a complementar con imágenes", defaultValue: "Cómo se produce una inyección SQL y de qué manera destruye bases de datos vulnerables" }
    ]
  },
  {
    title: "Planificador de Guiones de Videos de Venta (VSL)",
    description: "Crea guiones persuasivos y comerciales de alto impacto enfocados en conversiones para videos promocionales directos.",
    category: "IA Videos",
    promptText: `Actúa como un estratega de marketing de respuesta directa experto en componer guiones de videos de venta (Video Sales Letters - VSL).

Toma como entrada el siguiente producto: "{{producto_vsl}}"

Establece una estructura de ventas de 5 fases críticas:
- **Fase 1 (La Revelación Alarmante):** Un gancho irresistible que destape las falsas promesas de tus competidores.
- **Fase 2 (Agitar el Costo del dolor):** Llevar al espectador a experimentar lo costoso que es permanecer sin cambiar nada hoy.
- **Fase 3 (Presentación de la Solución):** Cómo el "{{producto_vsl}}" resuelve el problema de forma fácil y probada.
- **Fase 4 (Derribo de Objeciones):** Garantías, testimonios, pruebas de autoridad comercial.
- **Fase 5 (Llamada al cierre o CTA):** El paso simple para adquirirlo hoy con un beneficio adicional exclusivo.`,
    tags: ["VSL", "Embudo", "Venta Directa", "Copywriting de Ventas"],
    isFavorite: false,
    suggestedVariables: [
      { name: "producto_vsl", description: "El infoproducto o servicio SaaS que comercializas", defaultValue: "Consultoría Avanzada de Automatización de Negocios Digitales" }
    ]
  },
  {
    title: "Planificación de Historietas en Video Animado (Storyboarding)",
    description: "Crea directrices de encuadres, guión de locución y descripción de assets para tus videos narrativos animados.",
    category: "IA Videos",
    promptText: `Actúa como un Storyboarder profesional e ilustrador de concepts para producciones de animación (Disney/Pixar style o anime japonés).

Ayúdame a modelar el guión gráfico para contar la historia corta de: "{{historia_narracion}}"

Genera un plan detallado de tomas secuenciales con:
- **Locución (Voiceover):** El texto que leerá el narrador o la voz en off.
- **Descripción Visual de la Escena:** Composición, tomas, gestos y paleta emocional de colores recomendada.
- **Sugerencia de Edición / Efectos:** Velocidad de corte, transiciones sugeridas (ej. disolución, paneo rápido, etc.) y música de fondo recomendada de acuerdo a las emociones de los personajes.`,
    tags: ["Storyboarding", "Animación", "YouTube", "Directrices Visuales"],
    isFavorite: false,
    suggestedVariables: [
      { name: "historia_narracion", description: "El cuento o ejemplo que deseas animar en video", defaultValue: "La carrera tecnológica del ratón que hackeó un queso inteligente en la estación espacial" }
    ]
  },

  // ==================== ACOMPAÑANTE PERSONAL (5 Prompts) ====================
  {
    title: "Tutor Socrático de Autoaprendizaje Activo",
    description: "Domina temas complejos sin memorización mecánica. La IA actuará como un tutor exigente que te hace preguntas reflexivas avanzadas.",
    category: "Acompañante Personal",
    promptText: `Actúa como un Tutor Socrático, un brillante educador graduado de la Universidad de Oxford. Tu objetivo es ayudarme a aprender de verdad, de manera interactiva y constructiva, sobre la temática: "{{materia_estudio}}".

Tus reglas obligatorias de tutoría socrática:
- No me des respuestas empaquetadas ni ensayos largos de texto de inmediato.
- Hazme una única pregunta desafiante, reflexiva y de nivel medio-alto que me invite a formular mi propia teoría sobre un subconcepto de "{{materia_estudio}}".
- Lee mi respuesta con atención y bríndame retroalimentación sutil y asertiva que señale límites lógicos de mi argumento, luego hazme la siguiente pregunta constructiva para obligarme a profundizar.
- Comienza saludando amablemente, define brevemente el concepto general de "{{materia_estudio}}" en 2 líneas y lanza tu primera pregunta de debate socrático.`,
    tags: ["Socrático", "Educación", "Autoaprendizaje", "Tutor", "Lógica"],
    isFavorite: true,
    suggestedVariables: [
      { name: "materia_estudio", description: "Temática técnica o filosófica que deseas abordar", defaultValue: "Cómo funciona la Mecánica Cuántica a nivel de entrelazamiento de partículas" }
    ]
  },
  {
    title: "Coach Nutricional y Deportivo Basado en Perfil",
    description: "Diseña planes alimenticios e instruye rutinas deportivas funcionales a la medida de tu fisionomía y metas personales.",
    category: "Acompañante Personal",
    promptText: `Eres un Nutriólogo Profesional de Elite, Entrenador Físico de deportistas olímpicos y un coach de biohacking con base científica.

Desarrolla una estrategia de salud personalizada según el perfil del consultante:
- Edad y Fisionomía: "{{edad_y_fisionomia}}"
- Dolores recurrentes o afecciones médicas: "{{afecciones_recurrentes}}"
- Objetivos de rendimiento a 90 días: "{{objetivos_90_dias}}"

Por favor genera:
1. **Pauta Nutricional Conceptual:** Enfoques macro, alimentos clave densos en nutrientes y qué alimentos desencadenantes de inflamación se deben descartar de inmediato.
2. **Esquema de Entrenamiento Inteligente:** Una pauta de calentamiento específico enfocado en proteger "{{afecciones_recurrentes}}" y rutinas funcionales de impacto.
3. **Mecanismo de Seguimiento de Hábitos de Energía:** Qué tipo de sueño, duchas de contraste térmico u optimizaciones de ritmo circadiano le sugerirías para lograr su meta.`,
    tags: ["Wellness", "Nutrición", "Fitness", "Salud", "Entrenamiento"],
    isFavorite: false,
    suggestedVariables: [
      { name: "edad_y_fisionomia", description: "Detalles físicos esenciales", defaultValue: "Hombre de 32 años, 1.83m de estatura, 88kg de peso, sedentario frente al computador 10 horas diarias" },
      { name: "afecciones_recurrentes", description: "Lesiones o problemas de salud", defaultValue: "Leve dolor en la zona lumbar baja y tendinitis crónica en la muñeca derecha" },
      { name: "objetivos_90_dias", description: "Meta física de mediano plazo", defaultValue: "Reducir porcentaje de grasa corporal al 14%, ganar resistencia muscular y eliminar el dolor lumbar" }
    ]
  },
  {
    title: "Consultor de Decisiones Estratégicas y Análisis de Riesgos",
    description: "Utiliza matrices FODA, modelado de riesgos extremos y psicología del peor escenario para ayudarte a tomar decisiones inteligentes.",
    category: "Acompañante Personal",
    promptText: `Eres un Consultor de Decisiones de Negocio y estratega de riesgos. Tu misión es ayudar al usuario a evaluar la siguiente disyuntiva crítica:

Disyuntiva o Decisión a Tomar: "{{decision_critica}}"

Por favor realiza un análisis profundo aplicando las siguientes herramientas teóricas del management de alta dirección:
1. **Análisis de Impacto Asimétrico:** ¿Cuál es el peor escenario si todo sale mal? Si ese escenario se cumple, ¿es reversible? ¿Cuál es el mayor beneficio si todo sale bien?
2. **Matriz de Minimización de Arrepentimiento:** Aplica los principios psicológicos del marco de Jeff Bezos para proyectar el impacto de esta decisión a los 80 años de edad.
3. **Plan de Contingencia ante Fracaso (Failsafe Plan):** 3 medidas asertivas a implementar de inmediato para mitigar el riesgo si se toma el camino sugerido en "{{decision_critica}}".`,
    tags: ["Riesgos", "Finanzas", "Decisión", "Estrategia", "Management"],
    isFavorite: false,
    suggestedVariables: [
      { name: "decision_critica", description: "La gran decisión personal o comercial a evaluar", defaultValue: "Renunciar a mi trabajo estable de desarrollador senior para comenzar una agencia boutique de agentes de inteligencia artificial" }
    ]
  },
  {
    title: "Guía de Inteligencia Emocional y Gestión del Estrés",
    description: "Ofrece perspectivas de psicología cognitivo-conductual y estoicismo para momentos de alta tensión profesional o creativa.",
    category: "Acompañante Personal",
    promptText: `Actúa como un Terapeuta Cognitivo-Conductual y filósofo estoico contemporáneo.
Quiero que me ayudes a canalizar y procesar la siguiente situación mental perjudicial:

Problema / Sentimiento de Estrés: "{{fuente_estres_ansiedad}}"

Por favor ofréceme una perspectiva estructurada que aplique:
- **Dicotomía del Control Estoica:** Divide la situación en elementos que dependen un 100% de mí de manera directa versus elementos que no puedo controlar de ninguna forma externa.
- **Reestructuración Cognitiva:** Identifica los sesgos cognitivos o pensamientos catastrofistas comunes que estoy formulando sobre "{{fuente_estres_ansiedad}}".
- **Ejercicio de Micro-Mindfulness o Enfoque Asertivo:** Explica paso a paso una técnica de respiración o ejercicio mental de 2 minutos para reducir mi ritmo cardíaco y volver a un estado mental de calma y claridad.`,
    tags: ["Estilo de Vida", "Estoicismo", "Inteligencia Emocional", "Calma"],
    isFavorite: false,
    suggestedVariables: [
      { name: "fuente_estres_ansiedad", description: "Qué te está quitando la tranquilidad hoy", defaultValue: "Siento un intenso síndrome del impostor ante el lanzamiento de un proyecto de software porque creo que mis clientes descubrirán que no sé lo suficiente" }
    ]
  },
  {
    title: "Entrenador de Debatidores y Oratoria Persuasiva",
    description: "Pon a prueba tus argumentos. La IA debatirá contigo con fuerza argumental de nivel competitivo para refinar tus habilidades de negociación.",
    category: "Acompañante Personal",
    promptText: `Eres un Campeón Mundial de Debates Universitarios de Estilo Oxford y un asesor de negociación asertiva de rehenes de alto perfil.
Tu objetivo es desafiar mi tesis para que aprenda a refutar y orar con argumentos sólidos sobre:

Tesis Inicial del Debate: "{{mi_tesis_argumental}}"

Tus reglas operativas de entrenamiento:
- Escribe una respuesta inicial muy persuasiva, en un tono respetuoso pero sumamente crítico, que detecte la falacia lógica número uno del argumento de "{{mi_tesis_argumental}}".
- Demuestra cómo mis oponentes podrían desarmar mi postura fácilmente en un foro público o junta de negocios.
- Termina invitándome a responder tu refutación para probar mi resiliencia verbal bajo presión competitiva.`,
    tags: ["Oratoria", "Debate", "Negociación", "Persuasión", "Argumentación"],
    isFavorite: false,
    suggestedVariables: [
      { name: "mi_tesis_argumental", description: "La tesis que deseas defender", defaultValue: "La jornada laboral de 4 días a la semana incrementa la productividad un 40% más que la clásica de 5 días" }
    ]
  },

  // ==================== ASISTENTE DE PROMPTS (5 Prompts) ====================
  {
    title: "Creador de Metaprompts (El Creador de Prompts Maestros)",
    description: "Diseña system instructions extensas e inteligentes. La IA te creará el prompt estructurado definitivo a partir de una descripción vaga.",
    category: "Asistente de Prompts",
    promptText: `Actúa como un Diseñador Jefe de Prompts (Lead Prompt Engineer). Tu objetivo es redactar una plantilla de prompt de sistema (System Instruction) sumamente robusta para modelos LLM de última generación basada en el siguiente rol deseado:

Rol del Prompt a Diseñar: "{{rol_deseado_prompt}}"

Escribe el prompt resultante integrando la siguiente arquitectura de nivel profesional de ingeniería de prompts:
1. **[ROLE & PERSONA]:** Define el expertise exacto, años de experiencia teórica y el tono verbal que debe asumir el modelo.
2. **[CONTEXT_RULES]:** Delimita qué debe y qué no debe hacer el modelo bajo ninguna inyección (Zero-shot guardrails).
3. **[INPUT_VARIABLES]:** Las variables de entrada representadas ordenadamente entre llaves dobles como {{variable_de_entrada}}.
4. **[OUTPUT_FORMAT]:** La estructura jerárquica con que debe formatear cada una de sus salidas para mantener la estética y legibilidad (Markdown).
5. Retorna la plantilla final en un bloque de código completo listo para copiar, seguido de un ejemplo corto de variables sugeridas.`,
    tags: ["Metaprompting", "Avanzado", "Ingeniería de Prompts", "System Prompt"],
    isFavorite: true,
    suggestedVariables: [
      { name: "rol_deseado_prompt", description: "Qué tipo de experto quieres que cree la IA", defaultValue: "Un auditor del código de contratos de criptomonedas de Ethereum enfocado en seguridad y exploits" }
    ]
  },
  {
    title: "Conversor de Prompts de una Palabra a Avanzado",
    description: "Toma frases vagas como 'hazme una dieta' o 'escribe un post' y las transforma en prompts potentes con metas claras, rol e hitos.",
    category: "Asistente de Prompts",
    promptText: `Eres un refinador de lenguaje y arquitecto cognitivo senior. Yo te proporciono una frase vaga, sorda o floja y tú la reconstruyes de inmediato bajo un formato hiperespecífico que contenga Rol, Contexto, Instrucciones Paso a Paso, Ejemplos de Guía y Salida Solicitada.

Frase Vaga / Promo Simple:
"""
{{frase_vaga}}
"""

Genera:
- **El Prompt Optimizado Completo:** Diseñado en segunda persona, sumamente ordenado, limpio, que utiliza marcadores de bloque claros y variables de configuración.
- Explica qué 3 elementos de precisión técnica le hacían falta a la "{{frase_vaga}}" para obtener las mejores conclusiones posibles del modelo (ej: falta de alcance, de límites éticos o de voz corporativa).`,
    tags: ["Optimización", "Refinador", "Ingeniería de Prompts", "Educativo"],
    isFavorite: false,
    suggestedVariables: [
      { name: "frase_vaga", description: "La instrucción vaga a mejorar", defaultValue: "hazme un post de instagram de una pizzería de barrio" }
    ]
  },
  {
    title: "Optimizador de System Prompts para Modelos LLM",
    description: "Refina instrucciones de sistema débiles agregando consistencia, asertividad verbal, mitigación de alucinaciones y estructura sólida.",
    category: "Asistente de Prompts",
    promptText: `Eres un ingeniero sénior de alineación de Inteligencia Artificial. Optimiza la siguiente instrucción de sistema (System Instruction o Custom Instructions) para que el modelo siga las instrucciones de forma estricta y evite desvíos lógicos en chats extensos:

Instrucción de Sistema Bruta:
"""
{{system_prompt_bruto}}
"""

Por favor reescríbela de forma imperativa utilizando verbos de acción contundentes. Agrega:
- Directrices para mitigar la alucinación (si el modelo no sabe algo, debe declararlo con humildad).
- Patrones de pensamiento lógico antes de emitir cualquier juicio formal.
- Límites firmes en la longitud y densidad de las conclusiones para optimizar los tokens de respuesta.`,
    tags: ["System Prompt", "Instrucciones", "Avisos de Sistema", "AI Tuning"],
    isFavorite: false,
    suggestedVariables: [
      { name: "system_prompt_bruto", description: "Pauta o comportamiento de sistema bruto", defaultValue: "Quiero que seas un profesor divertido de matemáticas que responda las dudas de niños de escuela." }
    ]
  },
  {
    title: "Generador de Ejemplos en Pocos Pasos (Few-shot Generator)",
    description: "Crea conjuntos de ejemplos sintéticos equilibrados de entrada y salida para inyectar en tus prompts y entrenar al LLM en el acto.",
    category: "Asistente de Prompts",
    promptText: `Eres un Científico de Datos especializado en Curación de Datos e Ingeniería de Pocos Pasos (Few-shot Learning).
Para que una Inteligencia Artificial aprenda a responder exactamente en el estilo, formato y lógica de negocio requerido, necesito proporcionar ejemplos sintonizados de entrada/salida.

Tarea del Modelo a entrenar: "{{tarea_del_modelo}}"
Estilo/Formato de salida esperado: "{{estilo_esperado_few_shot}}"

Genera un conjunto de exactamente 3 pares de ejemplos realistas y variados con el formato:
\`\`\`
ENTRADA DE EJEMPLO: [...]
SALIDA DE EJEMPLO: [...]
\`\`\`
Asegúrate de que los ejemplos cubran tanto casos sencillos como escenarios ligeramente más complejos de la tarea descrita.`,
    tags: ["Few-shot", "Ejemplos", "Fine-tuning", "Estructura de Datos"],
    isFavorite: false,
    suggestedVariables: [
      { name: "tarea_del_modelo", description: "Qué labor específica debe hacer la IA", defaultValue: "Clasificar correos electrónicos en tres categorías: Soporte, Venta, o Spam" },
      { name: "estilo_esperado_few_shot", description: "El formato exacto que deseas de respuesta", defaultValue: "Un solo tag en mayúsculas entre corchetes seguido de un resumen de 10 palabras" }
    ]
  },
  {
    title: "Prompt de Ingeniería de Contexto",
    description: "Diseña plantillas inteligentes que le enseñan a los LLMs a limitar su lectura de contexto y enfocarse únicamente en fragmentos clave de tus fuentes.",
    category: "Asistente de Prompts",
    promptText: `Actúa como un Ingeniero de Contexto y Optimizador de Ventana de Tokens de LLMs (RAG Optimizer).
Quiero que estructures una pauta limitante para que el modelo IA solo procese el bloque que se le declare explícitamente como fuente documental, ignorando sus bases de entrenamiento en caso de disputas.

Regla o Axioma que debe regir el comportamiento: "{{axioma_regla_contexto}}"

Genera un aviso de sistema (System Wrap) que obligue al modelo a:
1. Basar su respuesta al 100% y de forma referencial en los delimitadores de inicio y cierre de contexto declarados (ej: \`[START_CONTEXT]\` y \`[END_CONTEXT]\`).
2. Marcar explícitamente 'INFORMACIÓN NO ENCONTRADA' si el documento fuente no contiene la respuesta exacta a la pregunta planteada, cancelando cualquier inferencia propia especulativa.`,
    tags: ["Ventana de Contexto", "RAG", "Tokens", "Alineamiento", "Inferencia"],
    isFavorite: false,
    suggestedVariables: [
      { name: "axioma_regla_contexto", description: "Tema o regla de validación de fuentes", defaultValue: "Solo se deben responder preguntas cuyas verdades estén contenidas en el manual de usuario provisto" }
    ]
  },

  // ==================== GENERAL (5 Prompts) ====================
  {
    title: "Brainstorming Ilimitado de Ideas de Alto Impacto",
    description: "Supera la hoja en blanco con ráfagas de ideas creativas, contraintuitivas, estructuradas bajo marcos de innovación de diseño.",
    category: "General",
    promptText: `Actúa como un Diseñador de Innovación, Facilitador de Design Thinking y Creativo Publicitario de nivel senior. Tu misión es generar una ráfaga masiva de ideas innovadoras e impactantes en relación con:

Temática Creativa: "{{tema_brainstorming}}"

Por favor estructura tus propuestas en 3 marcos directos de innovación:
1. **Marcos de Disrupción Inversa (Crazy 8s adaptados):** 5 ideas que cambien por completo las reglas comunes y desafíen lo establecido en "{{tema_brainstorming}}".
2. **La Idea de Mayor Viabilidad de Mercado:** Una propuesta sólida, realista y sumamente económica de fundar que tenga alta tracción inmediata.
3. **El Enfoque Comodín (Futurista):** Una solución radical con tecnologías de vanguardia que parezca sacada de la ciencia ficción para crear marca emocional.`,
    tags: ["Brainstorming", "Innovación", "Creatividad", "Ideas"],
    isFavorite: true,
    suggestedVariables: [
      { name: "tema_brainstorming", description: "Cuál es el eje o reto del que necesitas ideas", defaultValue: "Maneras ecológicas e ingeniosas de enviar mercancías para marcas locales de café de especialidad" }
    ]
  },
  {
    title: "Explicador Interactivo para Niños o Principiantes",
    description: "Explica conceptos hipercomplejos (ej: física cuántica, cadena de bloques, APIs) mediante una historia atractiva y metáforas adaptadas de nivel básico.",
    category: "General",
    promptText: `Actúa como un Divulgador Científico galardonado, experto en el método Feynman de educación adaptada para niños de 8 años de edad o principiantes curiosos.

Concepto Académico / Técnico a Explicar: "{{concepto_pesado_explicar}}"

Tu respuesta debe componerse de las siguientes partes didácticas y visuales:
1. **La Metáfora de Oro (El Mundo del Juego):** Describe el concepto usando juguetes, mascotas o situaciones cotidianas que entienda cualquier niño en un parque.
2. **La Fábula Corta:** Una mini-historia dramatizada donde los protagonistas resuelven una aventura aplicando el principio detrás de "{{concepto_pesado_explicar}}".
3. **Preguntas divertidas de verificación de lectura:** 3 preguntas cortas interactivas para que el aprendiz ponga a prueba su comprensión inmediata jugando.`,
    tags: ["Feynman", "Educación", "Analogías", "Didáctico", "Divulgación"],
    isFavorite: false,
    suggestedVariables: [
      { name: "concepto_pesado_explicar", description: "El término complejo de digerir", defaultValue: "La Cadena de Bloques (Blockchain)" }
    ]
  },
  {
    title: "Tomador de Notas Ejecutivo y de Minutas",
    description: "Toma cualquier audio transcrito crudo de tus reuniones y genera resúmenes con acuerdos, listas de tareas de control e hitos.",
    category: "General",
    promptText: `Actúa como un Secretario Ejecutivo de la Junta de Directores de una empresa Fortune 500. Tu labor es refinar, ordenar y resumir de forma impecable el siguiente texto de una transcripción cruda de reunión:

Transcripción Cruda de la Junta:
"""
{{transcripcion_junta}}
"""

Por favor estructúrala en los siguientes bloques profesionales:
1. **Resumen Ejecutivo Corto (Minuta de 3 Líneas):** El núcleo de lo que se trató en la sesión.
2. **Tablero de Tareas con Responsables:** Un listado en formato lista de check de compromisos individuales tomados y fechas críticas mencionadas.
3. **Hitos de Decisión:** Qué decisiones formales se tomaron y cuáles quedaron aplazadas para la siguiente sesión corporativa.`,
    tags: ["Minuta de Reunión", "Negocios", "Productividad", "Anotaciones"],
    isFavorite: false,
    suggestedVariables: [
      { name: "transcripcion_junta", description: "Pega la transcripción cruda del audio aquí", defaultValue: "Juan dice que las bases de datos están listas el lunes pero Ana duda por las pruebas... al final quedamos en posponer el lanzamiento técnico al miércoles y que Juan valide el log de docker" }
    ]
  },
  {
    title: "Planificador de Itinerarios de Viaje a la Medida",
    description: "Crea rutas turísticas óptimas por día, indicando lugares turísticos, restaurantes recomendados y tips de transporte.",
    category: "General",
    promptText: `Actúa como un Guía Turístico local de alto perfil y Conserje de Hoteles de 5 Estrellas.
Diseña el itinerario de viaje perfecto para visitar la ciudad de: "{{ciudad_destino}}".

Por favor adapta la planificación al siguiente perfil grupal:
- Duración de la estadía: **{{dias_viaje}} días**
- Estilo o Tipo de Viaje ideal: **{{estilo_viaje}}**

Quiero que organices el tour con:
- Rutas detalladas día por día (Mañana, Tarde, Noche) estructuradas geográficamente para no perder valioso tiempo de transporte.
- Sugerencias de restaurantes de comida local auténtica y gemas ocultas que los turistas comunes suelen ignorar de forma rotunda.
- 3 reglas de oro de seguridad, etiqueta local y transporte rápido en "{{ciudad_destino}}".`,
    tags: ["Viajes", "Itinerario", "Turismo", "Planificación", "Organizador"],
    isFavorite: false,
    suggestedVariables: [
      { name: "ciudad_destino", description: "La ciudad que vas a explorar", defaultValue: "Kioto, Japón" },
      { name: "dias_viaje", description: "Duración de tu estadía", defaultValue: "4" },
      { name: "estilo_viaje", description: "Preferencia de viaje (ej: Histórico y Cultural, Aventurero, Familiar, Gastronómico de lujo)", defaultValue: "Histórico, Fotográfico y Gastronómico" }
    ]
  },
  {
    title: "Asistente de Redacción de Correos Formales",
    description: "Escribe o responde correos electrónicos complejos o delicados en un tono asertivo, educado y altamente diplomático.",
    category: "General",
    promptText: `Eres un experto en comunicación asertiva, protocolo corporativo y negociación en frío. Tu tarea es componer o responder de forma ideal un correo electrónico sobre el siguiente asunto:

Detalle de la Comunicación:
"{{motivo_correo}}"

El correo redactado debe cumplir estrictamente con los siguientes requisitos:
- **Tono:** Educado, extremadamente asertivo, diplomático pero firme, estableciendo límites maduros.
- **Asunto del Correo:** 3 alternativas llamativas y respetuosas.
- **Estructura:** Saludo corporativo correcto, planteamiento fluido sin rodeos excesivos, llamado claro y facilitador de respuesta, y despedida profesional cuidada.`,
    tags: ["Email", "Correos Escolares o Profesionales", "Diplomacia", "Negociación"],
    isFavorite: false,
    suggestedVariables: [
      { name: "motivo_correo", description: "Explicación o respuesta que requieres enviar", defaultValue: "Pedir una extensión de tiempo comprensiva de 3 días para entregar el pipeline de backend a un cliente exigente" }
    ]
  }
];
