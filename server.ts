import express from "express";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import { GoogleGenAI, Type } from "@google/genai";
import firebaseConfig from "./firebase-applet-config.json";

// Load environment variables
dotenv.config();

const port = Number(process.env.PORT || 3000);
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const promptCategories = ["YouTube", "Marketing", "Programación", "Redacción", "IA Agentes", "IA Imágenes", "IA Videos", "Acompañante Personal", "Asistente de Prompts", "Refactorización", "Seguridad", "Buenas Prácticas", "General"] as const;
const categoryOptions = promptCategories.join(", ");
const aiWindowMs = Number(process.env.AI_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000);
const aiMaxRequests = Number(process.env.AI_RATE_LIMIT_MAX || 20);
const aiBuckets = new Map<string, { count: number; resetAt: number }>();
const newsCache = new Map<string, { items: NewsItemPayload[]; expiresAt: number }>();
let certCache: { certs: Record<string, string>; expiresAt: number } | null = null;
const geminiTimeoutMs = Number(process.env.GEMINI_TIMEOUT_MS || 30_000);

// ─── OpenRouter config ────────────────────────────────────────────────────────
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

/** Models available via OpenRouter (curated list). */
export const OPENROUTER_MODELS: Array<{ id: string; name: string; provider: string; context: number }> = [
  { id: "anthropic/claude-sonnet-4-5",        name: "Claude Sonnet 4.5",     provider: "Anthropic",  context: 200_000 },
  { id: "anthropic/claude-opus-4",             name: "Claude Opus 4",        provider: "Anthropic",  context: 200_000 },
  { id: "openai/gpt-4o",                        name: "GPT-4o",               provider: "OpenAI",     context: 128_000 },
  { id: "openai/gpt-4o-mini",                   name: "GPT-4o Mini",          provider: "OpenAI",     context: 128_000 },
  { id: "google/gemini-2.5-flash",              name: "Gemini 2.5 Flash",     provider: "Google",     context: 1_048_576 },
  { id: "meta-llama/llama-3.3-70b-instruct",   name: "Llama 3.3 70B",        provider: "Meta",       context: 128_000 },
  { id: "mistralai/mixtral-8x22b-instruct",    name: "Mixtral 8x22B",        provider: "Mistral",    context: 65_536 },
  { id: "deepseek/deepseek-r1",                 name: "DeepSeek R1",          provider: "DeepSeek",   context: 128_000 },
];

