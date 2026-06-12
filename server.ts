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
