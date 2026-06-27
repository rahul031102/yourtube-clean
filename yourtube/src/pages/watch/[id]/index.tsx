import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import GestureVideoPlayer from "@/components/GestureVideoPlayer";
import axiosInstance from "@/lib/axiosinstance";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

const index = () => {
  const router = useRouter();
  const { id } = router.query;
  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const [videoList, setVideoList] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideo = async () => {
      if (!id || typeof id !== "string") return;
      try {
        const res = await axiosInstance.get("/video/getall");
        const found = res.data?.find((vid: any) => vid._id === id);
        setCurrentVideo(found);
        setVideoList(res.data);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
  }, [id]);

  if (loading) {
    return <div>Loading..</div>;
  }

  if (!currentVideo) {
    return <div>Video not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
     <div className="max-w-7xl mx-auto px-0 sm:px-4 pt-0 sm:pt-4">
      {/* <div className="max-w-7xl mx-auto p-2 sm:p-4"> */}
        {/* <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"> */}
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="w-full lg:col-span-2 space-y-4 px-3 sm:px-0">
          {/* <div className="lg:col-span-2 space-y-4"> */}
            <GestureVideoPlayer video={currentVideo} allVideos={videoList} />
            <VideoInfo video={currentVideo} />
            <div id="comments-section">
              <Comments videoId={id} />
            </div>
          </div>
          <div className="space-y-4 px-2 sm:px-0">
          {/* <div className="space-y-4"> */}
            <RelatedVideos videos={videoList} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default index;
