import express from "express";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import { GoogleGenAI, Type } from "@google/genai";
import firebaseConfig from "./firebase-applet-config.json";

// Load environment variables
dotenv.config();

const port = 3000;
const geminiModel = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const promptCategories = ["YouTube", "Marketing", "Programación", "Redacción", "IA Agentes", "IA Imágenes", "IA Videos", "Acompañante Personal", "Asistente de Prompts", "General"] as const;
const categoryOptions = promptCategories.join(", ");
const aiWindowMs = Number(process.env.AI_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000);
const aiMaxRequests = Number(process.env.AI_RATE_LIMIT_MAX || 20);
const aiBuckets = new Map<string, { count: number; resetAt: number }>();
const newsCache = new Map<string, { items: NewsItemPayload[]; expiresAt: number }>();
let certCache: { certs: Record<string, string>; expiresAt: number } | null = null;

interface AuthenticatedRequest extends express.Request {
  user?: {
    uid: string;
    email?: string;
  };
}

interface GeneratedPromptPayload {
  title: string;
  description: string;
  promptText: string;
  category: (typeof promptCategories)[number];
  tags: string[];
  suggestedVariables: {
    name: string;
    description: string;
    defaultValue?: string;
  }[];
}

interface RecommendationCandidate {
  id: string;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  score?: number;
  reasons?: string[];
}

interface AIRecommendationPayload {
  recommendations: {
    id: string;
    reason: string;
    confidence: number;
  }[];
  gapAnalysis: string;
  suggestedNewPrompt?: {
    title: string;
    description: string;
    category: GeneratedPromptPayload["category"];
    tags: string[];
    promptText: string;
    suggestedVariables: GeneratedPromptPayload["suggestedVariables"];
  };
}

type NewsCategory = "ai" | "tech" | "startups" | "devtools" | "design" | "hackathons";
type NewsLanguage = "en" | "es" | "unknown";

interface NewsItemPayload {
  id: string;
  title: string;
  titleEs?: string;
  summary?: string;
  summaryEs?: string;
  url: string;
  source: string;
  imageUrl?: string;
  publishedAt?: string;
  language: NewsLanguage;
  category: NewsCategory;
  tags: string[];
}

const newsQueries: Record<NewsCategory, { hn: string; gnews: string; tags: string[]; spanishContext: string }> = {
  ai: {
    hn: "artificial intelligence OR generative AI OR agents OR LLM",
    gnews: "artificial intelligence OR generative AI OR AI agents",
    tags: ["ia", "llm", "agentes"],
    spanishContext: "Inteligencia artificial, modelos generativos, agentes o automatizacion."
  },
  tech: {
    hn: "technology OR software OR product",
    gnews: "technology OR software OR product",
    tags: ["tech", "producto"],
    spanishContext: "Tecnologia, software, producto o tendencias digitales."
  },
  startups: {
    hn: "startup OR founder OR venture capital",
    gnews: "startup OR founder OR venture capital",
    tags: ["startups", "negocio"],
    spanishContext: "Startups, founders, inversion o nuevas empresas tecnologicas."
  },
  devtools: {
    hn: "developer tools OR open source OR API OR framework",
    gnews: "developer tools OR open source OR API OR framework",
    tags: ["devtools", "codigo"],
    spanishContext: "Herramientas para desarrolladores, APIs, frameworks u open source."
  },
  design: {
    hn: "design tools OR UX OR product design OR creative AI",
    gnews: "design tools OR UX OR product design OR creative AI",
    tags: ["diseno", "ux", "creatividad"],
    spanishContext: "Diseno, UX, herramientas creativas o contenido visual con IA."
  },
  hackathons: {
    hn: "hackathon OR builders OR developer challenge OR AI competition",
    gnews: "hackathon OR developer challenge OR AI competition",
    tags: ["hackathon", "oportunidades"],
    spanishContext: "Hackathons, retos para builders, competencias o oportunidades para crear equipo."
  }
};

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, "=");
  return Buffer.from(padded, "base64");
}

