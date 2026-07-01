
import {
  Home,
  Compass,
  PlaySquare,
  Clock,
  ThumbsUp,
  History,
  User,
  Award,
  X,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Button } from "./ui/button";
import Channeldialogue from "./channeldialogue";
import { useUser } from "@/lib/AuthContext";

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

const Sidebar = ({ open = false, onClose }: SidebarProps) => {
  const { user } = useUser();

  const [isdialogeopen, setisdialogeopen] = useState(false);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className="hidden md:flex md:fixed md:top-16 md:left-0 md:h-[calc(100vh-4rem)] md:translate-x-0 md:z-20 w-64 bg-background text-foreground border-r p-2 flex-col overflow-y-auto shrink-0">
        <nav className="space-y-1">
          <Link href="/">
            <Button variant="ghost" className="w-full justify-start">
              <Home className="w-5 h-5 mr-3" />
              Home
            </Button>
          </Link>
          <Link href="/explore">
            <Button variant="ghost" className="w-full justify-start">
              <Compass className="w-5 h-5 mr-3" />
              Explore
            </Button>
          </Link>
          <Link href="/subscriptions">
            <Button variant="ghost" className="w-full justify-start">
              <PlaySquare className="w-5 h-5 mr-3" />
              Subscriptions
            </Button>
          </Link>

          {user && (
            <div className="border-t pt-2 mt-2">
              <Link href="/history">
                <Button variant="ghost" className="w-full justify-start">
                  <History className="w-5 h-5 mr-3" />
                  History
                </Button>
              </Link>
              <Link href="/liked">
                <Button variant="ghost" className="w-full justify-start">
                  <ThumbsUp className="w-5 h-5 mr-3" />
                  Liked videos
                </Button>
              </Link>
              <Link href="/profile">
                <Button variant="ghost" className="w-full justify-start">
                  <User className="w-5 h-5 mr-3" />
                  Profile
                </Button>
              </Link>
              <Link href="/premium">
                <Button variant="ghost" className="w-full justify-start">
                  <Award className="w-5 h-5 mr-3" />
                  Plans
                </Button>
              </Link>
              <Link href="/watch-later">
                <Button variant="ghost" className="w-full justify-start">
                  <Clock className="w-5 h-5 mr-3" />
                  Watch later
                </Button>
              </Link>
              {user?.channelname ? (
                <Link href={`/channel/${user?._id}`}>
                  <Button variant="ghost" className="w-full justify-start">
                    <User className="w-5 h-5 mr-3" />
                    Your channel
                  </Button>
                </Link>
              ) : (
                <div className="px-2 py-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setisdialogeopen(true);
                    }}
                  >
                    Create Channel
                  </Button>
                </div>
              )}
            </div>
          )}
        </nav>
      </aside>

      {open && (
        <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-background text-foreground border-r min-h-screen p-2 md:hidden shadow-2xl">
          <div className="flex items-center justify-between mb-2 px-2 py-1">
            <span className="text-sm font-medium text-muted-foreground">Menu</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

        <nav className="space-y-1" onClick={onClose}>
          <Link href="/">
            <Button variant="ghost" className="w-full justify-start">
              <Home className="w-5 h-5 mr-3" />
              Home
            </Button>
          </Link>
          <Link href="/explore">
            <Button variant="ghost" className="w-full justify-start">
              <Compass className="w-5 h-5 mr-3" />
              Explore
            </Button>
          </Link>
          <Link href="/subscriptions">
            <Button variant="ghost" className="w-full justify-start">
              <PlaySquare className="w-5 h-5 mr-3" />
              Subscriptions
            </Button>
          </Link>

          {user && (
            <div className="border-t pt-2 mt-2">
              <Link href="/history">
                <Button variant="ghost" className="w-full justify-start">
                  <History className="w-5 h-5 mr-3" />
                  History
                </Button>
              </Link>
              <Link href="/liked">
                <Button variant="ghost" className="w-full justify-start">
                  <ThumbsUp className="w-5 h-5 mr-3" />
                  Liked videos
                </Button>
              </Link>
              <Link href="/profile">
                <Button variant="ghost" className="w-full justify-start">
                  <User className="w-5 h-5 mr-3" />
                  Profile
                </Button>
              </Link>
              <Link href="/premium">
                <Button variant="ghost" className="w-full justify-start">
                  <Award className="w-5 h-5 mr-3" />
                  Plans
                </Button>
              </Link>
              <Link href="/watch-later">
                <Button variant="ghost" className="w-full justify-start">
                  <Clock className="w-5 h-5 mr-3" />
                  Watch later
                </Button>
              </Link>
              {user?.channelname ? (
                <Link href={`/channel/${user?._id}`}>
                  <Button variant="ghost" className="w-full justify-start">
                    <User className="w-5 h-5 mr-3" />
                    Your channel
                  </Button>
                </Link>
              ) : (
                <div className="px-2 py-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setisdialogeopen(true);
                    }}
                  >
                    Create Channel
                  </Button>
                </div>
              )}
            </div>
          )}
        </nav>
        </aside>
      )}

      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
    </>
  );
};

export default Sidebar;