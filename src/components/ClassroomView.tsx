import React, { useState } from "react";
import type { User } from "firebase/auth";
import { ArrowLeft, BookOpen, CalendarDays, CheckCircle2, LockKeyhole, School, Sparkles, Users, HelpCircle, ChevronDown, ChevronUp, UserCheck, BarChart3 } from "lucide-react";
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
  isInstructor?: boolean;
  classMembers?: ClassroomMember[];
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
  onOpenLibrary,
  isInstructor = false,
  classMembers = []
}: ClassroomViewProps) {
  const isJoined = Boolean(membership);
  const isPackSaved = missingCount === 0 && savedCount > 0;

  // Tabs for Classroom view
  const [activeTab, setActiveTab] = useState<"prompts" | "instructor">(
    isInstructor ? "instructor" : "prompts"
  );

  // Expanded teacher notes state per prompt index
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});

  const toggleNotes = (idx: number) => {
    setExpandedNotes(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 md:gap-6">
      
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="ui-action-secondary inline-flex w-fit items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/55 px-3 py-2 text-xs font-black text-slate-300 transition-colors hover:text-white"
      >
        <ArrowLeft size={14} />
        Volver
      </button>

      {/* Classroom Banner */}
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
              <p className="mt-4 text-[11px] leading-relaxed text-slate-500 font-sans">
                Nada se publica automáticamente. El pack se guarda como copia privada en tu cuenta.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Tab Switcher for Instructors */}
      {isInstructor && (
        <div className="flex border-b border-slate-800 pb-1 gap-4 select-none shrink-0">
          <button
            onClick={() => setActiveTab("prompts")}
            className={`pb-3 text-sm font-extrabold transition-all border-b-2 px-1 cursor-pointer ${
              activeTab === "prompts"
                ? "border-amber-500 text-white font-black"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Prompts del Pack ({classroom.promptPack.length})
          </button>
          <button
            onClick={() => setActiveTab("instructor")}
            className={`pb-3 text-sm font-extrabold transition-all border-b-2 px-1 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "instructor"
                ? "border-amber-500 text-white font-black"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users size={14} className="text-amber-400" />
            Panel del Instructor ({classMembers.length})
          </button>
        </div>
      )}

      {/* RENDER PROMPTS TAB */}
      {activeTab === "prompts" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {classroom.promptPack.map((prompt, index) => {
              const isExpanded = expandedNotes[index] || false;
              return (
                <article key={prompt.title} className="surface-card rounded-2xl border border-slate-850 bg-[#1e293b]/70 p-4 shadow-lg flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-black text-indigo-300 font-mono">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="rounded-full border border-slate-700 bg-slate-950/35 px-2.5 py-1 text-[10px] font-black text-slate-400">
                        {prompt.category}
                      </span>
                    </div>
                    <h3 className="ui-text-primary text-base font-black leading-tight text-white">{prompt.title}</h3>
                    <p className="ui-text-muted text-xs leading-relaxed text-slate-400 font-sans">{prompt.description}</p>
                    
                    <div className="flex flex-wrap gap-1">
                      {(prompt.tags || []).slice(0, 3).map((tag) => (
                        <span key={tag} className="ui-chip rounded-lg border border-slate-800 bg-slate-950/35 px-2 py-0.5 text-[9px] font-bold text-slate-400">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Teacher notes collapsible */}
                  {prompt.teacherNotes && (
                    <div className="border-t border-slate-800/80 pt-3 mt-1">
                      <button
                        type="button"
                        onClick={() => toggleNotes(index)}
                        className="flex items-center justify-between w-full text-[10px] font-black uppercase text-amber-300 tracking-wider hover:text-amber-200 cursor-pointer select-none"
                      >
                        <span className="flex items-center gap-1">
                          <HelpCircle size={12} />
                          <span>Notas del Profesor</span>
                        </span>
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      
                      {isExpanded && (
                        <p className="text-[11px] leading-relaxed text-slate-350 bg-amber-500/5 p-2.5 border border-amber-500/15 rounded-xl mt-2 font-sans">
                          {prompt.teacherNotes}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {isPackSaved && (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-255 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 stroke-[3]" />
              <span>Pack guardado. Puedes editar cada prompt, adaptarlo a tu proyecto y compartirlo solo si tú quieres.</span>
            </div>
          )}
        </div>
      )}

      {/* RENDER INSTRUCTOR TAB */}
      {activeTab === "instructor" && isInstructor && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            
            {/* Column 1 & 2: Students List */}
            <div className="md:col-span-2 bg-[#1e293b]/60 rounded-3xl border border-slate-800 p-5 space-y-4 shadow-xl">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Users size={16} className="text-indigo-400" />
                Alumnos Inscritos en el Aula
              </h3>

              {classMembers.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs font-sans">
                  No hay alumnos inscritos aún en esta clase privada. Comparte el código para empezar.
                </div>
              ) : (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/35 max-h-[400px] overflow-y-auto pr-1">
                  {classMembers.map((member) => {
                    const progress = member.savedPromptsCount || 0;
                    const percent = Math.round((progress / classroom.promptPack.length) * 100);
                    return (
                      <div key={member.id} className="p-3.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          {member.photoURL ? (
                            <img src={member.photoURL} alt={member.displayName} className="w-8 h-8 rounded-full border border-slate-750 shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                              {member.displayName.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{member.displayName}</p>
                            <p className="text-[10px] text-slate-500 font-mono truncate">@{member.handle || member.uid.slice(0, 6)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded ${
                            percent === 100 ? "bg-emerald-500/10 text-emerald-450" : "bg-slate-800 text-slate-400"
                          }`}>
                            {progress}/{classroom.promptPack.length} ({percent}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Column 3: Prompt Access Statistics */}
            <div className="bg-[#1e293b]/60 rounded-3xl border border-slate-800 p-5 space-y-4 shadow-xl">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <BarChart3 size={16} className="text-pink-400" />
                Estadísticas de Descarga
              </h3>
              
              <div className="space-y-3">
                <div className="bg-slate-950/45 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Pack Completo Guardado</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white">
                      {classMembers.filter(m => (m.savedPromptsCount || 0) === classroom.promptPack.length).length}
                    </span>
                    <span className="text-xs font-bold text-slate-500">/ {classMembers.length} alumnos</span>
                  </div>
                </div>

                <div className="bg-slate-950/45 p-3 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Avance Promedio Clase</span>
                  {classMembers.length === 0 ? (
                    <span className="text-xs text-slate-400">0%</span>
                  ) : (
                    <>
                      <span className="text-2xl font-black text-emerald-400 font-mono">
                        {Math.round(
                          (classMembers.reduce((sum, m) => sum + (m.savedPromptsCount || 0), 0) / 
                          (classMembers.length * classroom.promptPack.length)) * 100
                        )}%
                      </span>
                      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400"
                          style={{
                            width: `${Math.round(
                              (classMembers.reduce((sum, m) => sum + (m.savedPromptsCount || 0), 0) / 
                              (classMembers.length * classroom.promptPack.length)) * 100
                            )}%`
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </section>
  );
}
