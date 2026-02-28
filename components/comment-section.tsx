"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Trash2, Reply, Send } from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/contexts/language-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface CommentUser {
  id: string;
  fullName: string;
  image: string | null;
  role: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: CommentUser;
  replies: Omit<Comment, "replies">[];
}

interface CommentSectionProps {
  chapterId: string;
  courseId: string;
  commentsEnabled: boolean;
  currentUserId: string;
  currentUserRole: string;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

interface CommentItemProps {
  comment: Comment;
  courseId: string;
  chapterId: string;
  currentUserId: string;
  currentUserRole: string;
  onDeleted: (id: string, parentId?: string) => void;
  onReplied: (reply: Omit<Comment, "replies">, parentId: string) => void;
  isReply?: boolean;
}

function CommentItem({
  comment,
  courseId,
  chapterId,
  currentUserId,
  currentUserRole,
  onDeleted,
  onReplied,
  isReply = false,
}: CommentItemProps) {
  const { t } = useLanguage();
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isPostingReply, setIsPostingReply] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete =
    currentUserRole === "ADMIN" ||
    currentUserRole === "TEACHER" ||
    comment.user.id === currentUserId;

  const handleDelete = async () => {
    if (!window.confirm(t("comments.deleteConfirm"))) return;
    try {
      setIsDeleting(true);
      const res = await fetch(
        `/api/courses/${courseId}/chapters/${chapterId}/comments/${comment.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      onDeleted(comment.id, isReply ? comment.id : undefined);
    } catch {
      toast.error(t("teacher.chapterEdit.updateError"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    try {
      setIsPostingReply(true);
      const res = await fetch(
        `/api/courses/${courseId}/chapters/${chapterId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: replyContent, parentId: comment.id }),
        }
      );
      if (!res.ok) throw new Error();
      const newReply = await res.json();
      onReplied(newReply, comment.id);
      setReplyContent("");
      setShowReplyBox(false);
      setShowReplies(true);
    } catch {
      toast.error(t("teacher.chapterEdit.updateError"));
    } finally {
      setIsPostingReply(false);
    }
  };

  const replyCount = comment.replies?.length ?? 0;

  return (
    <div className={cn("flex gap-3", isReply && "ms-10 mt-3")}>
      <Avatar className="h-8 w-8 shrink-0 mt-1">
        <AvatarImage src={comment.user.image ?? undefined} />
        <AvatarFallback className="text-xs">{getInitials(comment.user.fullName)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="bg-muted/50 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-sm">{comment.user.fullName}</span>
            {(comment.user.role === "TEACHER" || comment.user.role === "ADMIN") && (
              <span className="text-xs bg-brand/15 text-brand px-1.5 py-0.5 rounded-full font-medium">
                {comment.user.role === "ADMIN" ? "Admin" : "Teacher"}
              </span>
            )}
            <span className="text-xs text-muted-foreground ms-auto">
              {formatDate(comment.createdAt)}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
        </div>

        <div className="flex items-center gap-3 mt-1 px-1">
          {!isReply && (
            <button
              onClick={() => setShowReplyBox((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <Reply className="h-3 w-3" />
              {t("comments.reply")}
            </button>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-xs text-destructive/70 hover:text-destructive flex items-center gap-1 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              {t("comments.delete")}
            </button>
          )}
          {!isReply && replyCount > 0 && (
            <button
              onClick={() => setShowReplies((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors ms-auto"
            >
              {showReplies
                ? t("comments.hideReplies")
                : t("comments.showReplies", { count: String(replyCount) })}
            </button>
          )}
        </div>

        {showReplyBox && (
          <div className="mt-3 ms-0 flex gap-2">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={t("comments.replyPlaceholder")}
              className="text-sm resize-none min-h-[64px]"
              rows={2}
            />
            <div className="flex flex-col gap-1 shrink-0">
              <Button
                size="sm"
                onClick={handleReply}
                disabled={isPostingReply || !replyContent.trim()}
              >
                <Send className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setShowReplyBox(false); setReplyContent(""); }}
              >
                ✕
              </Button>
            </div>
          </div>
        )}

        {!isReply && showReplies && replyCount > 0 && (
          <div className="mt-1 space-y-2 border-s-2 border-muted ps-2">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={{ ...reply, replies: [] }}
                courseId={courseId}
                chapterId={chapterId}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                onDeleted={(id) => onDeleted(id, comment.id)}
                onReplied={onReplied}
                isReply
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CommentSection({
  chapterId,
  courseId,
  commentsEnabled,
  currentUserId,
  currentUserRole,
}: CommentSectionProps) {
  const { t } = useLanguage();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const loadComments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/courses/${courseId}/chapters/${chapterId}/comments`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setComments(data);
    } catch {
      toast.error(t("comments.loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [courseId, chapterId, t]);

  useEffect(() => {
    if (commentsEnabled) loadComments();
    else setIsLoading(false);
  }, [commentsEnabled, loadComments]);

  const handlePost = async () => {
    if (!newComment.trim()) return;
    try {
      setIsPosting(true);
      const res = await fetch(`/api/courses/${courseId}/chapters/${chapterId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setComments((prev) => [{ ...created, replies: [] }, ...prev]);
      setNewComment("");
    } catch {
      toast.error(t("teacher.chapterEdit.updateError"));
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeleted = (id: string, parentId?: string) => {
    if (parentId) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: c.replies.filter((r) => r.id !== id) }
            : c
        )
      );
    } else {
      setComments((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleReplied = (reply: Omit<Comment, "replies">, parentId: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === parentId ? { ...c, replies: [...(c.replies ?? []), reply] } : c
      )
    );
  };

  return (
    <div className="mt-8 space-y-6">
      <hr className="border-border" />
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">{t("comments.title")}</h3>
        {commentsEnabled && !isLoading && (
          <span className="text-sm text-muted-foreground">({comments.length})</span>
        )}
      </div>

      {!commentsEnabled ? (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50 text-muted-foreground text-sm">
          <MessageSquare className="h-4 w-4 shrink-0" />
          {t("comments.disabled")}
        </div>
      ) : (
        <>
          {/* New comment input */}
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 shrink-0 mt-1">
              <AvatarFallback className="text-xs">أنت</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={t("comments.placeholder")}
                className="resize-none min-h-[80px]"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handlePost();
                }}
              />
              <div className="flex justify-end">
                <Button
                  onClick={handlePost}
                  disabled={isPosting || !newComment.trim()}
                  size="sm"
                  className="gap-2"
                >
                  <Send className="h-3.5 w-3.5" />
                  {isPosting ? t("comments.posting") : t("comments.submit")}
                </Button>
              </div>
            </div>
          </div>

          <hr className="border-border" />

          {/* Comments list */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/4" />
                    <div className="h-12 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              {t("comments.noComments")}
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  courseId={courseId}
                  chapterId={chapterId}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  onDeleted={handleDeleted}
                  onReplied={handleReplied}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
