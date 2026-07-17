/**
 * ProgressDashboard — "Mi Progreso"
 * ------------------------------------
 * Dashboard de analytics personal calculado en tiempo real
 * desde los prompts del usuario en Firestore.
 *
 * Métricas:
 *  - Total creados / favoritos / públicos / privados
 *  - Distribución por categoría (donut chart CSS)
 *  - Top prompts por likes
 *  - Progreso hacia metas por categoría
 *  - Prompts recientes
 */

import React, { useMemo } from "react";
import {
  BookOpen,
  Heart,
  Globe,
  Lock,
  Trophy,
  TrendingUp,
  Sparkles,
  Star,
  Target,
  GitFork,
  Clock,
  BarChart3,
} from "lucide-react";

import type { Prompt } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  "YouTube":             "#ef4444",
  "Marketing":           "#f97316",
  "Programación":        "#3b82f6",
  "Redacción":           "#8b5cf6",
  "IA Agentes":          "#06b6d4",
  "IA Imágenes":         "#ec4899",
  "IA Videos":           "#f59e0b",
  "Acompañante Personal":"#10b981",
  "Asistente de Prompts":"#6366f1",
  "Refactorización":     "#14b8a6",
  "Seguridad":           "#dc2626",
  "Buenas Prácticas":    "#22c55e",
  "General":             "#94a3b8",
};

const GOAL_PER_CATEGORY = 5; // prompts para "completar" una categoría

