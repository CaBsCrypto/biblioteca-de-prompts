import { Activity, AlertTriangle, BookOpen, GitFork, MessageSquare, Newspaper, ShieldCheck, Trophy, Users } from "lucide-react";
import { useMemo, useState } from "react";
import type { AdminUserMetric, ClassroomMetric } from "../hooks/useAdminDashboard";
import ClassroomAdminSummary from "./ClassroomAdminSummary";

interface AdminDashboardProps {
  loading: boolean;
  permissionIssue: boolean;
  userMetrics: AdminUserMetric[];
  totals: {
    users: number;
    prompts: number;
    publicPrompts: number;
    remixes: number;
    posts: number;
    showcases: number;
    briefings: number;
    publicBriefings: number;
    hackathons: number;
    connections: number;
    classes: number;
    classMembers: number;
  };
  classroomMetrics: ClassroomMetric[];
}

function formatDate(value: any) {
  if (!value) return "Sin fecha";
  const date = typeof value.toDate === "function"
    ? value.toDate()
    : typeof value.seconds === "number"
      ? new Date(value.seconds * 1000)
      : new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function getTime(value: any) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone
}: {
  label: string;
  value: number | string;
  helper: string;
  icon: typeof Users;
  tone: "indigo" | "emerald" | "pink" | "cyan" | "amber";
}) {
  const toneClasses = {
    indigo: "text-indigo-300 bg-indigo-500/10 border-indigo-500/20",
    emerald: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
    pink: "text-pink-300 bg-pink-500/10 border-pink-500/20",
    cyan: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20",
    amber: "text-amber-300 bg-amber-500/10 border-amber-500/20"
  };

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-[#1e293b]/80 p-4 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 font-mono text-2xl font-black text-white">{value}</p>
        </div>
        <div className={`rounded-xl border p-2 ${toneClasses[tone]}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">{helper}</p>
    </div>
  );
}

export default function AdminDashboard({ loading, permissionIssue, userMetrics, totals, classroomMetrics }: AdminDashboardProps) {
  const [accountFilter, setAccountFilter] = useState<"todos" | "nuevos" | "activos" | "creadores" | "sinPublicar" | "founder">("todos");
  const now = Date.now();
  const filteredMetrics = useMemo(() => {
    return userMetrics.filter((metric) => {
      if (accountFilter === "nuevos") return now - getTime(metric.createdAt) <= 1000 * 60 * 60 * 24 * 7;
      if (accountFilter === "activos") return now - getTime(metric.lastActivityAt) <= 1000 * 60 * 60 * 24 * 14;
      if (accountFilter === "creadores") return metric.publicPromptsCount > 0 || metric.postsCount > 0 || metric.showcasePostsCount > 0 || metric.publicBriefingsCount > 0;
      if (accountFilter === "sinPublicar") return metric.publicPromptsCount === 0 && metric.postsCount === 0 && metric.showcasePostsCount === 0 && metric.publicBriefingsCount === 0;
      if (accountFilter === "founder") return metric.role === "founder";
      return true;
    });
  }, [accountFilter, now, userMetrics]);
  const filters = [
    { id: "todos" as const, label: "Todos", count: userMetrics.length },
    { id: "nuevos" as const, label: "Nuevos 7d", count: userMetrics.filter((metric) => now - getTime(metric.createdAt) <= 1000 * 60 * 60 * 24 * 7).length },
    { id: "activos" as const, label: "Activos 14d", count: userMetrics.filter((metric) => now - getTime(metric.lastActivityAt) <= 1000 * 60 * 60 * 24 * 14).length },
    { id: "creadores" as const, label: "Creadores", count: userMetrics.filter((metric) => metric.publicPromptsCount > 0 || metric.postsCount > 0 || metric.showcasePostsCount > 0 || metric.publicBriefingsCount > 0).length },
    { id: "sinPublicar" as const, label: "Sin publicar", count: userMetrics.filter((metric) => metric.publicPromptsCount === 0 && metric.postsCount === 0 && metric.showcasePostsCount === 0 && metric.publicBriefingsCount === 0).length },
    { id: "founder" as const, label: "Founder", count: userMetrics.filter((metric) => metric.role === "founder").length }
  ];

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5 md:space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="rounded-2xl md:rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 p-5 md:p-7 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-300">
              <ShieldCheck size={13} />
              Founder dashboard
            </p>
            <h1 className="mt-3 text-2xl md:text-4xl font-black text-white leading-tight">Panel de administracion</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
              Vista privada para revisar cuentas registradas, actividad de biblioteca, comunidad, remixes y senales de adopcion beta.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-700/80 bg-slate-950/35 px-4 py-3 text-xs text-slate-400">
            <p className="font-black uppercase tracking-wider text-slate-300">Acceso</p>
            <p className="mt-1">Visible solo para perfiles con rol founder.</p>
          </div>
        </div>

        {permissionIssue && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-amber-200">
            <AlertTriangle size={17} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-black">Falta permiso admin en Firestore.</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
                Confirma que tu perfil tenga <span className="font-mono">role: founder</span> y que las reglas desplegadas permitan lecturas founder.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Usuarios" value={totals.users} helper="Cuentas con perfil creado." icon={Users} tone="indigo" />
        <StatCard label="Prompts" value={totals.prompts} helper={`${totals.publicPrompts} publicos.`} icon={BookOpen} tone="emerald" />
        <StatCard label="Remixes" value={totals.remixes} helper="Copias/adaptaciones creadas." icon={GitFork} tone="pink" />
        <StatCard label="Comunidad" value={totals.posts + totals.showcases} helper={`${totals.posts} posts, ${totals.showcases} galeria.`} icon={MessageSquare} tone="cyan" />
        <StatCard label="Radar / clases" value={totals.briefings + totals.hackathons + totals.classes} helper={`${totals.publicBriefings} briefings, ${totals.classMembers} alumnos.`} icon={Newspaper} tone="amber" />
      </div>

      <ClassroomAdminSummary classroomMetrics={classroomMetrics} />

      <div className="rounded-2xl md:rounded-3xl border border-slate-700/80 bg-[#1e293b]/80 shadow-xl overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 p-4 md:p-5">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-white">
              <Activity size={15} className="text-indigo-300" />
              Cuentas registradas
            </h2>
            <p className="mt-1 text-xs text-slate-500">Ordenadas por actividad reciente estimada.</p>
          </div>
          <span className="rounded-full border border-slate-700 bg-slate-950/35 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
            {loading ? "Cargando..." : `${filteredMetrics.length}/${userMetrics.length} cuentas`}
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-slate-800 px-4 py-3 no-scrollbar">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setAccountFilter(filter.id)}
              className={`shrink-0 rounded-xl border px-3 py-2 text-[11px] font-black transition-all cursor-pointer ${
                accountFilter === filter.id
                  ? "border-indigo-500/45 bg-indigo-600 text-white"
                  : "border-slate-700 bg-slate-950/25 text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              {filter.label}
              <span className="ml-2 rounded-md bg-slate-950/25 px-1.5 py-0.5 font-mono text-[10px]">{filter.count}</span>
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left">
            <thead className="bg-slate-950/35 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-black">Usuario</th>
                <th className="px-4 py-3 font-black">Rol</th>
                <th className="px-4 py-3 font-black">Prompts</th>
                <th className="px-4 py-3 font-black">Remixes</th>
                <th className="px-4 py-3 font-black">Comunidad</th>
                <th className="px-4 py-3 font-black">Briefings</th>
                <th className="px-4 py-3 font-black">Hackathons</th>
                <th className="px-4 py-3 font-black">Conexiones</th>
                <th className="px-4 py-3 font-black">Alta / actividad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredMetrics.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-500">
                    {loading ? "Cargando cuentas..." : "No hay cuentas para este filtro."}
                  </td>
                </tr>
              ) : (
                filteredMetrics.map((metric) => (
                  <tr key={metric.uid} className="text-xs text-slate-300 hover:bg-slate-900/45">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {metric.photoURL ? (
                          <img src={metric.photoURL} alt={metric.displayName} referrerPolicy="no-referrer" className="h-9 w-9 rounded-xl object-cover border border-slate-700" />
                        ) : (
                          <div className="h-9 w-9 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 flex items-center justify-center font-black">
                            {metric.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-black text-white truncate">{metric.displayName}</p>
                          <p className="mt-0.5 font-mono text-[10px] text-slate-500 truncate">{metric.handle ? `@${metric.handle}` : metric.uid}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-lg border border-slate-700 bg-slate-950/35 px-2 py-1 text-[10px] font-black uppercase text-slate-300">
                        {metric.role || "member"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {metric.promptsCount}
                      <span className="ml-2 text-[10px] text-emerald-300">{metric.publicPromptsCount} pub</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-pink-300">{metric.remixesCount}</td>
                    <td className="px-4 py-3 font-mono">
                      {metric.postsCount}
                      <span className="ml-2 text-[10px] text-cyan-300">{metric.showcasePostsCount} gal</span>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {metric.briefingsCount}
                      <span className="ml-2 text-[10px] text-amber-300">{metric.publicBriefingsCount} pub</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-emerald-300">
                      <span className="inline-flex items-center gap-1">
                        <Trophy size={11} />
                        {metric.hackathonsCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-indigo-300">{metric.connectionsCount}</td>
                    <td className="px-4 py-3">
                      <p className="text-[11px] text-slate-300">{formatDate(metric.createdAt)}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">Ultima: {formatDate(metric.lastActivityAt)}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
