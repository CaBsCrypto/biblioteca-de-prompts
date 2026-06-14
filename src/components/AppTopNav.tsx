import { BookOpen, FolderOpen, Home, Image, MessageSquare, Newspaper, Trophy, Users } from "lucide-react";
import type { AppSection } from "../typesCommunity";

interface AppTopNavProps {
  currentSection: AppSection;
  promptsCount: number;
  libraryCount: number;
  postsCount: number;
  hackathonsCount: number;
  showcasesCount: number;
  newsCount?: number;
  onSectionChange: (section: AppSection) => void;
}

const NAV_ITEMS: Array<{
  id: AppSection;
  label: string;
  icon: typeof Home;
  countKey?: "prompts" | "library" | "posts" | "hackathons" | "showcases" | "news";
}> = [
  { id: "inicio", label: "Inicio", icon: Home },
  { id: "prompts", label: "Prompts", icon: BookOpen, countKey: "prompts" },
  { id: "foro", label: "Foro", icon: MessageSquare, countKey: "posts" },
  { id: "hackathons", label: "Hackathons", icon: Trophy, countKey: "hackathons" },
  { id: "galeria", label: "Galeria", icon: Image, countKey: "showcases" },
  { id: "noticias", label: "Noticias", icon: Newspaper, countKey: "news" },
  { id: "mi-biblioteca", label: "Mi Biblioteca", icon: FolderOpen, countKey: "library" }
];

export default function AppTopNav({
  currentSection,
  promptsCount,
  libraryCount,
  postsCount,
  hackathonsCount,
  showcasesCount,
  newsCount = 0,
  onSectionChange
}: AppTopNavProps) {
  const counts = {
    prompts: promptsCount,
    library: libraryCount,
    posts: postsCount,
    hackathons: hackathonsCount,
    showcases: showcasesCount,
    news: newsCount
  };

  return (
    <nav className="sticky top-[73px] z-20 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl px-4 md:px-12">
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto py-2.5 scrollbar-thin">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon === Users ? Users : item.icon;
          const isActive = currentSection === item.id;
          const count = item.countKey ? counts[item.countKey] : null;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionChange(item.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-black transition-all cursor-pointer ${
                isActive
                  ? "border-indigo-500/50 bg-indigo-600 text-white shadow-lg shadow-indigo-700/15"
                  : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-100"
              }`}
            >
              <Icon size={14} />
              <span>{item.label}</span>
              {typeof count === "number" && count > 0 && (
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono font-black ${
                  isActive ? "bg-white/15 text-white" : "bg-slate-950 text-indigo-300"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
