import { AlertTriangle, EyeOff, Flag, GitFork, Globe, ShieldCheck } from "lucide-react";
import type { Prompt } from "../types";
import type { ModerationReportSummary } from "../hooks/useModerationReview";

interface TrustModerationPanelProps {
  publicPrompts: Prompt[];
  reportedPrompts: ModerationReportSummary[];
  hiddenCount: number;
  totalReportsCount: number;
  hasPermissionIssue: boolean;
  onEditPrompt: (prompt: Prompt) => void;
  onViewPrompt: (prompt: Prompt) => void;
  onOpenCommunity: () => void;
}

function promptLikes(prompt: Prompt) {
  return prompt.likesCount || prompt.likedBy?.length || 0;
}

export default function TrustModerationPanel({
  publicPrompts,
  reportedPrompts,
  hiddenCount,
  totalReportsCount,
  hasPermissionIssue,
  onEditPrompt,
  onViewPrompt,
  onOpenCommunity
}: TrustModerationPanelProps) {
  if (publicPrompts.length === 0 && hiddenCount === 0 && !hasPermissionIssue) return null;

  const topPublicPrompts = [...publicPrompts]
    .sort((a, b) => promptLikes(b) - promptLikes(a))
    .slice(0, 3);

  return (
    <section className="rounded-2xl md:rounded-3xl border border-emerald-500/20 bg-[#1e293b]/65 p-4 md:p-5 shadow-xl space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full flex items-center gap-1.5">
              <ShieldCheck size={11} />
              Centro de confianza
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {publicPrompts.length} publicados · {hiddenCount} ocultos
            </span>
          </div>
          <h3 className="text-sm md:text-base font-extrabold text-white mt-2 leading-tight">
            Mantén tu perfil social claro antes de invitar a mas creadores
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Revisa señales de tus publicaciones, reportes recibidos y contenido que decidiste ocultar de tu feed.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 w-full lg:w-auto">
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3 text-center">
            <p className="text-lg font-black text-emerald-300 font-mono">{publicPrompts.length}</p>
            <p className="text-[9px] uppercase font-bold text-slate-500">publicos</p>
          </div>
          <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-3 text-center">
            <p className="text-lg font-black text-amber-300 font-mono">{totalReportsCount}</p>
            <p className="text-[9px] uppercase font-bold text-slate-500">reportes</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950/35 p-3 text-center">
            <p className="text-lg font-black text-slate-200 font-mono">{hiddenCount}</p>
            <p className="text-[9px] uppercase font-bold text-slate-500">ocultos</p>
          </div>
        </div>
      </div>

      {hasPermissionIssue && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200 flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>No pudimos leer reportes de algunas publicaciones. Verifica reglas de Firestore antes de pruebas sociales intensas.</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/25 p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black text-slate-100 flex items-center gap-1.5">
              <Flag size={13} className="text-amber-300" />
              Reportes por revisar
            </p>
            <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-0.5">
              {reportedPrompts.length}
            </span>
          </div>

          {reportedPrompts.length === 0 ? (
            <p className="text-[11px] text-slate-500 leading-relaxed rounded-xl border border-dashed border-slate-800 p-3">
              No hay reportes sobre tus prompts publicados. Si aparece uno, podras abrir el recurso y editarlo o dejar de publicarlo.
            </p>
          ) : (
            <div className="space-y-2">
              {reportedPrompts.slice(0, 4).map(({ prompt, reportsCount }) => (
                <article key={`reported-${prompt.id}`} className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-white line-clamp-1">{prompt.title}</p>
                      <p className="text-[10px] text-amber-200 mt-1">{reportsCount} reporte{reportsCount === 1 ? "" : "s"} recibido{reportsCount === 1 ? "" : "s"}</p>
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 bg-slate-950/50 border border-slate-800 px-2 py-0.5 rounded-lg font-bold shrink-0">
                      {prompt.category}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <button
                      type="button"
                      onClick={() => onViewPrompt(prompt)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      Ver
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditPrompt(prompt)}
                      className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      Editar / despublicar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/25 p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black text-slate-100 flex items-center gap-1.5">
              <Globe size={13} className="text-emerald-300" />
              Señales de calidad
            </p>
            <button
              type="button"
              onClick={onOpenCommunity}
              className="text-[10px] font-bold text-indigo-300 hover:text-indigo-200 cursor-pointer"
            >
              Ver comunidad
            </button>
          </div>

          {topPublicPrompts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-3 text-[11px] text-slate-500 leading-relaxed">
              Publica un prompt cuando este listo. Los remixes privados nacen cerrados; tu decides que llega al feed social.
            </div>
          ) : (
            <div className="space-y-2">
              {topPublicPrompts.map((prompt) => (
                <button
                  key={`quality-${prompt.id}`}
                  type="button"
                  onClick={() => onViewPrompt(prompt)}
                  className="w-full rounded-xl border border-slate-800 bg-[#1e293b]/70 p-3 text-left hover:border-emerald-500/25 hover:bg-slate-900/60 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-white line-clamp-1">{prompt.title}</p>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                        {prompt.category} · {promptLikes(prompt)} likes
                      </p>
                    </div>
                    {(prompt.forkedFromPromptId || prompt.forkedFrom) && (
                      <span className="text-[9px] uppercase tracking-wider text-pink-300 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-lg font-bold shrink-0 flex items-center gap-1">
                        <GitFork size={9} />
                        Remix
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {hiddenCount > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/35 p-3 text-[11px] text-slate-400 flex items-start gap-2">
              <EyeOff size={13} className="mt-0.5 text-slate-300 shrink-0" />
              <span>Ocultaste {hiddenCount} prompt{hiddenCount === 1 ? "" : "s"} de tu feed. Siguen sin afectar tu biblioteca ni tus publicaciones.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