/** Call OpenRouter chat-completion and return the text. */
async function callOpenRouter(
  model: string,
  systemPrompt: string,
  userMessage: string,
  signal?: AbortSignal
): Promise<string> {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY no configurada.");

  const resp = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://biblioteca.browns.studio",
      "X-Title": "Biblioteca de Prompts"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userMessage }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    }),
    signal
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => "");
    throw new Error(`OpenRouter ${resp.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await resp.json() as {
    choices?: Array<{ message?: { content?: string } }>
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenRouter devolvió respuesta vacía.");
  return text;
}

function pruneExpiredBuckets() {
  const now = Date.now();
  for (const [key, bucket] of aiBuckets) {
    if (bucket.resetAt <= now) aiBuckets.delete(key);
  }
  for (const [key, bucket] of newsBuckets) {
    if (bucket.resetAt <= now) newsBuckets.delete(key);
  }
}

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
    hn: "artificial intelligence",
    gnews: "artificial intelligence OR generative AI OR AI agents",
    tags: ["ia", "llm", "agentes"],
    spanishContext: "Inteligencia artificial, modelos generativos, agentes o automatizacion."
  },
  tech: {
    hn: "technology software",
    gnews: "technology OR software OR product",
    tags: ["tech", "producto"],
    spanishContext: "Tecnologia, software, producto o tendencias digitales."
  },
  startups: {
    hn: "startup founder",
    gnews: "startup OR founder OR venture capital",
    tags: ["startups", "negocio"],
    spanishContext: "Startups, founders, inversion o nuevas empresas tecnologicas."
  },
  devtools: {
    hn: "developer tools",
    gnews: "developer tools OR open source OR API OR framework",
    tags: ["devtools", "codigo"],
    spanishContext: "Herramientas para desarrolladores, APIs, frameworks u open source."
  },
  design: {
    hn: "design tools",
    gnews: "design tools OR UX OR product design OR creative AI",
    tags: ["diseno", "ux", "creatividad"],
    spanishContext: "Diseno, UX, herramientas creativas o contenido visual con IA."
  },
  hackathons: {
    hn: "hackathon",
    gnews: "hackathon OR developer challenge OR AI competition",
    tags: ["hackathon", "oportunidades"],
    spanishContext: "Hackathons, retos para builders, competencias o oportunidades para crear equipo."
  }
};

const hnFallbackQueries: Record<NewsCategory, string> = {
  ai: "AI",
  tech: "software",
  startups: "startup",
  devtools: "API",
  design: "UX",
  hackathons: "developer challenge"
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

const newsWindowMs = Number(process.env.NEWS_RATE_LIMIT_WINDOW_MS || 60 * 1000);
const newsMaxRequests = Number(process.env.NEWS_RATE_LIMIT_MAX || 30);
const newsBuckets = new Map<string, { count: number; resetAt: number }>();

function requireJson(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ct = req.headers["content-type"] || "";
  if (!ct.includes("application/json")) {
    return res.status(415).json({ error: "El cuerpo de la solicitud debe ser JSON (Content-Type: application/json)." });
  }
  next();
}

function rateLimitNews(req: express.Request, res: express.Response, next: express.NextFunction) {
  const now = Date.now();
  const key = req.ip || "anonymous";
  const bucket = newsBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    newsBuckets.set(key, { count: 1, resetAt: now + newsWindowMs });
    return next();
  }

  if (bucket.count >= newsMaxRequests) {
    return res.status(429).json({ error: "Demasiadas solicitudes de noticias. Inténtalo más tarde." });
  }

  bucket.count += 1;
  next();
}

function getClientIp(req: express.Request): string {
  const forwarded = req.header("x-forwarded-for");
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.header("x-real-ip");
  return typeof realIp === "string" && realIp.length > 0 ? realIp : (req.ip || "unknown");
}

function auditLog(event: string, details: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    ...details,
  };
  console.log(JSON.stringify(entry));
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
    Videos: "IA Videos",
    Refactoring: "Refactorización",
    Refactor: "Refactorización",
    Security: "Seguridad",
    Seguridad: "Seguridad",
    "Buenas Prácticas": "Buenas Prácticas",
    BestPractices: "Buenas Prácticas"
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
  const fetchHits = async (searchTerm: string) => {
    const url = new URL("https://hn.algolia.com/api/v1/search_by_date");
    url.searchParams.set("query", searchTerm);
    url.searchParams.set("tags", "story");
    url.searchParams.set("hitsPerPage", "24");

    const response = await fetch(url, {
      headers: { "User-Agent": "biblioteca-de-prompts-news/1.0" }
    });
    if (!response.ok) {
      throw new Error(`Hacker News respondio ${response.status}`);
    }

    const payload = await response.json() as { hits?: Array<Record<string, unknown>> };
    return payload.hits || [];
  };

  let hits = await fetchHits(queryConfig.hn);
  if (hits.length === 0) {
    hits = await fetchHits(hnFallbackQueries[category]);
  }

  return hits
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

async function fetchDevpostHackathons(): Promise<NewsItemPayload[]> {
  try {
    const response = await fetch("https://devpost.com/submission-periods.xml", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      }
    });
    if (!response.ok) throw new Error(`Devpost RSS respondio ${response.status}`);
    const xml = await response.text();

    const items: NewsItemPayload[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 24) {
      const itemContent = match[1];
      const title = (itemContent.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "")
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1")
        .trim();
      const link = (itemContent.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "").trim();
      const description = (itemContent.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "")
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1")
        .replace(/<[^>]*>/g, "")
        .trim()
        .slice(0, 320);
      const pubDate = (itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "").trim();

      if (title && link) {
        items.push({
          id: `devpost-${crypto.createHash("sha1").update(`${title}-${link}`).digest("hex")}`,
          title,
          summary: description || "Hackathon activo en la plataforma Devpost.",
          summaryEs: description || "Hackathon de desarrollo activo en Devpost.",
          url: link,
          source: "Devpost",
          imageUrl: "https://devpost-hackathon-images.s3.amazonaws.com/production/logos/original/devpost-logo.png",
          publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          language: "en",
          category: "hackathons",
          tags: ["hackathon", "devpost", "oportunidades"]
        });
      }
    }
    return items;
  } catch (error) {
    console.warn("Devpost RSS fetch failed:", error);
    return [];
  }
}

async function getNewsItems(category: NewsCategory, language: "all" | "en" | "es") {
  const cacheKey = `${category}:${language}`;
  const cached = newsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.items;
  }

  let devpostItems: NewsItemPayload[] = [];
  if (category === "hackathons") {
    devpostItems = await fetchDevpostHackathons().catch((err) => {
      console.warn("Devpost fetch failed:", err);
      return [];
    });
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
  const items = [...devpostItems, ...gnewsEsItems, ...gnewsEnItems, ...hnItems]
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
  if (!OPENROUTER_API_KEY) {
    console.info("[AI] OPENROUTER_API_KEY not set — using Gemini only.");
  } else {
    console.info(`[AI] OpenRouter active. ${OPENROUTER_MODELS.length} models available.`);
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

  /**
   * Unified AI call: uses OpenRouter when `modelId` is an OpenRouter model ID,
   * falls back to Gemini otherwise.
   */
  async function callAI(
    modelId: string | undefined,
    systemPrompt: string,
    userMessage: string,
    geminiCall: () => Promise<string>,
    signal?: AbortSignal
  ): Promise<string> {
    const isOpenRouterModel = modelId && OPENROUTER_MODELS.some(m => m.id === modelId);
    if (isOpenRouterModel && OPENROUTER_API_KEY) {
      return callOpenRouter(modelId!, systemPrompt, userMessage, signal);
    }
    return geminiCall();
  }

  // ─── GET /api/ai/models — list available AI models ─────────────────────────
  app.get("/api/ai/models", (_req, res) => {
    res.json({
      openrouterAvailable: Boolean(OPENROUTER_API_KEY),
      geminiModel,
      models: OPENROUTER_API_KEY ? OPENROUTER_MODELS : [],
      defaultModel: OPENROUTER_API_KEY ? OPENROUTER_MODELS[0].id : "gemini"
    });
  });

  app.get("/api/news", rateLimitNews, async (req, res) => {
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
  app.use("/api/ai", requireJson, requireFirebaseAuth, rateLimitAI);

  app.post("/api/ai/crear", async (req: AuthenticatedRequest, res) => {
    try {
      const { description, targetRole, channelContext, modelId } = req.body;
      const safeDescription = requireTextField(description, "La descripción", 1000);
      const safeTargetRole = typeof targetRole === "string" ? targetRole.trim().slice(0, 120) : "";
      const safeChannelContext = typeof channelContext === "string" ? channelContext.trim().slice(0, 250) : "";
      const safeModelId = typeof modelId === "string" ? modelId.trim().slice(0, 100) : undefined;

      auditLog("ai:crear:request", {
        uid: req.user?.uid,
        ip: getClientIp(req),
        descriptionLength: safeDescription.length,
        hasTargetRole: Boolean(safeTargetRole),
        hasChannelContext: Boolean(safeChannelContext),
        model: safeModelId || geminiModel,
      });

      const systemPrompt = `Eres un experto Diseñador de Prompts (Prompt Engineer) de clase mundial. Respondes siempre en JSON válido con los campos: title, description, promptText, category, tags, suggestedVariables.`;

      const userMessage = `
El usuario quiere crear un prompt para su biblioteca personal. Esto le servirá para su canal de YouTube donde enseña IA y para su uso diario.

Requerimiento: "${safeDescription}"
${safeTargetRole ? `Rol objetivo de la IA en el prompt: "${safeTargetRole}"` : ""}
${safeChannelContext ? `Contexto del canal de YouTube/audiencia: "${safeChannelContext}"` : ""}

Diseña un prompt altamente profesional y estructurado:
1. Define un ROL claro y asombroso.
2. Proporciona INSTRUCCIONES paso a paso, claras y lógicas.
3. Define RESTRICCIONES y pautas de formato para el resultado.
4. Usa variables con doble llave: {{tema}}, {{estilo}}, {{audiencia}}.
5. Devuelve el prompt estructurado con Markdown (#, ##).
6. Toda la respuesta en español neutro.

Categorías válidas: ${categoryOptions}

Responde SOLO con JSON:
{
  "title": "...",
  "description": "...",
  "promptText": "...",
  "category": "...",
  "tags": ["..."],
  "suggestedVariables": [{"name":"...","description":"...","defaultValue":"..."}]
}`;

      const abortCrear = new AbortController();
      const timeoutCrear = setTimeout(() => abortCrear.abort(), geminiTimeoutMs);

      let responseText: string;
      try {
        responseText = await callAI(
          safeModelId,
          systemPrompt,
          userMessage,
          async () => {
            const r = await ai.models.generateContent({
              model: geminiModel,
              contents: userMessage,
              config: {
                abortSignal: abortCrear.signal,
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    promptText: { type: Type.STRING },
                    category: { type: Type.STRING, description: `One of: ${categoryOptions}` },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    suggestedVariables: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, defaultValue: { type: Type.STRING } }, required: ["name", "description"] } }
                  },
                  required: ["title", "description", "promptText", "category", "tags", "suggestedVariables"]
                }
              }
            });
            if (!r.text) throw new Error("Respuesta vacía de Gemini.");
            return r.text;
          },
          abortCrear.signal
        );
      } finally {
        clearTimeout(timeoutCrear);
      }

      if (!responseText) throw new Error("No se pudo obtener una respuesta válida del modelo de IA.");
      res.json(normalizeGeneratedPrompt(responseText));
    } catch (error) {
      console.error("Error creating prompt:", error);
      const message = error instanceof Error ? error.message : String(error);
      const isValidationError = message.includes("requerido") || message.includes("largo permitido");
      res.status(isValidationError ? 400 : 500).json({
        error: isValidationError ? message : "Ocurrió un error inesperado en el asistente de IA. Por favor, inténtalo de nuevo más tarde."
      });
    }
  });

  // API Route: Optimize an existing prompt
  app.post("/api/ai/optimizar", async (req: AuthenticatedRequest, res) => {
    try {
      const { originalPromptText, promptText, comments, instructions, modelId } = req.body;
      // Accept both field names for backwards compat
      const rawText = originalPromptText || promptText;
      const rawInstructions = comments || instructions;
      const safeOriginalPromptText = requireTextField(rawText, "El texto del prompt original", 10000);
      const safeComments = typeof rawInstructions === "string" ? rawInstructions.trim().slice(0, 500) : "";
      const safeModelId = typeof modelId === "string" ? modelId.trim().slice(0, 100) : undefined;

      auditLog("ai:optimizar:request", {
        uid: req.user?.uid,
        ip: getClientIp(req),
        promptLength: safeOriginalPromptText.length,
        hasComments: Boolean(safeComments),
        model: safeModelId || geminiModel,
      });

      const systemPrompt = `Eres un experto Prompt Engineer de nivel senior. Mejora el prompt del usuario aplicando las mejores prácticas: roles claros, variables con {{doble_llave}}, formato estructurado en Markdown, tono y restricciones definidas. Respondes SOLO con JSON válido.`;

      const userMessage = `
Mejora y optimiza el siguiente prompt para que sea de nivel profesional:

PROMPT ORIGINAL:
"""
${safeOriginalPromptText}
"""

${safeComments ? `Instrucciones específicas: "${safeComments}"` : ""}

Categorías válidas: ${categoryOptions}

Responde SOLO con JSON:
{
  "title": "...",
  "description": "...",
  "promptText": "...mejorado...",
  "category": "...",
  "tags": ["..."],
  "suggestedVariables": [{"name":"...","description":"...","defaultValue":"..."}]
}`;



      const abortOptimizar = new AbortController();
      const timeoutOptimizar = setTimeout(() => abortOptimizar.abort(), geminiTimeoutMs);

      let responseText: string;
      try {
        responseText = await callAI(
          safeModelId,
          systemPrompt,
          userMessage,
          async () => {
            const r = await ai.models.generateContent({
              model: geminiModel,
              contents: userMessage,
              config: {
                abortSignal: abortOptimizar.signal,
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    promptText: { type: Type.STRING },
                    category: { type: Type.STRING },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    suggestedVariables: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, defaultValue: { type: Type.STRING } }, required: ["name", "description"] } }
                  },
                  required: ["title", "description", "promptText", "category", "tags", "suggestedVariables"]
                }
              }
            });
            if (!r.text) throw new Error("Respuesta vacía de Gemini.");
            return r.text;
          },
          abortOptimizar.signal
        );
      } finally {
        clearTimeout(timeoutOptimizar);
      }

      if (!responseText) throw new Error("No se pudo obtener una respuesta con el modelo de IA.");
      res.json(normalizeGeneratedPrompt(responseText));
    } catch (error) {
      console.error("Error optimizing prompt:", error);
      const message = error instanceof Error ? error.message : String(error);
      const isValidationError = message.includes("requerido") || message.includes("largo permitido");
      res.status(isValidationError ? 400 : 500).json({
        error: isValidationError ? message : "Ocurrió un error inesperado en el asistente de IA. Por favor, inténtalo de nuevo más tarde."
      });
    }
  });

  app.post("/api/ai/recomendar", async (req: AuthenticatedRequest, res) => {
    try {
      const safeGoal = requireTextField(req.body.goal, "El objetivo", 500);
      const candidates = normalizeRecommendationCandidates(req.body.candidates);
      if (candidates.length === 0) {
        throw new Error("Se requiere al menos un candidato local para mejorar la recomendacion.");
      }

      auditLog("ai:recomendar:request", {
        uid: req.user?.uid,
        ip: getClientIp(req),
        goalLength: safeGoal.length,
        candidateCount: candidates.length,
      });

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

      const abortRecomendar = new AbortController();
      const timeoutRecomendar = setTimeout(() => abortRecomendar.abort(), geminiTimeoutMs);
      let response: Awaited<ReturnType<typeof ai.models.generateContent>>;
      try {
        response = await ai.models.generateContent({
          model: geminiModel,
          contents: promptInstructions,
          config: {
            abortSignal: abortRecomendar.signal,
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
      } finally {
        clearTimeout(timeoutRecomendar);
      }

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No se pudo obtener una recomendacion valida del modelo de IA.");
      }

      res.json(normalizeRecommendationResponse(responseText, candidates));
    } catch (error) {
      console.error("Error recommending prompts:", error);
      const message = error instanceof Error ? error.message : String(error);
      const isValidationError = message.includes("requiere") || message.includes("requerido") || message.includes("largo permitido");
      res.status(isValidationError ? 400 : 500).json({
        error: isValidationError ? message : "Ocurrió un error inesperado en el asistente de IA. Por favor, inténtalo de nuevo más tarde."
      });
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

  // Periodically prune expired rate-limit entries to prevent memory leaks
  setInterval(pruneExpiredBuckets, 15 * 60 * 1000).unref();

  app.listen(port, "0.0.0.0", () => {
    console.log(`[Server] Full-stack application running on http://localhost:${port}`);
  });
}

if (process.env.VERCEL !== "1") {
  startServer();
}
