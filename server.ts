import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const port = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

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
  app.post("/api/ai/crear", async (req, res) => {
    try {
      const { description, targetRole, channelContext } = req.body;

      if (!description) {
        return res.status(400).json({ error: "La descripción es requerida" });
      }

      const promptInstructions = `
        Eres un experto Diseñador de Prompts (Prompt Engineer) de clase mundial.
        El usuario quiere crear un prompt para su biblioteca personal de prompts. Esto le servirá para su canal de YouTube donde enseña Inteligencia Artificial y para su uso diario.
        
        Su requerimiento: "${description}"
        ${targetRole ? `Rol objetivo de la IA en el prompt: "${targetRole}"` : ""}
        ${channelContext ? `Contexto del canal de YouTube/audiencia: "${channelContext}"` : ""}

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
        model: "gemini-3.5-flash",
        contents: promptInstructions,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "A catchy, descriptive title for the AI prompt in Spanish." },
              description: { type: Type.STRING, description: "A brief, clear summary of what the prompt accomplishes in Spanish." },
              promptText: { type: Type.STRING, description: "The full, high-quality markdown prompt text with placeholder variables enclosed in double curly brackets like {{variable_name}}." },
              category: { type: Type.STRING, description: "The category that best fits. Select exactly one of: YouTube, Marketing, Coding, Writing, or General." },
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

      res.json(JSON.parse(responseText));
    } catch (error) {
      console.error("Error creating prompt:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // API Route: Optimize an existing prompt
  app.post("/api/ai/optimizar", async (req, res) => {
    try {
      const { originalPromptText, comments } = req.body;

      if (!originalPromptText) {
        return res.status(400).json({ error: "El texto del prompt original es requerido" });
      }

      const promptInstructions = `
        Eres un experto Diseñador de Prompts (Prompt Engineer) de nivel senior.
        Mejora y optimiza el siguiente prompt de usuario para que sea de nivel profesional y rinda extremadamente bien en modelos de IA modernos (como Gemini, GPT, Claude, etc.):
        
        PROMPT ORIGINAL:
        """
        ${originalPromptText}
        """

        ${comments ? `Instrucciones específicas de optimización del usuario: "${comments}"` : ""}

        Aplica las mejores técnicas de Prompt Engineering:
        - Estructura clara (Roles, Contexto, Instrucciones paso a paso, Instrucciones de Salida, Ejemplo).
        - Añade variables envolviendo texto genérico en doble llaves, por ejemplo: {{tema_especifico}} o {{formato_salida}} para flexibilizarlo.
        - Elimina ambigüedades.
        - Añade pautas de tono, longitud y estilo.
        - Si el original contiene variables, consérvalas o mejoralas pero mantén la sintaxis {{nombre_variable}}.
        Toda la respuesta de descripción, título, y variables debe estar en español español neutro y claro.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptInstructions,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "An updated catchy title for this optimized prompt in Spanish." },
              description: { type: Type.STRING, description: "A brief description of what this optimized prompt does." },
              promptText: { type: Type.STRING, description: "The complete optimized markdown prompt, including double curly braced placeholders {{placeholder}}." },
              category: { type: Type.STRING, description: "The category that best fits. Select exactly one of: YouTube, Marketing, Coding, Writing, or General." },
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

      res.json(JSON.parse(responseText));
    } catch (error) {
      console.error("Error optimizing prompt:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Vite development vs. Production serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve index.html for all other routes to support client routing
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`[Server] Full-stack application running on http://localhost:${port}`);
  });
}

startServer();