function formatDate(ts: any): string {
  if (!ts) return "";
  try {
    const d: Date = ts?.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return "hoy";
    if (days === 1) return "ayer";
    if (days < 7) return `hace ${days} días`;
    return d.toLocaleDateString("es", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

// ─── Donut Chart (pure CSS conic-gradient) ────────────────────────────────────

interface DonutSlice {
  category: string;
  count: number;
  color: string;
  pct: number;
  startDeg: number;
}

function buildSlices(categoryMap: Record<string, number>): DonutSlice[] {
  const total = Object.values(categoryMap).reduce((a, b) => a + b, 0);
  if (total === 0) return [];
  let cursor = 0;
  return Object.entries(categoryMap)
    .filter(([, c]) => c > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, count]) => {
      const pct = (count / total) * 100;
      const slice: DonutSlice = {
        category: cat,
        count,
        color: CATEGORY_COLORS[cat] || "#94a3b8",
        pct,
        startDeg: cursor,
      };
      cursor += (pct / 100) * 360;
      return slice;
    });
}

const DonutChart: React.FC<{ slices: DonutSlice[]; total: number }> = ({ slices, total }) => {

  const gradient = slices.length === 0
    ? "conic-gradient(#1e293b 0deg 360deg)"
    : `conic-gradient(${slices
        .map((s) => `${s.color} ${s.startDeg}deg ${s.startDeg + (s.pct / 100) * 360}deg`)
        .join(", ")})`;

  return (
    <div className="relative flex items-center justify-center">
      <div
        className="w-36 h-36 rounded-full shadow-inner"
        style={{
          background: gradient,
          WebkitMask: "radial-gradient(circle, transparent 45%, black 46%)",
          mask: "radial-gradient(circle, transparent 45%, black 46%)",
        }}
      />
      <div className="absolute flex flex-col items-center pointer-events-none">
        <span className="text-2xl font-black text-white leading-none">{total}</span>
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">prompts</span>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  gradient: string;
}
const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  label,
  value,
  sub,
  gradient,
}) => {

  return (
    <div className="relative overflow-hidden bg-slate-900/70 border border-slate-700/60 rounded-2xl p-4 flex flex-col gap-2 hover:border-slate-600/80 transition-all group">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${gradient}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-3xl font-black text-white leading-none tracking-tight">{value}</p>
        <p className="text-xs font-semibold text-slate-400 mt-1">{label}</p>
        {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {/* Decorative shimmer */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none rounded-2xl" />
    </div>
  );
}

// ─── Category Progress Row ────────────────────────────────────────────────────

interface CategoryRowProps { category: string; count: number; goal: number }
const CategoryRow: React.FC<CategoryRowProps> = ({ category, count, goal }) => {

  const pct = Math.min((count / goal) * 100, 100);
  const color = CATEGORY_COLORS[category] || "#94a3b8";
  const done = count >= goal;

  return (
    <div className="flex items-center gap-3 group">
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-slate-300 truncate">{category}</span>
          <span className={`text-[10px] font-black shrink-0 ml-2 ${done ? "text-emerald-400" : "text-slate-400"}`}>
            {done ? "✓" : `${count}/${goal}`}
          </span>
        </div>
        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%`, background: color, opacity: done ? 1 : 0.75 }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ProgressDashboardProps {
  prompts: Prompt[];
  userDisplayName?: string;
}

export default function ProgressDashboard({ prompts, userDisplayName }: ProgressDashboardProps) {
  // ── Computed stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = prompts.length;
    const favorites = prompts.filter((p) => p.isFavorite).length;
    const publicPrompts = prompts.filter((p) => p.isShared).length;
    const privatePrompts = total - publicPrompts;
    const totalLikes = prompts.reduce((acc, p) => acc + (p.likesCount || 0), 0);
    const totalForks = prompts.filter((p) => p.forkedFrom).length;
    const withVariables = prompts.filter((p) => (p.suggestedVariables?.length ?? 0) > 0).length;

    // Category map
    const categoryMap: Record<string, number> = {};
    for (const p of prompts) {
      categoryMap[p.category] = (categoryMap[p.category] || 0) + 1;
    }

    // Top prompts by likes
    const topByLikes = [...prompts]
      .filter((p) => p.isShared && (p.likesCount ?? 0) > 0)
      .sort((a, b) => (b.likesCount ?? 0) - (a.likesCount ?? 0))
      .slice(0, 5);

    // Recent prompts
    const recent = [...prompts]
      .sort((a, b) => {
        const ta = a.updatedAt?.toDate?.()?.getTime() ?? 0;
        const tb = b.updatedAt?.toDate?.()?.getTime() ?? 0;
        return tb - ta;
      })
      .slice(0, 5);

    // Category progress — only categories with at least 1 prompt, sorted by count desc
    const categoryProgress = Object.entries(categoryMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);

    const completedCategories = categoryProgress.filter(([, c]) => c >= GOAL_PER_CATEGORY).length;

    return {
      total,
      favorites,
      publicPrompts,
      privatePrompts,
      totalLikes,
      totalForks,
      withVariables,
      categoryMap,
      topByLikes,
      recent,
      categoryProgress,
      completedCategories,
    };
  }, [prompts]);

  const slices = useMemo(() => buildSlices(stats.categoryMap), [stats.categoryMap]);

  const firstName = userDisplayName?.split(" ")[0] ?? "Builder";

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (stats.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4 px-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-xl">
          <BarChart3 size={28} className="text-white" />
        </div>
        <h2 className="text-xl font-black text-white">Aún no tienes prompts</h2>
        <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
          Crea tu primer prompt y aquí verás tus analytics en tiempo real.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-8">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
            Hola, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">{firstName} 👋</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Aquí está el resumen de tu biblioteca de prompts.</p>
        </div>
        {stats.completedCategories > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/25 shrink-0">
            <Trophy size={16} className="text-amber-400" />
            <span className="text-sm font-black text-amber-300">{stats.completedCategories} {stats.completedCategories === 1 ? "categoría completada" : "categorías completadas"}</span>
          </div>
        )}
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={BookOpen}
          label="Prompts creados"
          value={stats.total}
          sub={`${stats.withVariables} con variables`}
          gradient="bg-gradient-to-br from-indigo-600 to-indigo-800"
        />
        <StatCard
          icon={Heart}
          label="En favoritos"
          value={stats.favorites}
          sub={stats.total > 0 ? `${Math.round((stats.favorites / stats.total) * 100)}% del total` : undefined}
          gradient="bg-gradient-to-br from-pink-600 to-rose-700"
        />
        <StatCard
          icon={Globe}
          label="Públicos"
          value={stats.publicPrompts}
          sub={`${stats.totalLikes} likes recibidos`}
          gradient="bg-gradient-to-br from-emerald-600 to-teal-700"
        />
        <StatCard
          icon={Lock}
          label="Privados"
          value={stats.privatePrompts}
          sub={stats.totalForks > 0 ? `${stats.totalForks} remixes propios` : "Solo visibles para ti"}
          gradient="bg-gradient-to-br from-slate-600 to-slate-700"
        />
      </div>

      {/* ── Middle section: Donut + Category Progress ─────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Donut chart */}
        <div className="bg-slate-900/70 border border-slate-700/60 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-indigo-400" />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">Distribución</h2>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <DonutChart slices={slices} total={stats.total} />
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              {slices.slice(0, 6).map((s) => (
                <div key={s.category} className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="text-[11px] text-slate-300 truncate">{s.category}</span>
                  <span className="text-[10px] font-black text-slate-500 ml-auto shrink-0">{s.count}</span>
                </div>
              ))}
              {slices.length > 6 && (
                <p className="text-[10px] text-slate-500">+{slices.length - 6} más</p>
              )}
            </div>
          </div>
        </div>

        {/* Category goals */}
        <div className="bg-slate-900/70 border border-slate-700/60 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={15} className="text-purple-400" />
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Metas por Categoría</h2>
            </div>
            <span className="text-[10px] text-slate-500 font-semibold">meta: {GOAL_PER_CATEGORY} prompts</span>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto max-h-52">
            {(stats.categoryProgress as [string, number][]).map(([cat, count]) => (
              <React.Fragment key={cat}>
                <CategoryRow category={cat} count={count} goal={GOAL_PER_CATEGORY} />
              </React.Fragment>
            ))}


            {stats.categoryProgress.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">Crea prompts para ver tu progreso por categoría.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom: Top Públicos + Recientes ─────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Top prompts by likes */}
        <div className="bg-slate-900/70 border border-slate-700/60 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Star size={15} className="text-amber-400" />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">Mis Mejores Públicos</h2>
          </div>
          {stats.topByLikes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <Globe size={24} className="text-slate-600" />
              <p className="text-xs text-slate-500">Comparte tus prompts para ver cuáles gustan más.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {stats.topByLikes.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors group"
                >
                  <span className={`text-xs font-black w-5 text-center shrink-0 ${i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-600" : "text-slate-500"}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-200 truncate">{p.title}</p>
                    <p className="text-[10px] text-slate-500">{p.category}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Heart size={11} className="text-pink-400 fill-pink-400" />
                    <span className="text-[11px] font-black text-pink-300">{p.likesCount ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="bg-slate-900/70 border border-slate-700/60 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-blue-400" />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">Actividad Reciente</h2>
          </div>
          {stats.recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <Sparkles size={24} className="text-slate-600" />
              <p className="text-xs text-slate-500">Tu historial reciente aparecerá aquí.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {stats.recent.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0 mt-0.5"
                    style={{ background: CATEGORY_COLORS[p.category] || "#94a3b8" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-200 truncate">{p.title}</p>
                    <p className="text-[10px] text-slate-500">{p.category}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.isFavorite && <Heart size={10} className="text-pink-400 fill-pink-400" />}
                    {p.isShared && <Globe size={10} className="text-emerald-400" />}
                    {p.forkedFrom && <GitFork size={10} className="text-indigo-400" />}
                    <span className="text-[9px] text-slate-500">{formatDate(p.updatedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Insight footer ────────────────────────────────────────────── */}
      {stats.total >= 5 && (
        <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
          <Sparkles size={16} className="text-indigo-400 mt-0.5 shrink-0" />
          <p className="text-sm text-slate-300 leading-relaxed">
            {stats.completedCategories > 0
              ? `Completaste ${stats.completedCategories} ${stats.completedCategories === 1 ? "categoría" : "categorías"} con más de ${GOAL_PER_CATEGORY} prompts. ¡Sigue construyendo en las demás!`
              : `Tienes ${stats.total} prompts en ${Object.keys(stats.categoryMap).length} categorías. Llega a ${GOAL_PER_CATEGORY} en cada una para completar la meta.`}
          </p>
        </div>
      )}
    </div>
  );
}

