"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Play, Pause, ChevronRight, MessageCircle, X } from "lucide-react";
import { useUser } from "@/lib/AuthContext";

interface GestureVideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
  allVideos?: any[];
}

type GestureZone = "left" | "center" | "right";

interface FeedbackMessage {
  id: string;
  text: string;
  icon?: React.ReactNode;
  duration: number;
}

export default function GestureVideoPlayer({
  video,
  allVideos,
}: GestureVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const { user } = useUser();
  const [limitReached, setLimitReached] = useState(false);

  // Force reload video when video ID changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      setLimitReached(false); // Reset watch limit when video changes
    }
  }, [video?._id]);

  const getWatchLimitSeconds = (plan?: string) => {
    const normalizedPlan = plan === "premium" ? "gold" : plan;
    if (normalizedPlan === "bronze") return 7 * 60;
    if (normalizedPlan === "silver") return 10 * 60;
    if (normalizedPlan === "gold") return null;
    return 5 * 60;
  };

  const watchLimitSeconds = getWatchLimitSeconds(user?.plan);

  // Tap tracking
  const tapCountRef = useRef<Record<GestureZone, number>>({
    left: 0,
    center: 0,
    right: 0,
  });
  const tapTimeRef = useRef<Record<GestureZone, number>>({
    left: 0,
    center: 0,
    right: 0,
  });
  const tapTimerRef = useRef<Record<GestureZone, NodeJS.Timeout | null>>({
    left: null,
    center: null,
    right: null,
  });

  // Feedback messages
  const [feedbackMessages, setFeedbackMessages] = useState<FeedbackMessage[]>(
    []
  );
  const feedbackIdRef = useRef(0);

  // Website closed state
  const [isClosing, setIsClosing] = useState(false);

  const isControlRegion = useCallback((clientY: number): boolean => {
    const rect = videoRef.current?.getBoundingClientRect();
    if (!rect) return false;

    // Exclude the bottom native control bar area from gesture detection.
    const controlHeight = Math.max(80, rect.height * 0.18);
    const y = clientY - rect.top;
    return y >= rect.height - controlHeight;
  }, []);

  const getGestureZone = useCallback((zone: GestureZone, e: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>) => {
    if (isControlRegion(e.clientY)) return null;
    return zone;
  }, [isControlRegion]);

  // Add visual feedback
  const showFeedback = useCallback(
    (text: string, icon?: React.ReactNode, duration = 1000) => {
      const id = `feedback-${feedbackIdRef.current++}`;
      const newMessage: FeedbackMessage = { id, text, icon, duration };

      setFeedbackMessages((prev) => [...prev, newMessage]);

      setTimeout(() => {
        setFeedbackMessages((prev) =>
          prev.filter((msg) => msg.id !== id)
        );
      }, duration);
    },
    []
  );

  // Gesture handlers
  const handleTogglePlayback = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (limitReached) {
      showFeedback("Watch limit reached", <Pause className="w-8 h-8" />);
      vid.pause();
      if (watchLimitSeconds !== null) {
        vid.currentTime = watchLimitSeconds;
      }
      return;
    }

    if (vid.paused) {
      vid.play().catch(() => {});
      showFeedback("Playing", <Play className="w-8 h-8" />);
    } else {
      vid.pause();
      showFeedback("Paused", <Pause className="w-8 h-8" />);
    }
  }, [showFeedback, limitReached, watchLimitSeconds]);

  const handlePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid || !watchLimitSeconds) return;

    if (limitReached || vid.currentTime >= watchLimitSeconds) {
      vid.pause();
      vid.currentTime = watchLimitSeconds;
      setLimitReached(true);
    }
  }, [limitReached, watchLimitSeconds]);

  const handleSeekForward = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const nextTime = Math.min(vid.duration || 0, vid.currentTime + 10);
    vid.currentTime = nextTime;
    showFeedback("+10 seconds", <ChevronRight className="w-8 h-8" />);
  }, [showFeedback]);

  const handleSeekBackward = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const nextTime = Math.max(0, vid.currentTime - 10);
    vid.currentTime = nextTime;
    showFeedback("-10 seconds");
  }, [showFeedback]);

  const handleTimeUpdate = useCallback(() => {
    const vid = videoRef.current;
    if (!vid || limitReached || !watchLimitSeconds) return;

    if (vid.currentTime >= watchLimitSeconds) {
      vid.pause();
      vid.currentTime = watchLimitSeconds;
      setLimitReached(true);
    }
  }, [limitReached, watchLimitSeconds]);

  const handleSeeking = useCallback(() => {
    const vid = videoRef.current;
    if (!vid || !watchLimitSeconds) return;
    if (vid.currentTime > watchLimitSeconds) {
      vid.currentTime = watchLimitSeconds;
    }
  }, [watchLimitSeconds]);

  const handleNextVideo = useCallback(() => {
    if (!allVideos?.length || !video?._id) return;

    const currentIndex = allVideos.findIndex((v) => v._id === video._id);
    const nextVideo = allVideos[(currentIndex + 1) % allVideos.length];

    if (nextVideo?._id) {
      showFeedback("Next video", <ChevronRight className="w-8 h-8" />);
      setTimeout(() => {
        router.push(`/watch/${nextVideo._id}`);
      }, 400);
    }
  }, [allVideos, video?._id, router, showFeedback]);

  const handleOpenComments = useCallback(() => {
    const commentsSection = document.getElementById("comments-section");
    if (commentsSection) {
      showFeedback("Comments", <MessageCircle className="w-8 h-8" />);
      setTimeout(() => {
        commentsSection.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, [showFeedback]);

  const handleCloseWebsite = useCallback(() => {
    showFeedback("Closing website...", <X className="w-8 h-8" />);
    setIsClosing(true);

    try {
      if (typeof window !== "undefined") {
        window.close();
      }
    } catch {
      // Browser prevented window.close()
    }

    setTimeout(() => {
      router.push("/");
    }, 1500);
  }, [router, showFeedback]);

  // Handle tap gesture completion
  const handleTapComplete = useCallback(
    (zone: GestureZone, tapCount: number) => {
      console.log("Gesture detected", { zone, tapCount });
      if (zone === "left") {
        if (tapCount === 2) {
          handleSeekBackward();
        } else if (tapCount === 3) {
          console.log("Triple left detected: opening comments");
          handleOpenComments();
        }
      } else if (zone === "center") {
        if (tapCount === 1) {
          handleTogglePlayback();
        } else if (tapCount === 3) {
          handleNextVideo();
        }
      } else if (zone === "right") {
        if (tapCount === 2) {
          handleSeekForward();
        } else if (tapCount === 3) {
          console.log("Triple right detected: closing website");
          handleCloseWebsite();
        }
      }

      // Reset tap count for this zone
      tapCountRef.current[zone] = 0;
      tapTimeRef.current[zone] = 0;
    },
    [
      handleSeekBackward,
      handleOpenComments,
      handleTogglePlayback,
      handleNextVideo,
      handleSeekForward,
      handleCloseWebsite,
    ]
  );

  const handleZonePointerDown = useCallback(
    (zone: GestureZone) => (e: React.PointerEvent<HTMLDivElement>) => {
      if (!getGestureZone(zone, e)) return;

      e.preventDefault();
      e.stopPropagation();

      const now = Date.now();
      const lastTapTime = tapTimeRef.current[zone];

      if (tapTimerRef.current[zone]) {
        clearTimeout(tapTimerRef.current[zone]!);
        tapTimerRef.current[zone] = null;
      }

      if (now - lastTapTime > 400) {
        tapCountRef.current[zone] = 1;
      } else {
        tapCountRef.current[zone] += 1;
      }

      tapTimeRef.current[zone] = now;

      tapTimerRef.current[zone] = setTimeout(() => {
        handleTapComplete(zone, tapCountRef.current[zone]);
      }, 400);
    },
    [getGestureZone, handleTapComplete]
  );

  const handleZoneDoubleClickCapture = useCallback(
    (zone: GestureZone) => (e: React.MouseEvent<HTMLDivElement>) => {
      if (!getGestureZone(zone, e)) return;
      e.preventDefault();
      e.stopPropagation();
    },
    [getGestureZone]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(tapTimerRef.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Video Player Container */}
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
        {/* Native Video Element */}
        <video
          key={video?._id}
          ref={videoRef}
          className="w-full h-full"
          controls
          poster={""}
          controlsList="nodownload"
          onPlay={handlePlay}
          onTimeUpdate={handleTimeUpdate}
          onSeeking={handleSeeking}
        >
          <source
            src={video?.filepath}
            // src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/${video?.filepath}`}
            type="video/mp4"
          />
          Your browser does not support the video tag.
        </video>

        {/* Gesture Zones (top area only, native controls remain untouched) */}
        <div className="absolute inset-x-0 top-0 h-[82%] z-10 flex">
          <div
            className="relative w-1/3"
            onPointerDownCapture={handleZonePointerDown("left")}
            onDoubleClickCapture={handleZoneDoubleClickCapture("left")}
          >
            <div className="absolute inset-0 opacity-0 hover:opacity-10 bg-blue-500 transition-opacity pointer-events-none" />
          </div>
          <div
            className="relative w-1/3"
            onPointerDownCapture={handleZonePointerDown("center")}
            onDoubleClickCapture={handleZoneDoubleClickCapture("center")}
          >
            <div className="absolute inset-0 opacity-0 hover:opacity-10 bg-green-500 transition-opacity pointer-events-none" />
          </div>
          <div
            className="relative w-1/3"
            onPointerDownCapture={handleZonePointerDown("right")}
            onDoubleClickCapture={handleZoneDoubleClickCapture("right")}
          >
            <div className="absolute inset-0 opacity-0 hover:opacity-10 bg-red-500 transition-opacity pointer-events-none" />
          </div>
        </div>

        {/* Feedback Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 10 }}>
          {feedbackMessages.map((msg) => (
            <div
              key={msg.id}
              className="text-white text-center animate-fade-in-out"
            >
              <div className="text-5xl mb-2">{msg.icon}</div>
              <div className="text-xl font-semibold">{msg.text}</div>
            </div>
          ))}
        </div>

        {/* Watch limit overlay */}
        {limitReached && watchLimitSeconds && (
          <div className="absolute inset-0 bg-black/80 z-40 flex flex-col items-center justify-center text-center px-4">
            <div className="bg-white/10 border border-white/20 rounded-3xl p-8 max-w-md">
              <p className="text-2xl font-semibold text-white">Watch limit reached</p>
              <p className="mt-3 text-sm text-gray-200">
                Your current plan allows {Math.floor(watchLimitSeconds / 60)} minutes of playback.
              </p>
              <p className="mt-2 text-sm text-gray-200">
                Upgrade to a higher plan to continue watching this video.
              </p>
              <Link href="/premium" className="mt-6 inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500">
                View upgrade plans
              </Link>
            </div>
          </div>
        )}

        {/* Closing Overlay */}
        {isClosing && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center" style={{ zIndex: 50 }}>
            <div className="text-white text-center">
              <X className="w-16 h-16 mx-auto mb-4" />
              <p className="text-2xl font-semibold mb-2">Website Closed</p>
              <p className="text-sm text-gray-300">Redirecting to home...</p>
            </div>
          </div>
        )}
      </div>

      {/* Zone Information (optional - for user guidance) */}
      <div className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded border border-border">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="font-semibold text-gray-700">Left</p>
            <p>2x: -10s | 3x: Comments</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Center</p>
            <p>1x: Play/Pause | 3x: Next</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Right</p>
            <p>2x: +10s | 3x: Close</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInOut {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0.8);
          }
        }
        .animate-fade-in-out {
          animation: fadeInOut 1s ease-in-out;
        }
      `}</style>
    </div>
  );
}
