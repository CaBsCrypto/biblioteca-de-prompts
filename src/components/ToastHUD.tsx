import React from "react";
import { Check } from "lucide-react";

interface ToastHUDProps {
  message: string;
  type?: "success" | "info";
}

export default function ToastHUD({ message, type = "success" }: ToastHUDProps) {
  return (
    <div
      id="toast-hud"
      className={`fixed left-4 right-4 bottom-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 px-4 sm:px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border animate-in fade-in slide-in-from-bottom-4 duration-300 ${
        type === "success"
          ? "bg-[#1e293b]/95 border-indigo-500/40 backdrop-blur-md shadow-[0_0_20px_rgba(99,102,241,0.15)] text-white"
          : "bg-slate-900 border-slate-800 text-white"
      }`}
    >
      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
        <Check size={12} className="stroke-[3]" />
      </div>
      <span className="text-xs font-bold font-sans">{message}</span>
    </div>
  );
}
