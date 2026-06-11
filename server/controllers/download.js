import mongoose from "mongoose";
import download from "../Modals/download.js";
import users from "../Modals/Auth.js";
import video from "../Modals/video.js";

const startOfDay = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const endOfDay = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
};

export const addDownload = async (req, res) => {
  const { videoId } = req.params;
  const { userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(videoId) || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid request data." });
  }

  try {
    const user = await users.findById(userId);
    const videoFile = await video.findById(videoId);

    if (!user || !videoFile) {
      return res.status(404).json({ message: "User or video not found." });
    }

    if (user.plan === "free") {
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());
      const downloadsToday = await download.countDocuments({
        viewer: userId,
        createdAt: { $gte: todayStart, $lt: todayEnd },
      });

      if (downloadsToday >= 1) {
        return res.status(403).json({ message: "Upgrade to Premium for unlimited downloads." });
      }
    }

    const downloadedVideo = await download.create({
      viewer: userId,
      videoid: videoId,
    });

    return res.status(201).json({
      downloaded: true,
      downloadPath: videoFile.filepath.replace(/\\/g, "/"),
      message: "Download started.",
      downloadId: downloadedVideo._id,
    });
  } catch (error) {
    console.error("Download error:", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
};

export const getDownloads = async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  try {
    const downloads = await download
      .find({ viewer: userId })
      .sort({ createdAt: -1 })
      .populate({ path: "videoid", model: "videofiles" });

    return res.status(200).json(downloads);
  } catch (error) {
    console.error("Get downloads error:", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
};
