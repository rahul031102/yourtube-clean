import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  commentedon: string;
  city?: string;
  likes?: number;
  dislikes?: number;
  likedBy?: string[];
  dislikedBy?: string[];
}

const commentValidation = (text: string) => {
  const trimmed = text.trim();
  // Accept any language (Unicode). Only enforce non-empty and max length.
  return trimmed.length > 0 && trimmed.length <= 2000;
};

const getCityFromIP = async () => {
  try {
    const res = await fetch("https://ipapi.co/json");
    const data = await res.json();
    return data.city || "Unknown city";
  } catch (error) {
    return "Unknown city";
  }
};

const Comments = ({ videoId }: any) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(true);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translatedFrom, setTranslatedFrom] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<Record<string, boolean>>({});
  const [commentTranslationOpen, setCommentTranslationOpen] = useState<Record<string, boolean>>({});
  const [commentTargetLanguage, setCommentTargetLanguage] = useState<Record<string, string>>({});
  const [reactionLoading, setReactionLoading] = useState<Record<string, boolean>>({});
  const { user } = useUser();

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`);
      setComments(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) return;
    if (!newComment.trim()) return;
    if (!commentValidation(newComment)) {
      alert("Comment must be non-empty and under 2000 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const city = user.city || (await getCityFromIP());
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment.trim(),
        usercommented: user.name || "Anonymous",
        city,
      });
      if (res.data.comment) {
        setComments([res.data.comment, ...comments]);
        setNewComment("");
      }
    } catch (error: any) {
      console.error("Error adding comment:", error);
      alert(error?.response?.data?.message || "Failed to post comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
  };

  const handleUpdateComment = async () => {
    if (!editingCommentId) return;
    if (!editText.trim()) return;
    if (!commentValidation(editText)) {
      alert("Comment must be non-empty and under 2000 characters.");
      return;
    }
    try {
      const res = await axiosInstance.post(
        `/comment/editcomment/${editingCommentId}`,
        { commentbody: editText }
      );
      if (res.data) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === editingCommentId ? { ...c, commentbody: editText } : c
          )
        );
        setEditingCommentId(null);
        setEditText("");
      }
    } catch (error) {
      console.log(error);
      alert("Unable to save comment edit. Please try again.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`);
      if (res.data.comment) {
        setComments((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleReaction = async (commentId: string, action: "like" | "dislike") => {
    if (!user) {
      alert("Please log in to like or dislike comments.");
      return;
    }

    const userId = (user as any)._id || (user as any).id;
    if (!userId) {
      alert("User ID not available. Please refresh and try again.");
      return;
    }

    setReactionLoading((prev) => ({ ...prev, [commentId]: true }));
    try {
      const res = await axiosInstance.post(`/comment/reactcomment/${commentId}`, {
        action,
        userid: userId,
      });
      if (res.data.deleted) {
        setComments((prev) => prev.filter((c) => c._id !== commentId));
        return;
      }
      setComments((prev) =>
        prev.map((comment) =>
          comment._id === commentId
            ? {
                ...comment,
                likes: res.data.likes,
                dislikes: res.data.dislikes,
              }
            : comment
        )
      );
    } catch (error) {
      console.log(error);
      alert("Unable to update reaction. Please try again.");
    } finally {
      setReactionLoading((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  const translateComment = async (commentId: string, text: string) => {
    setTranslating((prev) => ({ ...prev, [commentId]: true }));
    try {
      const targetLang = commentTargetLanguage[commentId] || "en";
      const res = await axiosInstance.post(`/comment/translate`, {
        text,
        targetLang,
      });

      const translated = res.data?.translatedText;
      const sourceLang = res.data?.sourceLang || "original";
      if (translated && typeof translated === "string") {
        setTranslations((prev) => ({ ...prev, [commentId]: translated }));
        setTranslatedFrom((prev) => ({ ...prev, [commentId]: sourceLang }));
        setCommentTranslationOpen((prev) => ({ ...prev, [commentId]: true }));
      } else {
        console.error("Translation API returned invalid data", res.data);
      }
    } catch (error: any) {
      console.error("Translation failed:", error);
      alert(error?.response?.data?.message || "Translation failed. Please try again.");
    } finally {
      setTranslating((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  if (loading) {
    return <div>Loading comments...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{comments.length} Comments</h2>
      </div>

      {user && (
        <div className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e: any) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setNewComment("")}
                disabled={!newComment.trim()}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
              >
                Comment
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => {
            const translatedBody = translations[comment._id];
            return (
              <div key={comment._id} className="flex gap-4 rounded-lg border p-4">
                <Avatar className="w-10 h-10">
                 {/* /avatar.png */}
                  <AvatarImage src="/placeholder.svg?height=40&width=40" />
                  <AvatarFallback>{comment.usercommented?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1 text-sm text-gray-600">
                    <span className="font-medium text-sm">{comment.usercommented}</span>
                    <span>•</span>
                    <span>{comment.city || "Unknown city"}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(comment.commentedon))} ago</span>
                  </div>
                  {comment._id === editingCommentId ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editText}
                        onChange={(e: any) => setEditText(e.target.value)}
                        className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0"
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleUpdateComment}>Save</Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditText("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-800">{comment.commentbody}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() =>
                        setCommentTranslationOpen((prev) => ({
                          ...prev,
                          [comment._id]: !prev[comment._id],
                        }))
                      }
                    >
                      {commentTranslationOpen[comment._id] ? "Hide translation" : "Show translation"}
                    </button>
                    <button
                      className="text-blue-600 hover:underline disabled:cursor-not-allowed"
                      onClick={() => handleReaction(comment._id, "like")}
                      disabled={!user || reactionLoading[comment._id]}
                      title={!user ? "Log in to like comments" : "Like comment"}
                    >
                      👍 {comment.likes ?? 0}
                    </button>
                    <button
                      className="text-blue-600 hover:underline disabled:cursor-not-allowed"
                      onClick={() => handleReaction(comment._id, "dislike")}
                      disabled={!user || reactionLoading[comment._id]}
                      title={!user ? "Log in to dislike comments" : "Dislike comment"}
                    >
                      👎 {comment.dislikes ?? 0}
                    </button>
                  </div>
                  {commentTranslationOpen[comment._id] && (
                    <div className="mt-3 space-y-2 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="text-sm font-medium text-gray-600" htmlFor={`translateLang-${comment._id}`}>
                          Translate to:
                        </label>
                        <select
                          id={`translateLang-${comment._id}`}
                          value={commentTargetLanguage[comment._id] || "en"}
                          onChange={(e) =>
                            setCommentTargetLanguage((prev) => ({
                              ...prev,
                              [comment._id]: e.target.value,
                            }))
                          }
                          className="rounded-md border bg-white px-2 py-1 text-sm"
                        >
                          <option value="en">English</option>
                          <option value="hi">Hindi</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                          <option value="pt">Portuguese</option>
                          <option value="zh">Chinese</option>
                        </select>
                        <Button
                          variant="ghost"
                          onClick={() => translateComment(comment._id, comment.commentbody)}
                          disabled={translating[comment._id]}
                        >
                          Translate
                        </Button>
                      </div>
                      {translations[comment._id] && (
                        <div className="rounded-md bg-white p-3 text-sm text-gray-800">
                          <span className="block text-xs uppercase tracking-wide text-gray-500">
                            Translated from {translatedFrom[comment._id] || "original"}
                          </span>
                          <p>{translations[comment._id]}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {comment.userid === user?._id && (
                    <div className="flex gap-2 mt-3 text-sm text-gray-500">
                      <button onClick={() => handleEdit(comment)}>Edit</button>
                      <button onClick={() => handleDelete(comment._id)}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Comments;
