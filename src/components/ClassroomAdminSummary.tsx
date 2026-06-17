import { BookOpen, CheckCircle2, School, Users } from "lucide-react";
import type { ClassroomMetric } from "../hooks/useAdminDashboard";

interface ClassroomAdminSummaryProps {
  classroomMetrics: ClassroomMetric[];
}

export default function ClassroomAdminSummary({ classroomMetrics }: ClassroomAdminSummaryProps) {
  if (classroomMetrics.length === 0) return null;

  const totalMembers = classroomMetrics.reduce((sum, classroom) => sum + classroom.membersCount, 0);
  const totalSaved = classroomMetrics.reduce((sum, classroom) => sum + classroom.savedPackCount, 0);

  return (
    <section className="rounded-2xl md:rounded-3xl border border-amber-500/25 bg-[#1e293b]/80 p-4 shadow-xl md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-white">
            <School size={15} className="text-amber-300" />
            Clases privadas
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Asistencia basica para jornadas con codigo. No muestra prompts privados de alumnos.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <span className="rounded-xl border border-slate-700 bg-slate-950/35 px-3 py-2 font-black text-slate-300">
            {totalMembers} miembros
          </span>
          <span className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 font-black text-emerald-300">
            {totalSaved} guardaron pack
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {classroomMetrics.map((classroom) => {
          const savedRate = classroom.membersCount
            ? Math.round((classroom.savedPackCount / classroom.membersCount) * 100)
            : 0;

          return (
            <article key={classroom.id} className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-black text-white">{classroom.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{classroom.institution} · {classroom.eventDate}</p>
                </div>
                <span className="w-fit rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-amber-300">
                  {classroom.isActive ? "Activa" : "Inactiva"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-900/45 p-3">
                  <Users size={14} className="mb-2 text-indigo-300" />
                  <p className="font-mono text-lg font-black text-white">{classroom.membersCount}</p>
                  <p className="text-[10px] font-bold text-slate-500">Unidos</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/45 p-3">
                  <CheckCircle2 size={14} className="mb-2 text-emerald-300" />
                  <p className="font-mono text-lg font-black text-white">{savedRate}%</p>
                  <p className="text-[10px] font-bold text-slate-500">Guardado</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/45 p-3">
                  <BookOpen size={14} className="mb-2 text-cyan-300" />
                  <p className="font-mono text-lg font-black text-white">{classroom.promptPackCount}</p>
                  <p className="text-[10px] font-bold text-slate-500">Prompts</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
