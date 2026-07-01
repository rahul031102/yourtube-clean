

"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Play, Pause, ChevronRight, ChevronLeft, MessageCircle, X,
  Volume2, VolumeX, Maximize, Minimize, Settings,
} from "lucide-react";
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

function formatTime(s: number) {
  if (isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function GestureVideoPlayer({ video, allVideos }: GestureVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user } = useUser();

  // Watch limit
  const [limitReached, setLimitReached] = useState(false);
  const getWatchLimitSeconds = (plan?: string) => {
    const p = plan === "premium" ? "gold" : plan;
    if (p === "bronze") return 7 * 60;
    if (p === "silver") return 10 * 60;
    if (p === "gold") return null;
    return 5 * 60;
  };
  const watchLimitSeconds = getWatchLimitSeconds(user?.plan);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Quality
  const [qualities, setQualities] = useState<Record<string, string>>({});
  const [currentQuality, setCurrentQuality] = useState("Auto");
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // Feedback
  const [feedbackMessages, setFeedbackMessages] = useState<FeedbackMessage[]>([]);
  const feedbackIdRef = useRef(0);

  // Gesture tracking
  const tapCountRef = useRef<Record<GestureZone, number>>({ left: 0, center: 0, right: 0 });
  const tapTimeRef = useRef<Record<GestureZone, number>>({ left: 0, center: 0, right: 0 });
  const tapTimerRef = useRef<Record<GestureZone, NodeJS.Timeout | null>>({ left: null, center: null, right: null });
  const activeZoneRef = useRef<GestureZone | null>(null);
  const armTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset on video change
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      setLimitReached(false);
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [video?._id]);

  // Fetch qualities
  useEffect(() => {
    const fetchQualities = async () => {
      if (!video?._id) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/video/qualities/${video._id}`);
        const data = await res.json();
        setQualities(data.qualities || {});
      } catch { }
    };
    fetchQualities();
    setCurrentQuality("Auto");
  }, [video?._id]);

  // Controls auto-hide
  const showControlsTemp = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
    }, 3000);
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      Object.values(tapTimerRef.current).forEach((t) => t && clearTimeout(t));
      if (armTimerRef.current) clearTimeout(armTimerRef.current);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, []);

  // --- Feedback ---
  const showFeedback = useCallback((text: string, icon?: React.ReactNode, duration = 800) => {
    const id = `fb-${feedbackIdRef.current++}`;
    setFeedbackMessages((prev) => [...prev, { id, text, icon, duration }]);
    setTimeout(() => setFeedbackMessages((prev) => prev.filter((m) => m.id !== id)), duration);
  }, []);

  // --- Gesture actions ---
  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (limitReached) { showFeedback("Watch limit reached"); return; }
    if (vid.paused) {
      vid.play().catch(() => { });
      showFeedback("", <Play className="w-10 h-10" />);
      setIsPlaying(true);
    } else {
      vid.pause();
      showFeedback("", <Pause className="w-10 h-10" />);
      setIsPlaying(false);
    }
    showControlsTemp();
  }, [limitReached, showFeedback, showControlsTemp]);

  const seekForward = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = Math.min(vid.duration || 0, vid.currentTime + 10);
    showFeedback("+10s", <ChevronRight className="w-10 h-10" />);
    showControlsTemp();
  }, [showFeedback, showControlsTemp]);

  const seekBackward = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = Math.max(0, vid.currentTime - 10);
    showFeedback("-10s", <ChevronLeft className="w-10 h-10" />);
    showControlsTemp();
  }, [showFeedback, showControlsTemp]);

  const nextVideo = useCallback(() => {
    if (!allVideos?.length || !video?._id) return;
    const idx = allVideos.findIndex((v) => v._id === video._id);
    const next = allVideos[(idx + 1) % allVideos.length];
    if (next?._id) {
      showFeedback("Next video", <ChevronRight className="w-10 h-10" />);
      setTimeout(() => router.push(`/watch/${next._id}`), 400);
    }
  }, [allVideos, video?._id, router, showFeedback]);

  const openComments = useCallback(() => {
    const el = document.getElementById("comments-section");
    if (el) {
      showFeedback("Comments", <MessageCircle className="w-10 h-10" />);
      setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 300);
    }
  }, [showFeedback]);

  const closeWebsite = useCallback(() => {
    showFeedback("Closing...", <X className="w-10 h-10" />);
    setIsClosing(true);
    try { window.close(); } catch { }
    setTimeout(() => router.replace("/"), 1500);
  }, [router, showFeedback]);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  }, []);

  const toggleMute = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setIsMuted(vid.muted);
  }, []);

  const handleVolumeChange = useCallback((val: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  }, []);

  const handleQualityChange = useCallback((label: string, url: string) => {
    const vid = videoRef.current;
    if (!vid) return;
    const t = vid.currentTime;
    const wasPlaying = !vid.paused;
    vid.src = url;
    vid.load();
    vid.currentTime = t;
    if (wasPlaying) vid.play().catch(() => { });
    setCurrentQuality(label);
    setShowQualityMenu(false);
  }, []);

  // --- Gesture tap handler ---
  const handleTapComplete = useCallback((zone: GestureZone, tapCount: number) => {
    if (zone === "left") {
      if (tapCount === 1) showControlsTemp();
      else if (tapCount === 2) seekBackward();
      else if (tapCount === 3) openComments();
    } else if (zone === "center") {
      if (tapCount === 1) togglePlay();
      else if (tapCount === 3) nextVideo();
    } else if (zone === "right") {
      if (tapCount === 1) showControlsTemp();
      else if (tapCount === 2) seekForward();
      else if (tapCount === 3) closeWebsite();
    }
    tapCountRef.current[zone] = 0;
    tapTimeRef.current[zone] = 0;
  }, [seekBackward, openComments, togglePlay, nextVideo, seekForward, closeWebsite, showControlsTemp]);

  const handleWrapperPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;
    const zone: GestureZone = x < third ? "left" : x < third * 2 ? "center" : "right";

    // ignore taps in bottom 20% (custom controls area)
    const y = e.clientY - rect.top;
    if (y >= rect.height * 0.8) return;

    activeZoneRef.current = zone;
    if (armTimerRef.current) clearTimeout(armTimerRef.current);
    armTimerRef.current = setTimeout(() => { activeZoneRef.current = null; }, 450);

    const now = Date.now();
    const isRepeat = now - tapTimeRef.current[zone] <= 400;
    if (isRepeat) { e.preventDefault(); e.stopPropagation(); }

    if (tapTimerRef.current[zone]) { clearTimeout(tapTimerRef.current[zone]!); tapTimerRef.current[zone] = null; }
    tapCountRef.current[zone] = isRepeat ? tapCountRef.current[zone] + 1 : 1;
    tapTimeRef.current[zone] = now;
    tapTimerRef.current[zone] = setTimeout(() => handleTapComplete(zone, tapCountRef.current[zone]), 400);
  }, [handleTapComplete]);

  // Progress bar click
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const vid = videoRef.current;
    if (!vid || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const target = pct * duration;
    if (watchLimitSeconds && target > watchLimitSeconds) return;
    vid.currentTime = target;
    setCurrentTime(target);
    showControlsTemp();
  }, [duration, watchLimitSeconds, showControlsTemp]);

  const progressPct = duration ? (currentTime / duration) * 100 : 0;
  const limitPct = watchLimitSeconds && duration ? (watchLimitSeconds / duration) * 100 : 100;

  return (
    <div className="space-y-2">
      {/* Player */}
      <div
        ref={containerRef}
        className="relative w-full aspect-video bg-black rounded-none sm:rounded-lg overflow-hidden select-none"
        onMouseMove={showControlsTemp}
        onMouseLeave={() => { if (videoRef.current && !videoRef.current.paused) setShowControls(false); }}
        onPointerUp={(e) => {
          // only show controls if tap was in bottom 20% (controls area) or edges
          const rect = e.currentTarget.getBoundingClientRect();
          const y = e.clientY - rect.top;
          if (y >= rect.height * 0.8) showControlsTemp();
        }}
      >
        {/* Video */}
        <video
          key={video?._id}
          ref={videoRef}
          className="w-full h-full"
          src={video?.filepath}
          onPlay={() => { setIsPlaying(true); showControlsTemp(); }}
          onPause={() => { setIsPlaying(false); setShowControls(true); }}
          onTimeUpdate={() => {
            const vid = videoRef.current;
            if (!vid) return;
            setCurrentTime(vid.currentTime);
            if (watchLimitSeconds && !limitReached && vid.currentTime >= watchLimitSeconds) {
              vid.pause();
              vid.currentTime = watchLimitSeconds;
              setLimitReached(true);
            }
          }}
          onLoadedMetadata={() => { if (videoRef.current) setDuration(videoRef.current.duration); }}
          onSeeking={() => {
            const vid = videoRef.current;
            if (vid && watchLimitSeconds && vid.currentTime > watchLimitSeconds) vid.currentTime = watchLimitSeconds;
          }}
          onVolumeChange={() => { if (videoRef.current) { setVolume(videoRef.current.volume); setIsMuted(videoRef.current.muted); } }}
        />

        {/* Gesture overlay — covers top 80%, bottom 20% is controls */}
        <div
          className="absolute inset-x-0 top-0 z-10 flex"
          style={{ height: "80%" }}
          onPointerDownCapture={handleWrapperPointerDown}
        >
          <div className="w-1/3 h-full" />
          <div className="w-1/3 h-full" />
          <div className="w-1/3 h-full" />
        </div>

        {/* Feedback overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          {feedbackMessages.map((msg) => (
            <div key={msg.id} className="text-white text-center animate-fade-in-out bg-black/40 rounded-full p-4">
              {msg.icon && <div className="flex justify-center mb-1">{msg.icon}</div>}
              {msg.text && <div className="text-sm font-semibold">{msg.text}</div>}
            </div>
          ))}
        </div>

        {/* Custom Controls */}
        <div
          className={`absolute inset-x-0 bottom-0 z-30 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)" }}
        >
          {/* Progress bar */}
          <div className="px-3 pt-3 pb-1 group">
            <div
              className="relative h-[3px] group-hover:h-[5px] transition-all duration-150 rounded-full bg-white/20 cursor-pointer"
              onClick={handleProgressClick}
            >
              {/* watch limit zone */}
              {watchLimitSeconds && duration && (
                <div
                  className="absolute top-0 h-full bg-gray-500/50 rounded-full"
                  style={{ width: `${limitPct}%` }}
                />
              )}
              {/* buffered / played */}
              <div
                className="absolute top-0 left-0 h-full bg-red-600 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
              {/* scrubber thumb — only visible on hover */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${progressPct}% - 6px)` }}
              />
            </div>
          </div>

          {/* Buttons row */}
          <div className="flex items-center justify-between px-3 pb-2 pt-1">
            {/* Left side */}
            <div className="flex items-center gap-3">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="text-white/90 hover:text-white transition-colors"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying
                  ? <Pause className="w-[18px] h-[18px] fill-white stroke-none" />
                  : <Play className="w-[18px] h-[18px] fill-white stroke-none" />}
              </button>

              {/* Volume */}
              <div className="flex items-center gap-1 group/vol">
                <button onClick={toggleMute} className="text-white/90 hover:text-white transition-colors">
                  {isMuted || volume === 0
                    ? <VolumeX className="w-[18px] h-[18px]" />
                    : <Volume2 className="w-[18px] h-[18px]" />}
                </button>
                <input
                  type="range" min={0} max={1} step={0.02}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-0 group-hover/vol:w-16 sm:group-hover/vol:w-20 overflow-hidden transition-all duration-200 accent-white cursor-pointer"
                  style={{ height: "3px" }}
                />
              </div>

              {/* Time */}
              <span className="text-white/80 text-[11px] font-mono tracking-tight select-none">
                {formatTime(currentTime)}
                <span className="text-white/40 mx-1">/</span>
                {formatTime(duration)}
              </span>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 relative">
              {/* Quality */}
              <div className="relative">
                <button
                  onClick={() => setShowQualityMenu((s) => !s)}
                  className="flex items-center gap-1 text-white/80 hover:text-white transition-colors"
                  aria-label="Quality"
                >
                  <Settings className="w-[16px] h-[16px]" />
                  <span className="hidden sm:inline text-[11px] font-medium">{currentQuality}</span>
                </button>
                {showQualityMenu && (
                  <div className="absolute bottom-7 right-0 bg-[#1a1a1a] border border-white/10 rounded-lg overflow-hidden min-w-[100px] shadow-2xl z-50">
                    <div className="px-3 py-1.5 text-[10px] text-white/40 uppercase tracking-wider border-b border-white/10">Quality</div>
                    <button
                      onClick={() => handleQualityChange("Auto", video?.filepath || "")}
                      className={`block w-full text-left text-white text-xs px-3 py-2 hover:bg-white/10 transition-colors ${currentQuality === "Auto" ? "text-red-400" : ""}`}
                    >Auto</button>
                    {Object.entries(qualities).map(([label, url]) => (
                      <button
                        key={label}
                        onClick={() => handleQualityChange(label, url)}
                        className={`block w-full text-left text-white text-xs px-3 py-2 hover:bg-white/10 transition-colors ${currentQuality === label ? "text-red-400" : ""}`}
                      >{label}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="text-white/90 hover:text-white transition-colors"
                aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen
                  ? <Minimize className="w-[18px] h-[18px]" />
                  : <Maximize className="w-[18px] h-[18px]" />}
              </button>
            </div>
          </div>
        </div>

        {/* Watch limit overlay */}
        {limitReached && watchLimitSeconds && (
          <div className="absolute inset-0 bg-black/80 z-40 flex flex-col items-center justify-center text-center px-4">
            <div className="bg-white/10 border border-white/20 rounded-3xl p-8 max-w-md">
              <p className="text-2xl font-semibold text-white">Watch limit reached</p>
              <p className="mt-3 text-sm text-gray-200">
                Your plan allows {Math.floor(watchLimitSeconds / 60)} min of playback.
              </p>
              <Link href="/premium" className="mt-6 inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500">
                Upgrade plan
              </Link>
            </div>
          </div>
        )}

        {/* Closing overlay */}
        {isClosing && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="text-white text-center">
              <X className="w-16 h-16 mx-auto mb-4" />
              <p className="text-2xl font-semibold mb-2">Website Closed</p>
              <p className="text-sm text-gray-300">Redirecting to home...</p>
            </div>
          </div>
        )}
      </div>

      {/* Gesture guide */}
      <div className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded border border-border">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><p className="font-semibold">Left</p><p>2x: -10s | 3x: Comments</p></div>
          <div><p className="font-semibold">Center</p><p>1x: Play/Pause | 3x: Next</p></div>
          <div><p className="font-semibold">Right</p><p>2x: +10s | 3x: Close</p></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.8); }
        }
        .animate-fade-in-out { animation: fadeInOut 0.8s ease-in-out; }
      `}</style>
    </div>
  );
}