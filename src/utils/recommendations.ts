import { CategoryFilter, Prompt } from "../types";

export interface PromptEventScore {
  score: number;
  uses: number;
  copies: number;
  edits: number;
}

export interface LocalRecommendation {
  prompt: Prompt;
  score: number;
  reasons: string[];
}

interface BuildLocalRecommendationsInput {
  prompts: Prompt[];
  goal: string;
  selectedCategory: CategoryFilter;
  selectedTags: string[];
  promptEventScores: Map<string, PromptEventScore>;
  limit?: number;
}

export function buildLocalRecommendations({
  prompts,
  goal,
  selectedCategory,
  selectedTags,
  promptEventScores,
  limit = 5
}: BuildLocalRecommendationsInput): LocalRecommendation[] {
  const cleanGoal = goal.toLowerCase().trim();
  const terms = cleanGoal
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3);

  return prompts
    .map((prompt) => {
      let score = 0;
      const reasons: string[] = [];
      const title = prompt.title?.toLowerCase() || "";
      const description = prompt.description?.toLowerCase() || "";
      const promptText = prompt.promptText?.toLowerCase() || "";
      const tags = (prompt.tags || []).map((tag) => tag.toLowerCase());
      const eventScore = promptEventScores.get(prompt.id);

      if (selectedCategory !== "Todas" && selectedCategory !== "Favoritos" && prompt.category === selectedCategory) {
        score += 10;
        reasons.push(`Coincide con la categoria ${selectedCategory}.`);
      }

      if (selectedTags.length > 0) {
        const matchedTags = selectedTags.filter((tag) => tags.includes(tag.toLowerCase()));
        if (matchedTags.length > 0) {
          score += matchedTags.length * 12;
          reasons.push(`Comparte etiquetas: ${matchedTags.join(", ")}.`);
        }
      }

      if (prompt.isFavorite) {
        score += 6;
        reasons.push("Esta marcado como favorito.");
      }

      terms.forEach((term) => {
        if (title.includes(term)) score += 12;
        if (tags.some((tag) => tag.includes(term))) score += 10;
        if (description.includes(term)) score += 6;
        if (promptText.includes(term)) score += 3;
      });

      if (terms.length > 0) {
        const matchedTerms = terms.filter((term) =>
          title.includes(term) ||
          description.includes(term) ||
          promptText.includes(term) ||
          tags.some((tag) => tag.includes(term))
        );
        if (matchedTerms.length > 0) {
          reasons.push(`Responde a tu objetivo: ${matchedTerms.slice(0, 4).join(", ")}.`);
        }
      }

      if ((prompt.likesCount || 0) > 0) {
        score += Math.min(prompt.likesCount || 0, 8);
        reasons.push("Tiene senales positivas de la comunidad.");
      }

      if (eventScore && eventScore.score > 0) {
        score += Math.min(eventScore.score, 18);
        const usageBits = [
          eventScore.uses > 0 ? `${eventScore.uses} usos` : "",
          eventScore.copies > 0 ? `${eventScore.copies} copias` : "",
          eventScore.edits > 0 ? `${eventScore.edits} ediciones` : ""
        ].filter(Boolean);
        reasons.push(`Lo has usado antes: ${usageBits.join(", ")}.`);
      }

      if (score === 0 && !cleanGoal && selectedCategory === "Todas" && selectedTags.length === 0) {
        score = prompt.isFavorite ? 4 : 1;
        reasons.push(prompt.isFavorite ? "Buen candidato por favorito." : "Candidato general de tu biblioteca.");
      }

      return {
        prompt,
        score,
        reasons: reasons.slice(0, 3)
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