async function getFirebaseCerts() {
  const now = Date.now();
  if (certCache && certCache.expiresAt > now) {
    return certCache.certs;
  }

  const response = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com");
  if (!response.ok) {
    throw new Error("No se pudieron obtener certificados de Firebase.");
  }

  const cacheControl = response.headers.get("cache-control") || "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAge = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 60 * 60 * 1000;
  certCache = {
    certs: await response.json() as Record<string, string>,
    expiresAt: now + maxAge
  };
  return certCache.certs;
}

async function verifyFirebaseIdToken(idToken: string) {
  const [encodedHeader, encodedPayload, encodedSignature] = idToken.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error("Token Firebase inválido.");
  }

  const header = JSON.parse(decodeBase64Url(encodedHeader).toString("utf8"));
  const payload = JSON.parse(decodeBase64Url(encodedPayload).toString("utf8"));
  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Token Firebase inválido.");
  }

  const certs = await getFirebaseCerts();
  const cert = certs[header.kid];
  if (!cert) {
    throw new Error("Certificado Firebase no encontrado.");
  }

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();

  if (!verifier.verify(cert, decodeBase64Url(encodedSignature))) {
    throw new Error("Firma Firebase inválida.");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const projectId = firebaseConfig.projectId;
  if (payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}` || payload.exp < nowSeconds || payload.iat > nowSeconds + 60 || !payload.sub) {
    throw new Error("Token Firebase expirado o no autorizado.");
  }

  return {
    uid: String(payload.sub),
    email: payload.email ? String(payload.email) : undefined
  };
}

async function requireFirebaseAuth(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.header("authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return res.status(401).json({ error: "Debes iniciar sesión para usar funciones de IA." });
    }

    req.user = await verifyFirebaseIdToken(match[1]);
    next();
  } catch (error) {
    console.error("AI auth error:", error instanceof Error ? error.message : String(error));
    res.status(401).json({ error: "Sesión inválida o expirada. Vuelve a iniciar sesión." });
  }
}

function rateLimitAI(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  const now = Date.now();
  const userKey = req.user?.uid || req.ip || "anonymous";
  const bucket = aiBuckets.get(userKey);

  if (!bucket || bucket.resetAt <= now) {
    aiBuckets.set(userKey, { count: 1, resetAt: now + aiWindowMs });
    return next();
  }

  if (bucket.count >= aiMaxRequests) {
    return res.status(429).json({ error: "Límite temporal de IA alcanzado. Inténtalo nuevamente en unos minutos." });
  }

  bucket.count += 1;
  next();
}

function requireTextField(value: unknown, name: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${name} es requerido.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new Error(`${name} supera el largo permitido de ${maxLength} caracteres.`);
  }
  return trimmed;
}

function normalizeGeneratedPrompt(rawText: string): GeneratedPromptPayload {
  const parsed = JSON.parse(rawText) as Partial<GeneratedPromptPayload> & { category?: string };
  const categoryAliases: Record<string, GeneratedPromptPayload["category"]> = {
    Coding: "Programación",
    Programming: "Programación",
    Writing: "Redacción",
    Images: "IA Imágenes",
    Videos: "IA Videos"
  };
  const requestedCategory = parsed.category || "General";
  const category = promptCategories.includes(requestedCategory as GeneratedPromptPayload["category"])
    ? requestedCategory as GeneratedPromptPayload["category"]
    : categoryAliases[requestedCategory] || "General";

  const promptText = requireTextField(parsed.promptText, "promptText", 10000);
  const detectedVariables = new Set(
    Array.from(promptText.matchAll(/\{\{\s*([a-zA-Z0-9_ñÑáéíóúÁÉÍÓÚ-]+)\s*\}\}/g)).map((match) => match[1].trim())
  );

  return {
    title: requireTextField(parsed.title, "title", 150),
    description: typeof parsed.description === "string" ? parsed.description.trim().slice(0, 1000) : "",
    promptText,
    category,
    tags: Array.isArray(parsed.tags)
      ? Array.from(new Set(parsed.tags.filter((tag) => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean))).slice(0, 10)
      : [],
    suggestedVariables: Array.isArray(parsed.suggestedVariables)
      ? parsed.suggestedVariables
          .filter((variable) => variable && typeof variable.name === "string" && typeof variable.description === "string")
          .filter((variable) => detectedVariables.size === 0 || detectedVariables.has(variable.name.trim()))
          .slice(0, 20)
          .map((variable) => ({
            name: variable.name.trim(),
            description: variable.description.trim().slice(0, 300),
            defaultValue: typeof variable.defaultValue === "string" ? variable.defaultValue.slice(0, 300) : undefined
          }))
      : []
  };
}

function normalizeRecommendationResponse(rawText: string, candidates: RecommendationCandidate[]): AIRecommendationPayload {
  const parsed = JSON.parse(rawText) as Partial<AIRecommendationPayload>;
  const candidateIds = new Set(candidates.map((candidate) => candidate.id));
  const recommendations = Array.isArray(parsed.recommendations)
    ? parsed.recommendations
        .filter((item) => item && typeof item.id === "string" && candidateIds.has(item.id))
        .map((item) => ({
          id: item.id,
          reason: typeof item.reason === "string" ? item.reason.trim().slice(0, 500) : "Puede servir para este objetivo.",
          confidence: Math.max(0, Math.min(100, Number(item.confidence) || 0))
        }))
        .slice(0, 5)
    : [];

  let suggestedNewPrompt: AIRecommendationPayload["suggestedNewPrompt"];
  if (parsed.suggestedNewPrompt?.promptText) {
    suggestedNewPrompt = normalizeGeneratedPrompt(JSON.stringify({
      ...parsed.suggestedNewPrompt,
      category: parsed.suggestedNewPrompt.category || "General",
      tags: parsed.suggestedNewPrompt.tags || [],
      suggestedVariables: parsed.suggestedNewPrompt.suggestedVariables || []
    }));
  }

  return {
    recommendations,
    gapAnalysis: typeof parsed.gapAnalysis === "string"
      ? parsed.gapAnalysis.trim().slice(0, 1000)
      : "Gemini no detecto huecos claros con la informacion disponible.",
    suggestedNewPrompt
  };
}

function normalizeRecommendationCandidates(rawCandidates: unknown): RecommendationCandidate[] {
  if (!Array.isArray(rawCandidates)) return [];
  return rawCandidates
    .filter((candidate) => candidate && typeof candidate === "object")
    .map((candidate) => {
      const item = candidate as Record<string, unknown>;
      return {
        id: typeof item.id === "string" ? item.id.trim().slice(0, 128) : "",
        title: typeof item.title === "string" ? item.title.trim().slice(0, 150) : "",
        description: typeof item.description === "string" ? item.description.trim().slice(0, 500) : "",
        category: typeof item.category === "string" ? item.category.trim().slice(0, 50) : "General",
        tags: Array.isArray(item.tags)
          ? item.tags.filter((tag) => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean).slice(0, 8)
          : [],
        score: Number(item.score) || 0,
        reasons: Array.isArray(item.reasons)
          ? item.reasons.filter((reason) => typeof reason === "string").map((reason) => reason.trim()).filter(Boolean).slice(0, 4)
          : []
      };
    })
    .filter((candidate) => candidate.id && candidate.title)
    .slice(0, 8);
}

function getNewsCategory(value: unknown): NewsCategory {
  return typeof value === "string" && value in newsQueries ? value as NewsCategory : "ai";
}

function detectNewsLanguage(text: string): NewsLanguage {
  const normalized = text.toLowerCase();
  const spanishSignals = [" el ", " la ", " los ", " las ", " una ", " para ", " con ", " inteligencia ", " tecnologia ", " diseno ", " como "];
  const englishSignals = [" the ", " and ", " for ", " with ", " about ", " startup ", " artificial ", " intelligence ", " design "];
  const spanishScore = spanishSignals.filter((signal) => normalized.includes(signal)).length;
  const englishScore = englishSignals.filter((signal) => normalized.includes(signal)).length;
  if (spanishScore > englishScore) return "es";
  if (englishScore > 0) return "en";
  return "unknown";
}

function buildSpanishNewsContext(category: NewsCategory, source: string, language: NewsLanguage) {
  const base = newsQueries[category].spanishContext;
  if (language === "es") {
    return `Resumen editorial: contenido en espanol sobre ${base.toLowerCase()}`;
  }
  if (language === "en") {
    return `Resumen editorial: contenido en ingles sobre ${base.toLowerCase()} Ideal para detectar ideas de prompts, oportunidades o temas para newsletter.`;
  }
  return `Resumen editorial: fuente ${source} relacionada con ${base.toLowerCase()}`;
}

function normalizeNewsUrl(url: unknown) {
  if (typeof url !== "string") return "";
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

async function fetchHackerNewsItems(category: NewsCategory): Promise<NewsItemPayload[]> {
  const queryConfig = newsQueries[category];
  const url = new URL("https://hn.algolia.com/api/v1/search_by_date");
  url.searchParams.set("query", queryConfig.hn);
  url.searchParams.set("tags", "story");
  url.searchParams.set("hitsPerPage", "24");

  const response = await fetch(url, {
    headers: { "User-Agent": "biblioteca-de-prompts-news/1.0" }
  });
  if (!response.ok) {
    throw new Error(`Hacker News respondio ${response.status}`);
  }

  const payload = await response.json() as { hits?: Array<Record<string, unknown>> };
  return (payload.hits || [])
    .map((hit) => {
      const title = typeof hit.title === "string" ? hit.title.trim() : "";
      const storyUrl = normalizeNewsUrl(hit.url);
      const discussionUrl = typeof hit.objectID === "string" ? `https://news.ycombinator.com/item?id=${hit.objectID}` : "";
      const finalUrl = storyUrl || discussionUrl;
      const language = detectNewsLanguage(title);
      return {
        id: `hn-${String(hit.objectID || crypto.createHash("sha1").update(`${title}-${finalUrl}`).digest("hex"))}`,
        title,
        summary: typeof hit.story_text === "string" ? hit.story_text.replace(/<[^>]*>/g, " ").trim().slice(0, 280) : "",
        summaryEs: buildSpanishNewsContext(category, "Hacker News", language),
        url: finalUrl,
        source: "Hacker News",
        publishedAt: typeof hit.created_at === "string" ? hit.created_at : "",
        language,
        category,
        tags: queryConfig.tags
      } satisfies NewsItemPayload;
    })
    .filter((item) => item.title && item.url);
}

