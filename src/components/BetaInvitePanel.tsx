import { ClipboardCheck, Copy, MessageSquare, Smartphone, Users } from "lucide-react";

interface BetaInvitePanelProps {
  publicUrl: string;
  publicPromptsCount: number;
  publicBriefingsCount: number;
  forumPostsCount: number;
  savedIdeasCount: number;
  onCopy: (text: string, successMessage: string) => void;
  onCreateFeedbackPost: () => void;
}

const inviteText = (publicUrl: string) => [
  "Estoy probando una beta privada de Biblioteca de Prompts.",
  "",
  "La idea es guardar prompts, remixear recursos publicos, convertir tendencias en ideas y compartir briefings.",
  "Me ayudas probandola desde celular?",
  "",
  "Checklist rapido:",
  "1. Entra con Google.",
  "2. Carga el pack inicial.",
  "3. Guarda un prompt como remix.",
  "4. Crea una idea desde Noticias.",
  "5. Dejame feedback en el Foro.",
  "",
  publicUrl
].join("\n");

export default function BetaInvitePanel({
  publicUrl,
  publicPromptsCount,
  publicBriefingsCount,
  forumPostsCount,
  savedIdeasCount,
  onCopy,
  onCreateFeedbackPost
}: BetaInvitePanelProps) {
  const betaSignals = [
    { label: "prompts publicos", value: publicPromptsCount },
    { label: "briefings", value: publicBriefingsCount },
    { label: "posts foro", value: forumPostsCount },
    { label: "ideas guardadas", value: savedIdeasCount }
  ];

  return (
    <section className="surface-card beta-surface rounded-2xl md:rounded-3xl border border-amber-500/20 bg-amber-500/5 p-4 md:p-5 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-300">
            <Users size={12} />
            Beta privada
          </p>
          <h3 className="mt-3 text-lg font-black text-white">Lista para invitar 3-10 testers.</h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">
            Comparte el link, pide que prueben desde celular y centraliza el feedback en el foro. Nada se publica sin accion manual del usuario.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 min-[430px]:grid-cols-2">
          <button
            type="button"
            onClick={() => onCopy(inviteText(publicUrl), "Mensaje de invitacion copiado.")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black text-slate-950 transition-all hover:bg-amber-400 cursor-pointer"
          >
            <Copy size={13} />
            Copiar mensaje beta
          </button>
          <button
            type="button"
            onClick={onCreateFeedbackPost}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-4 py-2.5 text-xs font-black text-indigo-300 transition-all hover:bg-indigo-500/15 cursor-pointer"
          >
            <MessageSquare size={13} />
            Abrir feedback
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {betaSignals.map((signal) => (
          <div key={signal.label} className="rounded-xl border border-slate-800 bg-slate-950/35 p-3">
            <p className="text-lg font-black text-white">{signal.value}</p>
            <p className="text-[10px] font-bold uppercase text-slate-500">{signal.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-800 bg-slate-950/35 p-3.5">
          <p className="flex items-center gap-2 text-xs font-black text-white">
            <ClipboardCheck size={14} className="text-emerald-300" />
            Que pedirle al tester
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            Login con Google, cargar pack, guardar remix, crear idea desde Noticias y publicar feedback en Foro.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-950/35 p-3.5">
          <p className="flex items-center gap-2 text-xs font-black text-white">
            <Smartphone size={14} className="text-cyan-300" />
            Probar en celular
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            El login ya tiene fallback por redirect para navegadores internos, pero conviene validar WhatsApp, Instagram y Chrome.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-950/35 p-3.5">
          <p className="flex items-center gap-2 text-xs font-black text-white">
            <MessageSquare size={14} className="text-indigo-300" />
            Feedback accionable
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            Pide capturas, cuenta usada, navegador y el paso exacto donde hubo confusion o friccion.
          </p>
        </article>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/35 p-3.5">
        <p className="text-xs font-black text-white">Criterio de exito de esta ronda</p>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
          3 testers completan: login con Google, cargar pack inicial, guardar un remix privado y publicar feedback en Foro.
        </p>
      </div>
    </section>
  );
}
