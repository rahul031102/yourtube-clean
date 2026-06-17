"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Download, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";

export default function DownloadsContent() {
  const [downloads, setDownloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
        <p className="text-sm text-gray-600">{downloads.length} videos</p>
      </div>
      <div className="space-y-4">
        {downloads.map((item) => (
          <div key={item._id} className="flex gap-4 group rounded-lg border p-4">
            <Link href={`/watch/${item.videoid._id}`} className="flex-shrink-0">
              <div className="relative w-40 aspect-video bg-muted rounded overflow-hidden">
                <video
                  src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${item.videoid?.filepath?.replace(/\\/g, "/")}`}
                  className="object-cover w-full h-full"
                />
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
            <div className="flex flex-col justify-between gap-2">
              <a
                href={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${item.videoid?.filepath?.replace(/\\/g, "/")}`}
                download={item.videoid?.filename}
                className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Download again
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
