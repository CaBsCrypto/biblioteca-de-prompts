import { UserCheck, UserPlus, Users, X } from "lucide-react";
import type { UserConnection } from "../types";

interface ConnectionsPanelProps {
  connectedConnections: UserConnection[];
  incomingConnectionRequests: UserConnection[];
  outgoingConnectionRequests: UserConnection[];
  onAccept: (targetUid: string) => void;
  onRemove: (targetUid: string) => void;
}

function ConnectionAvatar({ connection }: { connection: UserConnection }) {
  if (connection.targetAvatar) {
    return (
      <img
        src={connection.targetAvatar}
        alt={connection.targetName}
        referrerPolicy="no-referrer"
        className="h-9 w-9 rounded-xl object-cover border border-slate-700/80"
      />
    );
  }

  return (
    <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center text-sm font-black shrink-0">
      {connection.targetName.charAt(0).toUpperCase()}
    </div>
  );
}

function ConnectionIdentity({ connection }: { connection: UserConnection }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-black text-white truncate">{connection.targetName}</p>
      <p className="text-[10px] text-slate-500 truncate">
        {connection.targetHandle ? `@${connection.targetHandle}` : "Creador de la comunidad"}
      </p>
    </div>
  );
}

export default function ConnectionsPanel({
  connectedConnections,
  incomingConnectionRequests,
  outgoingConnectionRequests,
  onAccept,
  onRemove
}: ConnectionsPanelProps) {
  const hasConnections =
    connectedConnections.length > 0 ||
    incomingConnectionRequests.length > 0 ||
    outgoingConnectionRequests.length > 0;

  return (
    <section className="rounded-2xl md:rounded-3xl border border-indigo-500/20 bg-[#1e293b]/80 p-4 md:p-5 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-300">
            <Users size={12} />
            Conexiones
          </p>
          <h3 className="mt-2 text-base md:text-lg font-black text-white">Tu red de creadores</h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
            Conecta con personas antes de abrir flujos mas cercanos como colaboracion y chat alrededor de prompts.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center shrink-0">
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/25 px-3 py-2">
            <p className="font-mono text-sm font-black text-emerald-300">{connectedConnections.length}</p>
            <p className="text-[9px] uppercase font-bold text-slate-500">activas</p>
          </div>
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/25 px-3 py-2">
            <p className="font-mono text-sm font-black text-amber-300">{incomingConnectionRequests.length}</p>
            <p className="text-[9px] uppercase font-bold text-slate-500">recibidas</p>
          </div>
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/25 px-3 py-2">
            <p className="font-mono text-sm font-black text-cyan-300">{outgoingConnectionRequests.length}</p>
            <p className="text-[9px] uppercase font-bold text-slate-500">enviadas</p>
          </div>
        </div>
      </div>

      {!hasConnections ? (
        <div className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-950/20 p-5 text-center">
          <UserPlus size={18} className="mx-auto text-indigo-300" />
          <p className="mt-2 text-xs font-bold text-slate-200">Aun no tienes conexiones.</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Abre un perfil publico y usa Conectar para empezar tu red.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-slate-700/80 bg-slate-950/20 p-3 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-300">Solicitudes recibidas</p>
            {incomingConnectionRequests.length === 0 ? (
              <p className="text-[11px] text-slate-500 py-3">Sin solicitudes pendientes.</p>
            ) : (
              incomingConnectionRequests.map((connection) => (
                <div key={connection.targetUid} className="rounded-xl border border-slate-800 bg-slate-900/45 p-2.5 space-y-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ConnectionAvatar connection={connection} />
                    <ConnectionIdentity connection={connection} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onAccept(connection.targetUid)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1.5 text-[10px] font-black text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
                    >
                      <UserCheck size={11} />
                      Aceptar
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(connection.targetUid)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/70 px-2 py-1.5 text-[10px] font-black text-slate-300 hover:bg-slate-700 cursor-pointer"
                    >
                      <X size={11} />
                      Ignorar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="rounded-2xl border border-slate-700/80 bg-slate-950/20 p-3 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Conectados</p>
            {connectedConnections.length === 0 ? (
              <p className="text-[11px] text-slate-500 py-3">Cuando acepten una solicitud, aparecera aqui.</p>
            ) : (
              connectedConnections.slice(0, 6).map((connection) => (
                <div key={connection.targetUid} className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/45 p-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <ConnectionAvatar connection={connection} />
                    <ConnectionIdentity connection={connection} />
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(connection.targetUid)}
                    className="rounded-lg border border-slate-700 bg-slate-800/70 p-2 text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer"
                    aria-label={`Quitar conexion con ${connection.targetName}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="rounded-2xl border border-slate-700/80 bg-slate-950/20 p-3 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Solicitudes enviadas</p>
            {outgoingConnectionRequests.length === 0 ? (
              <p className="text-[11px] text-slate-500 py-3">No tienes solicitudes salientes.</p>
            ) : (
              outgoingConnectionRequests.slice(0, 6).map((connection) => (
                <div key={connection.targetUid} className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/45 p-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <ConnectionAvatar connection={connection} />
                    <ConnectionIdentity connection={connection} />
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(connection.targetUid)}
                    className="rounded-lg border border-slate-700 bg-slate-800/70 px-2 py-1.5 text-[10px] font-black text-slate-300 hover:bg-slate-700 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}
