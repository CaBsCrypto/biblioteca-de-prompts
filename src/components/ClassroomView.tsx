import type { User } from "firebase/auth";
import { ArrowLeft, BookOpen, CalendarDays, CheckCircle2, LockKeyhole, School, Sparkles, Users } from "lucide-react";
import type { Classroom, ClassroomMember } from "../typesCommunity";

interface ClassroomViewProps {
  classroom: Classroom;
  user: User | null;
  membership: ClassroomMember | null;
  savedCount: number;
  missingCount: number;
  loading: boolean;
  onBack: () => void;
  onSignIn: () => void;
  onJoin: () => void | Promise<void>;
  onSavePack: () => void | Promise<void>;
  onOpenLibrary: () => void;
}

export default function ClassroomView({
  classroom,
  user,
  membership,
  savedCount,
  missingCount,
  loading,
  onBack,
  onSignIn,
  onJoin,
  onSavePack,
  onOpenLibrary
}: ClassroomViewProps) {
  const isJoined = Boolean(membership);
  const isPackSaved = missingCount === 0 && savedCount > 0;

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 md:gap-6">
      <button
        type="button"
        onClick={onBack}
        className="ui-action-secondary inline-flex w-fit items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/55 px-3 py-2 text-xs font-black text-slate-300 transition-colors hover:text-white"
      >
        <ArrowLeft size={14} />
        Volver
      </button>

      <div className="surface-card overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 shadow-2xl md:rounded-3xl">
        <div className="grid gap-0 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="p-5 md:p-8">
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-300">
              <School size={13} />
              Aula privada
            </p>
            <h1 className="ui-text-primary mt-4 max-w-3xl text-2xl font-black leading-tight text-white md:text-4xl">
              {classroom.title}
            </h1>
            <p className="ui-text-muted mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
              {classroom.description}
            </p>

            <div className="mt-5 grid gap-2 text-xs font-bold text-slate-300 min-[520px]:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
                <School size={15} className="mb-2 text-amber-300" />
                {classroom.institution}
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
                <CalendarDays size={15} className="mb-2 text-cyan-300" />
                {classroom.eventDate}
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
                <BookOpen size={15} className="mb-2 text-emerald-300" />
                {classroom.promptPack.length} prompts privados
              </div>
            </div>
          </div>

          <aside className="border-t border-slate-800 bg-slate-950/25 p-5 md:p-8 lg:border-l lg:border-t-0">
            <div className="rounded-2xl border border-slate-700 bg-slate-950/35 p-4">
              <p className="flex items-center gap-2 text-sm font-black text-white">
                <LockKeyhole size={16} className="text-amber-300" />
                Tu avance
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                  style={{ width: `${Math.round((savedCount / classroom.promptPack.length) * 100) || 0}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-bold text-slate-400">
                {savedCount}/{classroom.promptPack.length} prompts guardados en tu biblioteca.
              </p>

              <div className="mt-5 space-y-2">
                {!user ? (
                  <button
                    type="button"
                    onClick={onSignIn}
                    className="ui-button-primary flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black"
                  >
                    Entrar con Google
                  </button>
                ) : !isJoined ? (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={onJoin}
                    className="ui-button-primary flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black disabled:opacity-60"
                  >
                    <Users size={14} />
                    Unirme a la clase
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={loading || isPackSaved}
                      onClick={onSavePack}
                      className="ui-button-primary flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black disabled:opacity-60"
                    >
                      <Sparkles size={14} />
                      {isPackSaved ? "Pack guardado" : `Guardar pack (${missingCount})`}
                    </button>
                    <button
                      type="button"
                      onClick={onOpenLibrary}
                      className="ui-action-secondary flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-xs font-black text-slate-200"
                    >
                      Ir a Mi Biblioteca
                    </button>
                  </>
                )}
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
                Nada se publica automaticamente. El pack se guarda como copia privada en tu cuenta.
              </p>
            </div>
          </aside>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {classroom.promptPack.map((prompt, index) => (
          <article key={prompt.title} className="surface-card rounded-2xl border border-slate-800 bg-[#1e293b]/70 p-4 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-black text-indigo-300">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-950/35 px-2.5 py-1 text-[10px] font-black text-slate-400">
                {prompt.category}
              </span>
            </div>
            <h3 className="ui-text-primary mt-4 text-base font-black leading-tight text-white">{prompt.title}</h3>
            <p className="ui-text-muted mt-2 line-clamp-3 text-sm leading-relaxed text-slate-400">{prompt.description}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {(prompt.tags || []).slice(0, 4).map((tag) => (
                <span key={tag} className="ui-chip rounded-lg border border-slate-800 bg-slate-950/35 px-2 py-1 text-[10px] font-bold text-slate-400">
                  #{tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      {isPackSaved && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-200">
          <CheckCircle2 size={16} className="mr-2 inline" />
          Pack listo. Puedes editar cada prompt, adaptarlo a tu proyecto y publicarlo solo si tu quieres.
        </div>
      )}
    </section>
  );
}
