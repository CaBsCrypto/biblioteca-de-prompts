import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import type { CommunityPost, CommunityPostComment } from "../typesCommunity";

interface ForumCommentsSectionProps {
  post: CommunityPost;
  currentUser: User | null;
  onSignIn: () => void;
  onNotification: (message: string, type?: "success" | "info") => void;
}

function mapCommentDoc<T extends { id: string; data: () => unknown }>(docSnap: T, postId: string): CommunityPostComment {
  const data = docSnap.data() as Partial<CommunityPostComment>;
  return {
    id: docSnap.id,
    postId,
    userId: data.userId || "",
    userName: data.userName || "Miembro",
    userAvatar: data.userAvatar || "",
    text: data.text || "",
    createdAt: data.createdAt
  };
}

function formatCommentDate(value: any) {
  const date = value?.toDate?.() || null;
  if (!date) return "Ahora";
  return new Intl.DateTimeFormat("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

export default function ForumCommentsSection({ post, currentUser, onSignIn, onNotification }: ForumCommentsSectionProps) {
  const [comments, setComments] = useState<CommunityPostComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    const commentsQuery = query(
      collection(db, "communityPosts", post.id, "comments"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      commentsQuery,
      (snapshot) => {
        setComments(snapshot.docs.map((docSnap) => mapCommentDoc(docSnap, post.id)));
        setLoading(false);
      },
      (error) => {
        console.error("Error subscribing to forum comments:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [post.id]);

  const canSubmit = useMemo(() => commentText.trim().length > 0 && commentText.trim().length <= 1000, [commentText]);

  const handleSubmit = async () => {
    if (!currentUser) {
      onSignIn();
      return;
    }

    const cleanText = commentText.trim();
    if (!cleanText) {
      onNotification("Escribe una respuesta para comentar.", "info");
      return;
    }

    if (cleanText.length > 1000) {
      onNotification("El comentario debe tener maximo 1000 caracteres.", "info");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "communityPosts", post.id, "comments"), {
        postId: post.id,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email || "Miembro",
        userAvatar: currentUser.photoURL || "",
        text: cleanText,
        createdAt: serverTimestamp()
      });
      setCommentText("");
      onNotification("Respuesta publicada.", "success");
    } catch (error) {
      console.error("Error saving forum comment:", error);
      onNotification("No se pudo publicar la respuesta.", "info");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (comment: CommunityPostComment) => {
    if (!currentUser || (currentUser.uid !== comment.userId && currentUser.uid !== post.authorUid)) {
      onNotification("Solo puedes borrar tus respuestas o moderar tu propio post.", "info");
      return;
    }

    try {
      await deleteDoc(doc(db, "communityPosts", post.id, "comments", comment.id));
      onNotification("Respuesta eliminada.", "info");
    } catch (error) {
      console.error("Error deleting forum comment:", error);
      onNotification("No se pudo eliminar la respuesta.", "info");
    }
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3 sm:p-4 space-y-3" aria-label={`Conversacion sobre ${post.title}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-black text-slate-200">
          <MessageCircle size={14} className="text-indigo-300" />
          Conversacion
        </p>
        <span className="rounded-full border border-slate-800 bg-slate-900/70 px-2.5 py-1 text-[10px] font-black text-slate-400">
          {comments.length} respuesta{comments.length === 1 ? "" : "s"}
        </span>
      </div>

      {loading ? (
        <div className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-xs font-bold text-slate-500">
          Cargando respuestas...
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 p-4 text-center">
          <p className="text-xs font-black text-slate-300">Todavia no hay respuestas.</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">Abre la conversacion con feedback, una pregunta o un recurso relacionado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {comments.map((comment) => {
            const canDelete = currentUser?.uid === comment.userId || currentUser?.uid === post.authorUid;
            return (
              <article key={comment.id} className="surface-nested-card rounded-xl border border-slate-800 bg-slate-900/35 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {comment.userAvatar ? (
                      <img src={comment.userAvatar} alt={comment.userName} referrerPolicy="no-referrer" className="h-7 w-7 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-[10px] font-black text-indigo-300">
                        {comment.userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-slate-200">{comment.userName}</p>
                      <p className="text-[10px] font-bold text-slate-500">{formatCommentDate(comment.createdAt)}</p>
                    </div>
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => void handleDelete(comment)}
                      className="ui-action-secondary rounded-lg border border-slate-800 bg-slate-950/50 p-1.5 text-slate-500 transition-colors hover:text-red-300"
                      title="Eliminar respuesta"
                      aria-label="Eliminar respuesta"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{comment.text}</p>
              </article>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-2">
        <label className="sr-only" htmlFor={`forum-comment-${post.id}`}>Responder en la conversacion</label>
        <textarea
          id={`forum-comment-${post.id}`}
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          placeholder={currentUser ? "Escribe una respuesta util..." : "Inicia sesion para responder"}
          className="ui-input min-h-24 w-full resize-none rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm leading-relaxed text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400"
          disabled={submitting}
        />
        <div className="mt-2 flex flex-col gap-2 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
          <p className="text-[10px] font-bold text-slate-500">{commentText.trim().length}/1000</p>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || (!!currentUser && !canSubmit)}
            className="ui-button-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black disabled:cursor-not-allowed disabled:opacity-55"
          >
            <Send size={13} />
            {currentUser ? "Responder" : "Iniciar sesion"}
          </button>
        </div>
      </div>
    </section>
  );
}
