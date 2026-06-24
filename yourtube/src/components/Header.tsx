import { Bell, Menu, Mic, Search, User, VideoIcon, PhoneCall, PhoneOff } from "lucide-react";
// import { Bell, Menu, Mic, Search, User, VideoIcon, PhoneCall ,phoneoff} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "./ui/button";
import Link from "next/link";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Channeldialogue from "./channeldialogue";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import { getSocket } from "@/lib/socket";

// const Header = () => {
//   const { user, logout, handlegooglesignin } = useUser();
//   // const user: any = {
//   //   id: "1",
//   //   name: "John Doe",
//   //   email: "john@example.com",
//   //   image: "https://github.com/shadcn.png?height=32&width=32",
//   // };
//   const [searchQuery, setSearchQuery] = useState("");
 
interface HeaderProps {
  onMenuClick?: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const { user, logout, handlegooglesignin } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

const [isdialogeopen, setisdialogeopen] = useState(false);
  const router = useRouter();
  const [incoming, setIncoming] = useState<any>(null);
  const ringIntervalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  useEffect(() => {
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    Notification.requestPermission();
  }
}, []);
  useEffect(() => {
  const unlockAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    window.removeEventListener("click", unlockAudio);
    window.removeEventListener("touchstart", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
  };
  window.addEventListener("click", unlockAudio);
  window.addEventListener("touchstart", unlockAudio);
  window.addEventListener("keydown", unlockAudio);
  return () => {
    window.removeEventListener("click", unlockAudio);
    window.removeEventListener("touchstart", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
  };
}, []);
  useEffect(() => {
    const socket = getSocket();
    const onConnect = () => {
      if (user?._id) {
        socket.emit("register", { userId: user._id });
      }
    };

    if (socket.connected && user?._id) {
      socket.emit("register", { userId: user._id });
    } else {
      socket.on("connect", onConnect);
    }
  
    const onIncoming = ({ fromUserId, roomId, mode, fromName, fromImage }: any) => {
      setIncoming({ fromUserId, roomId, mode, fromName, fromImage });
    };
    socket.on("incoming-call", onIncoming);

    const onUnavailable = ({ targetUserId }: any) => {
      toast.error("User is unavailable or offline");
      router.push("/calls");
    };
    socket.on("call-unavailable", onUnavailable);

    const onRegisterFailed = ({ reason }: any) => {
      console.warn("socket register failed", reason);
    };
    const onRegisterSuccess = ({ userId }: any) => {
      console.log("socket registered", userId);
    };
    socket.on("register-failed", onRegisterFailed);
    socket.on("register-success", onRegisterSuccess);

    return () => {
      socket.off("connect", onConnect);
      socket.off("incoming-call", onIncoming);
      socket.off("call-unavailable", onUnavailable);
      socket.off("register-failed", onRegisterFailed);
      socket.off("register-success", onRegisterSuccess);
    };
  }, [user, router]);

useEffect(() => {
  const playBeep = () => {
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 800;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  };

  // if (incoming) {
  //   playBeep();
  //   ringIntervalRef.current = window.setInterval(playBeep, 1000);
  // } else if (ringIntervalRef.current) {
    if (incoming) {
    playBeep();
    ringIntervalRef.current = window.setInterval(playBeep, 1000);
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("Incoming call", {
        body: `${incoming.fromName || "Someone"} is calling you`,
        icon: "/favicon.ico",
      });
    }
  } else if (ringIntervalRef.current) {
  clearInterval(ringIntervalRef.current);
    ringIntervalRef.current = null;
  }

  return () => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
  };
}, [incoming]);  

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  const handleKeypress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(e as any);
    }
  };
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-background text-foreground border-b sticky top-0 z-30">
    {/* // <header className="flex items-center justify-between px-4 py-2 bg-background text-foreground border-b"> */}
      <div className="flex items-center gap-4">
        {/* <Button variant="ghost" size="icon">
          <Menu className="w-6 h-6" />
        </Button> */}

        <Button variant="ghost" size="icon" onClick={onMenuClick}>
  <Menu className="w-6 h-6" />
</Button>

        <Link href="/" className="flex items-center gap-1">
          <div className="bg-red-600 p-1 rounded">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <span className="text-xl font-medium">YourTube</span>
          <span className="text-xs text-gray-400 ml-1">IN</span>
        </Link>
      </div>
      <form
        onSubmit={handleSearch}
        className="hidden sm:flex items-center gap-2 flex-1 max-w-2xl mx-4"
        // className="flex items-center gap-2 flex-1 max-w-2xl mx-4"
      >
        <div className="flex flex-1">
          <Input
            type="search"
            placeholder="Search"
            value={searchQuery}
            onKeyPress={handleKeypress}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-l-full border-r-0 focus-visible:ring-0"
          />
          <Button
            type="submit"
            className="rounded-r-full px-6 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-l-0"
          >
            <Search className="w-5 h-5" />
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Mic className="w-5 h-5" />
        </Button>
      </form>


