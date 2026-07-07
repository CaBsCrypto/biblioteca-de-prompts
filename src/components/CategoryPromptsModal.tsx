import React, { useState } from "react";
import { X, Copy, Play, Search, Shield, Wrench, CheckCircle2, Youtube, Target, Pencil, Cpu, Image, Film, User as UserIcon, HelpCircle, FileText } from "lucide-react";
import type { Prompt } from "../types";
import type { User } from "firebase/auth";

interface CategoryPromptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  prompts: Prompt[];
  onCopyFilledPrompt: (prompt: Prompt) => void;
  onUsePrompt: (prompt: Prompt, context: string) => void;
  user: User | null;
}

export default function CategoryPromptsModal({
  isOpen,
  onClose,
  category,
  prompts,
  onCopyFilledPrompt,
  onUsePrompt,
  user
}: CategoryPromptsModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  if (!isOpen) return null;

  const categoryPrompts = prompts.filter(
    (p) => p.category.toLowerCase() === category.toLowerCase()
  );

  const filteredPrompts = categoryPrompts.filter(
    (p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Custom metadata and styling for each category
  const getCategoryMeta = (cat: string) => {
    switch (cat) {
      case "Refactorización":
        return {
          icon: <Wrench className="text-indigo-400" size={24} />,
          gradient: "from-indigo-600 to-indigo-900",
          textColor: "text-indigo-400",
          description: "Optimización continua del código para mejorar la legibilidad, mantenibilidad y rendimiento sin alterar el comportamiento externo del software.",
          tips: [
            "Ejecuta auditorías semanales de complejidad en controladores y middlewares.",
            "Reduce la complejidad ciclomática segmentando funciones largas en helpers puros.",
            "Utiliza los prompts de refactorización para re-arquitecturar código legacy a estándares modernos."
          ]
        };
      case "Seguridad":
        return {
          icon: <Shield className="text-rose-400" size={24} />,
          gradient: "from-rose-600 to-rose-900",
          textColor: "text-rose-400",
          description: "Auditorías de código estricto y escaneo de vulnerabilidades para proteger tus desarrollos contra ataques y fugas de información.",
          tips: [
            "Verifica que los inputs de tus endpoints estén sanitizados para evitar inyecciones SQL/NoSQL/OS.",
            "Escanea archivos de configuración buscando API keys y credenciales hardcodeadas.",
            "Valida la robustez del control de acceso (IDOR) y las cabeceras HTTP de red mediante middlewares como Helmet."
          ]
        };
      case "Buenas Prácticas":
        return {
          icon: <CheckCircle2 className="text-emerald-400" size={24} />,
          gradient: "from-emerald-600 to-emerald-900",
          textColor: "text-emerald-400",
          description: "Principios de diseño limpio, arquitectura acoplada flexible y estándares recomendados por la industria (Clean Code).",
          tips: [
            "Mantén tus métodos y clases apegados a los principios SOLID y DRY (Don't Repeat Yourself).",
            "Aplica el principio KISS para evitar la sobreingeniería en lógicas de negocio cotidianas.",
            "Enriquece tu codebase con auto-documentación nativa (JSDoc o Docstrings) para asistir a tu equipo en el IDE."
          ]
        };
      case "YouTube":
        return {
          icon: <Youtube className="text-red-400" size={24} />,
          gradient: "from-red-650 to-red-900",
          textColor: "text-red-400",
          description: "Estrategias de guionización, títulos de alto gancho, descripciones SEO y llamadas a la acción para creadores de contenido de tecnología e IA.",
          tips: [
            "Usa ganchos (hooks) emocionales en los primeros 15 segundos de tus guiones.",
            "Genera múltiples variantes de títulos para realizar pruebas A/B de CTR.",
            "Adapta el tono al arquetipo de tu audiencia meta en YouTube."
          ]
        };
      case "Marketing":
        return {
          icon: <Target className="text-amber-400" size={24} />,
          gradient: "from-amber-600 to-amber-900",
          textColor: "text-amber-450",
          description: "Copys publicitarios persuasivos, embudos de conversión, estrategias de crecimiento y optimización de campañas.",
          tips: [
            "Aplica fórmulas clásicas de copywriting como AIDA (Atención, Interés, Deseo, Acción).",
            "Segmenta el copy según el nivel de conciencia del cliente potencial.",
            "Valida que la propuesta de valor de tu producto sea clara y libre de tecnicismos."
          ]
        };
      case "Programación":
        return {
          icon: <Cpu className="text-blue-400" size={24} />,
          gradient: "from-blue-600 to-blue-900",
          textColor: "text-blue-400",
          description: "Generación de código estructurado, scripting ágil, resolución de algoritmos complejos y configuración de entornos.",
          tips: [
            "Define claramente las tecnologías y versiones que deseas utilizar antes de generar código.",
            "Solicita pruebas unitarias complementarias para garantizar la cobertura del código generado.",
            "Divide tareas complejas en pasos lógicos guiados por el prompt de programación."
          ]
        };
      default:
        return {
          icon: <HelpCircle className="text-slate-400" size={24} />,
          gradient: "from-slate-600 to-slate-900",
          textColor: "text-slate-300",
          description: "Prompts generales y herramientas auxiliares multipropósito para tu flujo de trabajo diario.",
          tips: [
            "Filtra por etiquetas (tags) para refinar tu búsqueda dentro de esta categoría.",
            "Crea remixes privados de tus prompts favoritos para adaptarlos a tu negocio."
          ]
        };
    }
  };

  const meta = getCategoryMeta(category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-[#0f172a] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Banner de Categoría */}
        <div className={`p-6 bg-gradient-to-r ${meta.gradient} text-white flex items-start justify-between relative`}>
          <div className="space-y-2 z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/35 border border-white/10 text-xs font-bold uppercase tracking-wider">
              {meta.icon}
              <span>{category}</span>
            </span>
            <h3 className="text-xl md:text-2xl font-black">{category === "Refactorización" || category === "Seguridad" || category === "Buenas Prácticas" ? `Suite de ${category}` : `Categoría: ${category}`}</h3>
            <p className="text-xs text-white/80 leading-relaxed font-normal">{meta.description}</p>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-black/25 hover:bg-black/45 text-white/80 hover:text-white transition-all cursor-pointer border border-white/5 active:scale-95"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 flex-1 overflow-hidden">
          
          {/* Panel Lateral de Recomendaciones e Info */}
          <div className="p-6 bg-[#182235]/65 border-r border-slate-800/80 overflow-y-auto space-y-5 hidden md:block">
            <div>
              <h4 className="text-[11px] font-black uppercase text-slate-450 tracking-wider">Pautas de Validación</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Utiliza estas recomendaciones al ejecutar las plantillas en tus proyectos:
              </p>
            </div>
            
            <ul className="space-y-3.5">
              {meta.tips.map((tip, idx) => (
                <li key={idx} className="flex gap-2 text-xs leading-relaxed text-slate-300">
                  <span className="text-indigo-400 font-extrabold select-none">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>

            <div className="pt-4 border-t border-slate-800/60 text-[10px] text-slate-500 font-medium">
              💡 <span className="font-bold">Remix de un click:</span> Puedes copiar las plantillas directamente o hacer clic en "Usar" para cargar el rellenador de variables interactivo en vivo.
            </div>
          </div>

          {/* Listado de Prompts */}
          <div className="col-span-2 p-6 overflow-hidden flex flex-col gap-4">
            
            {/* Buscador interno */}
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                <Search size={14} />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Buscar dentro de ${category}...`}
                className="w-full text-xs rounded-xl border border-slate-700 bg-slate-900/60 pl-9 pr-4 py-2.5 focus:outline-none focus:border-indigo-455 transition-all text-white placeholder-slate-500 font-sans"
              />
            </div>

            {/* Listado scrollable */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 scroll-smooth custom-scrollbar">
              {filteredPrompts.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <FileText className="mx-auto text-slate-600" size={32} />
                  <p className="text-xs font-bold">No se encontraron prompts en esta sección.</p>
                </div>
              ) : (
                filteredPrompts.map((prompt) => (
                  <div 
                    key={prompt.id}
                    className="p-4 rounded-2xl border border-slate-800 bg-[#1e293b]/25 hover:bg-[#1e293b]/45 transition-all flex flex-col gap-3 group relative hover:border-slate-700/80"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h5 className="text-sm font-extrabold text-white group-hover:text-indigo-400 transition-colors leading-tight">
                          {prompt.title}
                        </h5>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {prompt.description}
                        </p>
                      </div>
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 items-center shrink-0">
                        {prompt.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/85 flex items-center justify-between gap-3">
                      <span className="text-[10px] text-slate-500">
                        Por {prompt.authorName || "Biblioteca"}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onCopyFilledPrompt(prompt)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                          title="Copiar prompt al portapapeles"
                        >
                          <Copy size={12} />
                          <span>Copiar</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onUsePrompt(prompt, "category_hub");
                          }}
                          className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-555 text-white text-xs font-extrabold rounded-lg flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-md shadow-indigo-650/15"
                        >
                          <Play size={10} fill="currentColor" />
                          <span>Usar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
