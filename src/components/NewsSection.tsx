import { Bookmark, Copy, ExternalLink, FileText, Globe2, Languages, Lightbulb, MessageSquare, Newspaper, RefreshCw, Search, Send, Sparkles, Target, Trash2, Users, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNews, type NewsLanguageFilter } from "../hooks/useNews";
import type { NewsCategory, NewsItem, SavedIdea } from "../typesCommunity";
import { safeIdeaId } from "../utils/news";

const CATEGORIES: Array<{ id: NewsCategory; label: string; helper: string }> = [
  { id: "ai", label: "IA", helper: "Modelos, agentes y automatizacion" },
  { id: "tech", label: "Tech", helper: "Software, plataformas y producto" },
  { id: "startups", label: "Startups", helper: "Founders, inversion y negocio" },
  { id: "devtools", label: "DevTools", helper: "APIs, frameworks y open source" },
  { id: "design", label: "Diseno", helper: "UX, visuales y creative AI" },
  { id: "hackathons", label: "Hackathons", helper: "Retos, competencias y equipos" }
];

const LANGUAGE_FILTERS: Array<{ id: NewsLanguageFilter; label: string }> = [
  { id: "all", label: "Todo" },
  { id: "es", label: "ES" },
  { id: "en", label: "EN" }
];

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  ai: "IA",
  tech: "Tech",
  startups: "Startups",
  devtools: "DevTools",
  design: "Diseno",
  hackathons: "Hackathons"
};

function formatDate(value?: string) {
  if (!value) return "Reciente";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "Reciente";
  return new Intl.DateTimeFormat("es", { month: "short", day: "numeric" }).format(new Date(timestamp));
}

function languageLabel(item: NewsItem) {
  if (item.language === "es") return "Espanol";
  if (item.language === "en") return "Ingles";
  return "Idioma no detectado";
}

interface NewsSectionProps {
  savedIdeas: SavedIdea[];
  savedIdeaIds: Set<string>;
  loadingSavedIdeas: boolean;
  onCreatePromptFromNews: (item: NewsItem) => void;
  onCreateForumPostFromNews: (item: NewsItem, intent?: "idea" | "question" | "team") => void;
  onCreateForumDigest: (items: NewsItem[], category: NewsCategory) => void;
  onCreatePublicBriefing: (items: NewsItem[], category: NewsCategory) => void;
  onCreateNewsletterFromNews: (items: NewsItem[], category: NewsCategory) => void;
  onSaveIdeaFromNews: (item: NewsItem) => void;
  onDeleteSavedIdea: (idea: SavedIdea) => void;
  onCreatePromptFromSavedIdea: (idea: SavedIdea) => void;
  onCreateForumPostFromSavedIdea: (idea: SavedIdea, intent?: "idea" | "question" | "team") => void;
  onSummarizeNews: (item: NewsItem) => void;
  onTranslateNews: (item: NewsItem) => void;
  onDetectHackathonOpportunity: (item: NewsItem) => void;
}

