import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import { useUser } from "@/lib/AuthContext";
import { useRouter } from "next/router";
import React from "react";

const index = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser();
  const [videos, setVideos] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!id) return;
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/video/all`)
      .then((res) => res.json())
      .then((data) => {
        const channelVideos = data.filter((v: any) => v.uploader === id);
        setVideos(channelVideos);
      })
      .catch((err) => console.error("Failed to fetch videos:", err));
  }, [id]);

  return (
    <div className="flex-1 min-h-screen bg-background">
      <div className="max-w-full mx-auto">
        <ChannelHeader channel={user} user={user} />
        <Channeltabs />
        <div className="px-4 pb-8">
          <VideoUploader channelId={user?._id} channelName={user?.channelname} />
        </div>
        <div className="px-4 pb-8">
          <ChannelVideos videos={videos} />
        </div>
      </div>
    </div>
  );
};

export default index;