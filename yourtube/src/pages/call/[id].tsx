"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/router";
import { getSocket } from "@/lib/socket";

const buildIceConfig = (): RTCConfiguration => {
  const iceServers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
  try {
    const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
    const turnUser = process.env.NEXT_PUBLIC_TURN_USER;
    const turnPass = process.env.NEXT_PUBLIC_TURN_PASS;
    if (turnUrl) {
      const turn: RTCIceServer = { urls: turnUrl } as any;
      if (turnUser && turnPass) {
        (turn as any).username = turnUser;
        (turn as any).credential = turnPass;
      }
      iceServers.push(turn);
    }
  } catch (e) {}
  return { iceServers };
};

const VideoCallPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const targetId = Array.isArray(id) ? id[0] : id || "";

  const localRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const remoteSocketIdRef = useRef<string | null>(null);
  const iceCandidatesQueueRef = useRef<any[]>([]);
  const [connected, setConnected] = useState(false);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<number | null>(null);
  const [callSeconds, setCallSeconds] = useState(0);
  const callTimerRef = useRef<number | null>(null);
  const [connectionState, setConnectionState] = useState("new");
  const [mode, setMode] = useState<"audio" | "video">("video");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [calleeName, setCalleeName] = useState<string>("");

  useEffect(() => {
    if (!router.isReady) return;
    const params = new URLSearchParams(window.location.search);
    const currentMode = params.get("mode") === "audio" ? "audio" : "video";
    setMode(currentMode);
    setRole(params.get("role"));
    setRoomId(params.get("room") || targetId || null);
    const toName = params.get("toName") ? decodeURIComponent(params.get("toName")!) : targetId;
    setCalleeName(toName);
  }, [router.isReady, targetId]);

  useEffect(() => {
    if (!roomId || !role) return;

    let mounted = true;
    const socket = getSocket();
    const currentMode = mode;
    const mediaConstraints = currentMode === "audio" ? { audio: true, video: false } : { audio: true, video: true };

    const cleanupPeer = () => {
      if (pcRef.current) {
        pcRef.current.getSenders().forEach((s) => s.track?.stop());
        pcRef.current.close();
        pcRef.current = null;
      }
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    };

    const setupPeerAndMedia = async () => {
      try {
        if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          toast.error("WebRTC is not supported on this browser/device or context (HTTPS required).");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        if (!mounted) return;

        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((t) => t.stop());
        }
        localStreamRef.current = stream;
        cameraTrackRef.current = currentMode === "video" ? stream.getVideoTracks()[0] || null : null;

        if (currentMode === "video" && localRef.current) {
          localRef.current.srcObject = stream;
          localRef.current.muted = true;
          localRef.current.play().catch(() => {});
        }

        setIsMuted(false);
        setIsCameraOn(currentMode === "video");
        pcRef.current = new RTCPeerConnection(buildIceConfig());
        const pc = pcRef.current;

        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        pc.ontrack = (ev) => {
          const [remoteStream] = ev.streams;
          if (currentMode === "video") {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
              remoteVideoRef.current.play().catch(() => {});
            }
          } else {
            if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = remoteStream;
              remoteAudioRef.current.play().catch(() => {});
            }
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", { target: remoteSocketIdRef.current, candidate: event.candidate });
          }
        };

        pc.onconnectionstatechange = () => {
          setConnectionState(pc.connectionState || "unknown");
        };

        const processQueuedCandidates = async () => {
          while (iceCandidatesQueueRef.current.length > 0) {
            const cand = iceCandidatesQueueRef.current.shift();
            if (cand) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {
                console.warn("Failed to add queued ICE candidate", e);
              }
            }
          }
        };

        socket.on("user-joined", async ({ id: otherId }) => {
          if (!pc) return;
          remoteSocketIdRef.current = otherId;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("offer", { target: otherId, sdp: offer });
        });

        socket.on("offer", async ({ from, sdp }) => {
          if (!pc) return;
          remoteSocketIdRef.current = from;
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          await processQueuedCandidates();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("answer", { target: from, sdp: answer });
        });

        socket.on("answer", async ({ from, sdp }) => {
          if (!pc) return;
          remoteSocketIdRef.current = from;
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          await processQueuedCandidates();
        });

        socket.on("ice-candidate", async ({ from, candidate }) => {
          if (!pc || !candidate) return;
          if (!pc.remoteDescription) {
            iceCandidatesQueueRef.current.push(candidate);
            return;
          }
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn("Failed to add ICE candidate", e);
          }
        });

        socket.emit("join-room", { roomId });
        setConnected(true);
        callTimerRef.current = window.setInterval(() => setCallSeconds((s) => s + 1), 1000);
      } catch (err) {
        console.error("media error", err);
        toast.error("Could not access camera/microphone. Please check permissions.");
      }
    };

    const onResponse = ({ accepted }: any) => {
      socket.off("call-response", onResponse);
      if (accepted) {
        setupPeerAndMedia();
      } else {
        toast.error("Call declined", { description: "The recipient declined your call." });
        router.replace("/");
      }
    };

    if (role === "caller") {
      if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // start local camera immediately so caller sees themselves while waiting
        navigator.mediaDevices.getUserMedia(mediaConstraints).then((stream) => {
          localStreamRef.current = stream;
          cameraTrackRef.current = stream.getVideoTracks()[0] || null;
          if (localRef.current && currentMode === "video") {
            localRef.current.srcObject = stream;
            localRef.current.muted = true;
            localRef.current.play().catch(() => {});
          }
        }).catch(() => {});
      } else {
        toast.error("Camera/Mic access is not supported on this browser or connection context.");
      }
      socket.on("call-response", onResponse);
    } else {
      setupPeerAndMedia();
    }

    return () => {
      mounted = false;
      socket.emit("leave-room", { roomId });
      socket.off("user-joined");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("call-response", onResponse);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (localRef.current) localRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
      cleanupPeer();
    };
  }, [roomId, role, mode, router]);

  useEffect(() => {
    if (mode === "video" && localRef.current && localStreamRef.current) {
      localRef.current.srcObject = localStreamRef.current;
      localRef.current.muted = true;
      localRef.current.play().catch(() => {});
    }
  }, [connected, mode]);

  useEffect(() => {
    const socket = getSocket();
    const onCallEnded = () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (localRef.current) localRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
      if (pcRef.current) {
        pcRef.current.getSenders().forEach((s) => s.track?.stop());
        pcRef.current.close();
        pcRef.current = null;
      }
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      router.replace("/");
    };
    socket.on("call-ended", onCallEnded);
    return () => {
      socket.off("call-ended", onCallEnded);
    };
  }, [router]);

  const startRecording = async () => {
    if (recording) return;
    const remoteStream = (remoteVideoRef.current?.srcObject || remoteAudioRef.current?.srcObject) as MediaStream | null;
    const localStream = localStreamRef.current;
    const mixed = new MediaStream();
    if (remoteStream) {
      remoteStream.getVideoTracks().forEach((t) => mixed.addTrack(t));
    } else if (localStream) {
      localStream.getVideoTracks().forEach((t) => mixed.addTrack(t));
    }
    if (localStream) localStream.getAudioTracks().forEach((t) => mixed.addTrack(t));
    if (remoteStream) remoteStream.getAudioTracks().forEach((t) => mixed.addTrack(t));

    const options: MediaRecorderOptions = { mimeType: "video/webm;codecs=vp9,opus" } as any;
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(mixed, options);
    } catch (e) {
      recorder = new MediaRecorder(mixed as any);
    }
    recordedChunksRef.current = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size) recordedChunksRef.current.push(ev.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `call-recording-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingSeconds(0);
    };
    recorder.start(1000);
    recorderRef.current = recorder;
    setRecording(true);
    recordingTimerRef.current = window.setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  };

  const endCall = () => {
    const socket = getSocket();
    socket.emit("end-call", { roomId: roomId || targetId });
    socket.emit("call-cancel", { targetUserId: targetId, roomId: roomId || targetId });
    if (pcRef.current) {
      pcRef.current.getSenders().forEach((s) => s.track?.stop());
      pcRef.current.close();
      pcRef.current = null;
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    router.replace("/");
  };

  const toggleScreenShare = async () => {
    const pc = pcRef.current;
    if (!pc || mode !== "video") return;
    if (!screenTrackRef.current) {
      if (!(navigator.mediaDevices as any)?.getDisplayMedia) {
        toast.error("Screen sharing isn't supported on this browser/device.");
        return;
      }
      try {
        const displayStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
        const screenTrack = displayStream.getVideoTracks()[0];
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(screenTrack);
          if (localRef.current) {
            localRef.current.srcObject = displayStream;
            localRef.current.muted = true;
            localRef.current.play().catch(() => {});
          }
          screenTrack.onended = async () => {
            const camera = cameraTrackRef.current;
            if (camera && sender) await sender.replaceTrack(camera);
            if (localRef.current && localStreamRef.current) {
              localRef.current.srcObject = localStreamRef.current;
              localRef.current.play().catch(() => {});
            }
            screenTrackRef.current = null;
            setIsScreenSharing(false);
          };
          screenTrackRef.current = screenTrack;
          setIsScreenSharing(true);
        }
      } catch (e: any) {
        if (e?.name === "NotAllowedError") {
          toast.error("Screen share permission was denied.");
        } else {
          toast.error("Couldn't start screen sharing on this device.");
        }
      }
    } else {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      const camera = cameraTrackRef.current;
      if (sender && camera) await sender.replaceTrack(camera);
      if (localRef.current && localStreamRef.current) {
        localRef.current.srcObject = localStreamRef.current;
        localRef.current.play().catch(() => {});
      }
      if (screenTrackRef.current) screenTrackRef.current.stop();
      screenTrackRef.current = null;
      setIsScreenSharing(false);
    }
  };

  return (
    <main className="flex-1 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold">
            {role === "caller" && !connected ? `Calling ${calleeName}...` : calleeName}
          </div>
          <div className="text-sm text-gray-500">
            {mode === "audio" ? "Audio Call" : "Video Call"} •{" "}
            {Math.floor(callSeconds / 60).toString().padStart(2, "0")}:
            {(callSeconds % 60).toString().padStart(2, "0")}
          </div>
        </div>

        {/* Waiting screen */}
       
{!connected && role === "caller" && (
  <div className="bg-gray-900 rounded-lg p-8 text-center text-white space-y-4">
    <div className="text-2xl font-semibold">Calling {calleeName}...</div>
    <div className="text-sm text-gray-400">Waiting for them to accept</div>
    <Button variant="destructive" onClick={endCall} className="mt-4">
      Cancel Call
    </Button>
  </div>
)}

        {/* Call area */}
        {(connected || role === "callee") && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Remote video/audio */}
            <div className={`md:col-span-2 rounded-lg overflow-hidden ${mode === "video" ? "bg-black aspect-video" : "bg-gray-900 text-white"}`}>
              {mode === "video" ? (
                <video ref={remoteVideoRef} className="w-full h-full object-cover" playsInline autoPlay />
              ) : (
                <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 p-6">
                  <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-3xl font-bold">
                    {calleeName?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="text-xl font-semibold">{calleeName}</div>
                  <div className="text-sm text-gray-400">Audio call in progress</div>
                  <audio ref={remoteAudioRef} autoPlay />
                </div>
              )}
            </div>

            {/* Local + controls */}
            <div className="space-y-4">
              {mode === "video" ? (
                <div className="bg-gray-900 rounded-lg overflow-hidden">
                <video ref={localRef} className="w-full aspect-video object-cover" playsInline muted autoPlay />
                  {/* <video ref={localRef} className="w-full h-40 object-cover" playsInline muted autoPlay /> */}
                  <div className="text-xs text-center text-gray-400 py-1">You</div>
                </div>
              ) : (
                <div className="bg-gray-100 rounded-lg p-4 text-center">
                  <div className="text-sm font-medium">🎙 Mic active</div>
                  <div className="text-xs text-gray-500 mt-1">Audio only mode</div>
                </div>
              )}

              {/* Controls */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={isMuted ? "destructive" : "outline"}
                  onClick={() => {
                    const local = localStreamRef.current;
                    if (!local) return;
                    const currentEnabled = local.getAudioTracks()[0]?.enabled ?? true;
                    local.getAudioTracks().forEach((t) => (t.enabled = !currentEnabled));
                    setIsMuted(currentEnabled);
                  }}
                >
                  {isMuted ? "Unmute" : "Mute"}
                </Button>

                {mode === "video" && (
                  <>
                    <Button
                      variant={isCameraOn ? "outline" : "destructive"}
                      onClick={() => {
                        const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === "video");
                        if (sender?.track) {
                          const next = !sender.track.enabled;
                          sender.track.enabled = next;
                          setIsCameraOn(next);
                        }
                      }}
                    >
                      {isCameraOn ? "Camera Off" : "Camera On"}
                    </Button>
                    <Button
                      variant={isScreenSharing ? "secondary" : "outline"}
                      onClick={toggleScreenShare}
                    >
                      {isScreenSharing ? "Stop Sharing" : "Share Screen"}
                    </Button>
                  </>
                )}

                {!recording ? (
                  <Button onClick={startRecording} className="bg-red-600 hover:bg-red-700 text-white">
                    ● Record
                  </Button>
                ) : (
                  <Button onClick={stopRecording} variant="outline">
                    ■ Stop ({recordingSeconds}s)
                  </Button>
                )}
              </div>

              <Button variant="destructive" className="w-full" onClick={endCall}>
                End Call
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default VideoCallPage;