async function fetchGNewsItems(category: NewsCategory, language: "en" | "es"): Promise<NewsItemPayload[]> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return [];

  const queryConfig = newsQueries[category];
  const url = new URL("https://gnews.io/api/v4/search");
  url.searchParams.set("q", queryConfig.gnews);
  url.searchParams.set("lang", language);
  url.searchParams.set("max", "10");
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url);
  if (!response.ok) {
    console.warn(`GNews ${language} respondio ${response.status}`);
    return [];
  }

  const payload = await response.json() as { articles?: Array<Record<string, unknown>> };
  return (payload.articles || [])
    .map((article) => {
      const title = typeof article.title === "string" ? article.title.trim() : "";
      const finalUrl = normalizeNewsUrl(article.url);
      return {
        id: `gnews-${crypto.createHash("sha1").update(`${title}-${finalUrl}`).digest("hex")}`,
        title,
        summary: typeof article.description === "string" ? article.description.trim().slice(0, 320) : "",
        summaryEs: language === "es"
          ? (typeof article.description === "string" ? article.description.trim().slice(0, 320) : buildSpanishNewsContext(category, "GNews", "es"))
          : buildSpanishNewsContext(category, "GNews", "en"),
        url: finalUrl,
        source: typeof (article.source as Record<string, unknown> | undefined)?.name === "string"
          ? String((article.source as Record<string, unknown>).name)
          : "GNews",
        imageUrl: normalizeNewsUrl(article.image),
        publishedAt: typeof article.publishedAt === "string" ? article.publishedAt : "",
        language,
        category,
        tags: queryConfig.tags
      } satisfies NewsItemPayload;
    })
    .filter((item) => item.title && item.url);
}

