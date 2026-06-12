import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { User } from "firebase/auth";
import { MessageSquare, Send, Trash2 } from "lucide-react";

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: any;
}

interface CommentsSectionProps {
  promptId: string;
  currentUser: User | null;
  promptOwnerId: string;
  onNotification?: (message: string, type: "success" | "info") => void;
}

export default function CommentsSection({
  promptId,
  currentUser,
  promptOwnerId,
  onNotification
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const commentsPath = `prompts/${promptId}/comments`;
    const q = query(collection(db, commentsPath), orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Comment[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            ...data
          } as Comment);
        });
        setComments(list);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching comments:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [promptId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      if (onNotification) onNotification("Debes iniciar sesion para aportar sugerencias.", "info");
      return;
    }
    if (!newComment.trim()) return;

    setSubmitting(true);
    const commentsPath = `prompts/${promptId}/comments`;
    try {
      await addDoc(collection(db, commentsPath), {
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email?.split("@")[0] || "Miembro de la comunidad",
        userAvatar: currentUser.photoURL || "",
        text: newComment.trim(),
        createdAt: serverTimestamp()
      });
      setNewComment("");
      if (onNotification) onNotification("Sugerencia publicada.", "success");
    } catch (err) {
      console.error("Error creating comment:", err);
      if (onNotification) onNotification("Error al enviar la sugerencia.", "info");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!currentUser) return;
    if (!window.confirm("¿Seguro que deseas eliminar este comentario?")) return;

    const commentDocPath = `prompts/${promptId}/comments/${commentId}`;
    try {
      await deleteDoc(doc(db, commentDocPath));
      if (onNotification) onNotification("Comentario eliminado.", "info");
    } catch (err) {
      console.error("Error deleting comment:", err);
      if (onNotification) onNotification("Error al eliminar comentario.", "info");
    }
  };

  const getInitials = (name: string) => {
    return name ? name.substring(0, 2).toUpperCase() : "U";
  };

  return (
    <div className="border-t border-slate-700/50 mt-4 pt-4 shrink-0 font-sans">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare size={14} className="text-indigo-400" />
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Sugerencias ({loading ? "..." : comments.length})
        </span>
      </div>

      {/* Comment submission form */}
      {currentUser ? (
        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={submitting}
            placeholder="Sugiere una mejora, variante o caso de uso..."
            className="flex-1 text-xs bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-sans"
          />
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="bg-indigo-550 hover:bg-indigo-600 disabled:opacity-40 text-white rounded-xl px-3 py-2 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
          >
            <Send size={12} />
          </button>
        </form>
      ) : (
        <p className="text-[11px] text-slate-500 mb-4 bg-slate-900/35 border border-slate-800 p-2.5 rounded-xl text-center">
          Inicia sesion para sugerir mejoras o formas de usar este prompt.
        </p>
      )}

      {/* List comments */}
      {loading ? (
        <div className="text-center py-2 text-[11px] text-slate-500">Cargando sugerencias...</div>
      ) : comments.length === 0 ? (
        <p className="text-[11px] text-slate-550 italic text-center py-2">
          Sin sugerencias aun. Se el primero en proponer una mejora o variante.
        </p>
      ) : (
        <div className="space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
          {comments.map((comment) => {
            const isCommentAuthor = currentUser?.uid === comment.userId;
            const isPromptAuthor = currentUser?.uid === promptOwnerId;
            const canDelete = isCommentAuthor || isPromptAuthor;

            return (
              <div
                key={comment.id}
                className="group relative flex items-start gap-2.5 p-2.5 bg-slate-900/40 rounded-xl border border-slate-800 hover:border-slate-700/60 transition-colors"
              >
                {/* Avatar container */}
                {comment.userAvatar ? (
                  <img
                    src={comment.userAvatar}
                    alt={comment.userName}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full shrink-0 border border-slate-700"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-extrabold text-indigo-300 bg-gradient-to-br from-indigo-500/20 to-pink-500/20 border border-indigo-500/30 font-mono">
                    {getInitials(comment.userName)}
                  </div>
                )}

                {/* Comment body */}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-250 truncate">
                      {comment.userName}
                    </span>
                    {comment.userId === promptOwnerId && (
                      <span className="text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-extrabold px-1 py-[0.1rem] rounded">
                        Creador
                      </span>
                    )}
                    {comment.createdAt?.seconds && (
                      <span className="text-[9px] text-slate-550 font-sans">
                        {new Date(comment.createdAt.seconds * 1000).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-350 leading-relaxed mt-0.5 break-words font-sans">
                    {comment.text}
                  </p>
                </div>

                {/* Actions */}
                {canDelete && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="absolute right-2 top-2 p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-red-500/10"
                    title="Eliminar este comentario"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
