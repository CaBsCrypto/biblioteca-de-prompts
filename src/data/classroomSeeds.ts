import { DEFAULT_PROMPTS } from "../data";
import type { Classroom, ClassroomPromptPackItem } from "../typesCommunity";

type SeedPrompt = ClassroomPromptPackItem;

const CLASS_PROMPT_TITLES = [
  "Brainstorming Ilimitado de Ideas de Alto Impacto",
  "Creador de Metaprompts (El Creador de Prompts Maestros)",
  "Conversor de Prompts de una Palabra a Avanzado",
  "Auditor de Prompt: Claridad, Contexto y Riesgos",
  "Prompt de Ingeniería de Contexto",
  "Resumidor Analítico de Trabajos de Investigación",
  "Tutorial IA Paso a Paso: De Cero a Resultado",
  "LinkedIn IA: Post de Autoridad sin Humo",
  "Tomador de Notas Ejecutivo y de Minutas",
  "Planificador de Guiones de Videos de Venta (VSL)",
  "Diseñador de Agente IA Personal",
  "Caso de Uso Real IA: Antes, Después y ROI"
];

function toClassPrompt(prompt: typeof DEFAULT_PROMPTS[number]): SeedPrompt {
  let notes = "Consejo didáctico: Pide a tus alumnos que identifiquen las variables y las rellenen con ejemplos reales antes de ejecutar el prompt.";
  if (prompt.title.includes("Brainstorming")) {
    notes = "Consejo didáctico: Ideal para comenzar la clase. Haz que los alumnos lo usen para generar ideas sobre proyectos del mundo real y seleccionen las 3 mejores.";
  } else if (prompt.title.includes("Metaprompts")) {
    notes = "Consejo didáctico: Explica a los estudiantes la diferencia entre un meta-prompt y un prompt normal. Muestra cómo la IA genera estructuras complejas.";
  } else if (prompt.title.includes("Auditor")) {
    notes = "Consejo didáctico: Usa este prompt para evaluar los prompts iniciales creados por los alumnos. Analicen juntos los riesgos identificados por la IA.";
  }
  return {
    title: prompt.title,
    description: prompt.description,
    promptText: prompt.promptText,
    category: prompt.category,
    tags: prompt.tags || [],
    isFavorite: false,
    suggestedVariables: prompt.suggestedVariables || [],
    teacherNotes: notes
  };
}

function buildPromptingClassPack(): SeedPrompt[] {
  const selected = CLASS_PROMPT_TITLES
    .map((title) => DEFAULT_PROMPTS.find((prompt) => prompt.title === title))
    .filter(Boolean)
    .map((prompt) => toClassPrompt(prompt!));

  if (selected.length >= 8) return selected.slice(0, 12);

  const fallback = DEFAULT_PROMPTS
    .filter((prompt) => {
      const searchable = [
        prompt.title,
        prompt.description,
        prompt.category,
        ...(prompt.tags || [])
      ].join(" ").toLocaleLowerCase("es");
      return ["prompt", "investig", "resum", "contenido", "agente", "present"].some((term) => searchable.includes(term));
    })
    .map(toClassPrompt);

  const seen = new Set<string>();
  return [...selected, ...fallback].filter((prompt) => {
    const key = prompt.title.trim().toLocaleLowerCase("es");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12);
}

export const CLASSROOM_SEEDS: Classroom[] = [
  {
    id: "prompting-universidad-v1",
    title: "Clase de Prompting - Universidad",
    description: "Pack privado para practicar prompting en vivo: ideacion, mejora, investigacion, contenido, automatizacion simple y proyecto final.",
    institution: "Universidad",
    eventDate: "2026-06-19",
    accessCode: "PROMPT-UNI",
    isActive: true,
    promptPack: buildPromptingClassPack()
  }
];

export function findClassroomByCode(code: string) {
  const normalizedCode = code.trim().toLocaleUpperCase("es");
  return CLASSROOM_SEEDS.find((classroom) =>
    classroom.isActive && classroom.accessCode.toLocaleUpperCase("es") === normalizedCode
  ) || null;
}

export function findClassroomById(classId: string) {
  return CLASSROOM_SEEDS.find((classroom) => classroom.id === classId && classroom.isActive) || null;
}