export default function NewsSection({
  savedIdeas,
  savedIdeaIds,
  loadingSavedIdeas,
  onCreatePromptFromNews,
  onCreateForumPostFromNews,
  onCreateForumDigest,
  onCreatePublicBriefing,
  onCreateNewsletterFromNews,
  onSaveIdeaFromNews,
  onDeleteSavedIdea,
  onCreatePromptFromSavedIdea,
  onCreateForumPostFromSavedIdea,
  onSummarizeNews,
  onTranslateNews,
  onDetectHackathonOpportunity
}: NewsSectionProps) {
  const [category, setCategory] = useState<NewsCategory>("ai");
  const [language, setLanguage] = useState<NewsLanguageFilter>("all");
  const [search, setSearch] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const { items, loading, error, hasPremiumSource } = useNews(category, language);

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [
        item.title,
        item.titleEs || "",
        item.summary || "",
        item.summaryEs || "",
        item.source,
        ...item.tags
      ].join(" ").toLowerCase().includes(needle)
    );
  }, [items, search]);

  const digestItems = useMemo(() => filteredItems.slice(0, 5), [filteredItems]);
  const actionQueueItems = useMemo(() => {
    const scoreItem = (item: NewsItem) => {
      const text = [
        item.title,
        item.titleEs || "",
        item.summary || "",
        item.summaryEs || "",
        item.source,
        item.category,
        ...item.tags
      ].join(" ").toLowerCase();

      let score = 0;
      if (item.category === "hackathons") score += 5;
      if (item.category === category) score += 2;
      if (text.includes("hackathon") || text.includes("challenge") || text.includes("competition")) score += 4;
      if (text.includes("agent") || text.includes("ai") || text.includes("open source")) score += 2;
      if (text.includes("startup") || text.includes("funding") || text.includes("launch")) score += 2;
      if (item.summaryEs) score += 1;
      return score;
    };

    return [...filteredItems]
      .map((item, index) => ({ item, score: scoreItem(item), index }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.index - b.index;
      })
      .slice(0, 3)
      .map(({ item }) => item);
  }, [category, filteredItems]);
  const digestText = useMemo(() => {
    const lines = digestItems.map((item, index) => {
      const summary = item.summaryEs || item.summary || "Sin resumen disponible.";
      return `${index + 1}. ${item.title}\nFuente: ${item.source}\n${summary}\n${item.url}`;
    });
    return [
      `Briefing ${CATEGORY_LABELS[category]} - Biblioteca de Prompts`,
      "",
      ...lines
    ].join("\n\n");
  }, [category, digestItems]);

  const handleCopyDigest = async () => {
    await navigator.clipboard.writeText(digestText);
    setCopyState("copied");
    setTimeout(() => setCopyState("idle"), 1800);
  };

  const renderSaveIdeaButton = (item: NewsItem, variant: "card" | "compact" = "card") => {
    const itemSaved = savedIdeaIds.has(safeIdeaId(item));
    const baseClass = variant === "compact"
      ? "inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-black cursor-pointer"
      : "inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition-all cursor-pointer";
    const stateClass = itemSaved
      ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
      : "border-amber-500/25 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15";

    return (
      <button
        type="button"
        onClick={() => onSaveIdeaFromNews(item)}
        className={`${baseClass} ${stateClass}`}
      >
        <Bookmark size={variant === "compact" ? 11 : 13} fill={itemSaved ? "currentColor" : "none"} />
        {variant === "compact" && itemSaved ? "Guardada" : "Guardar"}
      </button>
    );
  };

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <div className="surface-card rounded-2xl sm:rounded-3xl border border-slate-800/80 bg-slate-900/55 p-4 sm:p-5 shadow-2xl md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-300">
              <Newspaper size={12} />
              Radar IA y tecnologia
            </span>
            <h2 className="text-2xl font-black leading-tight text-white md:text-4xl">
              Noticias para convertir tendencias en prompts, posts y oportunidades.
            </h2>
            <p className="text-sm leading-relaxed text-slate-400">
              La mayoria del radar tech nace en ingles. Aqui lo mostramos con idioma original y una lectura editorial en espanol para que puedas usarlo rapido.
            </p>
          </div>

          <div className="surface-nested-card rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
            <div className="flex items-center gap-2 text-xs font-black text-slate-200">
              <Languages size={15} className="text-cyan-300" />
              Bilingue por diseno
            </div>
            <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-slate-500">
              {hasPremiumSource
                ? "GNews esta activo: podemos traer fuentes en ingles y espanol."
                : "MVP sin API key: Hacker News en ingles, con contexto editorial en espanol."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_auto]">
        <div className="surface-card no-scrollbar flex gap-2 overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/40 p-2">
          {CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategory(item.id)}
              className={`min-w-[150px] rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer ${
                category === item.id
                  ? "border-cyan-500/40 bg-cyan-500/15 text-white"
                  : "ui-action-secondary border-slate-800 bg-slate-900/70 text-slate-400 hover:text-slate-100"
              }`}
            >
              <span className="block text-xs font-black">{item.label}</span>
              <span className="mt-1 block text-[10px] leading-snug text-slate-500">{item.helper}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
          <div className="flex rounded-2xl border border-slate-800 bg-slate-950/40 p-1">
            {LANGUAGE_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setLanguage(item.id)}
                className={`rounded-xl px-3 py-2 text-xs font-black transition-all cursor-pointer ${
              language === item.id ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="surface-card flex min-w-0 items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2 sm:w-72">
            <Search size={14} className="text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-xs font-bold text-slate-200 outline-none placeholder:text-slate-600"
              placeholder="Buscar en titulares"
            />
          </label>
        </div>
      </div>

      {!loading && !error && digestItems.length > 0 && (
        <section className="surface-card rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-300">
                  <Newspaper size={12} />
                  Briefing publicable
                </span>
                <span className="rounded-full border border-slate-800 bg-slate-950/50 px-3 py-1 text-[10px] font-black text-slate-400">
                  {digestItems.length} senales
                </span>
              </div>
              <h3 className="mt-3 text-lg font-black leading-tight text-white">
                Convierte este radar en newsletter, post o idea de comunidad.
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Usa las noticias visibles del filtro actual para publicar un resumen rapido o preparar una edicion con IA.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 min-[430px]:grid-cols-2 lg:w-auto xl:grid-cols-4">
              <button
                type="button"
                onClick={handleCopyDigest}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-xs font-black text-slate-200 transition-all hover:border-cyan-500/30 hover:text-cyan-200 cursor-pointer"
              >
                <Copy size={13} />
                {copyState === "copied" ? "Copiado" : "Copiar"}
              </button>
              <button
                type="button"
                onClick={() => onCreateForumDigest(digestItems, category)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-3 py-2.5 text-xs font-black text-indigo-300 transition-all hover:bg-indigo-500/15 cursor-pointer"
              >
                <Send size={13} />
                Foro
              </button>
              <button
                type="button"
                onClick={() => onCreatePublicBriefing(digestItems, category)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-xs font-black text-emerald-300 transition-all hover:bg-emerald-500/15 cursor-pointer"
              >
                <FileText size={13} />
                Briefing publico
              </button>
              <button
                type="button"
                onClick={() => onCreateNewsletterFromNews(digestItems, category)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-pink-500/25 bg-pink-500/10 px-3 py-2.5 text-xs font-black text-pink-300 transition-all hover:bg-pink-500/15 cursor-pointer"
              >
                <Sparkles size={13} />
                Newsletter IA
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-5">
            {digestItems.map((item) => (
              <a
                key={`digest-${item.id}`}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="surface-nested-card rounded-xl border border-slate-800 bg-slate-950/35 p-3 transition-colors hover:border-cyan-500/25"
              >
                <p className="line-clamp-2 text-[11px] font-black leading-snug text-slate-200">{item.title}</p>
                <p className="mt-2 text-[10px] font-bold text-slate-500">{item.source}</p>
              </a>
            ))}
          </div>
        </section>
      )}

      {!loading && !error && actionQueueItems.length > 0 && (
        <section className="surface-card rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-violet-300">
                <Target size={12} />
                Cola de accion
              </span>
              <h3 className="mt-3 text-lg font-black leading-tight text-white">
                Senales listas para convertir en recursos, conversaciones o equipo.
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Priorizamos oportunidades del filtro actual para que el radar termine en una accion concreta, no solo en lectura.
              </p>
            </div>
            <span className="w-fit rounded-full border border-slate-800 bg-slate-950/50 px-3 py-1 text-[10px] font-black text-slate-400">
              {actionQueueItems.length} acciones sugeridas
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            {actionQueueItems.map((item) => {
              return (
                <article key={`action-${item.id}`} className="surface-nested-card rounded-2xl border border-slate-800 bg-slate-950/35 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-xs font-black leading-snug text-white">{item.title}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-violet-300">
                        {CATEGORY_LABELS[item.category]} - {item.source}
                      </p>
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-300 hover:text-white"
                      title="Leer fuente"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-slate-400">
                    {item.summaryEs || item.summary || "Senal del radar lista para explorar."}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {renderSaveIdeaButton(item, "compact")}
                    <button
                      type="button"
                      onClick={() => onCreatePromptFromNews(item)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-pink-500/25 bg-pink-500/10 px-2.5 py-2 text-[11px] font-black text-pink-300 cursor-pointer"
                    >
                      <Sparkles size={11} />
                      Prompt
                    </button>
                    <button
                      type="button"
                      onClick={() => onCreateForumPostFromNews(item, "team")}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-2 text-[11px] font-black text-emerald-300 cursor-pointer"
                    >
                      <Users size={11} />
                      Equipo
                    </button>
                    <button
                      type="button"
                      onClick={() => onCreatePublicBriefing([item], item.category)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-2 text-[11px] font-black text-cyan-300 cursor-pointer"
                    >
                      <FileText size={11} />
                      Briefing
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {savedIdeas.length > 0 && (
        <section className="surface-card rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-300">
                <Bookmark size={12} />
                Ideas guardadas
              </span>
              <h3 className="mt-3 text-lg font-black leading-tight text-white">Tu radar personal para volver y construir.</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Convierte cualquier idea guardada en prompt, conversacion o busqueda de equipo.
              </p>
            </div>
            <span className="w-fit rounded-full border border-slate-800 bg-slate-950/50 px-3 py-1 text-[10px] font-black text-slate-400">
              {loadingSavedIdeas ? "Sincronizando..." : `${savedIdeas.length} ideas`}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            {savedIdeas.slice(0, 6).map((idea) => (
              <article key={idea.id} className="surface-nested-card rounded-xl border border-slate-800 bg-slate-950/35 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-xs font-black leading-snug text-white">{idea.title}</p>
                    <p className="mt-1 text-[10px] font-bold text-slate-500">{idea.source}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteSavedIdea(idea)}
                    className="shrink-0 rounded-lg border border-red-500/20 bg-red-500/10 p-1.5 text-red-300 transition-colors hover:bg-red-500/20 cursor-pointer"
                    title="Eliminar idea"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-slate-400">{idea.summary}</p>
                <div className="mt-3 grid grid-cols-1 gap-2 min-[430px]:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => onCreatePromptFromSavedIdea(idea)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-pink-500/25 bg-pink-500/10 px-2.5 py-2 text-[11px] font-black text-pink-300 cursor-pointer"
                  >
                    <Sparkles size={11} />
                    Prompt
                  </button>
                  <button
                    type="button"
                    onClick={() => onCreateForumPostFromSavedIdea(idea, "question")}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-2 text-[11px] font-black text-indigo-300 cursor-pointer"
                  >
                    <MessageSquare size={11} />
                    Foro
                  </button>
                  <button
                    type="button"
                    onClick={() => onCreateForumPostFromSavedIdea(idea, "team")}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-2 text-[11px] font-black text-emerald-300 cursor-pointer"
                  >
                    Equipo
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="surface-card rounded-3xl border border-slate-800/70 bg-slate-900/40 py-16 text-center text-sm font-bold text-slate-400">
          <RefreshCw size={22} className="mx-auto mb-3 animate-spin text-cyan-300" />
          Cargando radar de noticias...
        </div>
      ) : error ? (
        <div className="surface-card rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center text-sm font-bold text-red-200">
          {error}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="surface-card rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 p-5 sm:p-10 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
            <Newspaper size={18} />
          </div>
          <p className="mt-4 text-sm font-black text-slate-200">No hay noticias para este filtro.</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
            Prueba otra categoria, cambia el idioma o vuelve a Todo para encontrar senales que puedas guardar como idea.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => (
            <article key={item.id} className="surface-card flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/55 shadow-xl shadow-slate-950/20">
              {item.imageUrl && (
                <div className="aspect-[16/9] overflow-hidden bg-slate-950">
                  <img src={item.imageUrl} alt={item.title} loading="lazy" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-300">
                    {languageLabel(item)}
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-950/50 px-2.5 py-1 text-[10px] font-black text-slate-400">
                    {item.source}
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-950/50 px-2.5 py-1 text-[10px] font-black text-slate-500">
                    {formatDate(item.publishedAt)}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-black leading-tight text-white">{item.title}</h3>
                  {(item.summary || item.summaryEs) && (
                    <p className="line-clamp-3 text-sm leading-relaxed text-slate-400">
                      {item.summary || item.summaryEs}
                    </p>
                  )}
                </div>

                {item.summaryEs && (
                  <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-300">
                      <Globe2 size={12} />
                      Lectura en espanol
                    </div>
                    <p className="text-xs leading-relaxed text-slate-300">{item.summaryEs}</p>
                  </div>
                )}

                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <span key={tag} className="rounded-md border border-slate-800 bg-slate-950/60 px-2 py-1 text-[10px] font-bold text-slate-400">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 border-t border-slate-800/80 pt-4 sm:flex sm:flex-wrap">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="ui-action-secondary inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-xs font-black text-slate-200 transition-all hover:bg-slate-700"
                  >
                    Leer
                    <ExternalLink size={13} />
                  </a>
                  <button
                    type="button"
                    onClick={() => onCreateForumPostFromNews(item, "question")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-3 py-2 text-xs font-black text-indigo-300 transition-all hover:bg-indigo-500/15 cursor-pointer"
                  >
                    <MessageSquare size={13} />
                    Comentar
                  </button>
                  <button
                    type="button"
                    onClick={() => onCreatePromptFromNews(item)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-pink-500/25 bg-pink-500/10 px-3 py-2 text-xs font-black text-pink-300 transition-all hover:bg-pink-500/15 cursor-pointer"
                  >
                    <Sparkles size={13} />
                    Prompt
                  </button>
                  <button
                    type="button"
                    onClick={() => onCreateForumPostFromNews(item, "idea")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-300 transition-all hover:bg-amber-500/15 cursor-pointer"
                  >
                    <Lightbulb size={13} />
                    Idea
                  </button>
                  {renderSaveIdeaButton(item)}
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => onSummarizeNews(item)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[11px] font-black text-cyan-300 transition-all hover:bg-cyan-500/15 cursor-pointer"
                  >
                    <Wand2 size={12} />
                    Resumir ES
                  </button>
                  <button
                    type="button"
                    onClick={() => onTranslateNews(item)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[11px] font-black text-cyan-300 transition-all hover:bg-cyan-500/15 cursor-pointer"
                  >
                    <Languages size={12} />
                    Traducir
                  </button>
                  <button
                    type="button"
                    onClick={() => onDetectHackathonOpportunity(item)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] font-black text-emerald-300 transition-all hover:bg-emerald-500/15 cursor-pointer"
                  >
                    <Sparkles size={12} />
                    Oportunidad
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