async function getNewsItems(category: NewsCategory, language: "all" | "en" | "es") {
  const cacheKey = `${category}:${language}`;
  const cached = newsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.items;
  }

  const [hnItems, gnewsEnItems, gnewsEsItems] = await Promise.all([
    language === "es" ? Promise.resolve([]) : fetchHackerNewsItems(category).catch((error) => {
      console.warn("Hacker News fetch failed:", error instanceof Error ? error.message : String(error));
      return [];
    }),
    language === "es" ? Promise.resolve([]) : fetchGNewsItems(category, "en"),
    language === "en" ? Promise.resolve([]) : fetchGNewsItems(category, "es")
  ]);

  const seenUrls = new Set<string>();
  const items = [...gnewsEsItems, ...gnewsEnItems, ...hnItems]
    .filter((item) => {
      if (seenUrls.has(item.url)) return false;
      seenUrls.add(item.url);
      return true;
    })
    .sort((a, b) => Date.parse(b.publishedAt || "0") - Date.parse(a.publishedAt || "0"))
    .slice(0, 36);

  newsCache.set(cacheKey, {
    items,
    expiresAt: Date.now() + 10 * 60 * 1000
  });
  return items;
}

export async function createApp(options: { enableVite?: boolean; serveStatic?: boolean } = {}) {
  const enableVite = options.enableVite ?? process.env.NODE_ENV !== "production";
  const serveStatic = options.serveStatic ?? process.env.NODE_ENV === "production";
  const app = express();
  app.use(express.json({ limit: "64kb" }));

  // Check if API key is present
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY environment variable is not set. AI interactions won't work.");
  }

  // Initialize Gemini client (server side)
  const ai = new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  app.get("/api/news", async (req, res) => {
    try {
      const category = getNewsCategory(req.query.category);
      const language = req.query.language === "en" || req.query.language === "es"
        ? req.query.language
        : "all";
      const items = await getNewsItems(category, language);
      res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");
      res.json({
        category,
        language,
        hasPremiumSource: Boolean(process.env.GNEWS_API_KEY),
        items
      });
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({ error: "No se pudieron cargar las noticias en este momento." });
    }
  });

  // API Route: Create a new prompt based on descriptions
  app.use("/api/ai", requireFirebaseAuth, rateLimitAI);

  app.post("/api/ai/crear", async (req, res) => {
    try {
      const { description, targetRole, channelContext } = req.body;
      const safeDescription = requireTextField(description, "La descripción", 1000);
      const safeTargetRole = typeof targetRole === "string" ? targetRole.trim().slice(0, 120) : "";
      const safeChannelContext = typeof channelContext === "string" ? channelContext.trim().slice(0, 250) : "";

      const promptInstructions = `
        Eres un experto Diseñador de Prompts (Prompt Engineer) de clase mundial.
        El usuario quiere crear un prompt para su biblioteca personal de prompts. Esto le servirá para su canal de YouTube donde enseña Inteligencia Artificial y para su uso diario.
        
        Su requerimiento: "${safeDescription}"
        ${safeTargetRole ? `Rol objetivo de la IA en el prompt: "${safeTargetRole}"` : ""}
        ${safeChannelContext ? `Contexto del canal de YouTube/audiencia: "${safeChannelContext}"` : ""}

        Diseña un prompt altamente profesional y estructurado con las mejores prácticas:
        1. Define un ROL claro y asombroso.
        2. Proporciona INSTRUCCIONES paso a paso, claras y lógicas.
        3. Define RESTRICCIONES y pautas de formato para el resultado.
        4. Usa marcadores de posición dinámicos usando doble llave, por ejemplo: {{tema}}, {{estilo}}, o {{audiencia}} para que el usuario pueda rellenarlos en un formulario interactivo.
        5. Devuelve el prompt estructurado en secciones usando Markdown encabezados (#, ##).
        6. Agrega un ejemplo de cómo completarlo paso a paso.
        Toda la respuesta de descripción, título, y variables debe estar en español español neutro y claro.
      `;

      const response = await ai.models.generateContent({
        model: geminiModel,
        contents: promptInstructions,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "A catchy, descriptive title for the AI prompt in Spanish." },
              description: { type: Type.STRING, description: "A brief, clear summary of what the prompt accomplishes in Spanish." },
              promptText: { type: Type.STRING, description: "The full, high-quality markdown prompt text with placeholder variables enclosed in double curly brackets like {{variable_name}}." },
              category: { type: Type.STRING, description: `The category that best fits. Select exactly one of: ${categoryOptions}.` },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "A list of 3-5 tags relevant to the prompt, e.g., ['video', 'seo', 'creative']."
              },
              suggestedVariables: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Name of the variable as declared inside double curly brackets in promptText, e.g., 'tema' (no spaces, all lowercase)." },
                    description: { type: Type.STRING, description: "Explanation in Spanish of what values should be placed here." },
                    defaultValue: { type: Type.STRING, description: "A smart or typical default fallback value in Spanish." }
                  },
                  required: ["name", "description"]
                },
                description: "List of variables defined in promptText using double curly brackets {{variable_name}}."
              }
            },
            required: ["title", "description", "promptText", "category", "tags", "suggestedVariables"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No se pudo obtener una respuesta válida del modelo de IA.");
      }

      res.json(normalizeGeneratedPrompt(responseText));
    } catch (error) {
      console.error("Error creating prompt:", error);
      const message = error instanceof Error ? error.message : String(error);
      res.status(message.includes("requerido") || message.includes("largo permitido") ? 400 : 500).json({ error: message });
    }
  });

  // API Route: Optimize an existing prompt
  app.post("/api/ai/optimizar", async (req, res) => {
    try {
      const { originalPromptText, comments } = req.body;
      const safeOriginalPromptText = requireTextField(originalPromptText, "El texto del prompt original", 10000);
      const safeComments = typeof comments === "string" ? comments.trim().slice(0, 500) : "";

      const promptInstructions = `
        Eres un experto Diseñador de Prompts (Prompt Engineer) de nivel senior.
        Mejora y optimiza el siguiente prompt de usuario para que sea de nivel profesional y rinda extremadamente bien en modelos de IA modernos (como Gemini, GPT, Claude, etc.):
        
        PROMPT ORIGINAL:
        """
        ${safeOriginalPromptText}
        """

        ${safeComments ? `Instrucciones específicas de optimización del usuario: "${safeComments}"` : ""}

        Aplica las mejores técnicas de Prompt Engineering:
        - Estructura clara (Roles, Contexto, Instrucciones paso a paso, Instrucciones de Salida, Ejemplo).
        - Añade variables envolviendo texto genérico en doble llaves, por ejemplo: {{tema_especifico}} o {{formato_salida}} para flexibilizarlo.
        - Elimina ambigüedades.
        - Añade pautas de tono, longitud y estilo.
        - Si el original contiene variables, consérvalas o mejoralas pero mantén la sintaxis {{nombre_variable}}.
        Toda la respuesta de descripción, título, y variables debe estar en español español neutro y claro.
      `;

      const response = await ai.models.generateContent({
        model: geminiModel,
        contents: promptInstructions,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "An updated catchy title for this optimized prompt in Spanish." },
              description: { type: Type.STRING, description: "A brief description of what this optimized prompt does." },
              promptText: { type: Type.STRING, description: "The complete optimized markdown prompt, including double curly braced placeholders {{placeholder}}." },
              category: { type: Type.STRING, description: `The category that best fits. Select exactly one of: ${categoryOptions}.` },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "A list of 3-5 tags relevant to the prompt."
              },
              suggestedVariables: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Name of the variable as found in double curly brackets in promptText, e.g., 'tema'." },
                    description: { type: Type.STRING, description: "Explanation in Spanish of what values should represent." },
                    defaultValue: { type: Type.STRING, description: "A realistic default starting value for the variable." }
                  },
                  required: ["name", "description"]
                },
                description: "Variables found inside the newly optimized prompt text."
              }
            },
            required: ["title", "description", "promptText", "category", "tags", "suggestedVariables"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No se pudo obtener una respuesta con el modelo de IA.");
      }

      res.json(normalizeGeneratedPrompt(responseText));
    } catch (error) {
      console.error("Error optimizing prompt:", error);
      const message = error instanceof Error ? error.message : String(error);
      res.status(message.includes("requerido") || message.includes("largo permitido") ? 400 : 500).json({ error: message });
    }
  });

  app.post("/api/ai/recomendar", async (req, res) => {
    try {
      const safeGoal = requireTextField(req.body.goal, "El objetivo", 500);
      const candidates = normalizeRecommendationCandidates(req.body.candidates);
      if (candidates.length === 0) {
        throw new Error("Se requiere al menos un candidato local para mejorar la recomendacion.");
      }

      const rawFilters = req.body.filters && typeof req.body.filters === "object"
        ? req.body.filters as Record<string, unknown>
        : {};
      const filters = {
        category: typeof rawFilters.category === "string" ? rawFilters.category.slice(0, 50) : "Todas",
        tags: Array.isArray(rawFilters.tags)
          ? rawFilters.tags.filter((tag) => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean).slice(0, 8)
          : []
      };

      const promptInstructions = `
        Eres una capa opcional de recomendacion para una biblioteca personal de prompts.
        Tu trabajo es mejorar el ranking local, no reemplazarlo.

        Objetivo del usuario:
        "${safeGoal}"

        Filtros activos:
        ${JSON.stringify(filters, null, 2)}

        Candidatos prefiltrados por el recomendador local:
        ${JSON.stringify(candidates, null, 2)}

        Reglas:
        - Recomienda solo IDs que existan en los candidatos.
        - No inventes IDs.
        - Explica por que sirve cada candidato de forma breve y accionable.
        - Si los candidatos no cubren bien el objetivo, explica el hueco y sugiere un nuevo prompt.
        - No necesitas ni debes pedir el texto completo de los prompts para esta recomendacion.
        - Responde en espanol neutro.
      `;

      const response = await ai.models.generateContent({
        model: geminiModel,
        contents: promptInstructions,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "ID exacto de un candidato recibido." },
                    reason: { type: Type.STRING, description: "Razon breve y accionable en espanol." },
                    confidence: { type: Type.NUMBER, description: "Confianza de 0 a 100." }
                  },
                  required: ["id", "reason", "confidence"]
                }
              },
              gapAnalysis: {
                type: Type.STRING,
                description: "Resumen del hueco principal de la biblioteca para este objetivo."
              },
              suggestedNewPrompt: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  promptText: { type: Type.STRING },
                  category: { type: Type.STRING, description: `Una categoria de: ${categoryOptions}.` },
                  tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  suggestedVariables: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        defaultValue: { type: Type.STRING }
                      },
                      required: ["name", "description"]
                    }
                  }
                },
                required: ["title", "description", "promptText", "category", "tags", "suggestedVariables"]
              }
            },
            required: ["recommendations", "gapAnalysis"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No se pudo obtener una recomendacion valida del modelo de IA.");
      }

      res.json(normalizeRecommendationResponse(responseText, candidates));
    } catch (error) {
      console.error("Error recommending prompts:", error);
      const message = error instanceof Error ? error.message : String(error);
      res.status(message.includes("requiere") || message.includes("requerido") || message.includes("largo permitido") ? 400 : 500).json({ error: message });
    }
  });

  // Vite development vs. Production serving
  if (enableVite) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (serveStatic) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve index.html for all other routes to support client routing
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  return app;
}

async function startServer() {
  const app = await createApp();

  app.listen(port, "0.0.0.0", () => {
    console.log(`[Server] Full-stack application running on http://localhost:${port}`);
  });
}

if (process.env.VERCEL !== "1") {
  startServer();
}
