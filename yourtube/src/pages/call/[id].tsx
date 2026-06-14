"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/router";
import { getSocket } from "@/lib/socket";

const buildIceConfig = (): RTCConfiguration => {
  const iceServers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
  try {
    const turnUrl = process.env.NEXT_PUBLIC_TURN_URL || (typeof window !== "undefined" && (window as any).NEXT_PUBLIC_TURN_URL);
    const turnUser = process.env.NEXT_PUBLIC_TURN_USER || (typeof window !== "undefined" && (window as any).NEXT_PUBLIC_TURN_USER);
    const turnPass = process.env.NEXT_PUBLIC_TURN_PASS || (typeof window !== "undefined" && (window as any).NEXT_PUBLIC_TURN_PASS);
    if (turnUrl) {
      const turn: RTCIceServer = { urls: turnUrl } as any;
      if (turnUser && turnPass) {
        (turn as any).username = turnUser;
        (turn as any).credential = turnPass;
      }
      iceServers.push(turn);
    }
  } catch (e) {
    // ignore
  }
  return { iceServers };
};

const VideoCallPage = ({ params }: any) => {
  const router = useRouter();
  const { id } = params || {};
  const localRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
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

  useEffect(() => {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams("");
    const currentMode = params.get("mode") === "audio" ? "audio" : "video";
    setMode(currentMode);
    setRole(params.get("role"));
    setRoomId(params.get("room") || id);
  }, [id]);

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
        const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        if (!mounted) return;

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
            socket.emit("ice-candidate", { target: id, candidate: event.candidate });
          }
        };

        pc.onconnectionstatechange = () => {
          setConnectionState(pc.connectionState || "unknown");
        };

        socket.on("user-joined", async ({ id: otherId }) => {
          if (!pc) return;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("offer", { target: otherId, sdp: offer });
        });

        socket.on("offer", async ({ from, sdp }) => {
          if (!pc) return;
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("answer", { target: from, sdp: answer });
        });

        socket.on("answer", async ({ from, sdp }) => {
          if (!pc) return;
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        });

        socket.on("ice-candidate", async ({ from, candidate }) => {
          if (!pc || !candidate) return;
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
      }
    };

    const onResponse = ({ accepted, roomId: incomingRoom }: any) => {
      if (accepted) {
        setupPeerAndMedia();
      } else {
        alert("Call declined");
        router.push("/");
      }
    };

    if (role === "caller") {
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
      cleanupPeer();
    };
  }, [id, roomId, role, mode, router]);

  useEffect(() => {
    const socket = getSocket();
    const onCallEnded = () => {
      if (pcRef.current) {
        pcRef.current.getSenders().forEach((s) => s.track?.stop());
        pcRef.current.close();
        pcRef.current = null;
      }
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      router.push("/");
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
      (async () => {
        try {
          const form = new FormData();
          form.append("recording", blob, `call-${Date.now()}.webm`);
          const room = roomId || id;
          form.append("roomId", room || id);
          const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
          await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000") + "/call/recording", {
            method: "POST",
            body: form,
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
        } catch (e) {
          console.warn("Upload failed", e);
        }
      })();
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
    socket.emit("end-call", { roomId: roomId || id });
    if (pcRef.current) {
      pcRef.current.getSenders().forEach((s) => s.track?.stop());
      pcRef.current.close();
      pcRef.current = null;
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    router.push("/");
  };

  const toggleScreenShare = async () => {
    const pc = pcRef.current;
    if (!pc || mode !== "video") return;
    if (!screenTrackRef.current) {
      try {
        const displayStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
        const screenTrack = displayStream.getVideoTracks()[0];
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(screenTrack);
          screenTrack.onended = async () => {
            const camera = cameraTrackRef.current;
            if (camera && sender) await sender.replaceTrack(camera);
            screenTrackRef.current = null;
          };
          screenTrackRef.current = screenTrack;
        }
      } catch (e) {
        console.warn("screen share error", e);
      }
    } else {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      const camera = cameraTrackRef.current;
      if (sender && camera) await sender.replaceTrack(camera);
      if (screenTrackRef.current) screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
  };

  return (
    <main className="flex-1 p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Call ID: {id}</div>
          <div className="text-sm text-gray-600">
            Mode: {mode === "audio" ? "Audio only" : "Video"} • Status: {connectionState} • Duration: {Math.floor(callSeconds / 60).toString().padStart(2, "0")}:{(callSeconds % 60).toString().padStart(2, "0")}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(!connected && role === "caller") ? (
            <div className="md:col-span-3 bg-gray-50 rounded-lg p-6 text-center">
              <div className="text-lg font-medium">Calling...</div>
              <div className="text-sm text-gray-600">Waiting for the recipient to accept the call.</div>
            </div>
          ) : null}

          <div className={`md:col-span-2 rounded-lg overflow-hidden ${mode === "video" ? "bg-black aspect-video" : "bg-gray-900 text-white"}`}>
            {mode === "video" ? (
              <video ref={remoteVideoRef} className="w-full h-full object-cover" playsInline autoPlay />
            ) : (
              <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 p-6">
                <div className="text-xl font-semibold">Audio Call</div>
                <div className="text-sm text-gray-300">Your audio connection is live.</div>
                <audio ref={remoteAudioRef} autoPlay />
              </div>
            )}
          </div>

          <div className="space-y-4">
            {mode === "video" ? (
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <video ref={localRef} className="w-full h-48 object-cover rounded" playsInline muted autoPlay />
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <div className="text-sm font-medium text-gray-800">Mic active</div>
                <div className="text-sm text-gray-500">You are connected in audio-only mode.</div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  const local = localStreamRef.current;
                  if (!local) return;
                  const currentAudioEnabled = local.getAudioTracks()[0]?.enabled ?? true;
                  local.getAudioTracks().forEach((t) => (t.enabled = !currentAudioEnabled));
                  setIsMuted(!currentAudioEnabled);
                }}
              >
                {isMuted ? "Unmute" : "Mute"}
              </Button>
              {mode === "video" && (
                <>
                  <Button
                    onClick={() => {
                      const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === "video");
                      if (sender?.track) {
                        const nextCameraOn = !(sender.track.enabled ?? false);
                        sender.track.enabled = nextCameraOn;
                        setIsCameraOn(nextCameraOn);
                      }
                    }}
                  >
                    {isCameraOn ? "Camera Off" : "Camera On"}
                  </Button>
                  <Button onClick={() => toggleScreenShare()}>Share Screen</Button>
                </>
              )}
              {!recording ? (
                <Button onClick={() => startRecording()} className="bg-red-600 text-white">
                  Record
                </Button>
              ) : (
                <Button onClick={() => stopRecording()} className="bg-gray-800 text-white">
                  Stop
                </Button>
              )}
            </div>
            <div>
              <Button variant="destructive" onClick={() => endCall()}>
                End Call
              </Button>
            </div>
          </div>
        </div>
        <div className="text-sm text-gray-500">WebRTC: basic signaling + peer connection active: {connected ? "yes" : "no"}.</div>
      </div>
    </main>
  );
};

export default VideoCallPage;
