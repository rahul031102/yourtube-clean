import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import UpgradePremium from "@/components/UpgradePremium";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const EditDescriptionInline = ({ video, userId }: any) => {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(video.description || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await axiosInstance.patch(`/video/update/${video._id}`, {
        userId,
        description: desc,
      });
      video.description = desc;
      setEditing(false);
      toast.success("Description updated");
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) return (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto px-0 py-0 text-sm font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground"
      onClick={() => setEditing(true)}
    >
      Edit description
    </Button>
  );

  return (
    <div className="mt-2 space-y-2">
      <textarea
        className="w-full border rounded p-2 text-sm bg-background"
        rows={3}
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    </div>
  );
};

const VideoInfo = ({ video }: any) => {
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState("");
  const [showUpgradeCTA, setShowUpgradeCTA] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [alreadyDownloaded, setAlreadyDownloaded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // const user: any = {
  //   id: "1",
  //   name: "John Doe",
  //   email: "john@example.com",
  //   image: "https://github.com/shadcn.png?height=32&width=32",
  // };
  useEffect(() => {
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);
  }, [video]);

  useEffect(() => {
    if (!user || !video?._id) return;

    axiosInstance.get(`/like/${user._id}`)
      .then((res) => {
        const alreadyLiked = res.data.some(
          (item: any) =>
            item.videoid?._id === video._id ||
            item.videoid === video._id
        );
        setIsLiked(alreadyLiked);
      })
      .catch(() => { });
  }, [user, video?._id]);

  useEffect(() => {
    const checkDownload = async () => {
      if (!user || !video?._id) return;
      try {
        const res = await axiosInstance.get(`/download/check/${video._id}/${user._id}`);
        setAlreadyDownloaded(res.data.downloaded);
      } catch (error) {
        console.log(error);
      }
    };
    checkDownload();
  }, [user, video?._id]);

  useEffect(() => {
    if (!user?._id || !video?._id) return;
    axiosInstance
      .get(`/watch/${user._id}`)
      .then((res) => {
        const already = res.data.some(
          (item: any) => item.videoid?._id === video._id || item.videoid === video._id
        );
        setIsWatchLater(already);
      })
      .catch(() => { });
  }, [user?._id, video?._id]);

  useEffect(() => {
    const handleviews = async () => {
      if (user) {
        try {
          return await axiosInstance.post(`/history/${video._id}`, {
            userId: user?._id,
          });
        } catch (error) {
          return console.log(error);
        }
      } else {
        return await axiosInstance.post(`/history/views/${video?._id}`);
      }
    };
    handleviews();
  }, [user]);
  const handleLike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.liked) {
        if (isLiked) {
          setlikes((prev: any) => prev - 1);
          setIsLiked(false);
        } else {
          setlikes((prev: any) => prev + 1);
          setIsLiked(true);
          if (isDisliked) {
            setDislikes((prev: any) => prev - 1);
            setIsDisliked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleWatchLater = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user?._id,
      });
      const added = res.data.watchlater === true;
      setIsWatchLater(added);
      toast.success(added ? "Added to Watch Later" : "Removed from Watch Later");
    } catch (error) {
      console.log(error);
    }
  };
  const handleDislike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (!res.data.liked) {
        if (isDisliked) {
          setDislikes((prev: any) => prev - 1);
          setIsDisliked(false);
        } else {
          setDislikes((prev: any) => prev + 1);
          setIsDisliked(true);
          if (isLiked) {
            setlikes((prev: any) => prev - 1);
            setIsLiked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDownloadVideo = async () => {
    if (!user) {
      setDownloadMessage("Sign in to download videos.");
      setShowUpgradeCTA(false);
      return;
    }

    // Already downloaded — just re-download the file directly without
    // creating another history entry or hitting the daily free-tier limit.
    // Streamed through our own backend to avoid Cloudinary's CORS
    // restriction, which silently broke fetch()/anchor-download attempts
    // and caused Chrome to open the video in its built-in player instead.
    if (alreadyDownloaded) {
      const streamUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/download/stream/${video._id}`;
      const res = await fetch(streamUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = video.filename || `${video.videotitle}.mp4`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      return;
    }

    setDownloadLoading(true);
    setDownloadMessage("");
    setShowUpgradeCTA(false);

    try {
      const res = await axiosInstance.post(`/download/${video._id}`, {
        userId: user?._id,
      });

      if (res.data.downloaded) {
        const streamUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/download/stream/${video._id}`;
        const fileRes = await fetch(streamUrl);
        const blob = await fileRes.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = video.filename || `${video.videotitle}.mp4`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(blobUrl);
      }

      setDownloadMessage(res.data.message || "Download started.");
      setAlreadyDownloaded(true);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Unable to download video.";
      setDownloadMessage(message);
      if (error?.response?.status === 403) {
        setShowUpgradeCTA(true);
      }
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleDeleteVideo = async () => {
    if (!user) {
      toast.error("Sign in to delete videos");
      return;
    }

    setIsDeleting(true);
    try {
      await axiosInstance.delete(`/video/delete/${video._id}`, {
        data: {
          userId: user?._id,
        },
      });

      toast.success("Video deleted successfully");
      setShowDeleteDialog(false);

      // Refresh the page after deletion
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to delete video";
      toast.error(message);
      console.error("Delete error:", error);
    } finally {
      setIsDeleting(false);
    }
  };
  console.log("user._id:", user?._id, "video.uploader:", video.uploader);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{video.videotitle}</h1>

      {/* <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback>{video.videochanel[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{video.videochanel}</h3>
            <p className="text-sm text-gray-600">1.2M subscribers</p>
          </div>
          <Button className="ml-4">Subscribe</Button>
        </div> */}


      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarFallback>{video.videochanel[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="font-medium truncate">{video.videochanel}</h3>
            <p className="text-sm text-gray-600">1.2M subscribers</p>
          </div>
          <Button className="ml-2 sm:ml-4 shrink-0">Subscribe</Button>
        </div>

        {/* <div className="flex items-center gap-2"> */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto flex-nowrap scrollbar-hide whitespace-nowrap -mx-1 px-1 sm:mx-0 sm:px-0">
          {/* <div className="flex items-center gap-1 sm:gap-2 flex-wrap"> */}
          <div className="flex items-center bg-muted rounded-full">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-full"
              onClick={handleLike}
            >
              <ThumbsUp
                className={`w-5 h-5 mr-2 ${isLiked ? "fill-black text-black" : ""
                  }`}
              />
              {likes.toLocaleString()}
            </Button>
            <div className="w-px h-6 bg-gray-300" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-full"
              onClick={handleDislike}
            >
              <ThumbsDown
                className={`w-5 h-5 mr-2 ${isDisliked ? "fill-black text-black" : ""
                  }`}
              />
              {dislikes.toLocaleString()}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-muted rounded-full shrink-0 transition-colors ${isWatchLater ? "text-blue-500 bg-blue-500/10" : ""
              }`}
            onClick={handleWatchLater}
          >
            <Clock className={`w-5 h-5 mr-2 ${isWatchLater ? "fill-blue-500" : ""}`} />
            {isWatchLater ? "✓ Saved" : "Watch Later"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-muted rounded-full shrink-0"
          >
            <Share className="w-5 h-5 mr-2" />
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-muted rounded-full shrink-0"
            onClick={handleDownloadVideo}
            disabled={downloadLoading}
          >
            <Download className="w-5 h-5 mr-2" />
            {downloadLoading ? "Downloading..." : alreadyDownloaded ? "Downloaded" : "Download"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="bg-muted rounded-full shrink-0"
              >
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  if (String(user?._id) === String(video.uploader)) {
                    setShowDeleteDialog(true);
                  } else {
                    toast.error("only the actual uploader of this video can perform this action.");
                  }
                }}
                className="text-red-600 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Video
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {downloadMessage && (
        <p className="text-sm text-yellow-700">{downloadMessage}</p>
      )}
      {showUpgradeCTA && user?.plan === "free" && (
        <div className="mt-4">
          <UpgradePremium onUpgradeSuccess={() => setShowUpgradeCTA(false)} />
        </div>
      )}
      <div className="bg-muted rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span>{video.views.toLocaleString()} views</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground font-normal">
            {formatDistanceToNow(new Date(video.createdAt))} ago
          </span>
        </div>
        <p
          className={`text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap ${showFullDescription ? "" : "line-clamp-3"
            }`}
        >
          {video.description || "No description provided."}
        </p>
        <div className="flex items-center gap-4 pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-0 py-0 text-sm font-semibold hover:bg-transparent hover:text-foreground/70"
            onClick={() => setShowFullDescription(!showFullDescription)}
          >
            {showFullDescription ? "Show less" : "Show more"}
          </Button>
          {String(user?._id) === String(video.uploader) && (
            <EditDescriptionInline video={video} userId={user?._id} />
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Video</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this video? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteVideo}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoInfo;
