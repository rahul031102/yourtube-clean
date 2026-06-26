// "use client";

// import { useState, useEffect } from "react";
// import Link from "next/link";
// import { formatDistanceToNow } from "date-fns";
// import { Download, Clock } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import axiosInstance from "@/lib/axiosinstance";
// import { useUser } from "@/lib/AuthContext";

// export default function DownloadsContent() {
//   const [downloads, setDownloads] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const { user } = useUser();

//   useEffect(() => {
//     if (user) {
//       loadDownloads();
//     } else {
//       setLoading(false);
//     }
//   }, [user]);

//   const loadDownloads = async () => {
//     setLoading(true);
//     if (!user) return;

//     try {
//       const response = await axiosInstance.get(`/download/${user._id}`);
//       setDownloads(response.data);
//     } catch (error) {
//       console.error("Error loading downloads:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (!user) {
//     return (
//       <div className="text-center py-12">
//         <Download className="w-16 h-16 mx-auto text-gray-400 mb-4" />
//         <h2 className="text-xl font-semibold mb-2">Your downloads</h2>
//         <p className="text-gray-600">Sign in to save and view downloaded videos.</p>
//       </div>
//     );
//   }

//   if (loading) {
//     return <div>Loading downloads...</div>;
//   }

//   if (downloads.length === 0) {
//     return (
//       <div className="text-center py-12">
//         <Download className="w-16 h-16 mx-auto text-gray-400 mb-4" />
//         <h2 className="text-xl font-semibold mb-2">No downloads yet</h2>
//         <p className="text-gray-600">Downloaded videos will appear here for quick access.</p>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-4">
//       <div className="flex justify-between items-center">
//         {/* <p className="text-sm text-gray-600">{downloads.length} videos</p> */}
//         <p className="text-sm text-gray-600">{downloads.filter((item) => item.videoid).length} videos</p>
//       </div>
//       <div className="space-y-4">
//         {downloads.filter((item) =>  item.videoid).map((item)=>(
//           <div key={item._id} className="flex gap-4 group rounded-lg border p-4">
//             <Link href={`/watch/${item.videoid._id}`} className="flex-shrink-0">
//               <div className="relative w-40 aspect-video bg-muted rounded overflow-hidden">
//                 <video
//                   src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${item.videoid?.filepath?.replace(/\\/g, "/")}`}
//                   className="object-cover w-full h-full"
//                 />
//               </div>
//             </Link>
//             <div className="flex-1 min-w-0">
//               <Link href={`/watch/${item.videoid._id}`}>
//                 <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 mb-1">
//                   {item.videoid.videotitle}
//                 </h3>
//               </Link>
//               <p className="text-sm text-gray-600">{item.videoid.videochanel}</p>
//               <p className="text-sm text-gray-600">
//                 {item.videoid.views.toLocaleString()} views • {formatDistanceToNow(new Date(item.videoid.createdAt))} ago
//               </p>
//               <p className="text-xs text-gray-500 mt-1">
//                 Downloaded {formatDistanceToNow(new Date(item.createdAt))} ago
//               </p>
//             </div>
//             <div className="flex flex-col justify-between gap-2">
//               <a
//                 href={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${item.videoid?.filepath?.replace(/\\/g, "/")}`}
//                 download={item.videoid?.filename}
//                 className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
//               >
//                 Download again
//               </a>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }


"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Download, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";

const resolveMediaUrl = (filepath?: string) => {
  if (!filepath) return "";
  const cleaned = filepath.replace(/\\/g, "/");
  // Cloudinary (and any other) URLs are already absolute; only prepend our
  // backend URL for legacy local-disk relative paths.
  return /^https?:\/\//i.test(cleaned)
    ? cleaned
    : `${process.env.NEXT_PUBLIC_BACKEND_URL}/${cleaned}`;
};

export default function DownloadsContent() {
  const [downloads, setDownloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteEntry = async (downloadId: string) => {
    if (!user) return;
    setDeletingId(downloadId);
    try {
      await axiosInstance.delete(`/download/entry/${downloadId}`, {
        data: { userId: user._id },
      });
      setDownloads((prev) => prev.filter((item) => item._id !== downloadId));
    } catch (error) {
      console.error("Error deleting download entry:", error);
    } finally {
      setDeletingId(null);
    }
  };
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      loadDownloads();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadDownloads = async () => {
    setLoading(true);
    if (!user) return;

    try {
      const response = await axiosInstance.get(`/download/${user._id}`);
      setDownloads(response.data);
    } catch (error) {
      console.error("Error loading downloads:", error);
    } finally {
      setLoading(false);
    }
  };

  // Cross-origin URLs (e.g. Cloudinary) cause the browser's `download`
  // attribute on an <a> tag to be ignored, opening the video in Chrome's
  // player instead of saving it. Fetching the file as a blob first and
  // triggering the download from a same-origin object URL avoids that.
  const handleDownloadAgain = async (videoId: string, filename: string, id: string) => {
    setDownloadingId(id);
    try {
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/download/stream/${videoId}`;
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename || "video.mp4";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setDownloadingId(null);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <Download className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Your downloads</h2>
        <p className="text-gray-600">Sign in to save and view downloaded videos.</p>
      </div>
    );
  }

  if (loading) {
    return <div>Loading downloads...</div>;
  }

  if (downloads.length === 0) {
    return (
      <div className="text-center py-12">
        <Download className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No downloads yet</h2>
        <p className="text-gray-600">Downloaded videos will appear here for quick access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">{downloads.filter((item) => item.videoid).length} videos</p>
      </div>
      <div className="space-y-4">
        {downloads.filter((item) => item.videoid).map((item) => {
          const mediaUrl = resolveMediaUrl(item.videoid?.filepath);
          return (
            <div key={item._id} className="flex flex-col sm:flex-row gap-3 sm:gap-4 group rounded-lg border p-4">
              <Link href={`/watch/${item.videoid._id}`} className="flex-shrink-0">
                <div className="relative w-full sm:w-40 aspect-video bg-muted rounded overflow-hidden">
                  {item.videoid?.thumbnail ? (
                    <img
                      src={item.videoid.thumbnail}
                      alt={item.videoid?.videotitle || "thumbnail"}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <video
                      src={mediaUrl}
                      preload="metadata"
                      className="object-cover w-full h-full"
                    />
                  )}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/watch/${item.videoid._id}`}>
                  <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 mb-1">
                    {item.videoid.videotitle}
                  </h3>
                </Link>
                <p className="text-sm text-gray-600">{item.videoid.videochanel}</p>
                <p className="text-sm text-gray-600">
                  {item.videoid.views.toLocaleString()} views • {formatDistanceToNow(new Date(item.videoid.createdAt))} ago
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Downloaded {formatDistanceToNow(new Date(item.createdAt))} ago
                </p>
              </div>
              <div className="flex flex-row sm:flex-col justify-start sm:justify-between gap-2 flex-shrink-0">
                <button
                  onClick={() => handleDownloadAgain(item.videoid._id, item.videoid?.filename, item._id)}
                  disabled={downloadingId === item._id}
                  className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
                >
                  {downloadingId === item._id ? "Downloading..." : "Download again"}
                </button>
                <button
                  onClick={() => handleDeleteEntry(item._id)}
                  disabled={deletingId === item._id}
                  title="Remove from download history"
                  className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}