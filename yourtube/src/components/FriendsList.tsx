"use client";

import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { PhoneCall, VideoIcon, Trash2 } from "lucide-react";
import { useRouter } from "next/router";
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
  const [removedUsers, setRemovedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("removed_friends");
    if (saved) {
      try {
        setRemovedUsers(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (!user?._id) return;
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        // excludeId hides yourself from the list
        const res = await axiosInstance.get(`/user/list?excludeId=${user?._id}`);
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
    return () => { mounted = false; };
  }, [user?._id]);

  const createRoomId = (targetId: string) =>
    `${user?._id || "anon"}-${targetId}-${Date.now()}`;

  const handleCall = (targetId: string, targetName: string, selectedMode: "audio" | "video") => {
    if (!user?._id) {
      router.push("/");
      return;
    }
    const socket = getSocket();
    const roomId = createRoomId(targetId);
    setCalling(targetId);
    socket.emit("call-request", {
      targetUserId: String(targetId),
      roomId,
      fromUserId: user._id,
      mode: selectedMode,
      fromName: user.channelname || user.name,
      fromImage: user.image,
    });
    const toName = encodeURIComponent(targetName);
    router.push(`/call/${targetId}?role=caller&room=${roomId}&mode=${selectedMode}&toName=${toName}`);
  };

  const handleRemove = (targetId: string) => {
    const updated = [...removedUsers, targetId];
    setRemovedUsers(updated);
    localStorage.setItem("removed_friends", JSON.stringify(updated));
  };

  const visibleUsers = usersList?.filter((f) => !removedUsers.includes(String(f._id))) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {mode === "audio" ? "Audio Call" : "Video Call"}
          </h2>
          <p className="text-sm text-gray-500">Select a user to call</p>
        </div>
      </div>

      <div className="space-y-3">
        {loading && <div className="text-sm text-gray-500">Loading users...</div>}
        {!loading && visibleUsers.length === 0 && (
          <div className="text-sm text-gray-500">No other users available</div>
        )}

        {!loading && visibleUsers.map((f) => {
          const displayName = f.channelname || f.name || "Unknown";
          const isCalling = calling === f._id;
          return (
            <div
              key={f._id}
              className="flex items-center justify-between gap-4 p-3 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={f.image || undefined} />
                  <AvatarFallback>{displayName[0]?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{displayName}</div>
                  <div className={`text-sm ${f.online ? "text-green-500" : "text-gray-400"}`}>
                    {f.online ? "● Online" : "○ Offline"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={isCalling}
                  onClick={() => handleCall(String(f._id), displayName, "audio")}
                  title="Audio call"
                >
                  <PhoneCall className="w-4 h-4" />
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  disabled={isCalling}
                  onClick={() => handleCall(String(f._id), displayName, "video")}
                  title="Video call"
                >
                  <VideoIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleRemove(String(f._id))}
                  title="Remove user"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}