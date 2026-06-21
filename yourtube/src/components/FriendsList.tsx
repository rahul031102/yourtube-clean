"use client";

import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { PhoneCall, VideoIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axiosinstance";
import { getSocket } from "@/lib/socket";
import { useUser } from "@/lib/AuthContext";

interface FriendsListProps {
  mode?: "audio" | "video";
}

export default function FriendsList({ mode = "video" }: FriendsListProps) {
  const router = useRouter();
  const { user } = useUser();
  const [calling, setCalling] = useState<string | null>(null);
  const [usersList, setUsersList] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await axiosInstance.get("/user/list");
        if (!mounted) return;
        setUsersList(res.data || []);
      } catch (e) {
        console.error("Failed to load users", e);
        if (mounted) setUsersList([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const createRoomId = (targetId: string) => `${user?._id || "anon"}-${targetId}-${Date.now()}`;

  const handleCall = (targetId: string, selectedMode: "audio" | "video") => {
    if (!user?._id) {
      router.push("/");
      return;
    }
    const socket = getSocket();
    const roomId = createRoomId(targetId);
    setCalling(targetId);
    socket.emit("call-request", { targetUserId: String(targetId), roomId, fromUserId: user._id, mode: selectedMode, fromName: user.channelname || user.name, fromImage: user.image });
    // socket.emit("call-request", { targetUserId: String(targetId), roomId, fromUserId: user._id, mode: selectedMode });
    router.push(`/call/${targetId}?role=caller&room=${roomId}&mode=${selectedMode}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Friends</h2>
          <p className="text-sm text-gray-500">Current mode: {mode === "audio" ? "Audio Call" : "Video Call"}</p>
        </div>
        <p className="text-sm text-gray-500">Tap an icon to start a call</p>
      </div>

      <div className="space-y-3">
        {loading && <div className="text-sm text-gray-500">Loading users...</div>}
        {!loading && usersList && usersList.length === 0 && (
          <div className="text-sm text-gray-500">No users available</div>
        )}

        {!loading && usersList && usersList.map((f) => (
          <div key={f._id} className="flex items-center justify-between gap-4 p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={f.image || undefined} />
                <AvatarFallback>{(f.name || "")[0] || "U"}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{f.channelname || f.name}</div>
                <div className="text-sm text-gray-500">{f.online ? "Online" : "Offline"}</div>
              </div>
            </div>
            {/* <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCall(String(f._id), "audio")}
              >
                <PhoneCall className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleCall(String(f._id), "video")}
              >
                <VideoIcon className="w-4 h-4" />
              </Button>
            </div> */}
            // TO:
<div className="flex items-center gap-2">
  <Button
    variant="default"
    size="icon"
    onClick={() => handleCall(String(f._id), mode)}
  >
    {mode === "audio" ? <PhoneCall className="w-4 h-4" /> : <VideoIcon className="w-4 h-4" />}
  </Button>
</div>
          </div>
        ))}
      </div>
    </div>
  );
}
