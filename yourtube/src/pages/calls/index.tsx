import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import FriendsList from "@/components/FriendsList";

const CallsPage = () => {
  const router = useRouter();
  const [mode, setMode] = useState<"audio" | "video">("video");

  useEffect(() => {
    const queryMode = router.query.mode as string | undefined;
    setMode(queryMode === "audio" ? "audio" : "video");
  }, [router.query.mode]);

  return (
    <main className="flex-1 p-6">
      <div className="max-w-3xl mx-auto">
        <FriendsList mode={mode} />
      </div>
    </main>
  );
};

export default CallsPage;