<Button
  variant="ghost"
  size="icon"
  className="sm:hidden"
  onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
>
  <Search className="w-5 h-5" />
</Button>      

      <div className="flex items-center gap-2">
        {user ? (
          <>
            {/* <Button variant="ghost" size="icon" onClick={() => router.push("/calls?mode=audio") }>
              <PhoneCall className="w-6 h-6" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => router.push("/calls?mode=video") }>
              <VideoIcon className="w-6 h-6" />
            </Button> */}

            <Button variant="ghost" size="icon" onClick={() => router.push("/calls?mode=audio") }>
  <PhoneCall className="w-5 h-5 sm:w-6 sm:h-6" />
</Button>
<Button variant="ghost" size="icon" onClick={() => router.push("/calls?mode=video") }>
  <VideoIcon className="w-5 h-5 sm:w-6 sm:h-6" />
</Button>

            <Button variant="ghost" size="icon">
              <Bell className="w-6 h-6" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image} />
                    <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                {/* // ADD after line 168 (after <DropdownMenuContent className="w-56" align="end" forceMount>): */}
{/* <div className="sm:hidden">
  <DropdownMenuItem onClick={() => router.push("/calls?mode=audio")}>
    <PhoneCall className="w-4 h-4 mr-2" /> Audio Call
  </DropdownMenuItem>
  <DropdownMenuItem onClick={() => router.push("/calls?mode=video")}>
    <VideoIcon className="w-4 h-4 mr-2" /> Video Call
  </DropdownMenuItem>
  <DropdownMenuSeparator />
</div> */}
                {user?.channelname ? (
                  <DropdownMenuItem asChild>
                    <Link href={`/channel/${user?._id}`}>Your channel</Link>
                  </DropdownMenuItem>
                ) : (
                  <div className="px-2 py-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => setisdialogeopen(true)}
                    >
                      Create Channel
                    </Button>
                  </div>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/history">History</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/liked">Liked videos</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/downloads">Downloads</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/watch-later">Watch later</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            <Button
              className="flex items-center gap-2"
              onClick={handlegooglesignin}
            >
              <User className="w-4 h-4" />
              Sign in
            </Button>
          </>
        )}{" "}
      </div>

      {mobileSearchOpen && (
  // <div className="sm:hidden px-4 pb-2 flex items-center gap-2">
    <div className="sm:hidden fixed top-[53px] left-0 right-0 z-20 bg-background border-b px-3 py-2 flex items-center gap-2">
    <Input
      type="search"
      placeholder="Search"
      value={searchQuery}
      onKeyPress={handleKeypress}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="flex-1"
      autoFocus
    />
    <Button onClick={handleSearch} size="icon">
      <Search className="w-5 h-5" />
    </Button>
  </div>
)}
     {incoming && (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
    <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in duration-200">
      <div className="relative w-24 h-24 mx-auto mb-4">
        <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
        <Avatar className="w-24 h-24 relative">
          <AvatarImage src={incoming.fromImage} />
           <AvatarFallback className="text-2xl">
              {String(incoming.fromName || incoming.fromUserId)?.[0]?.toUpperCase() || "U"}
            {/* {String(incoming.fromUserId)?.[0]?.toUpperCase() || "U"} */}
          </AvatarFallback>
        </Avatar>
      </div>

      <p className="text-sm text-muted-foreground mb-1">
        Incoming {incoming.mode === "audio" ? "audio" : "video"} call
      </p>
      <h3 className="text-lg font-semibold mb-6">{incoming.fromName || incoming.fromUserId}</h3>
      {/* <h3 className="text-lg font-semibold mb-6">{incoming.fromUserId}</h3> */}

      <div className="flex gap-4 justify-center">
        <Button
          variant="destructive"
          size="lg"
          className="rounded-full w-16 h-16 p-0"
          onClick={() => {
            const socket = getSocket();
            socket.emit("call-response", { fromUserId: incoming.fromUserId, targetUserId: user?._id, accepted: false, roomId: incoming.roomId });
            setIncoming(null);
          }}
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
        <Button
          size="lg"
          className="rounded-full w-16 h-16 p-0 bg-green-600 hover:bg-green-700"
          onClick={() => {
            const socket = getSocket();
            socket.emit("call-response", { fromUserId: incoming.fromUserId, targetUserId: user?._id, accepted: true, roomId: incoming.roomId });
            setIncoming(null);
            router.push(`/call/${incoming.fromUserId}?role=callee&room=${incoming.roomId}&mode=${incoming.mode || "video"}`);
          }}
        >
          {incoming.mode === "audio" ? <PhoneCall className="w-6 h-6" /> : <VideoIcon className="w-6 h-6" />}
        </Button>
      </div>
    </div>
  </div>
)}
      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
    </header>
  );
};

export default Header;
  