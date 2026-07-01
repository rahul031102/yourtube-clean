"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/router";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
  allVideos?: any[];
}

type TapRegion = "left" | "center" | "right";

type TapState = {
  count: number;
  region: TapRegion | null;
  lastTime: number;
  timer: number | null;
};

export default function VideoPlayer({ video, allVideos }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [siteClosed, setSiteClosed] = useState(false);
  const taps = useRef<TapState>({ count: 0, region: null, lastTime: 0, timer: null });

  useEffect(() => {
    return () => {
      if (taps.current.timer) {
        clearTimeout(taps.current.timer);
      }
    };
  }, []);

  const resetTapState = () => {
    if (taps.current.timer) {
      clearTimeout(taps.current.timer);
    }
    taps.current = { count: 0, region: null, lastTime: 0, timer: null };
  };

  const togglePlayback = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  };

  const seekBy = (offset: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    const nextTime = Math.max(0, Math.min(vid.duration || 0, vid.currentTime + offset));
    vid.currentTime = nextTime;
  };

  const playNextVideo = () => {
    if (!allVideos?.length) return;
    const currentIndex = allVideos.findIndex((item) => item._id === video?._id);
    const nextVideo = allVideos[currentIndex + 1] || allVideos[0];
    if (nextVideo?._id) {
      router.push(`/watch/${nextVideo._id}`);
    }
  };

  const closeWebsite = () => {
    if (typeof window !== "undefined") {
      try {
        window.close();
      } catch {
        // ignore
      }
    }
    setSiteClosed(true);
    setTimeout(() => {
      router.replace("/");
    }, 800);
  };

  const openComments = () => {
    if (typeof document !== "undefined") {
      const comments = document.getElementById("comments-section");
      comments?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleTapAction = (region: TapRegion, count: number) => {
    resetTapState();

    if (region === "center" && count === 1) {
      togglePlayback();
      return;
    }

    if (region === "center" && count === 3) {
      playNextVideo();
      return;
    }

    if (region === "right" && count === 2) {
      seekBy(10);
      return;
    }

    if (region === "left" && count === 2) {
      seekBy(-10);
      return;
    }

    if (region === "right" && count === 3) {
      closeWebsite();
      return;
    }

    if (region === "left" && count === 3) {
      openComments();
      return;
    }
  };

  const getRegion = (clientX: number) => {
    const container = containerRef.current;
    if (!container) return "center" as TapRegion;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const ratio = x / rect.width;
    if (ratio < 0.3) return "left";
    if (ratio > 0.7) return "right";
    return "center";
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLVideoElement>) => {
    const region = getRegion(event.clientX);
    const now = Date.now();

    if (taps.current.region === region && now - taps.current.lastTime < 400) {
      taps.current.count += 1;
    } else {
      taps.current.count = 1;
      taps.current.region = region;
    }

    taps.current.lastTime = now;
    if (taps.current.timer) {
      clearTimeout(taps.current.timer);
    }

    taps.current.timer = window.setTimeout(() => {
      handleTapAction(region, taps.current.count);
    }, 350);
  };

  return (
    <div ref={containerRef} className="relative aspect-video bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        poster={`/placeholder.svg?height=480&width=854`}
        onPointerUp={handlePointerUp}
      >
        <source
          src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${video?.filepath}`}
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>
      {siteClosed ? (
        <div className="absolute inset-0 bg-black/90 text-white flex items-center justify-center text-center p-6">
          <div>
            <p className="text-2xl font-semibold">Website Closed</p>
            <p className="text-sm text-gray-300 mt-2">
              Redirecting to home...
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
