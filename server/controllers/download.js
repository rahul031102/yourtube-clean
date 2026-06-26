import mongoose from "mongoose";
import download from "../Modals/download.js";
import users from "../Modals/Auth.js";
import video from "../Modals/video.js";
import axios from "axios";

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
       const filtered = downloads.filter((item) => item.videoid !== null);
return res.status(200).json(filtered);
    return res.status(200).json(downloads);
  } catch (error) {
    console.error("Get downloads error:", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
};

export const streamVideoFile = async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(400).json({ message: "Invalid video id." });
  }

  try {
    const videoFile = await video.findById(videoId);
    if (!videoFile) {
      return res.status(404).json({ message: "Video not found." });
    }

    const sourceUrl = videoFile.filepath.replace(/\\/g, "/");
    const upstream = await axios.get(sourceUrl, { responseType: "stream" });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${videoFile.filename || "video.mp4"}"`
    );
    res.setHeader("Content-Type", upstream.headers["content-type"] || "video/mp4");
    if (upstream.headers["content-length"]) {
      res.setHeader("Content-Length", upstream.headers["content-length"]);
    }

    upstream.data.pipe(res);
  } catch (error) {
    console.error("Stream video error:", error.message);
    return res.status(500).json({ message: "Unable to download video." });
  }
};

export const deleteDownloadEntry = async (req, res) => {
  const { downloadId } = req.params;
  const { userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(downloadId)) {
    return res.status(400).json({ message: "Invalid download id." });
  }

  try {
    const entry = await download.findById(downloadId);
    if (!entry) {
      return res.status(404).json({ message: "Download entry not found." });
    }

    // Only the owner of this download-history entry can remove it.
    if (String(entry.viewer) !== String(userId)) {
      return res.status(403).json({ message: "Not authorized to remove this entry." });
    }

    // Removes only this history record — the underlying video file in
    // Cloudinary/storage is left completely untouched.
    await download.findByIdAndDelete(downloadId);

    return res.status(200).json({ message: "Removed from download history." });
  } catch (error) {
    console.error("Delete download entry error:", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
};

export const checkDownloadStatus = async (req, res) => {
  const { videoId, userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId) || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid request data." });
  }

  try {
    const existing = await download.findOne({ viewer: userId, videoid: videoId });
    return res.status(200).json({ downloaded: Boolean(existing) });
  } catch (error) {
    console.error("Check download status error:", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
};
